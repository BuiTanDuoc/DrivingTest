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

public static class CacheTags
{
    public const string Bank = "bank";
    public const string Stats = "stats";
}
