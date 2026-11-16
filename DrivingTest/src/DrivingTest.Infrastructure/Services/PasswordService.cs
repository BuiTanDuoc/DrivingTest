using DrivingTest.Application.Common;
using DrivingTest.Domain;
using Microsoft.AspNetCore.Identity;

namespace DrivingTest.Infrastructure.Services;

/// <summary>Băm mật khẩu bằng PasswordHasher của ASP.NET Core Identity (PBKDF2 + salt).</summary>
public sealed class PasswordService : IPasswordService
{
    private readonly PasswordHasher<AppUser> _hasher = new();

    public string Hash(AppUser user, string password) => _hasher.HashPassword(user, password);

    public bool Verify(AppUser user, string hash, string password)
        => _hasher.VerifyHashedPassword(user, hash, password) != PasswordVerificationResult.Failed;
}
