using DrivingTest.Api.Extensions;
using DrivingTest.Application.Features.Admin;
using DrivingTest.Application.Features.Profile;
using Mediator;

namespace DrivingTest.Api.Endpoints;

public sealed record UpdateProfileRequest(string DisplayName);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record AdminQuestionListParams(
    int? TopicId, string? Search, bool? Critical, bool? Active, int Page = 1, int PageSize = 20);

public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        // ---- Hồ sơ người dùng ----
        var profile = app.MapGroup("/api/profile").WithTags("Profile").RequireAuthorization();

        profile.MapGet("/", async (HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetProfileQuery(http.User.RequireUserId()), ct)));

        profile.MapPut("/", async (UpdateProfileRequest body, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new UpdateProfileCommand(http.User.RequireUserId(), body.DisplayName), ct)));

        // Trả về token mới cho phiên hiện tại; các thiết bị khác bị đăng xuất.
        profile.MapPost("/change-password", async (ChangePasswordRequest body, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new ChangePasswordCommand(
                http.User.RequireUserId(), body.CurrentPassword, body.NewPassword), ct)))
            .RequireRateLimiting("auth");

        // ---- Quản trị ngân hàng câu hỏi (chỉ Admin) ----
        var admin = app.MapGroup("/api/admin/questions").WithTags("Admin").RequireAuthorization("Admin");

        admin.MapGet("/", async (ISender sender, [AsParameters] AdminQuestionListParams p, CancellationToken ct) =>
            Results.Ok(await sender.Send(new AdminListQuestionsQuery(
                p.TopicId, p.Search, p.Critical, p.Active, p.Page, p.PageSize), ct)));

        admin.MapGet("/{id:int}", async (int id, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new AdminGetQuestionQuery(id), ct)));

        admin.MapPost("/", async (QuestionInput body, ISender sender, CancellationToken ct) =>
        {
            var created = await sender.Send(new CreateQuestionCommand(body), ct);
            return Results.Created($"/api/admin/questions/{created.Id}", created);
        });

        admin.MapPut("/{id:int}", async (int id, QuestionInput body, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new UpdateQuestionCommand(id, body), ct)));

        admin.MapDelete("/{id:int}", async (int id, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new DeleteQuestionCommand(id), ct)));
    }
}
