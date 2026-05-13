/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 3 — Learning CV (mirror LearningCVPage.tsx)
   max-w-6xl · Hero (avatar + name + meta + Public toggle + Download
   PDF) + Public URL row (when isPublic) + 4 stat tiles + 2-col
   Knowledge Profile (radar) / Code-Quality Profile (bars) +
   Verified Projects grid.
   ───────────────────────────────────────────────────────────────── */

function LearningCvPage_Pc({ onGotoPublicCv }) {
  const {
    PC_LAYLA, PC_STATS, PC_SKILL_PROFILE, PC_CODE_QUALITY, PC_VERIFIED,
    PcRadarChart, StatTilePc, CvProgressRow, VerifiedProjectCard, CvHeroAvatar, PcEmptyMsg,
  } = window.PcShared;
  const publicUrl = `https://codementor.benha.app/cv/${PC_LAYLA.publicSlug}`;
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => { setCopied(true); setTimeout(()=>setCopied(false), 1500); };

  return (
    <AppLayout active="" title="Learning CV">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-6 animate-fade-in">

        {/* ─── Hero ─── */}
        <Card variant="glass">
          <CardBody className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <CvHeroAvatar size={96} name={PC_LAYLA.name}/>

              <div className="flex-1 min-w-0">
                <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-50">{PC_LAYLA.name}</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Joined {PC_LAYLA.joined}
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <Badge tone="primary">{PC_SKILL_PROFILE.overallLevel}</Badge>
                </p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Mail" size={13}/> {PC_LAYLA.email}
                  </span>
                  <a href="#" onClick={e=>e.preventDefault()}
                    className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-300 hover:underline">
                    <Icon name="Github" size={13}/> @{PC_LAYLA.gitHub}
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="MapPin" size={13}/> Benha, Egypt
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                <Button variant={PC_LAYLA.isPublic ? "outline" : "primary"} size="md"
                  leftIcon={PC_LAYLA.isPublic ? "Unlock" : "Lock"}>
                  {PC_LAYLA.isPublic ? "Public" : "Make Public"}
                </Button>
                <Button variant="ghost" size="md" leftIcon="Download">
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Public URL row */}
            {PC_LAYLA.isPublic && (
              <div className="mt-5 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/40
                bg-gradient-to-r from-cyan-50/80 to-primary-50/60
                dark:from-cyan-900/15 dark:to-primary-900/15
                flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 ring-1 ring-cyan-400/40
                  flex items-center justify-center text-cyan-600 dark:text-cyan-300 shrink-0">
                  <Icon name="Share2" size={15}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-cyan-700 dark:text-cyan-300">Public URL</p>
                  <a href="#" onClick={e=>{e.preventDefault(); onGotoPublicCv?.();}}
                    className="text-[13px] font-mono text-cyan-900 dark:text-cyan-100 break-all hover:underline">
                    {publicUrl}
                  </a>
                  <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/70 mt-1">
                    Viewed {PC_LAYLA.viewCount} times
                  </p>
                </div>
                <Button variant="ghost" size="sm" leftIcon={copied ? "Check" : "Copy"} onClick={handleCopy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ─── 4 stat tiles ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTilePc icon="Code"        tone="cyan"    value={PC_STATS.submissionsTotal}  label="Submissions"/>
          <StatTilePc icon="Trophy"      tone="warning" value={PC_STATS.assessmentsTotal}  label="Assessments"/>
          <StatTilePc icon="BookOpen"    tone="success" value={PC_STATS.pathsActive}       label="Active paths"/>
          <StatTilePc icon="CheckCircle" tone="purple"  value={PC_VERIFIED.length}         label="Verified projects"/>
        </div>

        {/* ─── 2-col: Knowledge profile (radar) / Code-quality profile (bars) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Card variant="glass">
            <CardBody className="p-6">
              <header className="mb-3">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Icon name="Brain" size={16} className="text-primary-500"/> Knowledge Profile
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Assessment-driven scores across CS domains.</p>
              </header>
              <div className="flex items-center justify-center py-2">
                <PcRadarChart
                  axes={PC_SKILL_PROFILE.scores.map(s=>s.category)}
                  values={PC_SKILL_PROFILE.scores.map(s=>s.score)}
                  size={300}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {PC_SKILL_PROFILE.scores.map(s => (
                  <div key={s.category} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                    <div className="text-[14.5px] font-bold text-slate-900 dark:text-slate-50">{s.score}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{s.category}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <header className="mb-4">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Icon name="Sparkles" size={16} className="text-cyan-500"/> Code-Quality Profile
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Running averages from AI-reviewed submissions.</p>
              </header>
              {PC_CODE_QUALITY.length === 0 ? (
                <PcEmptyMsg text="Submit a project to start building your code-quality profile."/>
              ) : (
                <ul className="space-y-3.5">
                  {PC_CODE_QUALITY.map(s => (
                    <CvProgressRow key={s.category} category={s.category} score={s.score} samples={s.samples}/>
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10
                text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Average across all dimensions</span>
                <span className="font-bold text-slate-900 dark:text-slate-50">
                  {Math.round(PC_CODE_QUALITY.reduce((a,c)=>a+c.score,0) / PC_CODE_QUALITY.length)}
                </span>
              </div>
            </CardBody>
          </Card>

        </div>

        {/* ─── Verified projects ─── */}
        <Card variant="glass">
          <CardBody className="p-6">
            <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Icon name="ShieldCheck" size={16} className="text-emerald-500"/> Verified Projects
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Top {PC_VERIFIED.length} highest-scoring AI-reviewed submissions on your Learning CV.
                </p>
              </div>
              <Badge tone="success">{PC_VERIFIED.length} verified</Badge>
            </header>
            {PC_VERIFIED.length === 0 ? (
              <PcEmptyMsg icon="Code" text="No verified projects yet — complete a submission with an AI review to show one here."/>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PC_VERIFIED.map(p => <VerifiedProjectCard key={p.id} project={p}/>)}
              </ul>
            )}
          </CardBody>
        </Card>

      </div>
    </AppLayout>
  );
}

window.LearningCvPage_Pc = LearningCvPage_Pc;
