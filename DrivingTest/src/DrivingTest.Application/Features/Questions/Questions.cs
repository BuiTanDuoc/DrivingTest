using DrivingTest.Application.Common;
using DrivingTest.Domain;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;

namespace DrivingTest.Application.Features.Questions;

public sealed record AnswerDto(int Id, string Text);

public sealed record QuestionDto(
    int Id, int Number, int TopicId, string TopicCode, bool IsCritical, string? ImageUrl,
    string Text, List<AnswerDto> Answers, bool IsBookmarked);

public static class QuestionQueries
{
    /// <summary>Nạp chủ đề, bản dịch (đúng ngôn ngữ + tiếng Việt để fallback) và đáp án.</summary>
    public static IQueryable<Question> WithContent(this IQueryable<Question> query, string lang) =>
        query
            .Include(x => x.Topic)
            .Include(x => x.Translations.Where(t => t.Lang == lang || t.Lang == Languages.Default))
            .Include(x => x.Answers.OrderBy(a => a.SortOrder))
                .ThenInclude(a => a.Translations.Where(t => t.Lang == lang || t.Lang == Languages.Default))
            .AsSplitQuery();
}

/// <summary>Mapping thủ công (không AutoMapper).</summary>
public static class QuestionMapper
{
    public static string TextOf(Question q, string lang) => Languages.Pick(q.Translations, lang)?.Text ?? "";

    public static string ExplanationOf(Question q, string lang) => Languages.Pick(q.Translations, lang)?.Explanation ?? "";

    public static List<AnswerDto> AnswersOf(Question q, string lang) =>
        q.Answers.OrderBy(a => a.SortOrder)
            .Select(a => new AnswerDto(a.Id, Languages.Pick(a.Translations, lang)?.Text ?? ""))
            .ToList();

    public static QuestionDto ToDto(Question q, string lang, bool bookmarked) =>
        new(q.Id, q.Number, q.TopicId, q.Topic.Code, q.IsCritical, q.ImageUrl,
            TextOf(q, lang), AnswersOf(q, lang), bookmarked);

    /// <summary>Nạp các câu hỏi theo danh sách id, giữ nguyên thứ tự của <paramref name="ids"/>.</summary>
    public static async Task<List<QuestionDto>> LoadByIdsAsync(
        IAppDbContext db, List<int> ids, string lang, Guid? userId, CancellationToken ct)
    {
        if (ids.Count == 0) return [];

        var questions = await db.Questions.AsNoTracking()
            .Where(q => ids.Contains(q.Id))
            .WithContent(lang)
            .ToDictionaryAsync(q => q.Id, ct);

        var bookmarked = new HashSet<int>();
        if (userId is { } uid)
        {
            bookmarked = (await db.Bookmarks.AsNoTracking()
                .Where(b => b.UserId == uid && ids.Contains(b.QuestionId))
                .Select(b => b.QuestionId)
                .ToListAsync(ct)).ToHashSet();
        }

        return ids.Where(questions.ContainsKey)
            .Select(id => ToDto(questions[id], lang, bookmarked.Contains(id)))
            .ToList();
    }
}

// ---------- Danh sách câu hỏi (chế độ học) — KHÔNG trả đáp án đúng ----------
public sealed record GetQuestionsQuery(
    Guid? UserId, int? TopicId, string? Search, bool CriticalOnly, int Page, int PageSize, string Lang)
    : IQuery<PagedResult<QuestionDto>>;

public sealed class GetQuestionsValidator : AbstractValidator<GetQuestionsQuery>
{
    public GetQuestionsValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, Paging.MaxPageSize);
        RuleFor(x => x.Search).MaximumLength(100);
    }
}

