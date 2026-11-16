using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Exams;
using DrivingTest.Application.Features.Questions;
using DrivingTest.Domain;
using DrivingTest.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Tests;

public class ExamGraderTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly DateTime Start = new(2026, 1, 1, 8, 0, 0, DateTimeKind.Utc);

    private static (AppDbContext Db, ExamGrader Grader) Create(int passScore = 2)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        var grader = new ExamGrader(
            db,
            new StudyStatsRecorder(db, TimeProvider.System),
            Options.Create(new ExamOptions { SubmitGraceSeconds = 15, PassScore = passScore }));
        return (db, grader);
    }

    /// <summary>Tạo 3 câu: câu 1 thường, câu 2 thường, câu 3 điểm liệt. Đáp án đúng luôn là answer thứ nhất.</summary>
    private static async Task<ExamAttempt> SeedAttemptAsync(AppDbContext db, int?[] pickedIndexes, int passScore = 2)
    {
        var topic = new Topic { Code = "rules" };
        db.Topics.Add(topic);

        var questions = new List<Question>();
        for (var i = 1; i <= 3; i++)
        {
            var q = new Question
            {
                Number = i,
                Topic = topic,
                IsCritical = i == 3,
                Answers =
                [
                    new Answer { IsCorrect = true, SortOrder = 1 },
                    new Answer { IsCorrect = false, SortOrder = 2 }
                ]
            };
            questions.Add(q);
            db.Questions.Add(q);
        }

        var attempt = new ExamAttempt
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            StartedAt = Start,
            ExpiresAt = Start.AddMinutes(19),
            Status = ExamStatus.InProgress,
            TotalQuestions = 3,
            PassScore = passScore
        };
        db.ExamAttempts.Add(attempt);
        await db.SaveChangesAsync();

        for (var i = 0; i < 3; i++)
        {
            attempt.Questions.Add(new ExamAttemptQuestion
            {
                QuestionId = questions[i].Id,
                Position = i + 1,
                SelectedAnswerId = pickedIndexes[i] is int idx ? questions[i].Answers[idx].Id : null
            });
        }

        await db.SaveChangesAsync();
        return attempt;
    }

    [Fact]
    public async Task AllCorrect_Passes()
    {
        var (db, grader) = Create();
        var attempt = await SeedAttemptAsync(db, [0, 0, 0]);

        await grader.GradeAsync(attempt, ExamStatus.Submitted, Start.AddMinutes(10), CancellationToken.None);

        Assert.Equal(3, attempt.Score);
        Assert.True(attempt.Passed);
        Assert.False(attempt.FailedByCritical);
        Assert.Equal(Start.AddMinutes(10), attempt.SubmittedAt);
    }

    [Fact]
    public async Task WrongCriticalQuestion_FailsEvenWithEnoughScore()
    {
        var (db, grader) = Create();
        var attempt = await SeedAttemptAsync(db, [0, 0, 1]); // 2/3 đúng nhưng sai câu điểm liệt

        await grader.GradeAsync(attempt, ExamStatus.Submitted, Start.AddMinutes(10), CancellationToken.None);

        Assert.Equal(2, attempt.Score);
        Assert.True(attempt.FailedByCritical);
        Assert.False(attempt.Passed);
    }

    [Fact]
    public async Task UnansweredCriticalQuestion_CountsAsWrong()
    {
        var (db, grader) = Create();
        var attempt = await SeedAttemptAsync(db, [0, 0, null]);

        await grader.GradeAsync(attempt, ExamStatus.Submitted, Start.AddMinutes(10), CancellationToken.None);

        Assert.True(attempt.FailedByCritical);
        Assert.False(attempt.Passed);
    }

    [Fact]
    public async Task OverdueAttempt_IsExpiredAndSubmittedAtIsCappedAtDeadline()
    {
        var (db, grader) = Create();
        var attempt = await SeedAttemptAsync(db, [0, 0, 0]);

        var expired = await grader.ExpireIfOverdueAsync(attempt, Start.AddMinutes(30), CancellationToken.None);

        Assert.True(expired);
        Assert.Equal(ExamStatus.Expired, attempt.Status);
        Assert.Equal(attempt.ExpiresAt, attempt.SubmittedAt);
    }

    [Fact]
    public async Task AttemptWithinGraceWindow_IsNotExpired()
    {
        var (db, grader) = Create();
        var attempt = await SeedAttemptAsync(db, [0, 0, 0]);

        var expired = await grader.ExpireIfOverdueAsync(
            attempt, attempt.ExpiresAt.AddSeconds(5), CancellationToken.None);

        Assert.False(expired);
        Assert.Equal(ExamStatus.InProgress, attempt.Status);
    }

    [Fact]
    public async Task Grading_RecordsLastResultPerQuestion()
    {
        var (db, grader) = Create();
        var attempt = await SeedAttemptAsync(db, [0, 1, 0]);

        await grader.GradeAsync(attempt, ExamStatus.Submitted, Start.AddMinutes(5), CancellationToken.None);
        await db.SaveChangesAsync();

        var wrong = await db.UserQuestionStats.Where(s => !s.LastWasCorrect).ToListAsync();
        Assert.Single(wrong);
        Assert.Equal(3, await db.UserQuestionStats.CountAsync());
    }
}
