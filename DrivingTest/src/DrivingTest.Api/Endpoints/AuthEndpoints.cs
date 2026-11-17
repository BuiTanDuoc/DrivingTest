using DrivingTest.Api.Extensions;
using DrivingTest.Application.Features.Auth;
using Mediator;

namespace DrivingTest.Api.Endpoints;

public sealed record ForgotPasswordRequest(string Email);

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth").WithTags("Auth").RequireRateLimiting("auth");

        g.MapPost("/register", async (RegisterCommand cmd, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(cmd, ct)));

        g.MapPost("/login", async (LoginCommand cmd, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(cmd, ct)));

        g.MapPost("/refresh", async (RefreshTokenCommand cmd, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(cmd, ct)));

        g.MapPost("/logout", async (LogoutCommand cmd, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(cmd, ct);
            return Results.NoContent();
        });

        // Luôn trả 204 dù email có tồn tại hay không.
        g.MapPost("/forgot-password", async (ForgotPasswordRequest body, HttpContext http, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(new ForgotPasswordCommand(body.Email, http.GetLang()), ct);
            return Results.NoContent();
        }).WithSummary("Gửi email chứa link đặt lại mật khẩu");

        g.MapPost("/reset-password", async (ResetPasswordCommand cmd, ISender sender, CancellationToken ct) =>
        {
            await sender.Send(cmd, ct);
            return Results.NoContent();
        }).WithSummary("Đặt mật khẩu mới bằng token trong email");
    }
}
