using DrivingTest.Application.Common;
using DrivingTest.Domain;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Exams;

/// <summary>
/// Bắt đầu thi. Nếu người dùng đang có một bài chưa hết giờ thì trả lại chính bài đó (tiếp tục làm),
/// tránh sinh ra hàng loạt bài dở dang.
/// </summary>
public sealed record StartExamCommand(Guid UserId, string Lang) : ICommand<ExamDto>;

public sealed class StartExamHandler(
    IAppDbContext db, IOptions<ExamOptions> options, TimeProvider clock,
    ExamComposer composer, ExamGrader grader, ExamReader reader)
    : ICommandHandler<StartExamCommand, ExamDto>
{
    public async ValueTask<ExamDto> Handle(StartExamCommand cmd, CancellationToken ct)
    {
        var opt = options.Value;
        var lang = Languages.Normalize(cmd.Lang);
        var now = clock.GetUtcNow().UtcDateTime;

        var active = await db.ExamAttempts
            .Where(a => a.UserId == cmd.UserId && a.Status == ExamStatus.InProgress)
            .OrderByDescending(a => a.StartedAt)
            .FirstOrDefaultAsync(ct);

        if (active is not null && !await grader.ExpireIfOverdueAsync(active, now, ct, ignoreGrace: true))
            return await reader.GetInProgressAsync(active.Id, cmd.UserId, lang, ct);

        var questionIds = await composer.ComposeAsync(ct);

        var attempt = new ExamAttempt
        {
            Id = Guid.CreateVersion7(),
            UserId = cmd.UserId,
            StartedAt = now,
            ExpiresAt = now.AddMinutes(opt.DurationMinutes),
            Status = ExamStatus.InProgress,
            TotalQuestions = questionIds.Length,
            PassScore = opt.PassScore,
            Questions = questionIds
                .Select((id, i) => new ExamAttemptQuestion { QuestionId = id, Position = i + 1 })
                .ToList()
        };

        db.ExamAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);

        return await reader.GetInProgressAsync(attempt.Id, cmd.UserId, lang, ct);
    }
}
