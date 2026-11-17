using DrivingTest.Domain;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace DrivingTest.Application.Common;

public static class ValidationExtensions
{
    /// <summary>Quy tắc mật khẩu dùng chung: 8–128 ký tự, có chữ và số.</summary>
    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule)
        => rule.NotEmpty().MinimumLength(8).MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("Password must contain a letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");

    /// <summary>Vai trò hợp lệ: User hoặc Admin.</summary>
    public static IRuleBuilderOptions<T, string> ValidRole<T>(this IRuleBuilder<T, string> rule)
        => rule.NotEmpty().Must(r => r is Roles.User or Roles.Admin).WithMessage("Role must be 'User' or 'Admin'.");
}

public static class RefreshTokenExtensions
{
    /// <summary>Thu hồi mọi refresh token còn hiệu lực của user (đăng xuất mọi thiết bị).</summary>
    public static Task<int> RevokeAllRefreshTokensAsync(this IAppDbContext db, Guid userId, DateTime now, CancellationToken ct)
    {
        DateTime? revokedAt = now;
        return db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, revokedAt), ct);
    }
}
