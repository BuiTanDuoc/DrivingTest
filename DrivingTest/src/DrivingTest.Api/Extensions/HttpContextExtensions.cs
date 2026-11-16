using System.Security.Claims;
using DrivingTest.Application.Common;
using DrivingTest.Domain;

namespace DrivingTest.Api.Extensions;

public static class HttpContextExtensions
{
    /// <summary>Id người dùng từ claim "sub" (JwtBearer để MapInboundClaims = false).</summary>
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }

    public static Guid RequireUserId(this ClaimsPrincipal user)
        => user.GetUserId() ?? throw new UnauthorizedAppException();

    /// <summary>Ngôn ngữ: ?lang=en ưu tiên, sau đó tới header Accept-Language, mặc định tiếng Việt.</summary>
    public static string GetLang(this HttpContext http)
    {
        var fromQuery = http.Request.Query["lang"].ToString();
        if (!string.IsNullOrWhiteSpace(fromQuery)) return Languages.Normalize(fromQuery);

        var header = http.Request.Headers.AcceptLanguage.ToString();
        var first = header.Split(',', 2)[0].Split(';')[0];
        return Languages.Normalize(first);
    }
}
