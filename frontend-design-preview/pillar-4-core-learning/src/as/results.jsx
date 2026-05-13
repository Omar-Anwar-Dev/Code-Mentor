// Assessment Results page

function ResultsHero() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
      <div className="shrink-0">
        <ScoreGauge score={76} size={200} stroke={14}/>
      </div>
      <div className="text-center sm:text-left flex-1 min-w-0">
        <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Your level</div>
        <div className="mt-2 inline-flex items-center gap-2 glass-card px-4 py-2 rounded-2xl ring-1 ring-cyan-400/30">
          <Icon name="Gauge" size={18} className="text-cyan-500 dark:text-cyan-300"/>
          <span className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-neon-cyan">Intermediate</span>
        </div>
        <p className="mt-3 text-[14.5px] text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed">
          Strong on Correctness and Readability. Room to grow on Security and Performance.
        </p>
      </div>
    </div>
  );
}

function StrengthsList({ items, iconName, iconCls }) {
  return (
    <ul className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={"shrink-0 mt-0.5 " + iconCls}><Icon name={iconName} size={16}/></span>
          <span className="text-[13.5px] leading-snug text-slate-700 dark:text-slate-300">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function AssessmentResults({ dark, setDark, onGenerate }) {
  const radarData = [
    { label:"Correctness",  value:84 },
    { label:"Readability",  value:81 },
    { label:"Security",     value:58 },
    { label:"Performance",  value:65 },
    { label:"Design",       value:72 },
  ];
  const cats = [
    { icon:"CircleCheckBig", label:"Correctness",  score:84 },
    { icon:"BookOpen",       label:"Readability",  score:81 },
    { icon:"ShieldCheck",    label:"Security",     score:58 },
    { icon:"Zap",            label:"Performance",  score:65 },
    { icon:"LayoutGrid",     label:"Design",       score:72 },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <TopBar
        variant="minimal"
        dark={dark}
        setDark={setDark}
        center={
          <div className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">
            <Icon name="CircleCheck" size={12} className="text-emerald-500 dark:text-emerald-300"/>
            Completed in <span className="text-slate-800 dark:text-slate-200">38 minutes 42 seconds</span>
          </div>
        }
      />
      <main className="relative pt-20 pb-10 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <Card variant="glass" className="p-6 sm:p-7">
            <ResultsHero/>
          </Card>

          {/* Radar + breakdown */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card variant="glass" className="p-5">
              <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Per-category breakdown</div>
              <div className="mt-2">
                <RadarChart data={radarData} size={300}/>
              </div>
            </Card>
            <Card variant="glass" className="p-5">
              <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-3">Scores</div>
              <div className="space-y-3">
                {cats.map(c => <CategoryBar key={c.label} {...c}/>)}
              </div>
            </Card>
          </div>

          {/* Strengths / weaknesses */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card variant="neon" className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <Icon name="Trophy" size={15}/>
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">What you nailed</h3>
              </div>
              <StrengthsList
                iconName="CircleCheck"
                iconCls="text-emerald-500 dark:text-emerald-400"
                items={[
                  "Clean function decomposition — your code is easy to read and reason about.",
                  "Confident with control flow — you handled the trickiest correctness questions.",
                  "Solid grasp of fundamentals — data types, scopes, mutation patterns.",
                ]}
              />
            </Card>
            <Card variant="glass" className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                  <Icon name="Target" size={15}/>
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">What&rsquo;s worth working on</h3>
              </div>
              <StrengthsList
                iconName="CircleAlert"
                iconCls="text-amber-500 dark:text-amber-400"
                items={[
                  "Security — particularly input validation and parameterized queries.",
                  "Performance — recognize the cost of nested loops and unnecessary allocations.",
                  "Design — when to introduce abstraction vs keep things flat.",
                ]}
              />
            </Card>
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight" onClick={onGenerate}>
              Generate my learning path
            </Button>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button variant="glass" size="sm" leftIcon="Share2">Save &amp; share results</Button>
              <Button variant="ghost" size="sm" leftIcon="FileDown">View the report (PDF)</Button>
            </div>
            <p className="text-[11.5px] font-mono text-slate-500 dark:text-slate-400 mt-1">
              Re-take available 30 days from today. Your results are saved to your profile.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
window.AssessmentResults = AssessmentResults;
