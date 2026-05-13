// Assessment Start page — pre-launch screen

function AssessmentStart({ dark, setDark, onBegin }) {
  const [track, setTrack] = asUseState("fullstack");
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <TopBar variant="minimal" dark={dark} setDark={setDark} />
      <main className="relative pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card variant="glass" className="p-7 sm:p-9">
            <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-[12px] font-medium text-slate-700 dark:text-slate-200">
              <Icon name="Sparkles" size={11} className="text-primary-500 dark:text-primary-300"/>
              Skill assessment · adaptive
            </div>
            <h1 className="mt-3 text-[34px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1]">
              Let&rsquo;s figure out where you are.
            </h1>
            <p className="mt-3 text-[15px] sm:text-[16px] text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Thirty adaptive questions that calibrate to your level as you answer. We&rsquo;ll plot your strengths across five engineering categories and generate a personalized learning path from the result.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ExpectationTile icon="Clock"      title="~40 minutes" body="Can pause anytime"/>
              <ExpectationTile icon="ListChecks" title="30 questions" body="Difficulty adapts to your answers"/>
              <ExpectationTile icon="Layers"     title="5 categories" body="Correctness · Readability · Security · Performance · Design"/>
              <ExpectationTile icon="TrendingUp" title="Beginner → Advanced" body="Get your level + per-category breakdown"/>
            </div>

            <div className="mt-5">
              <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">Track</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <TrackCard icon="Code"       name="Full Stack" blurb="React + .NET"        selected={track==="fullstack"} onClick={()=>setTrack("fullstack")}/>
                <TrackCard icon="ScanSearch" name="Backend"    blurb="ASP.NET + Python"    selected={track==="backend"}   onClick={()=>setTrack("backend")}/>
                <TrackCard icon="BookOpen"   name="Python"     blurb="Data + Web"          selected={track==="python"}    onClick={()=>setTrack("python")}/>
              </div>
            </div>

            <div className="mt-5">
              <Button variant="gradient" size="lg" leftIcon="Play" rightIcon="ArrowRight" className="w-full" onClick={onBegin}>
                Begin assessment
              </Button>
            </div>

            <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400 text-center">
              You can pause and resume at any time. Re-take available 30 days after completion.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
window.AssessmentStart = AssessmentStart;
