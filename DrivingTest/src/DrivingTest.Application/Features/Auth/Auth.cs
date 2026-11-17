using DrivingTest.Application.Common;
using DrivingTest.Domain;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Auth;

public sealed record UserDto(Guid Id, string Email, string DisplayName, string Role);

public sealed record AuthResponse(string AccessToken, DateTime AccessTokenExpiresAt, string RefreshToken, UserDto User);

/// <summary>Tạo access token + refresh token mới cho user và lưu hash refresh token.</summary>
public sealed class AuthTokenIssuer(
    IAppDbContext db, ITokenService tokens, IOptions<JwtOptions> jwt, TimeProvider clock)
{
    public async Task<AuthResponse> IssueAsync(AppUser user, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var (access, accessExpires) = tokens.CreateAccessToken(user);
        var refresh = tokens.GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TokenHash = tokens.Hash(refresh),
            CreatedAt = now,
            ExpiresAt = now.AddDays(jwt.Value.RefreshTokenDays)
        });
        await db.SaveChangesAsync(ct);

        return new AuthResponse(access, accessExpires, refresh, new UserDto(user.Id, user.Email, user.DisplayName, user.Role));
    }
}

// ---------- Register ----------
public sealed record RegisterCommand(string Email, string Password, string DisplayName) : ICommand<AuthResponse>;

public sealed class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password)
            .NotEmpty().MinimumLength(8).MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("Password must contain a letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");
    }
}

public sealed class RegisterHandler(
    IAppDbContext db, IPasswordService passwords, AuthTokenIssuer issuer, TimeProvider clock)
    : ICommandHandler<RegisterCommand, AuthResponse>
{
    public async ValueTask<AuthResponse> Handle(RegisterCommand cmd, CancellationToken ct)
    {
        var email = cmd.Email.Trim();
        var normalized = email.ToUpperInvariant();

        if (await db.Users.AnyAsync(u => u.NormalizedEmail == normalized, ct))
            throw new ConflictException("Email is already registered.");

        var user = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Email = email,
            NormalizedEmail = normalized,
            DisplayName = cmd.DisplayName.Trim(),
            CreatedAt = clock.GetUtcNow().UtcDateTime
        };
        user.PasswordHash = passwords.Hash(user, cmd.Password);
        db.Users.Add(user);

        return await issuer.IssueAsync(user, ct); // SaveChanges cả user lẫn refresh token
    }
}

// ---------- Login ----------
public sealed record LoginCommand(string Email, string Password) : ICommand<AuthResponse>;

public sealed class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}

public sealed class LoginHandler(IAppDbContext db, IPasswordService passwords, AuthTokenIssuer issuer)
    : ICommandHandler<LoginCommand, AuthResponse>
{
    public async ValueTask<AuthResponse> Handle(LoginCommand cmd, CancellationToken ct)
    {
        var normalized = cmd.Email.Trim().ToUpperInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normalized, ct);

        if (user is null || !passwords.Verify(user, user.PasswordHash, cmd.Password))
            throw new UnauthorizedAppException("Invalid email or password.");

        return await issuer.IssueAsync(user, ct);
    }
}

// ---------- Refresh (rotation + phát hiện dùng lại token) ----------
public sealed record RefreshTokenCommand(string RefreshToken) : ICommand<AuthResponse>;

public sealed class RefreshTokenValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenValidator() => RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(512);
}

public sealed class RefreshTokenHandler(
    IAppDbContext db, ITokenService tokens, AuthTokenIssuer issuer, TimeProvider clock)
    : ICommandHandler<RefreshTokenCommand, AuthResponse>
{
    public async ValueTask<AuthResponse> Handle(RefreshTokenCommand cmd, CancellationToken ct)
    {
        var hash = tokens.Hash(cmd.RefreshToken);
        var stored = await db.RefreshTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash, ct)
                     ?? throw new UnauthorizedAppException("Invalid refresh token.");

        var now = clock.GetUtcNow().UtcDateTime;

        if (stored.RevokedAt is not null)
        {
            // Token đã bị thu hồi mà vẫn được dùng lại → nghi ngờ bị đánh cắp: thu hồi toàn bộ phiên của user.
            DateTime? revokedAt = now;
            await db.RefreshTokens
                .Where(t => t.UserId == stored.UserId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt), ct);
            throw new UnauthorizedAppException("Refresh token was already used.");
        }

        if (stored.ExpiresAt <= now) throw new UnauthorizedAppException("Refresh token has expired.");

        stored.RevokedAt = now;
        return await issuer.IssueAsync(stored.User, ct); // lưu cả việc thu hồi token cũ lẫn token mới
    }
}

// ---------- Logout ----------
public sealed record LogoutCommand(string RefreshToken) : ICommand<Unit>;

public sealed class LogoutValidator : AbstractValidator<LogoutCommand>
{
    public LogoutValidator() => RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(512);
}

public sealed class LogoutHandler(IAppDbContext db, ITokenService tokens, TimeProvider clock)
    : ICommandHandler<LogoutCommand, Unit>
{
    public async ValueTask<Unit> Handle(LogoutCommand cmd, CancellationToken ct)
    {
        var hash = tokens.Hash(cmd.RefreshToken);
        DateTime? revokedAt = clock.GetUtcNow().UtcDateTime;
        await db.RefreshTokens
            .Where(t => t.TokenHash == hash && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt), ct);
        return Unit.Value;
    }
}
