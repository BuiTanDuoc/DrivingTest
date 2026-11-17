namespace DrivingTest.Domain;

public static class Roles
{
    public const string User = "User";
    public const string Admin = "Admin";
}

public class AppUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string NormalizedEmail { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    /// <summary>"User" hoặc "Admin" (xem <see cref="Roles"/>).</summary>
    public string Role { get; set; } = Roles.User;
    public DateTime CreatedAt { get; set; }
}

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    /// <summary>SHA-256 (hex) của token; không lưu token gốc.</summary>
    public string TokenHash { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
