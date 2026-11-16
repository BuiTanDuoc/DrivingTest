using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Exams;
using Mediator;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrivingTest.Infrastructure.Services;

/// <summary>
/// Định kỳ chấm các bài thi đã quá hạn mà client chưa nộp (đóng tab, mất mạng...)
/// để bài vẫn có kết quả trong lịch sử.
/// </summary>
public sealed class ExamExpirationWorker(
    IServiceScopeFactory scopes, IOptions<ExamOptions> options, ILogger<ExamExpirationWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.Value.ExpirationSweepSeconds));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();
                var count = await sender.Send(new ExpireOverdueExamsCommand(), stoppingToken);
                if (count > 0) logger.LogInformation("Auto-graded {Count} overdue exam(s).", count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to sweep overdue exams.");
            }
        }
    }
}
