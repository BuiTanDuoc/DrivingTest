namespace DrivingTest.Domain;

public interface ITranslation
{
    string Lang { get; }
}

public static class Languages
{
    public const string Default = "vi";
    public static readonly string[] Supported = ["vi", "en"];

    /// <summary>Chuẩn hóa mã ngôn ngữ ("en-US" → "en"); không hỗ trợ thì dùng tiếng Việt.</summary>
    public static string Normalize(string? lang)
    {
        if (string.IsNullOrWhiteSpace(lang)) return Default;
        var code = lang.Trim().ToLowerInvariant();
        var dash = code.IndexOfAny(['-', '_']);
        if (dash > 0) code = code[..dash];
        return Supported.Contains(code) ? code : Default;
    }

    /// <summary>Chọn bản dịch theo ngôn ngữ, fallback về tiếng Việt rồi bản bất kỳ.</summary>
    public static T? Pick<T>(IEnumerable<T> items, string lang) where T : class, ITranslation
        => items.FirstOrDefault(t => t.Lang == lang)
           ?? items.FirstOrDefault(t => t.Lang == Default)
           ?? items.FirstOrDefault();
}
