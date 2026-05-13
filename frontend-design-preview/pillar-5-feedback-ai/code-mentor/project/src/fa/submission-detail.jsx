// Submission Detail — THE SIGNATURE SURFACE

function SubmissionDetailPage() {
  const axes = ["Correctness","Readability","Security","Performance","Design"];
  const values = [92, 88, 78, 84, 88];
  const categories = axes.map((n,i) => ({ name:n, score:values[i] }));

  const strengths = [
    "Zod schema split at both step boundaries — no leakage between steps.",
    "Async username check correctly debounced (800ms) and doesn't block submit.",
    <>Error messages bound to <code className="font-mono text-[12px]">aria-describedby</code> — screen readers announce them.</>,
    "Submit button stays disabled until both schemas validate. Honest UX.",
  ];
  const weaknesses = [
    "No CSRF protection on the form POST — fine for a learning task, real apps need it.",
    <>Password complexity rule lives in a regex string — extract to a Zod <code className="font-mono text-[12px]">.refine()</code>.</>,
    "Optimistic submit state isn't rolled back if the network errors.",
  ];

  const recommendations = [
    { priority:"HIGH",   topic:"Security",        reason:"Add CSRF token to the form POST. This is exactly what the next task in your path teaches — perfect timing.", onPath:false },
    { priority:"HIGH",   topic:"Design",          reason:"Refactor the password regex into a Zod .refine(). You'll need this pattern for the next 3 tasks.",            onPath:true  },
    { priority:"MEDIUM", topic:"Performance",     reason:"Memoize the Zod schema with useMemo. Small win but the right reflex.",                                        onPath:false },
    { priority:"MEDIUM", topic:"Maintainability", reason:"Pull the form validation into a custom hook. You'll see this exact pattern in the WebSocket Chat task.",      onPath:false },
  ];
  const resources = [
    { title:"Schema validation in React Hook Form",     type:"article",       topic:"Form validation" },
    { title:"CSRF tokens, explained without hand-waving", type:"article",     topic:"Security" },
    { title:"Async validators without UI jank",         type:"video (12 min)", topic:"Performance" },
  ];

  return (
    <AppLayout active="submissions" title="Submission #142">
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <div>
          <a href="#" onClick={e=>{e.preventDefault(); window.__faGoto?.("task-detail");}} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
            <Icon name="ArrowLeft" size={14}/> Back to task
          </a>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">React Form Validation</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Attempt #2 · submitted 4m ago</p>
        </div>

        <StatusBanner status="completed"/>

        <SourceTimelineCard
          source="github.com/layla-ahmed/react-form-validation"
          timeline={[
            { label:"Received",           time:"09:24", done:true },
            { label:"Started processing", time:"09:24", done:true },
            { label:"Completed",          time:"09:25", done:true },
          ]}
        />

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Feedback column */}
          <div className="space-y-6 min-w-0">
            <PersonalizedChip/>
            <ScoreOverviewCard
              score={86}
              summary="Strong second attempt — you addressed the schema validation gaps from your last submission and the async username check now blocks correctly. Security and design are where the marginal gains are now."
              axes={axes} values={values}
            />
            <CategoryRatingsCard categories={categories}/>
            <StrengthsWeaknessesCard strengths={strengths} weaknesses={weaknesses}/>
            <ProgressAnalysisCard>
              Your previous attempt at this task scored <strong className="text-slate-900 dark:text-slate-50">62/100</strong> — the username validator was synchronous and blocked the entire form. This time you moved it to a debounced async check, which is exactly what the rubric is testing for. Security is still your softest dimension across the last 4 submissions; consider a deeper pass on input sanitization next.
            </ProgressAnalysisCard>
            <InlineAnnotationsCard/>
            <RecommendationsCard items={recommendations}/>
            <ResourcesCard items={resources}/>
            <NewAttemptCard/>
          </div>

          {/* Mentor chat column */}
          <div>
            <MentorChatInline/>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
window.SubmissionDetailPage = SubmissionDetailPage;
