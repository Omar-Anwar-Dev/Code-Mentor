/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 4 — Public CV (mirror PublicCVPage.tsx)
   max-w-5xl, **NO AppLayout** — this is the anonymous share-link
   surface at /cv/:slug. No sidebar, no app chrome. Minimal Code
   Mentor brand bar at top. No email (server-side redaction).
   Includes the "Want a Learning CV like this?" CTA back to register.
   ───────────────────────────────────────────────────────────────── */

function PublicCvPage_Pc({ dark, setDark }) {
  const {
    PC_LAYLA, PC_STATS, PC_SKILL_PROFILE, PC_CODE_QUALITY, PC_VERIFIED,
    PcRadarChart, StatTilePc, CvProgressRow, CvHeroAvatar, PcEmptyMsg,
  } = window.PcShared;

  return (
    <div className="min-h-screen bg-grid">
      {/* Minimal public brand bar (replaces AppLayout) */}
      <header className="sticky top-0 z-30 glass border-b border-white/30 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo size="sm"/>
          <div className="flex items-center gap-2">
            <Badge tone="primary"><Icon name="Eye" size={11} className="mr-1"/> Public view</Badge>
            <ThemeToggle dark={dark} setDark={setDark}/>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">

        {/* Hero (no email, no public-toggle, no PDF download) */}
        <Card variant="glass">
          <CardBody className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <CvHeroAvatar size={96} name={PC_LAYLA.name}/>
              <div className="flex-1 min-w-0">
                <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight brand-gradient-text">{PC_LAYLA.name}</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Joined {PC_LAYLA.joined}
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <Badge tone="primary">{PC_SKILL_PROFILE.overallLevel}</Badge>
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="GraduationCap" size={13}/> Benha University · Faculty of Computers and AI
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-600 dark:text-slate-300">
                  <a href="#" onClick={e=>e.preventDefault()}
                    className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-300 hover:underline">
                    <Icon name="Github" size={13}/> @{PC_LAYLA.gitHub}
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="MapPin" size={13}/> Benha, Egypt
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Code" size={13}/> Full Stack track
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                <Button variant="outline" size="md" leftIcon="Share2">
                  Share
                </Button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">/cv/{PC_LAYLA.publicSlug}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Stat tiles (no email-context tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTilePc icon="Code"        tone="cyan"    value={PC_STATS.submissionsTotal}  label="Submissions"/>
          <StatTilePc icon="Trophy"      tone="warning" value={PC_STATS.assessmentsTotal}  label="Assessments"/>
          <StatTilePc icon="BookOpen"    tone="success" value={PC_STATS.pathsActive}       label="Active paths"/>
          <StatTilePc icon="CheckCircle" tone="purple"  value={PC_VERIFIED.length}         label="Verified projects"/>
        </div>

        {/* Two skill axes — knowledge radar + code-quality bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Card variant="glass">
            <CardBody className="p-6">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
                <Icon name="Brain" size={16} className="text-primary-500"/> Knowledge Profile
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">CS-domain assessment scores.</p>
              <div className="flex items-center justify-center">
                <PcRadarChart
                  axes={PC_SKILL_PROFILE.scores.map(s=>s.category)}
                  values={PC_SKILL_PROFILE.scores.map(s=>s.score)}
                  size={280}
                />
              </div>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
                <Icon name="Sparkles" size={16} className="text-cyan-500"/> Code-Quality Profile
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">AI-reviewed submission averages.</p>
              {PC_CODE_QUALITY.length === 0 ? (
                <PcEmptyMsg text="No code-quality data yet."/>
              ) : (
                <ul className="space-y-3.5">
                  {PC_CODE_QUALITY.map(s => (
                    <CvProgressRow key={s.category} category={s.category} score={s.score} samples={s.samples}/>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Verified projects (no "View feedback" link in public view) */}
        <Card variant="glass">
          <CardBody className="p-6">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
              <Icon name="ShieldCheck" size={16} className="text-emerald-500"/> Verified Projects
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
              Top {PC_VERIFIED.length} highest-scoring submissions.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PC_VERIFIED.map(p => (
                <li key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50 truncate">{p.title}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="neutral">{p.track}</Badge>
                        <Badge tone="neutral">{p.language}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        {new Date(p.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none">{p.score}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">/ 100</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* "Create your own" CTA */}
        <Card variant="glass" className="border-primary-200/60 dark:border-primary-900/40">
          <CardBody className="p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl brand-gradient-bg text-white flex items-center justify-center mb-3 shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
              <Icon name="Sparkles" size={20}/>
            </div>
            <h3 className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-1">Want a Learning CV like this?</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              Get verified, AI-reviewed feedback on your projects. Build a portfolio that proves what you can do — not just what you claim.
            </p>
            <Button variant="primary" size="md" rightIcon="ArrowRight">Create your own</Button>
          </CardBody>
        </Card>

        {/* Footer (public-flavour) */}
        <footer className="text-center text-[11px] text-slate-500 dark:text-slate-400 py-6">
          <p>
            <span className="font-mono">codementor.benha.app</span>
            <span className="mx-2">·</span>
            Code Mentor — Benha University, Faculty of Computers and AI · Class of 2026
          </p>
          <p className="mt-1">
            <a href="#" onClick={e=>e.preventDefault()} className="hover:underline">Privacy</a>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <a href="#" onClick={e=>e.preventDefault()} className="hover:underline">Terms</a>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <a href="#" onClick={e=>e.preventDefault()} className="hover:underline">Report this CV</a>
          </p>
        </footer>

      </main>
    </div>
  );
}

window.PublicCvPage_Pc = PublicCvPage_Pc;
