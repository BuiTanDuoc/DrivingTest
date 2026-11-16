namespace DrivingTest.Domain;

public enum ExamStatus
{
    InProgress = 0,
    Submitted = 1,
    /// <summary>Quá hạn, hệ thống tự chấm theo các đáp án đã lưu.</summary>
    Expired = 2
}

public class ExamAttempt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime StartedAt { get; set; }
    /// <summary>Hạn nộp do server quyết định; client chỉ dùng để hiển thị đồng hồ.</summary>
    public DateTime ExpiresAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public ExamStatus Status { get; set; }
    public int TotalQuestions { get; set; }
    /// <summary>Điểm đạt tại thời điểm bắt đầu thi (cấu hình có thể đổi về sau).</summary>
    public int PassScore { get; set; }
    public int? Score { get; set; }
    public bool? Passed { get; set; }
    public bool FailedByCritical { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public List<ExamAttemptQuestion> Questions { get; set; } = [];
}

/// <summary>Snapshot đề thi: thứ tự câu hỏi và đáp án người dùng đã chọn.</summary>
public class ExamAttemptQuestion
{
    public Guid AttemptId { get; set; }
    public ExamAttempt Attempt { get; set; } = null!;
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public int Position { get; set; }
    public int? SelectedAnswerId { get; set; }
    public bool IsFlagged { get; set; }
    public bool? IsCorrect { get; set; }
}

public class Bookmark
{
    public Guid UserId { get; set; }
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

/// <summary>Thống kê theo từng câu của từng người dùng — phục vụ "ôn lại câu sai" và tiến độ học.</summary>
public class UserQuestionStat
{
    public Guid UserId { get; set; }
    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public bool LastWasCorrect { get; set; }
    public DateTime LastSeenAt { get; set; }
}
