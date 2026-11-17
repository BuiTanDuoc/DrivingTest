using DrivingTest.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DrivingTest.Infrastructure.Persistence.Configurations;

public sealed class TopicConfiguration : IEntityTypeConfiguration<Topic>
{
    public void Configure(EntityTypeBuilder<Topic> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.HasMany(x => x.Translations).WithOne().HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class TopicTranslationConfiguration : IEntityTypeConfiguration<TopicTranslation>
{
    public void Configure(EntityTypeBuilder<TopicTranslation> b)
    {
        b.HasKey(x => new { x.TopicId, x.Lang });
        b.Property(x => x.Lang).HasMaxLength(5);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
    }
}

public sealed class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Number).IsUnique();
        b.HasIndex(x => new { x.TopicId, x.IsActive });
        b.Property(x => x.ImageUrl).HasMaxLength(500);
        b.HasOne(x => x.Topic).WithMany(t => t.Questions).HasForeignKey(x => x.TopicId).OnDelete(DeleteBehavior.Restrict);
        b.HasMany(x => x.Translations).WithOne().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Answers).WithOne().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class QuestionTranslationConfiguration : IEntityTypeConfiguration<QuestionTranslation>
{
    public void Configure(EntityTypeBuilder<QuestionTranslation> b)
    {
        b.HasKey(x => new { x.QuestionId, x.Lang });
        b.Property(x => x.Lang).HasMaxLength(5);
        // Collation tiếng Việt không phân biệt hoa thường và dấu → tìm "bien bao" ra "biển báo".
        b.Property(x => x.Text).HasMaxLength(2000).IsRequired().UseCollation("Vietnamese_100_CI_AI");
        b.Property(x => x.Explanation).HasMaxLength(4000);
    }
}

public sealed class AnswerConfiguration : IEntityTypeConfiguration<Answer>
{
    public void Configure(EntityTypeBuilder<Answer> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.QuestionId);
        b.HasMany(x => x.Translations).WithOne().HasForeignKey(x => x.AnswerId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class AnswerTranslationConfiguration : IEntityTypeConfiguration<AnswerTranslation>
{
    public void Configure(EntityTypeBuilder<AnswerTranslation> b)
    {
        b.HasKey(x => new { x.AnswerId, x.Lang });
        b.Property(x => x.Lang).HasMaxLength(5);
        b.Property(x => x.Text).HasMaxLength(1000).IsRequired();
    }
}

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.Property(x => x.NormalizedEmail).HasMaxLength(256).IsRequired();
        b.HasIndex(x => x.NormalizedEmail).IsUnique();
        b.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        b.Property(x => x.Role).HasMaxLength(20).IsRequired();
    }
}

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();
        b.HasIndex(x => x.UserId);
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ExamAttemptConfiguration : IEntityTypeConfiguration<ExamAttempt>
{
    public void Configure(EntityTypeBuilder<ExamAttempt> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.RowVersion).IsRowVersion();
        b.HasIndex(x => new { x.UserId, x.StartedAt });
        b.HasIndex(x => new { x.Status, x.ExpiresAt });
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Questions).WithOne(x => x.Attempt).HasForeignKey(x => x.AttemptId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ExamAttemptQuestionConfiguration : IEntityTypeConfiguration<ExamAttemptQuestion>
{
    public void Configure(EntityTypeBuilder<ExamAttemptQuestion> b)
    {
        b.HasKey(x => new { x.AttemptId, x.QuestionId });
        b.HasIndex(x => new { x.AttemptId, x.Position }).IsUnique();
        b.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<Answer>().WithMany().HasForeignKey(x => x.SelectedAnswerId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class BookmarkConfiguration : IEntityTypeConfiguration<Bookmark>
{
    public void Configure(EntityTypeBuilder<Bookmark> b)
    {
        b.HasKey(x => new { x.UserId, x.QuestionId });
        b.HasIndex(x => new { x.UserId, x.CreatedAt });
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class UserQuestionStatConfiguration : IEntityTypeConfiguration<UserQuestionStat>
{
    public void Configure(EntityTypeBuilder<UserQuestionStat> b)
    {
        b.HasKey(x => new { x.UserId, x.QuestionId });
        b.HasIndex(x => new { x.UserId, x.LastWasCorrect, x.LastSeenAt });
        b.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Question).WithMany().HasForeignKey(x => x.QuestionId).OnDelete(DeleteBehavior.Cascade);
    }
}
