using DrivingTest.Application.Common;
using Mediator;
using Microsoft.Extensions.Options;

namespace DrivingTest.Application.Features.Exams;

/// <summary>Thông tin format đề thi để frontend hiển thị (lấy từ cấu hình, không ghi cứng ở client).</summary>
public sealed record ExamInfoDto(int TotalQuestions, int DurationMinutes, int PassScore, int MinCriticalQuestions);

public sealed record GetExamInfoQuery : IQuery<ExamInfoDto>;

public sealed class GetExamInfoHandler(IOptions<ExamOptions> options) : IQueryHandler<GetExamInfoQuery, ExamInfoDto>
{
    public ValueTask<ExamInfoDto> Handle(GetExamInfoQuery query, CancellationToken ct)
    {
        var o = options.Value;
        return ValueTask.FromResult(new ExamInfoDto(o.TotalQuestions, o.DurationMinutes, o.PassScore, o.MinCriticalQuestions));
    }
}
