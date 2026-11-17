using DrivingTest.Application.Common;
using DrivingTest.Application.Features.Auth;
using DrivingTest.Application.Features.Exams;
using DrivingTest.Application.Features.Questions;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DrivingTest.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration config)
    {
        // Mediator source-generated. Handler dùng DbContext (scoped) nên lifetime phải là Scoped.
        services.AddMediator(options =>
        {
            options.ServiceLifetime = ServiceLifetime.Scoped;
            options.PipelineBehaviors = [typeof(ValidationBehavior<,>)];
        });

        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly, includeInternalTypes: true);
        services.AddHybridCache();
        services.TryAddSingleton(TimeProvider.System);

        services.AddOptions<ExamOptions>()
            .Bind(config.GetSection(ExamOptions.SectionName))
            .ValidateDataAnnotations()
            .Validate(o => o.TopicQuota.Values.Sum() == o.TotalQuestions,
                "Exam:TopicQuota phải cộng đúng bằng Exam:TotalQuestions.")
            .Validate(o => o.PassScore <= o.TotalQuestions, "Exam:PassScore không được lớn hơn Exam:TotalQuestions.")
            .ValidateOnStart();

        services.AddOptions<JwtOptions>()
            .Bind(config.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<CacheOptions>()
            .Bind(config.GetSection(CacheOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<PasswordResetOptions>()
            .Bind(config.GetSection(PasswordResetOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddScoped<AuthTokenIssuer>();
        services.AddScoped<StudyStatsRecorder>();
        services.AddScoped<ExamComposer>();
        services.AddScoped<ExamGrader>();
        services.AddScoped<ExamReader>();

        return services;
    }
}
