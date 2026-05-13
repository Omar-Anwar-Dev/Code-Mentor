// Task Detail page

function MarkdownRenderer() {
  return (
    <div className="space-y-5 text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Overview</h2>
        <p>
          Build a multi-step React form that validates against a <strong className="text-slate-900 dark:text-slate-50 font-semibold">Zod schema</strong>. Each field shows its own inline error state, an async username-availability check runs without blocking the UI, and the submit button is disabled until every schema rule passes.
        </p>
      </div>
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Requirements</h2>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Two-step form: account info → preferences</li>
          <li><strong className="text-slate-900 dark:text-slate-50 font-semibold">Zod</strong> schemas at both step boundaries</li>
          <li>Async validator for <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">username</code> (mock 800ms delay)</li>
          <li>Field errors render inside <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">aria-describedby</code> containers</li>
          <li>Submit only fires when both schemas validate</li>
        </ul>
      </div>
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Acceptance</h2>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Type-check passes with <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">tsc --noEmit</code></li>
          <li>Tests in <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">tests/form.test.ts</code> all green</li>
          <li>No console errors in the happy path</li>
          <li><code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">npm run lint</code> returns 0</li>
        </ul>
      </div>
    </div>
  );
}

function TaskDetailPage() {
  return (
    <AppLayout active="tasks" title="Task Detail">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <a href="#tasks" onClick={(e)=>{ e.preventDefault(); window.__coGoto?.("tasks-library"); }} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
          <Icon name="ArrowLeft" size={14}/> Back to Task Library
        </a>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">React Form Validation</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="primary">FullStack</Badge>
              <Badge tone="neutral">OOP</Badge>
              <Badge tone="neutral">TypeScript</Badge>
              <span className="inline-flex items-center gap-1 text-[12.5px] text-slate-500 dark:text-slate-400 ml-1"><Icon name="Clock" size={12}/>5h</span>
              <DifficultyStars level={3} size={12}/>
            </div>
          </div>
          <div>
            <Badge tone="primary" icon="Play" glow>In Progress</Badge>
          </div>
        </div>

        <Card variant="glass">
          <CardBody className="p-6">
            <MarkdownRenderer/>
          </CardBody>
        </Card>

        <Card variant="glass">
          <CardHeader title="Prerequisites"/>
          <CardBody className="pb-5">
            <ul className="space-y-1.5 text-[13.5px] text-slate-700 dark:text-slate-300 list-disc pl-5">
              <li>PostgreSQL with Prisma</li>
              <li>JWT Authentication</li>
            </ul>
          </CardBody>
        </Card>

        <Card variant="glass">
          <CardBody className="p-6 text-center space-y-3">
            <div className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Ready to submit your work?</div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">Paste a GitHub URL or upload a ZIP of your project for automated review.</div>
            <div className="pt-1">
              <Button variant="primary" size="lg" leftIcon="Send">Submit Your Work</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
window.TaskDetailPage = TaskDetailPage;
