using System.Net;
using DrivingTest.Application.Common;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Auth;

// ---------- Quên mật khẩu: gửi email chứa link đặt lại ----------
/// <summary>
/// Luôn trả về thành công dù email có tồn tại hay không (không để lộ email nào đã đăng ký).
/// </summary>
public sealed record ForgotPasswordCommand(string Email, string Lang) : ICommand<Unit>;

public sealed class ForgotPasswordValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordValidator() => RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
}

public sealed class ForgotPasswordHandler(
    IAppDbContext db,
    IPasswordResetTokenService resetTokens,
    IEmailSender email,
    IOptions<PasswordResetOptions> options,
    ILogger<ForgotPasswordHandler> logger)
    : ICommandHandler<ForgotPasswordCommand, Unit>
{
    public async ValueTask<Unit> Handle(ForgotPasswordCommand cmd, CancellationToken ct)
    {
        var normalized = cmd.Email.Trim().ToUpperInvariant();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.NormalizedEmail == normalized, ct);
        if (user is null)
        {
            logger.LogInformation("Password reset requested for an unknown email.");
            return Unit.Value;
        }

        var opt = options.Value;
        var link = $"{opt.ResetUrl}{(opt.ResetUrl.Contains('?') ? '&' : '?')}token={Uri.EscapeDataString(resetTokens.Create(user))}";
        var (subject, body) = BuildEmail(cmd.Lang, user.DisplayName, link, opt.TokenMinutes);

        try
        {
            await email.SendAsync(user.Email, subject, body, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Không trả lỗi cho client để tránh lộ thông tin tài khoản; ghi log để quản trị kiểm tra SMTP.
            logger.LogError(ex, "Failed to send the password reset email to user {UserId}.", user.Id);
        }

        return Unit.Value;
    }

    private static (string Subject, string Body) BuildEmail(string lang, string name, string link, int minutes)
    {
        var n = WebUtility.HtmlEncode(name);
        var l = WebUtility.HtmlEncode(link);
        return lang == "en"
            ? ("Reset your password",
               $"""
                <p>Hi {n},</p>
                <p>We received a request to reset the password of your account. Click the link below to choose a new password:</p>
                <p><a href="{l}">Reset password</a></p>
                <p>This link expires in {minutes} minutes and can only be used once. If you did not request it, you can ignore this email.</p>
                """)
            : ("Đặt lại mật khẩu",
               $"""
                <p>Xin chào {n},</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Bấm vào liên kết dưới đây để đặt mật khẩu mới:</p>
                <p><a href="{l}">Đặt lại mật khẩu</a></p>
                <p>Liên kết có hiệu lực trong {minutes} phút và chỉ dùng được một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
                """);
    }
}

// ---------- Đặt lại mật khẩu bằng token trong email ----------
public sealed record ResetPasswordCommand(string Token, string NewPassword) : ICommand<Unit>;

public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Token).NotEmpty().MaximumLength(2048);
        RuleFor(x => x.NewPassword).StrongPassword();
    }
}

public sealed class ResetPasswordHandler(
    IAppDbContext db, IPasswordResetTokenService resetTokens, IPasswordService passwords, TimeProvider clock)
    : ICommandHandler<ResetPasswordCommand, Unit>
{
    public async ValueTask<Unit> Handle(ResetPasswordCommand cmd, CancellationToken ct)
    {
        const string invalid = "The reset link is invalid or has expired.";

        var ticket = resetTokens.Read(cmd.Token) ?? throw new BadRequestException(invalid);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == ticket.UserId, ct);

        // Token gắn với mật khẩu lúc phát hành: đổi mật khẩu xong thì token cũ hết hiệu lực (dùng một lần).
        if (user is null || !resetTokens.IsCurrent(user, ticket)) throw new BadRequestException(invalid);

        user.PasswordHash = passwords.Hash(user, cmd.NewPassword);
        await db.RevokeAllRefreshTokensAsync(user.Id, clock.GetUtcNow().UtcDateTime, ct);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