public sealed class GetQuestionsHandler(IAppDbContext db)
    : IQueryHandler<GetQuestionsQuery, PagedResult<QuestionDto>>
{
    public async ValueTask<PagedResult<QuestionDto>> Handle(GetQuestionsQuery q, CancellationToken ct)
    {
        var lang = Languages.Normalize(q.Lang);
        var query = db.Questions.AsNoTracking().Where(x => x.IsActive);

        if (q.TopicId is { } topicId) query = query.Where(x => x.TopicId == topicId);
        if (q.CriticalOnly) query = query.Where(x => x.IsCritical);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = int.TryParse(s, out var number)
                ? query.Where(x => x.Number == number || x.Translations.Any(t => t.Text.Contains(s)))
                : query.Where(x => x.Translations.Any(t => t.Text.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var ids = await query.OrderBy(x => x.Number)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(x => x.Id)
            .ToListAsync(ct);

        var items = await QuestionMapper.LoadByIdsAsync(db, ids, lang, q.UserId, ct);
        return new PagedResult<QuestionDto>(items, q.Page, q.PageSize, total);
    }
}

// ---------- Kiểm tra đáp án (chế độ học) ----------
public sealed record CheckAnswerResult(bool IsCorrect, int CorrectAnswerId, string Explanation);

public sealed record CheckAnswerCommand(Guid? UserId, int QuestionId, int AnswerId, string Lang)
    : ICommand<CheckAnswerResult>;

public sealed class CheckAnswerHandler(IAppDbContext db, StudyStatsRecorder recorder)
    : ICommandHandler<CheckAnswerCommand, CheckAnswerResult>
{
    public async ValueTask<CheckAnswerResult> Handle(CheckAnswerCommand cmd, CancellationToken ct)
    {
        var lang = Languages.Normalize(cmd.Lang);

        var question = await db.Questions.AsNoTracking()
            .Include(x => x.Answers)
            .Include(x => x.Translations.Where(t => t.Lang == lang || t.Lang == Languages.Default))
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == cmd.QuestionId && x.IsActive, ct)
            ?? throw new NotFoundException("Question", cmd.QuestionId);

        var selected = question.Answers.FirstOrDefault(a => a.Id == cmd.AnswerId)
            ?? throw new BadRequestException("The answer does not belong to this question.");
        var correct = question.Answers.FirstOrDefault(a => a.IsCorrect)
            ?? throw new ConflictException("The question has no correct answer configured.");

        if (cmd.UserId is { } userId)
        {
            await recorder.RecordAsync(userId, [(question.Id, selected.IsCorrect)], ct);
            await db.SaveChangesAsync(ct);
        }

        return new CheckAnswerResult(selected.IsCorrect, correct.Id, QuestionMapper.ExplanationOf(question, lang));
    }
}

// ---------- Ôn lại câu sai ----------
public sealed record GetReviewQuestionsQuery(Guid UserId, int Page, int PageSize, string Lang)
    : IQuery<PagedResult<QuestionDto>>;

public sealed class GetReviewQuestionsValidator : AbstractValidator<GetReviewQuestionsQuery>
{
    public GetReviewQuestionsValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, Paging.MaxPageSize);
    }
}

public sealed class GetReviewQuestionsHandler(IAppDbContext db)
    : IQueryHandler<GetReviewQuestionsQuery, PagedResult<QuestionDto>>
{
    public async ValueTask<PagedResult<QuestionDto>> Handle(GetReviewQuestionsQuery q, CancellationToken ct)
    {
        var lang = Languages.Normalize(q.Lang);

        // "Câu sai" = lần làm gần nhất của người dùng cho câu đó là sai.
        var query = db.UserQuestionStats.AsNoTracking()
            .Where(s => s.UserId == q.UserId && !s.LastWasCorrect && s.Question.IsActive);

        var total = await query.CountAsync(ct);
        var ids = await query.OrderByDescending(s => s.LastSeenAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(s => s.QuestionId)
            .ToListAsync(ct);

        var items = await QuestionMapper.LoadByIdsAsync(db, ids, lang, q.UserId, ct);
        return new PagedResult<QuestionDto>(items, q.Page, q.PageSize, total);
    }
}

// ---------- Ghi nhận thống kê theo câu (dùng chung cho học và thi) ----------
public sealed class StudyStatsRecorder(IAppDbContext db, TimeProvider clock)
{
    /// <summary>Cập nhật/ tạo UserQuestionStat. Không SaveChanges: caller lưu để đảm bảo cùng một transaction.</summary>
    public async Task RecordAsync(Guid userId, IReadOnlyCollection<(int QuestionId, bool Correct)> results, CancellationToken ct)
    {
        if (results.Count == 0) return;

        var now = clock.GetUtcNow().UtcDateTime;
        var ids = results.Select(r => r.QuestionId).Distinct().ToList();
        var existing = await db.UserQuestionStats
            .Where(s => s.UserId == userId && ids.Contains(s.QuestionId))
            .ToDictionaryAsync(s => s.QuestionId, ct);

        foreach (var (questionId, correct) in results)
        {
            if (!existing.TryGetValue(questionId, out var stat))
            {
                stat = new UserQuestionStat { UserId = userId, QuestionId = questionId };
                db.UserQuestionStats.Add(stat);
                existing[questionId] = stat;
            }

            if (correct) stat.CorrectCount++; else stat.WrongCount++;
            stat.LastWasCorrect = correct;
            stat.LastSeenAt = now;
        }
    }
}
