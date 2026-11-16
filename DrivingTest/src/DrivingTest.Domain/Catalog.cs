namespace DrivingTest.Domain;

public class Topic
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public int SortOrder { get; set; }
    public List<TopicTranslation> Translations { get; set; } = [];
    public List<Question> Questions { get; set; } = [];
}

public class TopicTranslation : ITranslation
{
    public int TopicId { get; set; }
    public string Lang { get; set; } = Languages.Default;
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public class Question
{
    public int Id { get; set; }
    /// <summary>Số thứ tự câu trong ngân hàng đề (dùng để import idempotent).</summary>
    public int Number { get; set; }
    public int TopicId { get; set; }
    public Topic Topic { get; set; } = null!;
    /// <summary>Câu điểm liệt: sai là trượt.</summary>
    public bool IsCritical { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public List<QuestionTranslation> Translations { get; set; } = [];
    public List<Answer> Answers { get; set; } = [];
}

public class QuestionTranslation : ITranslation
{
    public int QuestionId { get; set; }
    public string Lang { get; set; } = Languages.Default;
    public string Text { get; set; } = "";
    public string Explanation { get; set; } = "";
}

public class Answer
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public bool IsCorrect { get; set; }
    public int SortOrder { get; set; }
    public List<AnswerTranslation> Translations { get; set; } = [];
}

public class AnswerTranslation : ITranslation
{
    public int AnswerId { get; set; }
    public string Lang { get; set; } = Languages.Default;
    public string Text { get; set; } = "";
}
