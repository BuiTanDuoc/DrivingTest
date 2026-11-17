using System.Security.Cryptography;
using System.Text;
using DrivingTest.Application.Common;
using DrivingTest.Domain;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace DrivingTest.Infrastructure.Services;

/// <summary>
/// Token đặt lại mật khẩu không lưu DB: payload "userId|stamp" được mã hóa + ký bằng ASP.NET Data Protection, có hạn dùng.
/// Stamp lấy từ hash mật khẩu hiện tại nên token tự hết hiệu lực khi mật khẩu đã đổi.
/// </summary>
public sealed class PasswordResetTokenService(IDataProtectionProvider provider, IOptions<PasswordResetOptions> options)
    : IPasswordResetTokenService
{
    private readonly ITimeLimitedDataProtector _protector =
        provider.CreateProtector("DrivingTest.PasswordReset.v1").ToTimeLimitedDataProtector();

    public string Create(AppUser user)
        => _protector.Protect($"{user.Id:N}|{Stamp(user)}", TimeSpan.FromMinutes(options.Value.TokenMinutes));

    public PasswordResetTicket? Read(string token)
    {
        try
        {
            var parts = _protector.Unprotect(token).Split('|');
            return parts.Length == 2 && Guid.TryParse(parts[0], out var id) ? new PasswordResetTicket(id, parts[1]) : null;
        }
        catch (CryptographicException)
        {
            return null; // sai chữ ký, bị sửa hoặc đã hết hạn
        }
        catch (FormatException)
        {
            return null;
        }
    }

    public bool IsCurrent(AppUser user, PasswordResetTicket ticket)
        => CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Stamp(user)), Encoding.ASCII.GetBytes(ticket.Stamp));

    private static string Stamp(AppUser user)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(user.PasswordHash)))[..24];
}
