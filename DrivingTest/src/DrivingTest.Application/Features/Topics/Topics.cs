using DrivingTest.Application.Common;
using DrivingTest.Domain;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Topics;

public sealed record TopicDto(int Id, string Code, string Name, string? Description, int QuestionCount);

public sealed record GetTopicsQuery(string Lang) : IQuery<List<TopicDto>>;

public sealed class GetTopicsHandler(IAppDbContext db, HybridCache cache, IOptions<CacheOptions> cacheOptions)
    : IQueryHandler<GetTopicsQuery, List<TopicDto>>
{
    public async ValueTask<List<TopicDto>> Handle(GetTopicsQuery query, CancellationToken ct)
    {
        var lang = Languages.Normalize(query.Lang);
        var entry = new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(cacheOptions.Value.BankMinutes) };

        return await cache.GetOrCreateAsync(
            $"topics:{lang}",
            async token => await LoadAsync(lang, token),
            entry,
            [CacheTags.Bank],
            cancellationToken: ct);
    }

    private async Task<List<TopicDto>> LoadAsync(string lang, CancellationToken ct)
    {
        var topics = await db.Topics.AsNoTracking()
            .Include(t => t.Translations.Where(x => x.Lang == lang || x.Lang == Languages.Default))
            .OrderBy(t => t.SortOrder)
            .ToListAsync(ct);

        var counts = await db.Questions.AsNoTracking()
            .Where(q => q.IsActive)
            .GroupBy(q => q.TopicId)
            .Select(g => new { TopicId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TopicId, x => x.Count, ct);

        return topics.Select(t =>
        {
            var tr = Languages.Pick(t.Translations, lang);
            return new TopicDto(t.Id, t.Code, tr?.Name ?? t.Code, tr?.Description, counts.GetValueOrDefault(t.Id));
        }).ToList();
    }
}
