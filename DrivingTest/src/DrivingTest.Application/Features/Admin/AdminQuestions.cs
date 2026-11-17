using DrivingTest.Application.Common;
using DrivingTest.Domain;
using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace DrivingTest.Application.Features.Admin;

// ======================= DTO =======================
public sealed record QuestionTextInput(string Text, string? Explanation);

/// <summary>Đáp án: Id = null nghĩa là đáp án mới. Texts: mã ngôn ngữ → nội dung.</summary>
public sealed record AnswerInput(int? Id, bool IsCorrect, Dictionary<string, string> Texts);

public sealed record QuestionInput(
    int Number, int TopicId, bool IsCritical, bool IsActive, string? ImageUrl,
    Dictionary<string, QuestionTextInput> Texts, List<AnswerInput> Answers);

public sealed record AdminQuestionDto(
    int Id, int Number, int TopicId, string TopicCode, bool IsCritical, bool IsActive, string? ImageUrl,
    Dictionary<string, QuestionTextInput> Texts, List<AnswerInput> Answers);

public sealed record AdminQuestionListItemDto(
    int Id, int Number, int TopicId, string TopicCode, bool IsCritical, bool IsActive,
    bool HasImage, int AnswerCount, string Text);

public sealed record DeleteQuestionResult(bool Deleted, bool Deactivated);

// ======================= Validation =======================
public sealed class QuestionInputValidator : AbstractValidator<QuestionInput>
{
    public const int MaxAnswers = 6;

    public QuestionInputValidator()
    {
        RuleFor(x => x.Number).GreaterThanOrEqualTo(1);
        RuleFor(x => x.TopicId).GreaterThan(0);

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500)
            .Must(u => u!.StartsWith('/') || Uri.TryCreate(u, UriKind.Absolute, out var uri) && (uri.Scheme is "http" or "https"))
            .When(x => !string.IsNullOrWhiteSpace(x.ImageUrl))
            .WithMessage("ImageUrl must be an http(s) URL or a path starting with '/'.");

        RuleFor(x => x).Custom((q, ctx) =>
        {
            void Fail(string property, string message) => ctx.AddFailure(property, message);

            // ---- Nội dung câu hỏi ----
            if (q.Texts is null || !q.Texts.TryGetValue("vi", out var vi) || string.IsNullOrWhiteSpace(vi?.Text))
                Fail("Texts", "Vietnamese question text is required.");

            foreach (var (lang, text) in q.Texts ?? new Dictionary<string, QuestionTextInput>())
            {
                if (!Languages.Supported.Contains(lang)) Fail("Texts", $"Unsupported language '{lang}'.");
                if ((text?.Text?.Length ?? 0) > 2000) Fail("Texts", "Question text is too long (max 2000).");
                if ((text?.Explanation?.Length ?? 0) > 4000) Fail("Texts", "Explanation is too long (max 4000).");
            }

            // ---- Đáp án: 2..6 đáp án, mỗi đáp án có tiếng Việt, đúng một đáp án đúng ----
            if (q.Answers is null || q.Answers.Count < 2 || q.Answers.Count > MaxAnswers)
            {
                Fail("Answers", $"A question needs between 2 and {MaxAnswers} answers.");
                return;
            }

            foreach (var a in q.Answers)
            {
                if (a.Texts is null || !a.Texts.TryGetValue("vi", out var t) || string.IsNullOrWhiteSpace(t))
                    Fail("Answers", "Every answer needs Vietnamese text.");
                foreach (var (lang, text) in a.Texts ?? new Dictionary<string, string>())
                {
                    if (!Languages.Supported.Contains(lang)) Fail("Answers", $"Unsupported language '{lang}'.");
                    if ((text?.Length ?? 0) > 1000) Fail("Answers", "Answer text is too long (max 1000).");
                }
            }

            if (q.Answers.Count(a => a.IsCorrect) != 1) Fail("Answers", "Exactly one answer must be marked correct.");
        });
    }
}

public sealed class CreateQuestionValidator : AbstractValidator<CreateQuestionCommand>
{
    public CreateQuestionValidator() => RuleFor(x => x.Input).NotNull().SetValidator(new QuestionInputValidator());
}

