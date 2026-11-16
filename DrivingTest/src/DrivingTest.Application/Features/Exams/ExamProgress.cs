using DrivingTest.Application.Common;
using DrivingTest.Domain;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Exams;

// ---------- Bài đang làm dở ----------
public sealed record GetActiveExamQuery(Guid UserId, string Lang) : IQuery<ExamDto?>;

public sealed class GetActiveExamHandler(IAppDbContext db, TimeProvider clock, ExamGrader grader, ExamReader reader)
    : IQueryHandler<GetActiveExamQuery, ExamDto?>
{
    public async ValueTask<ExamDto?> Handle(GetActiveExamQuery q, CancellationToken ct)
    {
        var lang = Languages.Normalize(q.Lang);
        var attempt = await db.ExamAttempts
            .Where(a => a.UserId == q.UserId && a.Status == ExamStatus.InProgress)
            .OrderByDescending(a => a.StartedAt)
            .FirstOrDefaultAsync(ct);

        if (attempt is null) return null;
        if (await grader.ExpireIfOverdueAsync(attempt, clock.GetUtcNow().UtcDateTime, ct, ignoreGrace: true)) return null;

        return await reader.GetInProgressAsync(attempt.Id, q.UserId, lang, ct);
    }
}

// ---------- Lấy lại bài thi để làm tiếp (sau F5) ----------
public sealed record GetExamQuery(Guid UserId, Guid AttemptId, string Lang) : IQuery<ExamDto>;

public sealed class GetExamHandler(IAppDbContext db, TimeProvider clock, ExamGrader grader, ExamReader reader)
    : IQueryHandler<GetExamQuery, ExamDto>
{
    public async ValueTask<ExamDto> Handle(GetExamQuery q, CancellationToken ct)
    {
        var lang = Languages.Normalize(q.Lang);
        var attempt = await db.ExamAttempts.FirstOrDefaultAsync(a => a.Id == q.AttemptId && a.UserId == q.UserId, ct)
                      ?? throw new NotFoundException("Exam", q.AttemptId);

        if (await grader.ExpireIfOverdueAsync(attempt, clock.GetUtcNow().UtcDateTime, ct))
            throw new ConflictException("The exam time is over. Fetch the result instead.");

        return await reader.GetInProgressAsync(q.AttemptId, q.UserId, lang, ct);
    }
}

// ---------- Lưu đáp án / đánh dấu nghi ngờ (autosave) ----------
public sealed record SaveAnswerCommand(Guid UserId, Guid AttemptId, int QuestionId, int? AnswerId, bool IsFlagged)
    : ICommand<Unit>;

