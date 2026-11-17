using DrivingTest.Application.Common;
using DrivingTest.Infrastructure.Persistence;
using DrivingTest.Infrastructure.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DrivingTest.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

        services.AddDbContext<AppDbContext>(o =>
            o.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddSingleton<IPasswordService, PasswordService>();
        services.AddSingleton<ITokenService, TokenService>();

        // Quên mật khẩu: token ký bằng Data Protection + gửi email qua SMTP.
        services.AddDataProtection().SetApplicationName("DrivingTest");
        services.AddSingleton<IPasswordResetTokenService, PasswordResetTokenService>();
        services.Configure<EmailOptions>(config.GetSection(EmailOptions.SectionName));
        services.AddSingleton<IEmailSender, SmtpEmailSender>();

        services.AddScoped<DbInitializer>();
        services.AddHostedService<ExamExpirationWorker>();

        return services;
    }
}
