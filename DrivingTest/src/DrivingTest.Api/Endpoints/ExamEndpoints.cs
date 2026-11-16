using DrivingTest.Api.Extensions;
using DrivingTest.Application.Features.Exams;
using Mediator;

namespace DrivingTest.Api.Endpoints;

public sealed record SaveAnswerRequest(int QuestionId, int? AnswerId, bool IsFlagged);

public static class ExamEndpoints
{
    public static void MapExamEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/exams").WithTags("Exams").RequireAuthorization();

        // Bắt đầu thi (hoặc tiếp tục bài đang làm dở nếu còn thời gian).
        g.MapPost("/", async (HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new StartExamCommand(http.User.RequireUserId(), http.GetLang()), ct)));

        // Bài đang làm dở (204 nếu không có).
        g.MapGet("/active", async (HttpContext http, ISender sender, CancellationToken ct) =>
        {
            var exam = await sender.Send(new GetActiveExamQuery(http.User.RequireUserId(), http.GetLang()), ct);
            return exam is null ? Results.NoContent() : Results.Ok(exam);
        });

        g.MapGet("/history", async (HttpContext http, ISender sender, [AsParameters] PageParams p, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetExamHistoryQuery(http.User.RequireUserId(), p.Page, p.PageSize), ct)));

        g.MapGet("/{id:guid}", async (Guid id, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetExamQuery(http.User.RequireUserId(), id, http.GetLang()), ct)));

        // Autosave đáp án / đánh dấu nghi ngờ.
        g.MapPut("/{id:guid}/answers", async (Guid id, SaveAnswerRequest body, HttpContext http, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new SaveAnswerCommand(
                http.User.RequireUserId(), id, body.QuestionId, body.AnswerId, body.IsFlagged), ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:guid}/submit", async (Guid id, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new SubmitExamCommand(http.User.RequireUserId(), id, http.GetLang()), ct)));

        g.MapGet("/{id:guid}/result", async (Guid id, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetExamResultQuery(http.User.RequireUserId(), id, http.GetLang()), ct)));
    }
}
