// Submission Form

function SubmissionFormPage() {
  const [tab, setTab] = faUseState("github");
  const tabs = [
    { key:"github", label:"GitHub Repository", icon:"Github" },
    { key:"zip",    label:"Upload ZIP",         icon:"Upload" },
  ];
  return (
    <AppLayout active="submissions" title="Submit Code">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
        <a href="#" onClick={e=>{e.preventDefault(); window.__faGoto?.("task-detail");}} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
          <Icon name="ArrowLeft" size={14}/> Back to React Form Validation
        </a>

        <div>
          <h1 className="text-[26px] font-semibold tracking-tight brand-gradient-text">Submit Your Work</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Task: React Form Validation · Attempt #2</p>
        </div>

        <Card variant="glass">
          <div className="px-2 pt-2">
            <TabsStrip tabs={tabs} active={tab} onChange={setTab}/>
          </div>
          <CardBody className="p-6">
            {tab === "github" ? (
              <div className="space-y-4">
                <Field label="Repository URL">
                  <TextInput prefix="Github" defaultValue="https://github.com/layla-ahmed/react-form-validation" placeholder="https://github.com/username/repository"/>
                </Field>

                <Field label="Validation states demo" error="Must be https://github.com/owner/repo">
                  <TextInput prefix="Github" defaultValue="not-a-url" error/>
                </Field>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-400/30 text-blue-700 dark:text-blue-300">
                  <Icon name="CircleAlert" size={15} className="mt-0.5 shrink-0"/>
                  <p className="text-[12.5px] leading-relaxed">Public repos work without setup. For private repos, make sure you've signed in with GitHub.</p>
                </div>

                <Button variant="gradient" size="lg" rightIcon="ArrowRight" className="w-full">Submit Repository</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <button className="w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/15 p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                  <Icon name="Upload" size={28} className="mx-auto text-slate-400 mb-2"/>
                  <div className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Click to choose a ZIP</div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">Up to 50 MB</div>
                </button>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-300 text-[13px]">
                  <Icon name="CircleCheck" size={15}/> Ready to upload. <span className="font-mono text-[12px]">react-form-validation.zip</span> · 4.2 MB
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-600 dark:text-slate-300">Uploading…</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">73%</span>
                  </div>
                  <ProgressBar value={73} size="md"/>
                </div>

                <Button variant="gradient" size="lg" rightIcon="ArrowRight" className="w-full">Upload &amp; Submit</Button>
              </div>
            )}
          </CardBody>
        </Card>

        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 text-center">Your submission will be analyzed by the AI mentor. Average turnaround: 30 seconds in the stub pipeline, 2–3 minutes in production.</p>
      </div>
    </AppLayout>
  );
}
window.SubmissionFormPage = SubmissionFormPage;
