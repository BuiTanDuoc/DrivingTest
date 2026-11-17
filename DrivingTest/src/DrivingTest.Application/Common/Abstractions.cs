using DrivingTest.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace DrivingTest.Application.Common;

/// <summary>EF Core dùng trực tiếp (không repository). Infrastructure cài đặt bằng AppDbContext.</summary>
public interface IAppDbContext
{
    DbSet<AppUser> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Topic> Topics { get; }
    DbSet<Question> Questions { get; }
    DbSet<Answer> Answers { get; }
    DbSet<ExamAttempt> ExamAttempts { get; }
    DbSet<ExamAttemptQuestion> ExamAttemptQuestions { get; }
    DbSet<Bookmark> Bookmarks { get; }
    DbSet<UserQuestionStat> UserQuestionStats { get; }

    ChangeTracker ChangeTracker { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IPasswordService
{
    string Hash(AppUser user, string password);
    bool Verify(AppUser user, string hash, string password);
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user);
    string GenerateRefreshToken();
    string Hash(string token);
}

/// <summary>Token đặt lại mật khẩu (gửi qua email).</summary>
public interface IPasswordResetTokenService
{
    string Create(AppUser user);
    /// <summary>Giải mã + kiểm tra chữ ký và hạn dùng; null nếu token không hợp lệ.</summary>
    PasswordResetTicket? Read(string token);
    /// <summary>Token chỉ hợp lệ khi mật khẩu chưa thay đổi kể từ lúc phát hành.</summary>
    bool IsCurrent(AppUser user, PasswordResetTicket ticket);
}

public sealed record PasswordResetTicket(Guid UserId, string Stamp);

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct);
}

public static class CacheTags
{
    public const string Bank = "bank";
    public const string Stats = "stats";
}