public sealed class SaveAnswerHandler(IAppDbContext db, TimeProvider clock, ExamGrader grader)
    : ICommandHandler<SaveAnswerCommand, Unit>
{
    public async ValueTask<Unit> Handle(SaveAnswerCommand cmd, CancellationToken ct)
    {
        var attempt = await db.ExamAttempts.FirstOrDefaultAsync(a => a.Id == cmd.AttemptId && a.UserId == cmd.UserId, ct)
                      ?? throw new NotFoundException("Exam", cmd.AttemptId);

        if (attempt.Status != ExamStatus.InProgress) throw new ConflictException("The exam is already finished.");
        if (await grader.ExpireIfOverdueAsync(attempt, clock.GetUtcNow().UtcDateTime, ct))
            throw new ConflictException("The exam time is over.");

        var item = await db.ExamAttemptQuestions
            .FirstOrDefaultAsync(x => x.AttemptId == cmd.AttemptId && x.QuestionId == cmd.QuestionId, ct)
            ?? throw new BadRequestException("The question is not part of this exam.");

        if (cmd.AnswerId is int answerId &&
            !await db.Answers.AnyAsync(a => a.Id == answerId && a.QuestionId == cmd.QuestionId, ct))
            throw new BadRequestException("The answer does not belong to this question.");

        item.SelectedAnswerId = cmd.AnswerId;
        item.IsFlagged = cmd.IsFlagged;
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

// ---------- Nộp bài ----------
public sealed record SubmitExamCommand(Guid UserId, Guid AttemptId, string Lang) : ICommand<ExamResultDto>;

public sealed class SubmitExamHandler(
    IAppDbContext db, IOptions<ExamOptions> options, TimeProvider clock, ExamGrader grader, ExamReader reader)
    : ICommandHandler<SubmitExamCommand, ExamResultDto>
{
    public async ValueTask<ExamResultDto> Handle(SubmitExamCommand cmd, CancellationToken ct)
    {
        var lang = Languages.Normalize(cmd.Lang);
        var attempt = await db.ExamAttempts.FirstOrDefaultAsync(a => a.Id == cmd.AttemptId && a.UserId == cmd.UserId, ct)
                      ?? throw new NotFoundException("Exam", cmd.AttemptId);

        // Idempotent: đã chấm rồi thì chỉ trả lại kết quả.
        if (attempt.Status == ExamStatus.InProgress)
        {
            var now = clock.GetUtcNow().UtcDateTime;
            var overdue = now > attempt.ExpiresAt.AddSeconds(options.Value.SubmitGraceSeconds);
            await grader.GradeAsync(attempt, overdue ? ExamStatus.Expired : ExamStatus.Submitted, now, ct);
            await grader.SaveOrIgnoreConflictAsync(ct);
        }

        return await reader.GetResultAsync(cmd.AttemptId, cmd.UserId, lang, ct);
    }
}

// ---------- Xem kết quả ----------
public sealed record GetExamResultQuery(Guid UserId, Guid AttemptId, string Lang) : IQuery<ExamResultDto>;

public sealed class GetExamResultHandler(ExamReader reader) : IQueryHandler<GetExamResultQuery, ExamResultDto>
{
    public async ValueTask<ExamResultDto> Handle(GetExamResultQuery q, CancellationToken ct)
        => await reader.GetResultAsync(q.AttemptId, q.UserId, Languages.Normalize(q.Lang), ct);
}

// ---------- Lịch sử ----------
public sealed record GetExamHistoryQuery(Guid UserId, int Page, int PageSize) : IQuery<PagedResult<ExamSummaryDto>>;

public sealed class GetExamHistoryValidator : AbstractValidator<GetExamHistoryQuery>
{
    public GetExamHistoryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, Paging.MaxPageSize);
    }
}

public sealed class GetExamHistoryHandler(IAppDbContext db)
    : IQueryHandler<GetExamHistoryQuery, PagedResult<ExamSummaryDto>>
{
    public async ValueTask<PagedResult<ExamSummaryDto>> Handle(GetExamHistoryQuery q, CancellationToken ct)
    {
        var query = db.ExamAttempts.AsNoTracking()
            .Where(a => a.UserId == q.UserId && a.Status != ExamStatus.InProgress);

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(a => a.StartedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .ToListAsync(ct);

        return new PagedResult<ExamSummaryDto>(rows.Select(ExamMapper.ToSummary).ToList(), q.Page, q.PageSize, total);
    }
}

// ---------- Job quét bài quá hạn (gọi từ BackgroundService) ----------
public sealed record ExpireOverdueExamsCommand : ICommand<int>;

public sealed class ExpireOverdueExamsHandler(
    IAppDbContext db, IOptions<ExamOptions> options, TimeProvider clock, ExamGrader grader)
    : ICommandHandler<ExpireOverdueExamsCommand, int>
{
    public async ValueTask<int> Handle(ExpireOverdueExamsCommand cmd, CancellationToken ct)
    {
        var opt = options.Value;
        var now = clock.GetUtcNow().UtcDateTime;
        var cutoff = now.AddSeconds(-opt.SubmitGraceSeconds);

        var overdue = await db.ExamAttempts
            .Where(a => a.Status == ExamStatus.InProgress && a.ExpiresAt < cutoff)
            .OrderBy(a => a.ExpiresAt)
            .Take(opt.ExpirationBatchSize)
            .ToListAsync(ct);

        foreach (var attempt in overdue)
            await grader.GradeAsync(attempt, ExamStatus.Expired, now, ct);

        if (overdue.Count > 0) await grader.SaveOrIgnoreConflictAsync(ct);
        return overdue.Count;
    }
}
