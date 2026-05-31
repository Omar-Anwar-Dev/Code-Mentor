using System.Net;
using CodeMentor.Application.Admin;
using CodeMentor.Domain.Assessments;
using CodeMentor.Infrastructure.CodeReview;
using Microsoft.Extensions.Logging;
using Refit;

namespace CodeMentor.Infrastructure.Admin;

/// <summary>
/// S16-T4 / F15 (ADR-049 / ADR-054): production implementation of
/// <see cref="IAiQuestionGenerator"/> backed by the AI service
/// <c>POST /api/generate-questions</c> endpoint via Refit.
///
/// Translates HTTP-level errors from the AI service into
/// <see cref="AiGeneratorFailedException"/> so the route layer can map
/// onto the matching status code (503 / 422 / 504 / 400).
/// </summary>
public sealed class QuestionGeneratorRefitClient : IAiQuestionGenerator
{
    private readonly IQuestionGeneratorRefit _refit;
    private readonly ILogger<QuestionGeneratorRefitClient> _log;

    public QuestionGeneratorRefitClient(
        IQuestionGeneratorRefit refit,
        ILogger<QuestionGeneratorRefitClient> log)
    {
        _refit = refit;
        _log = log;
    }

    public async Task<AiGeneratedBatch> GenerateAsync(
        SkillCategory category,
        int difficulty,
        int count,
        bool includeCode,
        string? language,
        IReadOnlyList<string> existingSnippets,
        string correlationId,
        CancellationToken ct = default)
    {
        var request = new QGenerateRequest(
            Category: category.ToString(),
            Difficulty: difficulty,
            Count: count,
            IncludeCode: includeCode,
            Language: language,
            ExistingSnippets: existingSnippets ?? Array.Empty<string>());

        QGenerateResponse response;
        try
        {
            response = await _refit.GenerateAsync(request, correlationId, ct);
        }
        catch (ApiException ex)
        {
            _log.LogWarning(ex,
                "[corr={CorrelationId}] question generator returned HTTP {Status}",
                correlationId, (int)ex.StatusCode);
            throw new AiGeneratorFailedException(
                (int)ex.StatusCode,
                $"AI service returned {(int)ex.StatusCode}: {ExtractDetail(ex)}");
        }
        catch (HttpRequestException ex)
        {
            _log.LogWarning(ex,
                "[corr={CorrelationId}] question generator HTTP transport failure",
                correlationId);
            throw new AiGeneratorFailedException(
                (int)HttpStatusCode.ServiceUnavailable,
                $"AI service transport error: {ex.Message}");
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _log.LogWarning(ex,
                "[corr={CorrelationId}] question generator timed out", correlationId);
            throw new AiGeneratorFailedException(
                (int)HttpStatusCode.GatewayTimeout,
                "AI service request timed out.");
        }

        var drafts = response.Drafts
            .Select(d => new AiGeneratedDraft(
                QuestionText: d.QuestionText,
                CodeSnippet: d.CodeSnippet,
                CodeLanguage: d.CodeLanguage,
                Options: d.Options,
                CorrectAnswer: d.CorrectAnswer,
                Explanation: d.Explanation,
                IrtA: d.IrtA,
                IrtB: d.IrtB,
                Rationale: d.Rationale,
                Category: ParseCategory(d.Category, category),
                Difficulty: d.Difficulty))
            .ToList();

        return new AiGeneratedBatch(
            BatchId: response.BatchId,
            Drafts: drafts,
            TokensUsed: response.TokensUsed,
            RetryCount: response.RetryCount,
            PromptVersion: response.PromptVersion);
    }

    private static SkillCategory ParseCategory(string raw, SkillCategory fallback)
    {
        return Enum.TryParse<SkillCategory>(raw, ignoreCase: false, out var c) ? c : fallback;
    }

    private static string ExtractDetail(ApiException ex)
    {
        try
        {
            return ex.Content ?? ex.ReasonPhrase ?? ex.Message;
        }
        catch
        {
            return ex.Message;
        }
    }
}
