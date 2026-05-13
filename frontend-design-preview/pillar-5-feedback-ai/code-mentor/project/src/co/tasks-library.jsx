// Tasks Library page

const LIB_TASKS = [
  { id:1, title:"REST API with Express",       track:"FullStack", category:"Algorithms",     lang:"JavaScript", diff:3, hours:6 },
  { id:2, title:"JWT Authentication",          track:"FullStack", category:"Security",       lang:"JavaScript", diff:4, hours:4 },
  { id:3, title:"PostgreSQL with Prisma",      track:"FullStack", category:"Databases",      lang:"TypeScript", diff:3, hours:8 },
  { id:4, title:"React Form Validation",       track:"FullStack", category:"OOP",            lang:"TypeScript", diff:3, hours:5 },
  { id:5, title:"WebSocket Chat",              track:"FullStack", category:"DataStructures", lang:"TypeScript", diff:4, hours:7 },
  { id:6, title:"Docker Compose Stack",        track:"FullStack", category:"OOP",            lang:"CSharp",     diff:5, hours:6 },
  { id:7, title:"Type-Safe Reducers",          track:"FullStack", category:"DataStructures", lang:"TypeScript", diff:3, hours:3 },
  { id:8, title:"Trie-Based Fuzzy Search",     track:"FullStack", category:"Algorithms",     lang:"Python",     diff:4, hours:8 },
  { id:9, title:"Async Job Queue (Hangfire)",  track:"FullStack", category:"DataStructures", lang:"CSharp",     diff:4, hours:6 },
];

function NativeSelect({ label, value, options = ["Any"] }) {
  return (
    <div className="relative">
      <select defaultValue={value || options[0]} className="appearance-none h-10 pl-3 pr-8 rounded-xl text-[13px] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 ring-brand">
        {options.map(o => <option key={o} value={o}>{label}: {o}</option>)}
      </select>
      <Icon name="ChevronDown" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );
}

function TaskCard({ t }) {
  return (
    <Card variant="glass" className="p-0 hover:-translate-y-0.5 transition-all cursor-pointer h-full group"
      onClick={()=>window.__coGoto?.("task-detail")}>
      <CardBody className="p-5 flex flex-col h-full gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15.5px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-200 transition-colors">{t.title}</h3>
          <Badge tone="primary">{t.track}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="neutral">{t.category}</Badge>
          <Badge tone="neutral">{t.lang}</Badge>
        </div>
        <div className="mt-auto flex items-center gap-3 pt-2 text-[12px] text-slate-500 dark:text-slate-400">
          <DifficultyStars level={t.diff} size={12}/>
          <span className="inline-flex items-center gap-1"><Icon name="Clock" size={12}/>{t.hours}h</span>
          <Icon name="ChevronRight" size={14} className="ml-auto text-slate-400 group-hover:text-primary-500"/>
        </div>
      </CardBody>
    </Card>
  );
}

function TasksLibraryPage() {
  return (
    <AppLayout active="tasks" title="Task Library">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Task Library</h1>
          <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">Curated real-world tasks across Full Stack, Backend, and Python tracks.</p>
        </div>

        <Card variant="glass">
          <CardBody className="p-4 space-y-3">
            <TextInput prefix="Search" placeholder="Search task titles..."/>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect label="Track"      value="FullStack" options={["Any","FullStack","Backend","Python"]}/>
              <NativeSelect label="Category"   options={["Any","Algorithms","DataStructures","OOP","Security","Databases"]}/>
              <NativeSelect label="Language"   options={["Any","TypeScript","JavaScript","Python","CSharp"]}/>
              <NativeSelect label="Difficulty" options={["Any","1","2","3","4","5"]}/>
              <Button variant="ghost" size="sm" leftIcon="X" className="text-slate-500">Clear filters</Button>
            </div>
          </CardBody>
        </Card>

        <div>
          <div className="mb-3 text-[12.5px] font-mono text-slate-500 dark:text-slate-400">21 results · page 1 of 2</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIB_TASKS.map(t => <TaskCard key={t.id} t={t}/>)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 py-2">
          <Button variant="outline" size="sm" leftIcon="ArrowLeft" disabled>Prev</Button>
          <span className="font-mono text-[12.5px] text-slate-600 dark:text-slate-300">1 / 2</span>
          <Button variant="outline" size="sm" rightIcon="ArrowRight">Next</Button>
        </div>
      </div>
    </AppLayout>
  );
}
window.TasksLibraryPage = TasksLibraryPage;
