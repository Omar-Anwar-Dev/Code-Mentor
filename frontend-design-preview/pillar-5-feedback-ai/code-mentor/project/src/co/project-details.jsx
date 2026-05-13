// Project Details page

function ProjectTabContent_Overview() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Project Overview</h3>
        <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
          Build a multi-step form with Zod schema validation, error states tied to specific fields, an async username-availability check that doesn't block the UI, and accessible error messaging surfaced through ARIA. Submission should pass a small Jest suite covering typing errors and only fire when both step schemas validate.
        </p>
      </div>

      <div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-3">Learning Objectives</h3>
        <ul className="space-y-2">
          {[
            "Validate complex form schemas with Zod",
            "Bind field-level error states to inputs",
            "Handle async validators without blocking the UI",
            "Surface accessible error messaging (ARIA + role=alert)",
          ].map((t,i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-700 dark:text-slate-300">
              <Icon name="CircleCheck" size={16} className="text-primary-500 dark:text-primary-300 shrink-0 mt-0.5"/>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-3 inline-flex items-center gap-2">
          <Icon name="History" size={16} className="text-slate-500"/>
          Previous Submissions
        </h3>
        <div className="rounded-xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] p-3 flex items-center gap-3 flex-wrap">
          <SubmissionStatusPill status="failed"/>
          <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">Dec 22, 2024 · 02:15 PM</span>
          <span className="ml-auto text-[14px] font-semibold text-red-600 dark:text-red-400">65%</span>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsPage() {
  const [tab, setTab] = coUseState("overview");
  const tabs = [
    { key:"overview",     label:"Overview",     icon:"FileText" },
    { key:"requirements", label:"Requirements", icon:"Target" },
    { key:"deliverables", label:"Deliverables", icon:"Package" },
    { key:"resources",    label:"Resources",    icon:"BookOpen" },
  ];
  return (
    <AppLayout active="learning-path" title="Project Details">
      <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
        <a href="#learning-path" onClick={(e)=>{ e.preventDefault(); window.__coGoto?.("learning-path"); }} className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300">
          <Icon name="ArrowLeft" size={14}/> Back to Learning Path
        </a>

        <div className="glass-frosted rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">Task 4</span>
                <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-primary-500/15 text-primary-700 dark:text-primary-200 border border-primary-400/30 text-[13px] font-medium">
                  <Icon name="Play" size={12}/> In Progress
                </span>
              </div>
              <h1 className="mt-2 text-[30px] font-semibold tracking-tight brand-gradient-text">React Form Validation</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300 max-w-2xl">
                Build a multi-step form with Zod schema validation, error states tied to specific fields, async username-availability check, and accessible error messaging. Should pass a small Jest suite of typing-error tests and submit only when all schemas validate.
              </p>
              <div className="mt-3 flex items-center gap-4 flex-wrap text-[13px] text-slate-600 dark:text-slate-300">
                <Badge tone="neutral">Frontend</Badge>
                <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={13}/>5 hours</span>
                <span className="inline-flex items-center gap-1.5">Difficulty: <DifficultyStars level={3} size={13}/></span>
              </div>
            </div>
            <div className="shrink-0">
              <Button variant="gradient" size="lg" rightIcon="Send">Submit Code</Button>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-[12.5px] text-slate-500 dark:text-slate-400 mr-3">Prerequisites:</span>
            <span className="inline-flex items-center gap-2 flex-wrap">
              <Badge tone="success" icon="CircleCheck">PostgreSQL with Prisma</Badge>
              <Badge tone="success" icon="CircleCheck">JWT Authentication</Badge>
            </span>
          </div>
        </div>

        <div className="glass-frosted rounded-2xl p-6 overflow-hidden">
          <TabsStrip tabs={tabs} active={tab} onChange={setTab}/>
          <div className="pt-6">
            {tab === "overview" ? <ProjectTabContent_Overview/> : (
              <div className="text-[14px] text-slate-500 dark:text-slate-400 py-8 text-center">
                <Icon name="FolderOpen" size={28} className="inline-block text-slate-300 dark:text-white/20 mb-2"/>
                <div>Content for the <span className="text-primary-600 dark:text-primary-300 font-medium">{tabs.find(t=>t.key===tab)?.label}</span> tab.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
window.ProjectDetailsPage = ProjectDetailsPage;