public sealed class UpdateQuestionValidator : AbstractValidator<UpdateQuestionCommand>
{
    public UpdateQuestionValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.Input).NotNull().SetValidator(new QuestionInputValidator());
    }
}

// ======================= Helpers =======================
internal static class AdminQuestionSupport
{
    public static AdminQuestionDto ToDto(Question q) => new(
        q.Id, q.Number, q.TopicId, q.Topic.Code, q.IsCritical, q.IsActive, q.ImageUrl,
        q.Translations.ToDictionary(t => t.Lang, t => new QuestionTextInput(t.Text, t.Explanation)),
        q.Answers.OrderBy(a => a.SortOrder)
            .Select(a => new AnswerInput(a.Id, a.IsCorrect, a.Translations.ToDictionary(t => t.Lang, t => t.Text)))
            .ToList());

    public static async Task<AdminQuestionDto> LoadAsync(IAppDbContext db, int id, CancellationToken ct)
    {
        var q = await db.Questions.AsNoTracking()
            .Include(x => x.Topic)
            .Include(x => x.Translations)
            .Include(x => x.Answers).ThenInclude(a => a.Translations)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new NotFoundException("Question", id);
        return ToDto(q);
    }

    /// <summary>Chủ đề phải tồn tại và số câu không được trùng câu khác.</summary>
    public static async Task EnsureReferencesAsync(IAppDbContext db, QuestionInput input, int? excludeId, CancellationToken ct)
    {
        if (!await db.Topics.AnyAsync(t => t.Id == input.TopicId, ct))
            throw new BadRequestException("The topic does not exist.");
        if (await db.Questions.AnyAsync(x => x.Number == input.Number && x.Id != excludeId, ct))
            throw new ConflictException($"Question number {input.Number} is already used.");
    }

    public static void ApplyScalars(Question q, QuestionInput i)
    {
        q.Number = i.Number;
        q.TopicId = i.TopicId;
        q.IsCritical = i.IsCritical;
        q.IsActive = i.IsActive;
        q.ImageUrl = string.IsNullOrWhiteSpace(i.ImageUrl) ? null : i.ImageUrl.Trim();
    }

    /// <summary>Đồng bộ bản dịch câu hỏi: thêm/sửa các ngôn ngữ có nội dung, xóa ngôn ngữ bị bỏ trống.</summary>
    public static void SyncTexts(Question q, QuestionInput i)
    {
        var wanted = i.Texts
            .Where(kv => Languages.Supported.Contains(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value?.Text))
            .ToDictionary(kv => kv.Key, kv => kv.Value);

        foreach (var stale in q.Translations.Where(t => !wanted.ContainsKey(t.Lang)).ToList())
            q.Translations.Remove(stale);

        foreach (var (lang, text) in wanted)
        {
            var tr = q.Translations.FirstOrDefault(t => t.Lang == lang);
            if (tr is null)
            {
                q.Translations.Add(new QuestionTranslation
                {
                    Lang = lang, Text = text.Text.Trim(), Explanation = text.Explanation?.Trim() ?? ""
                });
            }
            else
            {
                tr.Text = text.Text.Trim();
                tr.Explanation = text.Explanation?.Trim() ?? "";
            }
        }
    }

    public static void SyncAnswerTexts(Answer a, Dictionary<string, string> texts)
    {
        var wanted = texts
            .Where(kv => Languages.Supported.Contains(kv.Key) && !string.IsNullOrWhiteSpace(kv.Value))
            .ToDictionary(kv => kv.Key, kv => kv.Value.Trim());

        foreach (var stale in a.Translations.Where(t => !wanted.ContainsKey(t.Lang)).ToList())
            a.Translations.Remove(stale);

        foreach (var (lang, text) in wanted)
        {
            var tr = a.Translations.FirstOrDefault(t => t.Lang == lang);
            if (tr is null) a.Translations.Add(new AnswerTranslation { Lang = lang, Text = text });
            else tr.Text = text;
        }
    }

    /// <summary>Ngân hàng câu hỏi đổi → xóa cache chủ đề và thống kê.</summary>
    public static async Task InvalidateAsync(HybridCache cache, CancellationToken ct)
    {
        await cache.RemoveByTagAsync(CacheTags.Bank, ct);
        await cache.RemoveByTagAsync(CacheTags.Stats, ct);
    }
}

