using System.Text.Json;
using DrivingTest.Application.Common;
using DrivingTest.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DrivingTest.Infrastructure.Persistence;

/// <summary>Tạo/migrate database, seed chủ đề và import ngân hàng câu hỏi từ file JSON (idempotent theo Number).</summary>
public sealed class DbInitializer(
    AppDbContext db, HybridCache cache, IConfiguration config, ILogger<DbInitializer> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private sealed record SeedTopic(string Code, int Order, string Vi, string En);

    // Mã chủ đề phải khớp với khóa trong Exam:TopicQuota (appsettings.json).
    private static readonly SeedTopic[] Topics =
    [
        new("rules", 1, "Khái niệm và quy tắc", "Rules & concepts"),
        new("signs", 2, "Biển báo đường bộ", "Road signs"),
        new("scenarios", 3, "Sa hình", "Traffic scenarios"),
        new("driving-skills", 4, "Kỹ thuật lái xe", "Driving techniques"),
        new("vehicle", 5, "Cấu tạo và sửa chữa xe", "Vehicle structure"),
        new("ethics", 6, "Văn hóa và đạo đức người lái xe", "Driver ethics & culture")
    ];

    private sealed record SeedText(string Text, string Explanation);
    private sealed record SeedAnswer(bool Correct, string Vi, string? En);
    private sealed record SeedQuestion(
        int Number, string Topic, bool Critical, string? ImageUrl,
        SeedText Vi, SeedText? En, List<SeedAnswer> Answers);

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        // Chưa có migration thì tạo schema trực tiếp (tiện cho dev); có migration thì áp dụng migration.
        if (db.Database.GetMigrations().Any()) await db.Database.MigrateAsync(ct);
        else await db.Database.EnsureCreatedAsync(ct);

        var changed = await SeedTopicsAsync(ct);
        changed |= await SeedQuestionsAsync(ct);

        if (changed)
        {
            await cache.RemoveByTagAsync(CacheTags.Bank, ct);
            await cache.RemoveByTagAsync(CacheTags.Stats, ct);
        }
    }

    private async Task<bool> SeedTopicsAsync(CancellationToken ct)
    {
        var existing = (await db.Topics.Select(t => t.Code).ToListAsync(ct)).ToHashSet();
        var added = false;

        foreach (var t in Topics.Where(t => !existing.Contains(t.Code)))
        {
            db.Topics.Add(new Topic
            {
                Code = t.Code,
                SortOrder = t.Order,
                Translations =
                [
                    new TopicTranslation { Lang = "vi", Name = t.Vi },
                    new TopicTranslation { Lang = "en", Name = t.En }
                ]
            });
            added = true;
        }

        if (added) await db.SaveChangesAsync(ct);
        return added;
    }

    private async Task<bool> SeedQuestionsAsync(CancellationToken ct)
    {
        var file = config["Database:QuestionsSeedFile"];
        if (string.IsNullOrWhiteSpace(file)) return false;

        var path = Path.Combine(AppContext.BaseDirectory, file);
        if (!File.Exists(path))
        {
            logger.LogWarning("Question seed file not found: {Path}", path);
            return false;
        }

        var seeds = JsonSerializer.Deserialize<List<SeedQuestion>>(await File.ReadAllTextAsync(path, ct), Json) ?? [];
        var existing = (await db.Questions.Select(q => q.Number).ToListAsync(ct)).ToHashSet();
        var topicIds = await db.Topics.ToDictionaryAsync(t => t.Code, t => t.Id, ct);
        var now = DateTime.UtcNow;
        var added = 0;

        foreach (var s in seeds)
        {
            if (existing.Contains(s.Number)) continue;

            if (!topicIds.TryGetValue(s.Topic, out var topicId) || s.Answers.Count < 2 ||
                s.Answers.Count(a => a.Correct) != 1)
            {
                logger.LogWarning("Skipping question #{Number}: unknown topic or not exactly one correct answer.", s.Number);
                continue;
            }

            var question = new Question
            {
                Number = s.Number,
                TopicId = topicId,
                IsCritical = s.Critical,
                ImageUrl = s.ImageUrl,
                CreatedAt = now,
                Translations = [new QuestionTranslation { Lang = "vi", Text = s.Vi.Text, Explanation = s.Vi.Explanation }],
                Answers = s.Answers.Select((a, i) =>
                {
                    var answer = new Answer { IsCorrect = a.Correct, SortOrder = i + 1 };
                    answer.Translations.Add(new AnswerTranslation { Lang = "vi", Text = a.Vi });
                    if (!string.IsNullOrWhiteSpace(a.En))
                        answer.Translations.Add(new AnswerTranslation { Lang = "en", Text = a.En });
                    return answer;
                }).ToList()
            };

            if (s.En is not null)
                question.Translations.Add(new QuestionTranslation { Lang = "en", Text = s.En.Text, Explanation = s.En.Explanation });

            db.Questions.Add(question);
            existing.Add(s.Number);
            added++;
        }

        if (added > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Imported {Count} question(s) from {Path}.", added, path);
        }

        return added > 0;
    }
}
