using DrivingTest.Api.Extensions;
using DrivingTest.Application.Features.Bookmarks;
using DrivingTest.Application.Features.Exams;
using DrivingTest.Application.Features.Questions;
using DrivingTest.Application.Features.Stats;
using DrivingTest.Application.Features.Topics;
using Mediator;

namespace DrivingTest.Api.Endpoints;

public sealed record QuestionListParams(
    int? TopicId, string? Search, bool CriticalOnly = false, int Page = 1, int PageSize = 20);

public sealed record PageParams(int Page = 1, int PageSize = 20);

public sealed record CheckAnswerRequest(int AnswerId);

public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        // ---- Chủ đề ----
        app.MapGet("/api/topics", async (HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetTopicsQuery(http.GetLang()), ct)))
            .WithTags("Topics");

        app.MapGet("/api/exam-info", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetExamInfoQuery(), ct)))
            .WithTags("Exams");

        // ---- Câu hỏi (cho phép ẩn danh; có token thì trả thêm trạng thái bookmark) ----
        var q = app.MapGroup("/api/questions").WithTags("Questions");

        q.MapGet("/", async (HttpContext http, ISender sender, [AsParameters] QuestionListParams p, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetQuestionsQuery(
                http.User.GetUserId(), p.TopicId, p.Search, p.CriticalOnly, p.Page, p.PageSize, http.GetLang()), ct)));

        q.MapPost("/{id:int}/check", async (int id, CheckAnswerRequest body, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new CheckAnswerCommand(http.User.GetUserId(), id, body.AnswerId, http.GetLang()), ct)))
            .RequireRateLimiting("check");

        q.MapGet("/review", async (HttpContext http, ISender sender, [AsParameters] PageParams p, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetReviewQuestionsQuery(
                http.User.RequireUserId(), p.Page, p.PageSize, http.GetLang()), ct)))
            .RequireAuthorization();

        // ---- Bookmark ----
        var b = app.MapGroup("/api/bookmarks").WithTags("Bookmarks").RequireAuthorization();

        b.MapGet("/", async (HttpContext http, ISender sender, [AsParameters] PageParams p, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetBookmarksQuery(
                http.User.RequireUserId(), p.Page, p.PageSize, http.GetLang()), ct)));

        b.MapPut("/{questionId:int}", async (int questionId, HttpContext http, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new AddBookmarkCommand(http.User.RequireUserId(), questionId), ct);
            return Results.NoContent();
        });

        b.MapDelete("/{questionId:int}", async (int questionId, HttpContext http, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new RemoveBookmarkCommand(http.User.RequireUserId(), questionId), ct);
            return Results.NoContent();
        });

        // ---- Thống kê ----
        var s = app.MapGroup("/api/stats").WithTags("Stats");

        s.MapGet("/home", async (ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetHomeStatsQuery(), ct)));

        s.MapGet("/me", async (HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetMyStatsQuery(http.User.RequireUserId(), http.GetLang()), ct)))
            .RequireAuthorization();
    }
}
