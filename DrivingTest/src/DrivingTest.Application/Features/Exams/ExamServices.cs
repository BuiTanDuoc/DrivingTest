using System.Linq.Expressions;
using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Questions;
using DrivingTest.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Exams;

/// <summary>Chọn câu hỏi cho một đề thi theo cơ cấu cấu hình trong appsettings.</summary>
public sealed class ExamComposer(IAppDbContext db, IOptions<ExamOptions> options)
{
    private sealed record Candidate(int Id, int TopicId, bool IsCritical);

    public async Task<int[]> ComposeAsync(CancellationToken ct)
    {
        var opt = options.Value;
        var codes = opt.TopicQuota.Keys.ToList();
        var topics = await db.Topics.AsNoTracking()
            .Where(t => codes.Contains(t.Code))
            .Select(t => new { t.Id, t.Code })
            .ToListAsync(ct);

        // 1. Lấy ngẫu nhiên theo từng chủ đề.
        var picked = new List<Candidate>();
        foreach (var topic in topics)
        {
            var topicId = topic.Id;
            picked.AddRange(await RandomAsync(q => q.TopicId == topicId, opt.TopicQuota[topic.Code], ct));
        }

        // 2. Đảm bảo đủ số câu điểm liệt tối thiểu: thay câu thường (ở chủ đề đang nhiều câu nhất) bằng câu điểm liệt.
        var missing = opt.MinCriticalQuestions - picked.Count(p => p.IsCritical);
        if (missing > 0)
        {
            var pickedIds = picked.Select(p => p.Id).ToList();
            var extra = await RandomAsync(q => q.IsCritical && !pickedIds.Contains(q.Id), missing, ct);
            foreach (var e in extra)
            {
                var victim = picked.Where(p => !p.IsCritical)
                    .GroupBy(p => p.TopicId)
                    .OrderByDescending(g => g.Count())
                    .Select(g => g.First())
                    .FirstOrDefault();
                if (victim is null) break;
                picked.Remove(victim);
                picked.Add(e);
            }
        }

        // 3. Chủ đề thiếu câu → bù từ các câu còn lại.
        var shortBy = opt.TotalQuestions - picked.Count;
        if (shortBy > 0)
        {
            var takenIds = picked.Select(p => p.Id).ToList();
            picked.AddRange(await RandomAsync(q => !takenIds.Contains(q.Id), shortBy, ct));
        }

        if (picked.Count < opt.TotalQuestions)
            throw new ConflictException(
                $"The question bank only has {picked.Count} usable questions; {opt.TotalQuestions} are required.");

        var ids = picked.Take(opt.TotalQuestions).Select(p => p.Id).ToArray();
        Random.Shared.Shuffle(ids);
        return ids;
    }

    private async Task<List<Candidate>> RandomAsync(Expression<Func<Question, bool>> filter, int take, CancellationToken ct)
    {
        var rows = await db.Questions.AsNoTracking()
            .Where(q => q.IsActive)
            .Where(filter)
            .OrderBy(_ => Guid.NewGuid()) // NEWID() trên SQL Server
            .Take(take)
            .Select(q => new { q.Id, q.TopicId, q.IsCritical })
            .ToListAsync(ct);
        return rows.Select(r => new Candidate(r.Id, r.TopicId, r.IsCritical)).ToList();
    }
}

/// <summary>Chấm điểm bài thi ở server. Đáp án đúng không bao giờ gửi xuống client khi đang thi.</summary>
public sealed class ExamGrader(IAppDbContext db, StudyStatsRecorder recorder, IOptions<ExamOptions> options)
{
    public async Task GradeAsync(ExamAttempt attempt, ExamStatus finalStatus, DateTime now, CancellationToken ct)
    {
        // Nạp (hoặc lấy lại từ tracker) toàn bộ câu của bài thi; EF tự gắn vào attempt.Questions.
        await db.ExamAttemptQuestions.Where(x => x.AttemptId == attempt.Id).LoadAsync(ct);

        var ids = attempt.Questions.Select(x => x.QuestionId).ToList();
        var correctAnswerIds = (await db.Answers.AsNoTracking()
            .Where(a => a.IsCorrect && ids.Contains(a.QuestionId))
            .Select(a => a.Id)
            .ToListAsync(ct)).ToHashSet();
        var criticalIds = (await db.Questions.AsNoTracking()
            .Where(q => q.IsCritical && ids.Contains(q.Id))
            .Select(q => q.Id)
            .ToListAsync(ct)).ToHashSet();

        foreach (var q in attempt.Questions)
            q.IsCorrect = q.SelectedAnswerId is int answerId && correctAnswerIds.Contains(answerId);

        attempt.Score = attempt.Questions.Count(q => q.IsCorrect == true);
        // Sai (hoặc bỏ trống) bất kỳ câu điểm liệt nào là trượt.
        attempt.FailedByCritical = attempt.Questions.Any(q => q.IsCorrect != true && criticalIds.Contains(q.QuestionId));
        attempt.Passed = attempt.Score >= attempt.PassScore && !attempt.FailedByCritical;
        attempt.Status = finalStatus;
        // Thời điểm nộp không được vượt quá hạn nộp.
        attempt.SubmittedAt = now < attempt.ExpiresAt ? now : attempt.ExpiresAt;

        await recorder.RecordAsync(
            attempt.UserId,
            attempt.Questions.Select(q => (q.QuestionId, q.IsCorrect == true)).ToList(),
            ct);
    }

