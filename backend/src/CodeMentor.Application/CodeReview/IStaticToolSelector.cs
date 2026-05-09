using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.CodeReview;

/// <summary>
/// Maps a task's <see cref="ProgrammingLanguage"/> to the static-analysis tools
/// the pipeline should run on its submission. Used by SubmissionAnalysisJob to
/// decide which per-tool <c>StaticAnalysisResults</c> rows are expected.
///
/// Mapping is intentionally narrow (one tool per language for MVP); unsupported
/// languages return an empty list and the job records a static-analysis skip.
/// </summary>
public interface IStaticToolSelector
{
    IReadOnlyList<StaticAnalysisTool> ToolsFor(ProgrammingLanguage language);
}

public sealed class StaticToolSelector : IStaticToolSelector
{
    private static readonly IReadOnlyDictionary<ProgrammingLanguage, IReadOnlyList<StaticAnalysisTool>> Map
        = new Dictionary<ProgrammingLanguage, IReadOnlyList<StaticAnalysisTool>>
        {
            [ProgrammingLanguage.JavaScript] = new[] { StaticAnalysisTool.ESLint },
            [ProgrammingLanguage.TypeScript] = new[] { StaticAnalysisTool.ESLint },
            [ProgrammingLanguage.Python]     = new[] { StaticAnalysisTool.Bandit },
            [ProgrammingLanguage.CSharp]     = new[] { StaticAnalysisTool.Roslyn },
            [ProgrammingLanguage.Java]       = new[] { StaticAnalysisTool.PMD },
            [ProgrammingLanguage.Cpp]        = new[] { StaticAnalysisTool.Cppcheck },
            [ProgrammingLanguage.Php]        = new[] { StaticAnalysisTool.PHPStan },
        };

    public IReadOnlyList<StaticAnalysisTool> ToolsFor(ProgrammingLanguage language)
        => Map.TryGetValue(language, out var tools) ? tools : Array.Empty<StaticAnalysisTool>();
}
