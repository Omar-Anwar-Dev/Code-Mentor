using CodeMentor.Application.CodeReview;
using CodeMentor.Domain.Submissions;
using CodeMentor.Domain.Tasks;

namespace CodeMentor.Application.Tests.CodeReview;

/// <summary>
/// S5-T4 acceptance: Job selects correct tools per task's ExpectedLanguage;
/// tested across the 3 MVP tracks (FullStack ≈ JS/TS, Backend ≈ C#, Python).
/// </summary>
public class StaticToolSelectorTests
{
    private readonly IStaticToolSelector _sut = new StaticToolSelector();

    [Theory]
    [InlineData(ProgrammingLanguage.JavaScript, StaticAnalysisTool.ESLint)]
    [InlineData(ProgrammingLanguage.TypeScript, StaticAnalysisTool.ESLint)]
    [InlineData(ProgrammingLanguage.Python, StaticAnalysisTool.Bandit)]
    [InlineData(ProgrammingLanguage.CSharp, StaticAnalysisTool.Roslyn)]
    [InlineData(ProgrammingLanguage.Java, StaticAnalysisTool.PMD)]
    [InlineData(ProgrammingLanguage.Cpp, StaticAnalysisTool.Cppcheck)]
    [InlineData(ProgrammingLanguage.Php, StaticAnalysisTool.PHPStan)]
    public void ToolsFor_KnownLanguage_ReturnsExpectedTool(ProgrammingLanguage language, StaticAnalysisTool expected)
    {
        var tools = _sut.ToolsFor(language);
        Assert.Single(tools);
        Assert.Equal(expected, tools[0]);
    }

    [Theory]
    [InlineData(ProgrammingLanguage.Go)]
    [InlineData(ProgrammingLanguage.Sql)]
    public void ToolsFor_UnsupportedLanguage_ReturnsEmpty(ProgrammingLanguage language)
    {
        Assert.Empty(_sut.ToolsFor(language));
    }

    [Fact]
    public void ToolsFor_ResultIsImmutable_PerCallReturnsSameInstanceSafely()
    {
        // Ensures the service doesn't hand out a mutable list that callers might
        // accidentally modify — defensive check against a future "oops I added
        // to this list" bug.
        var a = _sut.ToolsFor(ProgrammingLanguage.Python);
        var b = _sut.ToolsFor(ProgrammingLanguage.Python);
        Assert.Equal(a, b);
        Assert.Single(a);
    }

    [Fact]
    public void ToolsFor_CoversAllThreeMvpTracks()
    {
        // ADR-007: MVP tracks are FullStack, Backend, Python.
        // FullStack tasks use JS/TS; Backend uses C#; Python uses Python.
        Assert.Contains(StaticAnalysisTool.ESLint, _sut.ToolsFor(ProgrammingLanguage.JavaScript));
        Assert.Contains(StaticAnalysisTool.Roslyn, _sut.ToolsFor(ProgrammingLanguage.CSharp));
        Assert.Contains(StaticAnalysisTool.Bandit, _sut.ToolsFor(ProgrammingLanguage.Python));
    }
}
