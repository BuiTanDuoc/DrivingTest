using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using DrivingTest.Application.Common;
using DrivingTest.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace DrivingTest.Infrastructure.Services;

public sealed class TokenService(IOptions<JwtOptions> options, TimeProvider clock) : ITokenService
{
    private readonly JsonWebTokenHandler _handler = new();

    public (string Token, DateTime ExpiresAt) CreateAccessToken(AppUser user)
    {
        var opt = options.Value;
        var expires = clock.GetUtcNow().UtcDateTime.AddMinutes(opt.AccessTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = opt.Issuer,
            Audience = opt.Audience,
            Expires = expires,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opt.Key)), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim("sub", user.Id.ToString()),
                new Claim("email", user.Email),
                new Claim("name", user.DisplayName),
                new Claim("role", user.Role),
                new Claim("jti", Guid.NewGuid().ToString())
            ])
        };

        return (_handler.CreateToken(descriptor), expires);
    }

    public string GenerateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
