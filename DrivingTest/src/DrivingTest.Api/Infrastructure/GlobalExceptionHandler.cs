using DrivingTest.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace DrivingTest.Api.Infrastructure;

/// <summary>Chuyển exception thành ProblemDetails (RFC 9457) với mã trạng thái phù hợp.</summary>
public sealed class GlobalExceptionHandler(IProblemDetailsService problems, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        if (exception is OperationCanceledException && http.RequestAborted.IsCancellationRequested)
        {
            http.Response.StatusCode = 499; // client đã ngắt kết nối
            return true;
        }

        var problem = exception switch
        {
            ValidationException v => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Extensions =
                {
                    ["errors"] = v.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray())
                }
            },
            AppException a => new ProblemDetails { Status = a.StatusCode, Title = a.Title, Detail = a.Message },
            _ => null
        };

        if (problem is null)
        {
            logger.LogError(exception, "Unhandled exception on {Method} {Path}", http.Request.Method, http.Request.Path);
            problem = new ProblemDetails { Status = StatusCodes.Status500InternalServerError, Title = "Server error" };
        }

        http.Response.StatusCode = problem.Status!.Value;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            ProblemDetails = problem,
            Exception = exception
        });
    }
}

public sealed class RateLimitingOptions
{
    public int AuthPermitLimit { get; set; } = 10;
    public int CheckPermitLimit { get; set; } = 120;
    public int WindowSeconds { get; set; } = 60;
}
