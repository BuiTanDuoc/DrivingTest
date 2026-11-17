using System.Net;
using System.Net.Mail;
using DrivingTest.Application.Common;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrivingTest.Infrastructure.Services;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>Để trống = không gửi thật (Development sẽ ghi nội dung email ra log).</summary>
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string? UserName { get; set; }
    public string? Password { get; set; }
    public string FromAddress { get; set; } = "no-reply@drivingtest.local";
    public string FromName { get; set; } = "Thi Bằng Lái B";
}

/// <summary>Gửi email qua SMTP (System.Net.Mail).</summary>
public sealed class SmtpEmailSender(IOptions<EmailOptions> options, IHostEnvironment env, ILogger<SmtpEmailSender> logger)
    : IEmailSender
{
    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.Host))
        {
            // Chưa cấu hình SMTP: chỉ ở Development mới ghi nội dung (có chứa link bí mật) ra log.
            if (env.IsDevelopment())
                logger.LogWarning("Email:Host is not configured. Email to {To} was NOT sent.\nSubject: {Subject}\n{Body}", to, subject, htmlBody);
            else
                logger.LogError("Email:Host is not configured. Email to {To} ({Subject}) was NOT sent.", to, subject);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(o.FromAddress, o.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(to);

        using var client = new SmtpClient(o.Host, o.Port) { EnableSsl = o.EnableSsl };
        if (!string.IsNullOrEmpty(o.UserName)) client.Credentials = new NetworkCredential(o.UserName, o.Password);

        await client.SendMailAsync(message, ct);
    }
}
