using DrivingTest.Application.Features.Admin;

namespace DrivingTest.Application.Tests;

public class QuestionInputValidatorTests
{
    private static AnswerInput Answer(bool correct, string vi = "Đáp án") =>
        new(null, correct, new Dictionary<string, string> { ["vi"] = vi });

    private static QuestionInput Valid() => new(
        Number: 1, TopicId: 1, IsCritical: false, IsActive: true, ImageUrl: null,
        Texts: new Dictionary<string, QuestionTextInput> { ["vi"] = new("Câu hỏi?", "Giải thích") },
        Answers: [Answer(true), Answer(false), Answer(false)]);

    private static bool IsValid(QuestionInput input) => new QuestionInputValidator().Validate(input).IsValid;

    [Fact]
    public void ValidQuestion_Passes() => Assert.True(IsValid(Valid()));

    [Fact]
    public void MissingVietnameseText_Fails()
    {
        var q = Valid() with { Texts = new Dictionary<string, QuestionTextInput> { ["en"] = new("Question?", null) } };
        Assert.False(IsValid(q));
    }

    [Fact]
    public void NoCorrectAnswer_Fails() =>
        Assert.False(IsValid(Valid() with { Answers = [Answer(false), Answer(false)] }));

    [Fact]
    public void TwoCorrectAnswers_Fails() =>
        Assert.False(IsValid(Valid() with { Answers = [Answer(true), Answer(true)] }));

    [Fact]
    public void SingleAnswer_Fails() =>
        Assert.False(IsValid(Valid() with { Answers = [Answer(true)] }));

    [Fact]
    public void AnswerWithoutVietnamese_Fails() =>
        Assert.False(IsValid(Valid() with { Answers = [Answer(true), Answer(false, vi: " ")] }));

    [Fact]
    public void UnsupportedLanguage_Fails()
    {
        var q = Valid() with
        {
            Texts = new Dictionary<string, QuestionTextInput>
            {
                ["vi"] = new("Câu hỏi?", null),
                ["fr"] = new("Question ?", null)
            }
        };
        Assert.False(IsValid(q));
    }

    [Theory]
    [InlineData("/img/q1.png", true)]
    [InlineData("https://cdn.example.com/q1.png", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("ftp://example.com/a.png", false)]
    public void ImageUrl_MustBeHttpOrRootPath(string url, bool expected) =>
        Assert.Equal(expected, IsValid(Valid() with { ImageUrl = url }));
}
