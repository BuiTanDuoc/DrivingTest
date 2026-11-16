using System.ComponentModel.DataAnnotations;

namespace DrivingTest.Application.Common;

public sealed class ExamOptions
{
    public const string SectionName = "Exam";

    [Range(1, 200)] public int TotalQuestions { get; set; } = 35;
    [Range(1, 240)] public int DurationMinutes { get; set; } = 19;
    [Range(1, 200)] public int PassScore { get; set; } = 32;
    /// <summary>Số câu điểm liệt tối thiểu trong mỗi đề.</summary>
    [Range(0, 50)] public int MinCriticalQuestions { get; set; } = 1;
    /// <summary>Thời gian châm chước (giây) cho request nộp bài tới trễ do mạng.</summary>
    [Range(0, 300)] public int SubmitGraceSeconds { get; set; } = 15;
    [Range(5, 3600)] public int ExpirationSweepSeconds { get; set; } = 60;
    [Range(1, 1000)] public int ExpirationBatchSize { get; set; } = 100;
    /// <summary>Cơ cấu đề: mã chủ đề → số câu.</summary>
    [Required] public Dictionary<string, int> TopicQuota { get; set; } = [];
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required] public string Issuer { get; set; } = "";
    [Required] public string Audience { get; set; } = "";
    [Required, MinLength(32)] public string Key { get; set; } = "";
    [Range(1, 1440)] public int AccessTokenMinutes { get; set; } = 15;
    [Range(1, 365)] public int RefreshTokenDays { get; set; } = 30;
}

public sealed class CacheOptions
{
    public const string SectionName = "Cache";

    [Range(1, 1440)] public int BankMinutes { get; set; } = 60;
    [Range(1, 1440)] public int HomeStatsMinutes { get; set; } = 5;
}