// ======================= Danh sách =======================
public sealed record AdminListQuestionsQuery(
    int? TopicId, string? Search, bool? Critical, bool? Active, int Page, int PageSize)
    : IQuery<PagedResult<AdminQuestionListItemDto>>;

public sealed class AdminListQuestionsValidator : AbstractValidator<AdminListQuestionsQuery>
{
    public AdminListQuestionsValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, Paging.MaxPageSize);
        RuleFor(x => x.Search).MaximumLength(100);
    }
}

public sealed class AdminListQuestionsHandler(IAppDbContext db)
    : IQueryHandler<AdminListQuestionsQuery, PagedResult<AdminQuestionListItemDto>>
{
    public async ValueTask<PagedResult<AdminQuestionListItemDto>> Handle(AdminListQuestionsQuery q, CancellationToken ct)
    {
        var query = db.Questions.AsNoTracking().AsQueryable();

        if (q.TopicId is { } topicId) query = query.Where(x => x.TopicId == topicId);
        if (q.Critical is { } critical) query = query.Where(x => x.IsCritical == critical);
        if (q.Active is { } active) query = query.Where(x => x.IsActive == active);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.Trim();
            query = int.TryParse(s, out var number)
                ? query.Where(x => x.Number == number || x.Translations.Any(t => t.Text.Contains(s)))
                : query.Where(x => x.Translations.Any(t => t.Text.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderBy(x => x.Number)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(x => new
            {
                x.Id, x.Number, x.TopicId, TopicCode = x.Topic.Code, x.IsCritical, x.IsActive,
                HasImage = x.ImageUrl != null && x.ImageUrl != "",
                AnswerCount = x.Answers.Count,
                Text = x.Translations.Where(t => t.Lang == Languages.Default).Select(t => t.Text).FirstOrDefault()
            })
            .ToListAsync(ct);

        var items = rows.Select(r => new AdminQuestionListItemDto(
            r.Id, r.Number, r.TopicId, r.TopicCode, r.IsCritical, r.IsActive, r.HasImage, r.AnswerCount, r.Text ?? "")).ToList();
        return new PagedResult<AdminQuestionListItemDto>(items, q.Page, q.PageSize, total);
    }
}

// ======================= Chi tiết =======================
public sealed record AdminGetQuestionQuery(int Id) : IQuery<AdminQuestionDto>;

public sealed class AdminGetQuestionHandler(IAppDbContext db) : IQueryHandler<AdminGetQuestionQuery, AdminQuestionDto>
{
    public async ValueTask<AdminQuestionDto> Handle(AdminGetQuestionQuery q, CancellationToken ct)
        => await AdminQuestionSupport.LoadAsync(db, q.Id, ct);
}

// ======================= Tạo =======================
public sealed record CreateQuestionCommand(QuestionInput Input) : ICommand<AdminQuestionDto>;

public sealed class CreateQuestionHandler(IAppDbContext db, HybridCache cache, TimeProvider clock)
    : ICommandHandler<CreateQuestionCommand, AdminQuestionDto>
{
    public async ValueTask<AdminQuestionDto> Handle(CreateQuestionCommand cmd, CancellationToken ct)
    {
        var input = cmd.Input;
        await AdminQuestionSupport.EnsureReferencesAsync(db, input, null, ct);

        var question = new Question { CreatedAt = clock.GetUtcNow().UtcDateTime };
        AdminQuestionSupport.ApplyScalars(question, input);
        AdminQuestionSupport.SyncTexts(question, input);

        for (var i = 0; i < input.Answers.Count; i++)
        {
            var answer = new Answer { IsCorrect = input.Answers[i].IsCorrect, SortOrder = i + 1 };
            AdminQuestionSupport.SyncAnswerTexts(answer, input.Answers[i].Texts);
            question.Answers.Add(answer);
        }

        db.Questions.Add(question);
        await db.SaveChangesAsync(ct);
        await AdminQuestionSupport.InvalidateAsync(cache, ct);

        return await AdminQuestionSupport.LoadAsync(db, question.Id, ct);
    }
}

// ======================= Cập nhật (thay thế toàn bộ nội dung) =======================
public sealed record UpdateQuestionCommand(int Id, QuestionInput Input) : ICommand<AdminQuestionDto>;

public sealed class UpdateQuestionHandler(IAppDbContext db, HybridCache cache)
    : ICommandHandler<UpdateQuestionCommand, AdminQuestionDto>
{
    public async ValueTask<AdminQuestionDto> Handle(UpdateQuestionCommand cmd, CancellationToken ct)
    {
        var input = cmd.Input;
        var question = await db.Questions
            .Include(x => x.Translations)
            .Include(x => x.Answers).ThenInclude(a => a.Translations)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.Id == cmd.Id, ct)
            ?? throw new NotFoundException("Question", cmd.Id);

        await AdminQuestionSupport.EnsureReferencesAsync(db, input, cmd.Id, ct);

        AdminQuestionSupport.ApplyScalars(question, input);
        AdminQuestionSupport.SyncTexts(question, input);

        // Đáp án: có Id → sửa; Id null → thêm mới; đáp án không còn trong danh sách → xóa.
        var existing = question.Answers.ToDictionary(a => a.Id);
        var keptIds = input.Answers.Where(a => a.Id is not null).Select(a => a.Id!.Value).ToHashSet();

        if (keptIds.Any(id => !existing.ContainsKey(id)))
            throw new BadRequestException("An answer does not belong to this question.");

        var removed = question.Answers.Where(a => !keptIds.Contains(a.Id)).ToList();
        if (removed.Count > 0)
        {
            // Đáp án đã được chọn trong lịch sử thi thì không xóa được (giữ toàn vẹn dữ liệu).
            var removedIds = removed.Select(a => (int?)a.Id).ToList();
            if (await db.ExamAttemptQuestions.AnyAsync(x => removedIds.Contains(x.SelectedAnswerId), ct))
                throw new ConflictException("An answer you removed appears in exam history. Edit its text instead of deleting it.");
            db.Answers.RemoveRange(removed);
        }

        for (var i = 0; i < input.Answers.Count; i++)
        {
            var dto = input.Answers[i];
            Answer answer;
            if (dto.Id is { } id)
            {
                answer = existing[id];
            }
            else
            {
                answer = new Answer();
                question.Answers.Add(answer);
            }

            answer.IsCorrect = dto.IsCorrect;
            answer.SortOrder = i + 1;
            AdminQuestionSupport.SyncAnswerTexts(answer, dto.Texts);
        }

        await db.SaveChangesAsync(ct);
        await AdminQuestionSupport.InvalidateAsync(cache, ct);

        return await AdminQuestionSupport.LoadAsync(db, cmd.Id, ct);
    }
}

// ======================= Xóa =======================
/// <summary>
/// Câu chưa từng xuất hiện trong bài thi nào → xóa hẳn.
/// Câu đã có trong lịch sử thi → chỉ ẩn (IsActive = false) để không làm hỏng kết quả cũ.
/// </summary>
public sealed record DeleteQuestionCommand(int Id) : ICommand<DeleteQuestionResult>;

public sealed class DeleteQuestionHandler(IAppDbContext db, HybridCache cache)
    : ICommandHandler<DeleteQuestionCommand, DeleteQuestionResult>
{
    public async ValueTask<DeleteQuestionResult> Handle(DeleteQuestionCommand cmd, CancellationToken ct)
    {
        var question = await db.Questions.FirstOrDefaultAsync(x => x.Id == cmd.Id, ct)
                       ?? throw new NotFoundException("Question", cmd.Id);

        var usedInExams = await db.ExamAttemptQuestions.AnyAsync(x => x.QuestionId == cmd.Id, ct);
        if (usedInExams)
        {
            question.IsActive = false;
            await db.SaveChangesAsync(ct);
            await AdminQuestionSupport.InvalidateAsync(cache, ct);
            return new DeleteQuestionResult(Deleted: false, Deactivated: true);
        }

        db.Questions.Remove(question); // bản dịch, đáp án, bookmark, thống kê xóa theo (cascade)
        await db.SaveChangesAsync(ct);
        await AdminQuestionSupport.InvalidateAsync(cache, ct);
        return new DeleteQuestionResult(Deleted: true, Deactivated: false);
    }
}
