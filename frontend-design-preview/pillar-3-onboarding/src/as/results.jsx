// Assessment Results page — mirrors the canonical frontend/src/features/assessment/AssessmentResults.tsx
// structure (Trophy pill header → Track Assessment h1 → Status·Duration → Score+Skill breakdown 2-col →
// Per-category scores list → Strengths/Focus areas → Retake + Continue to dashboard), with the
// Neon & Glass identity preserved (glass cards, signature-gradient progress fills, custom ScoreGauge + RadarChart).

function AssessmentResults({ dark, setDark, onGenerate }) {
  // Mock data structured like the real assessmentSlice result payload.
  const result = {
    track: "Full Stack",
    status: "Completed",
    totalScore: 76,
    skillLevel: "Intermediate",
    answeredCount: 28,
    totalQuestions: 30,
    durationSec: 2322, // 38m 42s
    categoryScores: [
      { category:"Correctness", score:84, correctCount:5, totalAnswered:6 },
      { category:"Readability", score:81, correctCount:7, totalAnswered:8 },
      { category:"Security",    score:58, correctCount:4, totalAnswered:7 },
      { category:"Performance", score:65, correctCount:3, totalAnswered:5 },
      { category:"Design",      score:72, correctCount:3, totalAnswered:4 },
    ],
  };

  const overallScore = Math.round(result.totalScore);
  const level = result.skillLevel;
  const grade =
    overallScore >= 90 ? "A" :
    overallScore >= 80 ? "A-" :
    overallScore >= 70 ? "B" :
    overallScore >= 60 ? "C" :
    overallScore >= 50 ? "D" : "F";

  const radarData = result.categoryScores.map(c => ({ label: c.category, value: c.score }));
  const strengths = result.categoryScores
    .filter(c => c.score >= 70)
    .sort((a,b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.category);
  const weaknesses = result.categoryScores
    .filter(c => c.score < 60)
    .sort((a,b) => a.score - b.score)
    .slice(0, 3)
    .map(c => c.category);

  const minutes = Math.floor(result.durationSec / 60);
  const seconds = result.durationSec % 60;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <TopBar variant="minimal" dark={dark} setDark={setDark} />
      <main className="relative pt-20 pb-10 px-4">
        <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
          {/* Header — centered */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-3 brand-gradient-bg text-white rounded-full px-4 py-1.5 text-[13px] font-medium shadow-[0_8px_24px_-10px_rgba(139,92,246,.55)]">
              <Icon name="Trophy" size={14}/>
              Assessment complete
            </div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {result.track} Assessment
            </h1>
            <p className="mt-2 text-[13.5px] text-slate-600 dark:text-slate-400">
              Status: <span className="font-semibold text-slate-800 dark:text-slate-200">{result.status}</span>
              {' · '}
              Duration: <span className="font-mono">{minutes}m {seconds}s</span>
            </p>
          </div>

          {/* Score + Skill breakdown — 2-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card variant="glass" className="p-6 flex flex-col items-center justify-center">
              <ScoreGauge score={overallScore} size={160} stroke={12}/>
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge tone="primary" icon="Gauge">{level}</Badge>
                  <Badge tone="neutral">Grade {grade}</Badge>
                </div>
                <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
                  Answered <span className="font-mono text-slate-800 dark:text-slate-200">{result.answeredCount}</span> of <span className="font-mono text-slate-800 dark:text-slate-200">{result.totalQuestions}</span> questions
                </p>
              </div>
            </Card>
            <Card variant="glass" className="p-5">
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Skill breakdown</h3>
              <RadarChart data={radarData} size={280}/>
            </Card>
          </div>

          {/* Per-category scores list */}
          <Card variant="glass" className="p-5">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-4">Per-category scores</h3>
            <div className="space-y-3.5">
              {result.categoryScores.map(c => (
                <div key={c.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13.5px] font-medium text-slate-700 dark:text-slate-200">{c.category}</span>
                    <span className="text-[12.5px] text-slate-500 dark:text-slate-400 font-mono">
                      {c.correctCount}/{c.totalAnswered} correct · {Math.round(c.score)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full brand-gradient-bg" style={{ width: c.score + '%' }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Strengths + Focus areas — 2-col (conditional) */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <Card variant="glass" className="p-5">
                  <h3 className="text-[15px] font-semibold mb-3 text-emerald-600 dark:text-emerald-400">Strengths</h3>
                  <ul className="space-y-2 list-disc list-inside text-[13.5px] text-slate-700 dark:text-slate-300">
                    {strengths.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </Card>
              )}
              {weaknesses.length > 0 && (
                <Card variant="glass" className="p-5">
                  <h3 className="text-[15px] font-semibold mb-3 text-amber-600 dark:text-amber-400">Focus areas</h3>
                  <ul className="space-y-2 list-disc list-inside text-[13.5px] text-slate-700 dark:text-slate-300">
                    {weaknesses.map(w => <li key={w}>{w}</li>)}
                  </ul>
                  <p className="mt-3 text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your personalized learning path is being generated around these areas. Check the Dashboard or Learning Path in a few seconds.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Actions — right-aligned */}
          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Button variant="glass" size="md" leftIcon="RotateCcw">
              Retake (available after 30 days)
            </Button>
            <Button variant="gradient" size="md" rightIcon="ArrowRight" onClick={onGenerate}>
              Continue to dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
window.AssessmentResults = AssessmentResults;
