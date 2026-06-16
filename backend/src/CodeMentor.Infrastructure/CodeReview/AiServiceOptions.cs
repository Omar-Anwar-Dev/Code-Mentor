namespace CodeMentor.Infrastructure.CodeReview;

public sealed class AiServiceOptions
{
    public const string SectionName = "AiService";

    /// <summary>Base URL of the FastAPI AI service. Dev: http://localhost:8001 .</summary>
    public string BaseUrl { get; set; } = "http://localhost:8001";

    /// <summary>HTTP request timeout in seconds for analyze-zip (LLM calls are long).</summary>
    public int TimeoutSeconds { get; set; } = 300;
}
