using DrivingTest.Application.Features.Questions;
using DrivingTest.Domain;

namespace DrivingTest.Application.Features.Exams;

/// <summary>Câu hỏi trong bài thi đang làm: không có đáp án đúng, không lộ cờ điểm liệt.</summary>
public sealed record ExamQuestionDto(
    int Position, int QuestionId, string? ImageUrl, string Text,
    List<AnswerDto> Answers, int? SelectedAnswerId, bool IsFlagged);

public sealed record ExamDto(
    Guid AttemptId, DateTime StartedAt, DateTime ExpiresAt, DateTime ServerTime,
    int TotalQuestions, List<ExamQuestionDto> Questions);

public sealed record ResultAnswerDto(int Id, string Text, bool IsCorrect);

public sealed record ExamResultQuestionDto(
    int Position, int QuestionId, bool IsCritical, string? ImageUrl, string Text, string Explanation,
    List<ResultAnswerDto> Answers, int? SelectedAnswerId, bool IsCorrect, bool IsFlagged);

public sealed record ExamResultDto(
    Guid AttemptId, ExamStatus Status, DateTime StartedAt, DateTime SubmittedAt, int DurationSeconds,
    int Score, int TotalQuestions, int PassScore, bool Passed, bool FailedByCritical,
    List<ExamResultQuestionDto> Questions);

public sealed record ExamSummaryDto(
    Guid AttemptId, ExamStatus Status, DateTime StartedAt, DateTime? SubmittedAt, int? DurationSeconds,
    int? Score, int TotalQuestions, bool? Passed, bool FailedByCritical);

public static class ExamMapper
{
    public static ExamSummaryDto ToSummary(ExamAttempt a) =>
        new(a.Id, a.Status, a.StartedAt, a.SubmittedAt,
            a.SubmittedAt is { } s ? (int)(s - a.StartedAt).TotalSeconds : null,
            a.Score, a.TotalQuestions, a.Passed, a.FailedByCritical);
}
