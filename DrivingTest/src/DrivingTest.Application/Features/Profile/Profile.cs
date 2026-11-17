using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Auth;
using FluentValidation;
using FluentValidation.Results;
using Mediator;
using Microsoft.EntityFrameworkCore;

namespace DrivingTest.Application.Features.Profile;

public sealed record ProfileDto(Guid Id, string Email, string DisplayName, string Role, DateTime CreatedAt);

// ---------- Xem hồ sơ ----------
public sealed record GetProfileQuery(Guid UserId) : IQuery<ProfileDto>;

public sealed class GetProfileHandler(IAppDbContext db) : IQueryHandler<GetProfileQuery, ProfileDto>
{
    public async ValueTask<ProfileDto> Handle(GetProfileQuery q, CancellationToken ct)
    {
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == q.UserId, ct)
                ?? throw new NotFoundException("User", q.UserId);
        return new ProfileDto(u.Id, u.Email, u.DisplayName, u.Role, u.CreatedAt);
    }
}

// ---------- Cập nhật hồ sơ (tên hiển thị) ----------
public sealed record UpdateProfileCommand(Guid UserId, string DisplayName) : ICommand<ProfileDto>;

public sealed class UpdateProfileValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileValidator() => RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(100);
}

public sealed class UpdateProfileHandler(IAppDbContext db) : ICommandHandler<UpdateProfileCommand, ProfileDto>
{
    public async ValueTask<ProfileDto> Handle(UpdateProfileCommand cmd, CancellationToken ct)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == cmd.UserId, ct)
                ?? throw new NotFoundException("User", cmd.UserId);
        u.DisplayName = cmd.DisplayName.Trim();
        await db.SaveChangesAsync(ct);
        return new ProfileDto(u.Id, u.Email, u.DisplayName, u.Role, u.CreatedAt);
    }
}

// ---------- Đổi mật khẩu ----------
/// <summary>Trả về cặp token mới cho phiên hiện tại; mọi refresh token cũ (các thiết bị khác) bị thu hồi.</summary>
public sealed record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword) : ICommand<AuthResponse>;

public sealed class ChangePasswordValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().MaximumLength(128);
        RuleFor(x => x.NewPassword)
            .NotEmpty().MinimumLength(8).MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("Password must contain a letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.")
            .NotEqual(x => x.CurrentPassword).WithMessage("New password must be different from the current password.");
    }
}

public sealed class ChangePasswordHandler(
    IAppDbContext db, IPasswordService passwords, AuthTokenIssuer issuer, TimeProvider clock)
    : ICommandHandler<ChangePasswordCommand, AuthResponse>
{
    public async ValueTask<AuthResponse> Handle(ChangePasswordCommand cmd, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == cmd.UserId, ct)
                   ?? throw new NotFoundException("User", cmd.UserId);

        // Trả lỗi validation (400) thay vì 401 để client không nhầm với access token hết hạn.
        if (!passwords.Verify(user, user.PasswordHash, cmd.CurrentPassword))
            throw new ValidationException([new ValidationFailure(nameof(cmd.CurrentPassword), "Current password is incorrect.")]);

        user.PasswordHash = passwords.Hash(user, cmd.NewPassword);

        // Đăng xuất mọi thiết bị khác: thu hồi toàn bộ refresh token đang hiệu lực.
        DateTime? revokedAt = clock.GetUtcNow().UtcDateTime;
        await db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt), ct);

        return await issuer.IssueAsync(user, ct); // lưu mật khẩu mới + phát token mới cho phiên này
    }
}
