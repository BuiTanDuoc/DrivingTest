using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Exams;
using DrivingTest.Domain;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Stats;

// ---------- Thống kê trang chủ ----------
public sealed record HomeStatsDto(int TotalQuestions, int TotalTopics, int TotalAttempts, int TotalUsers);

public sealed record GetHomeStatsQuery : IQuery<HomeStatsDto>;

public sealed class GetHomeStatsHandler(IAppDbContext db, HybridCache cache, IOptions<CacheOptions> cacheOptions)
    : IQueryHandler<GetHomeStatsQuery, HomeStatsDto>
{
    public async ValueTask<HomeStatsDto> Handle(GetHomeStatsQuery query, CancellationToken ct)
    {
        var entry = new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(cacheOptions.Value.HomeStatsMinutes)
        };

        return await cache.GetOrCreateAsync(
            "stats:home",
            async token => new HomeStatsDto(
                await db.Questions.CountAsync(q => q.IsActive, token),
                await db.Topics.CountAsync(token),
                await db.ExamAttempts.CountAsync(a => a.Status != ExamStatus.InProgress, token),
                await db.Users.CountAsync(token)),
            entry,
            [CacheTags.Stats],
            cancellationToken: ct);
    }
}

// ---------- Thống kê cá nhân ----------
public sealed record TopicProgressDto(
    int TopicId, string Code, string Name, int TotalQuestions,
    int StudiedQuestions, int MasteredQuestions, int ExamQuestions, int ExamCorrect);

public sealed record MyStatsDto(
    int TotalAttempts, int PassedAttempts, double PassRate, double AverageScore, int BestScore,
    int TotalQuestions, int StudiedQuestions, int MasteredQuestions,
    List<TopicProgressDto> Topics, List<ExamSummaryDto> RecentAttempts);

public sealed record GetMyStatsQuery(Guid UserId, string Lang) : IQuery<MyStatsDto>;

public sealed class GetMyStatsHandler(IAppDbContext db) : IQueryHandler<GetMyStatsQuery, MyStatsDto>
{
    public async ValueTask<MyStatsDto> Handle(GetMyStatsQuery q, CancellationToken ct)
    {
        var lang = Languages.Normalize(q.Lang);
        var userId = q.UserId;

        // Tổng hợp các lượt thi đã kết thúc.
        var finished = db.ExamAttempts.AsNoTracking()
            .Where(a => a.UserId == userId && a.Status != ExamStatus.InProgress);

        var agg = await finished
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Passed = g.Count(a => a.Passed == true),
                Average = g.Average(a => (double)(a.Score ?? 0)),
                Best = g.Max(a => a.Score ?? 0)
            })
            .FirstOrDefaultAsync(ct);

        var recent = (await finished.OrderByDescending(a => a.StartedAt).Take(5).ToListAsync(ct))
            .Select(ExamMapper.ToSummary).ToList();

        // Tiến độ theo chủ đề.
        var topics = await db.Topics.AsNoTracking()
            .Include(t => t.Translations.Where(x => x.Lang == lang || x.Lang == Languages.Default))
            .OrderBy(t => t.SortOrder)
            .ToListAsync(ct);

        var totals = await db.Questions.AsNoTracking()
            .Where(x => x.IsActive)
            .GroupBy(x => x.TopicId)
            .Select(g => new { TopicId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TopicId, x => x.Count, ct);

        var studied = await db.UserQuestionStats.AsNoTracking()
            .Where(s => s.UserId == userId && s.Question.IsActive)
            .GroupBy(s => s.Question.TopicId)
            .Select(g => new
            {
                TopicId = g.Key,
                Studied = g.Count(),
                Mastered = g.Count(s => s.LastWasCorrect)
            })
            .ToDictionaryAsync(x => x.TopicId, ct);

        var exam = await db.ExamAttemptQuestions.AsNoTracking()
            .Where(x => x.Attempt.UserId == userId && x.Attempt.Status != ExamStatus.InProgress)
            .GroupBy(x => x.Question.TopicId)
            .Select(g => new
            {
                TopicId = g.Key,
                Total = g.Count(),
                Correct = g.Count(x => x.IsCorrect == true)
            })
            .ToDictionaryAsync(x => x.TopicId, ct);

        var progress = topics.Select(t =>
        {
            studied.TryGetValue(t.Id, out var s);
            exam.TryGetValue(t.Id, out var e);
            return new TopicProgressDto(
                t.Id, t.Code, Languages.Pick(t.Translations, lang)?.Name ?? t.Code,
                totals.GetValueOrDefault(t.Id),
                s?.Studied ?? 0, s?.Mastered ?? 0, e?.Total ?? 0, e?.Correct ?? 0);
        }).ToList();

        var total = agg?.Total ?? 0;
        return new MyStatsDto(
            total,
            agg?.Passed ?? 0,
            total == 0 ? 0 : Math.Round(100.0 * agg!.Passed / total, 1),
            Math.Round(agg?.Average ?? 0, 1),
            agg?.Best ?? 0,
            progress.Sum(p => p.TotalQuestions),
            progress.Sum(p => p.StudiedQuestions),
            progress.Sum(p => p.MasteredQuestions),
            progress,
            recent);
    }
}
