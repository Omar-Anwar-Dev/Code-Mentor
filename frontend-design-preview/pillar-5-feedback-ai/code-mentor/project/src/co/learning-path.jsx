// Learning Path page

const PATH_TASKS = [
  { n:1, title:"REST API with Express",        category:"Backend",   hours:6, diff:3, lang:"JavaScript", status:"completed" },
  { n:2, title:"JWT Authentication",           category:"Security",  hours:4, diff:4, lang:"JavaScript", status:"completed" },
  { n:3, title:"PostgreSQL with Prisma",       category:"Databases", hours:8, diff:3, lang:"TypeScript", status:"completed" },
  { n:4, title:"React Form Validation",        category:"Frontend",  hours:5, diff:3, lang:"TypeScript", status:"in_progress" },
  { n:5, title:"WebSocket Chat",               category:"Real-time", hours:7, diff:4, lang:"TypeScript", status:"not_started" },
  { n:6, title:"Docker Multi-Service Setup",   category:"DevOps",    hours:6, diff:5, lang:"Dockerfile", status:"locked" },
  { n:7, title:"End-to-End Testing",           category:"Testing",   hours:6, diff:4, lang:"TypeScript", status:"locked" },
];

function NumberCircle({ n, status }) {
  if (status === "completed") return <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0"><Icon name="Check" size={16}/></div>;
  if (status === "in_progress") return <div className="w-9 h-9 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-200 border border-primary-400/40 flex items-center justify-center shrink-0 font-mono text-[13px] font-semibold shadow-[0_0_0_3px_rgba(139,92,246,.12)]">{n}</div>;
  if (status === "locked") return <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 relative font-mono text-[13px]"><Icon name="Lock" size={13}/></div>;
  return <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 font-mono text-[13px]">{n}</div>;
}

function PathTaskRow({ task }) {
  return (
    <Card variant="glass" className="p-5 flex items-start gap-4">
      <NumberCircle n={task.n} status={task.status}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{task.title}</h3>
          {task.status === "completed" ? <Badge tone="success" icon="CircleCheck">Completed</Badge> : null}
          {task.status === "in_progress" ? <Badge tone="primary" icon="Play" glow pulse>In progress</Badge> : null}
        </div>
        <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><Icon name="BookOpen" size={11}/>{task.category}</span>
          <span className="inline-flex items-center gap-1"><Icon name="Clock" size={11}/>{task.hours}h</span>
          <span className="inline-flex items-center gap-1"><DifficultyStars level={task.diff} size={10}/></span>
          <CategoryBadge>{task.lang}</CategoryBadge>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <Button variant="outline" size="sm" rightIcon="ArrowRight">Open</Button>
        {task.status === "not_started" ? <Button variant="gradient" size="sm">Start</Button> : null}
        {task.status === "locked" ? <Button variant="outline" size="sm" leftIcon="Lock" disabled>Locked</Button> : null}
      </div>
    </Card>
  );
}

function LearningPathPage() {
  return (
    <AppLayout active="learning-path" title="Learning Path">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[30px] font-semibold tracking-tight brand-gradient-text">Your Full Stack Path</h1>
            <Badge tone="primary" icon="Layers">7 tasks</Badge>
          </div>
          <p className="mt-1.5 text-[13.5px] text-slate-500 dark:text-slate-400 font-mono">Generated May 7, 2026 · Estimated 42 h</p>
        </div>

        <div className="glass-frosted rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Overall Progress</span>
            <span className="brand-gradient-text font-bold text-[18px]">43% complete</span>
          </div>
          <ProgressBar value={43} size="md"/>
          <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">3 of 7 tasks done</p>
        </div>

        <div className="space-y-3">
          {PATH_TASKS.map(t => <PathTaskRow key={t.n} task={t}/>)}
        </div>
      </div>
    </AppLayout>
  );
}
window.LearningPathPage = LearningPathPage;
