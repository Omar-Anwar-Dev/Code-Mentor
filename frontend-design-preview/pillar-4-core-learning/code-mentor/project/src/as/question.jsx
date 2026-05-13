// Assessment Question page — exam-mode focused screen

function ProgressDots({ total = 30, current = 11, answered = 10 }) {
  const dots = [];
  for (let i = 1; i <= total; i++) {
    let cls = "w-1.5 h-1.5 rounded-full ";
    if (i <= answered) cls += "bg-primary-500 shadow-[0_0_4px_rgba(139,92,246,.6)]";
    else if (i === current) cls += "ring-2 ring-primary-300 bg-primary-500/30";
    else cls += "bg-slate-300/70 dark:bg-white/15";
    dots.push(<span key={i} className={cls} aria-hidden/>);
  }
  return <div className="flex items-center gap-[3px] mt-1.5 justify-center">{dots}</div>;
}

function ProgressCenter({ current = 11, total = 30, answered = 10 }) {
  const pct = ((current - 1) / total) * 100; // 10 done before current
  return (
    <div className="flex flex-col items-center min-w-0">
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Question <span className="text-slate-800 dark:text-slate-100">{current}</span> of {total}
      </div>
      <div className="mt-1 w-[240px] h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full brand-gradient-bg" style={{ width: pct + '%' }}/>
      </div>
      <ProgressDots total={total} current={current} answered={answered}/>
    </div>
  );
}

function TimerChip({ remaining = "32:18", warn = false }) {
  return (
    <div className={[
      "hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg glass font-mono text-[12.5px]",
      warn ? "text-amber-600 dark:text-amber-300" : "text-slate-700 dark:text-slate-200"
    ].join(" ")}>
      <Icon name="Clock" size={13}/>
      <span>{remaining}</span>
      <span className="text-slate-400 dark:text-slate-500">remaining</span>
    </div>
  );
}

function DifficultyDots({ level = 2, max = 3 }) {
  const dots = [];
  for (let i = 1; i <= max; i++) {
    dots.push(
      <span key={i} className={[
        "w-1.5 h-1.5 rounded-full",
        i <= level ? "bg-primary-500" : "bg-slate-300 dark:bg-white/20"
      ].join(" ")}/>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-white/60 dark:bg-white/[0.04] ring-1 ring-slate-200/70 dark:ring-white/10 text-[11.5px] text-slate-700 dark:text-slate-200">
      <span className="inline-flex items-center gap-[3px]">{dots}</span>
      <span>Difficulty {level}/{max}</span>
    </span>
  );
}

function CodeBlock() {
  const kw  = "text-violet-500 dark:text-violet-300";
  const fn  = "text-cyan-600 dark:text-cyan-300";
  const str = "text-emerald-600 dark:text-emerald-300";
  return (
    <pre className="glass-card p-3.5 text-[12.5px] leading-[1.6] font-mono overflow-x-auto whitespace-pre"><code>
        <div><span className={kw}>def</span> <span className={fn}>get_user_by_email</span>(email):</div>
        <div>{"    "}query = <span className={str}>{"f\"SELECT * FROM users WHERE email = '{email}'\""}</span></div>
        <div>{"    "}<span className={kw}>return</span> db.execute(query).fetchone()</div>
      </code></pre>
  );
}

function AssessmentQuestion({ dark, setDark, onExit }) {
  const [selected, setSelected] = asUseState("C");
  const [exitOpen, setExitOpen] = asUseState(false);

  const opts = [
    { letter:"A", text:"Sanitize the email string using ", code:"email.replace(\"'\", \"\")" },
    { letter:"B", text:"Wrap the query in a try/except block to handle SQL errors gracefully." },
    { letter:"C", text:"Use a parameterized query: ", code:"db.execute('SELECT * FROM users WHERE email = %s', (email,))" },
    { letter:"D", text:"Hash the email before passing it to the query." },
  ];

  return (
    <div className="relative min-h-screen">
      {/* subtle grid only, no orbs */}
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden/>
      <TopBar
        variant="exam"
        dark={dark}
        setDark={setDark}
        onExit={() => setExitOpen(true)}
        center={<ProgressCenter current={11} total={30} answered={10}/>}
        right={<TimerChip remaining="32:18"/>}
      />
      <main className="relative pt-20 pb-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card variant="glass" className="p-5 sm:p-6">
            {/* top row */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <Badge tone="cyan" icon="ScanSearch">Security</Badge>
              <DifficultyDots level={2} max={3}/>
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/60 dark:bg-white/[0.04] ring-1 ring-slate-200/70 dark:ring-white/10 font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
                <Icon name="Timer" size={11}/>~90s
              </span>
            </div>

            <h3 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
              Which of the following correctly mitigates a SQL injection vulnerability in this Python function?
            </h3>

            <div className="mt-3">
              <CodeBlock/>
            </div>

            {/* options */}
            <div className="mt-4 grid grid-cols-1 gap-2">
              {opts.map(o => (
                <AnswerOption
                  key={o.letter}
                  letter={o.letter}
                  text={o.text}
                  code={o.code}
                  selected={selected === o.letter}
                  onClick={() => setSelected(o.letter)}
                />
              ))}
            </div>

            {/* actions */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="ghost" size="md" leftIcon="ArrowLeft">Previous</Button>
              <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400">Skip this question</Button>
              <Button variant="gradient" size="md" rightIcon="ArrowRight">Next</Button>
            </div>
          </Card>

          <p className="mt-3 text-center text-[11.5px] font-mono text-slate-500 dark:text-slate-400">
            <Icon name="Keyboard" size={11} className="inline -mt-0.5 mr-1"/>
            Tip: press <span className="text-slate-700 dark:text-slate-200">A</span>–<span className="text-slate-700 dark:text-slate-200">D</span> to select, <span className="text-slate-700 dark:text-slate-200">Enter</span> to continue
          </p>
        </div>
      </main>

      <ExitModal open={exitOpen} onClose={() => setExitOpen(false)} onConfirm={() => { setExitOpen(false); onExit?.(); }} answered={10}/>
    </div>
  );
}
window.AssessmentQuestion = AssessmentQuestion;
