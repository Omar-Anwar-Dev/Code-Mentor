// Audit New — 3-step wizard, Step 1 active + Steps 2 & 3 preview

function AuditNewPage() {
  const focusActive = new Set(["Security","Performance","Database"]);
  const focusAreas = ["Security","Performance","Code quality","Architecture","Testing","Documentation","Database"];
  const tags = ["Python","FastAPI","SQLAlchemy","PostgreSQL","Alembic","Docker"];

  return (
    <AppLayout active="audit" title="New Audit">
      <div className="max-w-3xl mx-auto px-2 py-2 space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" size={18} className="text-primary-500"/>
            <h1 className="text-[26px] font-semibold tracking-tight brand-gradient-text">Audit your project</h1>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Get an honest, structured AI audit of your code in under 6 minutes.</p>
        </div>

        <Stepper step={0}/>

        {/* Active Step 1 */}
        <Card variant="glass">
          <CardBody className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Sparkles" size={15} className="text-primary-500"/>
              <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Project identity</span>
            </div>
            <Field label="Project name">
              <TextInput defaultValue="todo-api" maxLength={200}/>
            </Field>
            <Field label="One-line summary">
              <TextInput defaultValue="A short FastAPI service for personal to-do lists with auth and tags." maxLength={200}/>
            </Field>
            <Field label="Detailed description">
              <Textarea rows={5} defaultValue={`todo-api is a learning project for the Code Mentor capstone. FastAPI + SQLAlchemy on\nPostgres, with JWT auth, per-user task isolation, and a small tagging system. In\nscope: REST endpoints for tasks (CRUD), tags (CRUD), auth (register/login/refresh),\nand a /me endpoint. Out of scope: collaborative tasks, websocket sync, email.`}/>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 text-right">412/5000</div>
            </Field>
            <Field label="Project type">
              <Select value="api" onChange={()=>{}} options={[
                { value:"", label:"Pick one…" },
                { value:"api", label:"API" },
                { value:"web", label:"Web App" },
                { value:"cli", label:"CLI Tool" },
                { value:"lib", label:"Library" },
                { value:"mobile", label:"Mobile App" },
                { value:"other", label:"Other" },
              ]}/>
            </Field>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" leftIcon="ArrowLeft" disabled>Back</Button>
          <Button variant="primary" rightIcon="ArrowRight">Next</Button>
        </div>

        {/* Step 2 preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500">↓ Step 2 preview ↓</div>
        <Card variant="glass" className="opacity-95">
          <CardBody className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Code2" size={15} className="text-primary-500"/>
              <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Tech &amp; features</span>
            </div>
            <Field label="Tech stack">
              <div className="flex gap-2">
                <TextInput placeholder="React, TypeScript, Vite (Enter or comma to add)"/>
                <Button variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <Badge key={t} tone="primary" className="!h-7">{t}<Icon name="X" size={11} className="opacity-60 hover:opacity-100 cursor-pointer ml-0.5"/></Badge>
                ))}
              </div>
            </Field>
            <Field label="Main features">
              <Textarea rows={5} defaultValue={`JWT auth (register / login / refresh)\nPer-user task CRUD with pagination\nTag CRUD + many-to-many to tasks\nHealth check + readiness probe\nAlembic migrations`}/>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">5 listed (max 30).</div>
            </Field>
            <Field label="Target audience (optional)">
              <TextInput defaultValue="Solo dev portfolio"/>
            </Field>
            <Field label="Focus areas (optional)">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name="Target" size={14} className="text-slate-500"/>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">Pick the areas where you most want feedback.</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {focusAreas.map(f => {
                  const on = focusActive.has(f);
                  return (
                    <button key={f} className={["px-3 py-1.5 rounded-full text-[12px] border transition-colors", on ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-200" : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-primary-400"].join(" ")}>{f}</button>
                  );
                })}
              </div>
            </Field>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" leftIcon="ArrowLeft">Back</Button>
          <Button variant="primary" rightIcon="ArrowRight">Next</Button>
        </div>

        {/* Step 3 preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500">↓ Step 3 preview ↓</div>
        <Card variant="glass" className="opacity-95">
          <CardBody className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Upload" size={15} className="text-primary-500"/>
              <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Where's the code?</span>
            </div>
            <TabsStrip tabs={[{ key:"github", label:"GitHub Repository", icon:"Github" },{ key:"zip", label:"Upload ZIP", icon:"Upload" }]} active="github" onChange={()=>{}}/>
            <Field label="Repository URL">
              <TextInput prefix="Github" defaultValue="https://github.com/layla-ahmed/todo-api"/>
              <div className="text-[12px] text-slate-500 dark:text-slate-400">Public repos work without setup. For private repos, sign in with GitHub first.</div>
            </Field>
            <Field label="Known issues (optional)">
              <Textarea rows={3} defaultValue={`The /tasks/bulk-import endpoint is partially implemented but not exposed in the router.\nTest coverage is honest but thin — auth tests are missing.`}/>
            </Field>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-400/30 text-blue-700 dark:text-blue-300">
              <Icon name="CircleAlert" size={15} className="mt-0.5 shrink-0"/>
              <p className="text-[12.5px] leading-relaxed">Your uploaded code is stored for <strong>90 days</strong>, then automatically deleted. The audit report is yours to keep.</p>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" leftIcon="ArrowLeft">Back</Button>
          <Button variant="gradient" rightIcon="Send">Start Audit</Button>
        </div>
      </div>
    </AppLayout>
  );
}
window.AuditNewPage = AuditNewPage;
