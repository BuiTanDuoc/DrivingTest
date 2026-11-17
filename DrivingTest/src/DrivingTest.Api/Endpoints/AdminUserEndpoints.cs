using DrivingTest.Api.Extensions;
using DrivingTest.Application.Features.Admin;
using Mediator;

namespace DrivingTest.Api.Endpoints;

public sealed record AdminUserListParams(string? Search, string? Role, int Page = 1, int PageSize = 20);

public sealed record CreateUserRequest(string Email, string DisplayName, string Role, string Password);

public sealed record UpdateUserRequest(string Email, string DisplayName, string Role);

public sealed record AdminResetPasswordRequest(string NewPassword);

public static class AdminUserEndpoints
{
    public static void MapAdminUserEndpoints(this IEndpointRouteBuilder app)
    {
        // ---- Quản lý người dùng (chỉ Admin) ----
        var g = app.MapGroup("/api/admin/users").WithTags("Admin users").RequireAuthorization("Admin");

        g.MapGet("/", async (ISender sender, [AsParameters] AdminUserListParams p, CancellationToken ct) =>
            Results.Ok(await sender.Send(new AdminListUsersQuery(p.Search, p.Role, p.Page, p.PageSize), ct)))
            .WithSummary("Danh sách người dùng (tìm theo email/tên, lọc theo vai trò)");

        g.MapGet("/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new AdminGetUserQuery(id), ct)))
            .WithSummary("Chi tiết người dùng");

        g.MapPost("/", async (CreateUserRequest body, ISender sender, CancellationToken ct) =>
        {
            var created = await sender.Send(new CreateUserCommand(body.Email, body.DisplayName, body.Role, body.Password), ct);
            return Results.Created($"/api/admin/users/{created.Id}", created);
        }).WithSummary("Tạo người dùng");

        g.MapPut("/{id:guid}", async (Guid id, UpdateUserRequest body, HttpContext http, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new UpdateUserCommand(
                http.User.RequireUserId(), id, body.Email, body.DisplayName, body.Role), ct)))
            .WithSummary("Sửa email, tên hiển thị, vai trò");

        g.MapDelete("/{id:guid}", async (Guid id, HttpContext http, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new DeleteUserCommand(http.User.RequireUserId(), id), ct);
            return Results.NoContent();
        }).WithSummary("Xóa người dùng (kèm lịch sử thi)");

        g.MapPost("/{id:guid}/reset-password", async (Guid id, AdminResetPasswordRequest body, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new AdminResetPasswordCommand(id, body.NewPassword), ct);
            return Results.NoContent();
        }).WithSummary("Đặt mật khẩu mới cho người dùng (đăng xuất mọi thiết bị)");
    }
}
