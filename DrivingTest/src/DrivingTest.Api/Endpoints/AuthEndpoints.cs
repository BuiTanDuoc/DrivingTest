using DrivingTest.Application.Features.Auth;
using Mediator;

namespace DrivingTest.Api.Endpoints;

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
    }
}
