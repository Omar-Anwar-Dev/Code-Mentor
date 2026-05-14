using CodeMentor.Application.Admin;
using CodeMentor.Domain.Assessments;

namespace CodeMentor.Api.IntegrationTests.TestHost;

/// <summary>
/// S16-T4: test replacement for <c>QuestionGeneratorRefitClient</c>.
///
/// Returns scripted drafts so tests don't hit OpenAI. By default produces
/// <c>request.Count</c> drafts matching the requested category +
/// difficulty with placeholder question text and 4 distinct options.
/// Tests can override <see cref="ThrowWith"/> to simulate AI service
/// failures.
/// </summary>
public sealed class FakeAiQuestionGenerator : IAiQuestionGenerator
{
    /// <summary>Set to non-null to make every call throw with this status.</summary>
    public AiGeneratorFailedException? ThrowWith { get; set; }

    /// <summary>Records the last request so tests can assert what reached the wire.</summary>
    public int CallCount { get; private set; }
    public SkillCategory? LastCategory { get; private set; }
    public int? LastDifficulty { get; private set; }
    public int? LastCount { get; private set; }
    public IReadOnlyList<string>? LastExistingSnippets { get; private set; }

    /// <summary>When set, returns these drafts verbatim instead of synthesized ones.
    /// The fake still records call metadata.</summary>
    public IReadOnlyList<AiGeneratedDraft>? ScriptedDrafts { get; set; }

    public Task<AiGeneratedBatch> GenerateAsync(
        SkillCategory category,
        int difficulty,
        int count,
        bool includeCode,
        string? language,
        IReadOnlyList<string> existingSnippets,
        string correlationId,
        CancellationToken ct = default)
    {
        CallCount++;
        LastCategory = category;
        LastDifficulty = difficulty;
        LastCount = count;
        LastExistingSnippets = existingSnippets;

        if (ThrowWith is not null) throw ThrowWith;

        var drafts = ScriptedDrafts ?? Enumerable.Range(0, count)
            .Select(i => SyntheticDraft(category, difficulty, i, includeCode, language))
            .ToList();

        return Task.FromResult(new AiGeneratedBatch(
            BatchId: $"fake-batch-{Guid.NewGuid():N}".Substring(0, 16),
            Drafts: drafts,
            TokensUsed: 1234 * count,
            RetryCount: 0,
            PromptVersion: "generate_questions_v1"));
    }

    private static AiGeneratedDraft SyntheticDraft(
        SkillCategory category, int difficulty, int idx, bool includeCode, string? language) =>
        new(
            QuestionText: $"Synthetic test question {idx} for {category} at difficulty={difficulty}. Which option is correct?",
            CodeSnippet: includeCode ? $"// sample {language ?? "code"} snippet for {category}\nint x = {idx};" : null,
            CodeLanguage: includeCode ? language : null,
            Options: new[]
            {
                $"Option A (#{idx}) — the correct one",
                $"Option B (#{idx}) — common misconception",
                $"Option C (#{idx}) — adjacent topic",
                $"Option D (#{idx}) — wrong scope",
            },
            CorrectAnswer: "A",
            Explanation: $"Synthetic explanation for draft {idx}.",
            IrtA: 1.0 + (idx % 3) * 0.1,
            IrtB: difficulty switch { 1 => -1.0, 2 => 0.0, _ => 1.0 },
            Rationale: $"Synthetic rationale {idx}",
            Category: category,
            Difficulty: difficulty);
}
