// Dashboard page

const DASH_TASKS = [
  { id:1, title:"REST API with Express",      category:"Backend",   difficulty:3, hours:6, status:"completed" },
  { id:2, title:"JWT Authentication",         category:"Security",  difficulty:4, hours:4, status:"completed" },
  { id:3, title:"PostgreSQL with Prisma",     category:"Databases", difficulty:3, hours:8, status:"completed" },
  { id:4, title:"React Form Validation",      category:"Frontend",  difficulty:3, hours:5, status:"in_progress" },
  { id:5, title:"WebSocket Chat",             category:"Real-time", difficulty:4, hours:7, status:"not_started" },
];
const SKILLS = [
  { name:"Correctness", score:84, level:"Advanced" },
  { name:"Readability", score:81, level:"Advanced" },
  { name:"Security",    score:58, level:"Intermediate" },
  { name:"Performance", score:65, level:"Intermediate" },
  { name:"Design",      score:72, level:"Intermediate" },
];
const RECENT_SUBS = [
  { status:"completed",  task:"JWT Authentication",     meta:"2026-05-12 09:24",  score:86 },
  { status:"processing", task:"PostgreSQL with Prisma", meta:"2026-05-12 08:55" },
  { status:"completed",  task:"REST API with Express",  meta:"2026-05-11 18:12",  score:79 },
];

function DashWelcome() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-tight inline-flex items-center gap-2 flex-wrap">
          <span>Welcome back,</span>
          <span className="brand-gradient-text">Layla</span>
          <Icon name="Hand" size={28} className="text-amber-500 inline-block animate-float"/>
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-300">Your <span className="text-primary-700 dark:text-primary-200 font-medium">Full Stack</span> learning path has 7 tasks. 3 complete.</p>
        <div className="mt-3"><XpLevelChip level={7} xp={1240} target={2000}/></div>
      </div>
      <Button variant="outline" size="md" leftIcon="Sparkles">Retake Assessment</Button>
    </div>
  );
}

function ActivePathCard() {
  const total = 7, done = 3;
  const pct = Math.round((done/total)*100);
  const top5 = DASH_TASKS;
  const nextUp = DASH_TASKS.find(t => t.status === "in_progress");
  return (
    <Card variant="glass" className="lg:col-span-2">
      <CardHeader
        title="Active Learning Path"
        right={<Badge tone="primary" icon="Layers">Full Stack</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <CircularProgress value={Math.round((done/total)*100)} size={80} stroke={8}/>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">Overall progress</span>
              <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">{pct}%</span>
            </div>
            <ProgressBar value={pct} size="md"/>
            <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{done} of {total} tasks complete</p>
          </div>
        </div>

        <div className="space-y-2">
          {top5.map(t => {
            const cta = t.status === "completed" ? "Review" : t.status === "in_progress" ? "Continue" : "Start";
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/40 dark:border-white/5">
                <TaskStatusIcon status={t.status}/>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-slate-900 dark:text-slate-100 truncate">{t.title}</div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>{t.category}</span><span>·</span>
                    <span className="inline-flex items-center gap-1">difficulty <DifficultyStars level={t.difficulty} size={10}/></span><span>·</span>
                    <span>{t.hours}h</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" rightIcon="ArrowRight">{cta}</Button>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-700/40" style={{ background:"linear-gradient(135deg, rgba(139,92,246,0.08), rgba(168,85,247,0.08))" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-primary-700 dark:text-primary-200">Next up</div>
              <div className="mt-0.5 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{nextUp?.title}</div>
            </div>
            <Button variant="primary" size="md" rightIcon="ArrowRight">Continue Task</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SkillSnapshotCard() {
  return (
    <Card variant="glass">
      <CardHeader title="Skill Snapshot"/>
      <CardBody className="space-y-3.5">
        {SKILLS.map(s => (
          <div key={s.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
              <span className="text-[12px] text-slate-500 dark:text-slate-400">· <span className="font-mono">{s.score}%</span></span>
            </div>
            <ProgressBar value={s.score} size="sm"/>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{s.level}</div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function RecentSubmissionsCard() {
  return (
    <Card variant="glass">
      <CardHeader title="Recent Submissions" right={<a href="#" onClick={e=>e.preventDefault()} className="text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline">View all</a>}/>
      <div className="px-2 pb-2">
        {RECENT_SUBS.map((s,i) => (
          <div key={i} className={"flex items-center gap-3 px-3 py-3 " + (i>0 ? "border-t border-slate-200/40 dark:border-white/5" : "")}>
            <SubmissionStatusPill status={s.status}/>
            <div className="min-w-0 flex-1">
              <a href="#" onClick={e=>e.preventDefault()} className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-300 truncate block">{s.task}</a>
              <div className="text-[11.5px] font-mono text-slate-500 dark:text-slate-400">{s.meta}{s.score!=null ? ` · ${s.score}%` : ""}</div>
            </div>
            <Button variant="ghost" size="sm" rightIcon="ArrowRight">View</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickActionCard({ icon, gradient, title, description }) {
  return (
    <Card variant="glass" className="p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform cursor-pointer group">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-110" style={{ backgroundImage: gradient, boxShadow:"0 8px 24px -8px rgba(15,23,42,.35)" }}>
        <Icon name={icon} size={22}/>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>
      </div>
      <Icon name="ArrowUpRight" size={14} className="text-slate-400 group-hover:text-primary-500 transition-colors"/>
    </Card>
  );
}

function Dashboard() {
  return (
    <AppLayout active="dashboard" title="Dashboard">
      <div className="space-y-6">
        <DashWelcome/>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardGradient icon="Target" gradient="linear-gradient(135deg,#10b981,#34d399)" value="3 / 7" label="Tasks Complete"/>
          <StatCardGradient icon="Play"   gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" value="1"     label="In Progress"/>
          <StatCardGradient icon="Clock"  gradient="linear-gradient(135deg,#8b5cf6,#ec4899)" value="42h"   label="Estimated Path"/>
          <StatCardGradient icon="Trophy" gradient="linear-gradient(135deg,#f97316,#f59e0b)" value="78%"   label="Avg Skill Score"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivePathCard/>
          <SkillSnapshotCard/>
        </div>

        <RecentSubmissionsCard/>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <QuickActionCard icon="BookOpen" gradient="linear-gradient(135deg,#10b981,#34d399)" title="Browse Task Library" description="Explore every task across all tracks"/>
          <QuickActionCard icon="Trophy"   gradient="linear-gradient(135deg,#f97316,#fbbf24)" title="Your Learning CV"     description="3 verified projects · public"/>
          <QuickActionCard icon="Code"     gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" title="Submit Code"          description="Get AI feedback on your work"/>
        </div>
      </div>
    </AppLayout>
  );
}
window.Dashboard = Dashboard;