    /// <summary>Nếu bài đã quá hạn thì chấm luôn (Expired) và trả true.</summary>
    public async Task<bool> ExpireIfOverdueAsync(ExamAttempt attempt, DateTime now, CancellationToken ct, bool ignoreGrace = false)
    {
        if (attempt.Status != ExamStatus.InProgress) return false;

        var deadline = ignoreGrace
            ? attempt.ExpiresAt
            : attempt.ExpiresAt.AddSeconds(options.Value.SubmitGraceSeconds);
        if (now <= deadline) return false;

        await GradeAsync(attempt, ExamStatus.Expired, now, ct);
        await SaveOrIgnoreConflictAsync(ct);
        return true;
    }

    /// <summary>Có thể có 2 luồng cùng chấm (client nộp + job quét); RowVersion chặn bên thua, ta bỏ qua.</summary>
    public async Task SaveOrIgnoreConflictAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();
        }
    }
}

/// <summary>Dựng DTO bài thi đang làm và DTO kết quả.</summary>
public sealed class ExamReader(IAppDbContext db, TimeProvider clock)
{
    public async Task<ExamDto> GetInProgressAsync(Guid attemptId, Guid userId, string lang, CancellationToken ct)
    {
        var attempt = await db.ExamAttempts.AsNoTracking()
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId, ct)
            ?? throw new NotFoundException("Exam", attemptId);

        if (attempt.Status != ExamStatus.InProgress) throw new ConflictException("The exam is already finished.");

        var ids = attempt.Questions.Select(x => x.QuestionId).ToList();
        var content = await db.Questions.AsNoTracking()
            .Where(q => ids.Contains(q.Id))
            .WithContent(lang)
            .ToDictionaryAsync(q => q.Id, ct);

        var questions = attempt.Questions.OrderBy(x => x.Position).Select(x =>
        {
            var q = content[x.QuestionId];
            return new ExamQuestionDto(
                x.Position, x.QuestionId, q.ImageUrl, QuestionMapper.TextOf(q, lang),
                QuestionMapper.AnswersOf(q, lang), x.SelectedAnswerId, x.IsFlagged);
        }).ToList();

        return new ExamDto(
            attempt.Id, attempt.StartedAt, attempt.ExpiresAt, clock.GetUtcNow().UtcDateTime,
            attempt.TotalQuestions, questions);
    }

    public async Task<ExamResultDto> GetResultAsync(Guid attemptId, Guid userId, string lang, CancellationToken ct)
    {
        var attempt = await db.ExamAttempts.AsNoTracking()
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == attemptId && a.UserId == userId, ct)
            ?? throw new NotFoundException("Exam", attemptId);

        if (attempt.Status == ExamStatus.InProgress) throw new ConflictException("The exam is still in progress.");

        var ids = attempt.Questions.Select(x => x.QuestionId).ToList();
        var content = await db.Questions.AsNoTracking()
            .Where(q => ids.Contains(q.Id))
            .WithContent(lang)
            .ToDictionaryAsync(q => q.Id, ct);

        var questions = attempt.Questions.OrderBy(x => x.Position).Select(x =>
        {
            var q = content[x.QuestionId];
            var answers = q.Answers.OrderBy(a => a.SortOrder)
                .Select(a => new ResultAnswerDto(a.Id, Languages.Pick(a.Translations, lang)?.Text ?? "", a.IsCorrect))
                .ToList();
            return new ExamResultQuestionDto(
                x.Position, x.QuestionId, q.IsCritical, q.ImageUrl, QuestionMapper.TextOf(q, lang),
                QuestionMapper.ExplanationOf(q, lang), answers, x.SelectedAnswerId,
                x.IsCorrect == true, x.IsFlagged);
        }).ToList();

        var submittedAt = attempt.SubmittedAt ?? attempt.ExpiresAt;
        return new ExamResultDto(
            attempt.Id, attempt.Status, attempt.StartedAt, submittedAt,
            (int)(submittedAt - attempt.StartedAt).TotalSeconds,
            attempt.Score ?? 0, attempt.TotalQuestions, attempt.PassScore,
            attempt.Passed ?? false, attempt.FailedByCritical, questions);
    }
}
