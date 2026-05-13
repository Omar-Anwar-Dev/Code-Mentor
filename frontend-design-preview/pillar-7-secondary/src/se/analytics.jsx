/* Pillar 7 / Page 1 — Analytics (mirror AnalyticsPage.tsx) */

function AnalyticsPage_Se() {
  const { SE_WEEKLY_TREND, SE_WEEKLY_SUBS, SE_KNOWLEDGE, SeLineTrendChart, SeStackedBars, LegendChip } = window.SeShared;
  const totalSubs = SE_WEEKLY_SUBS.reduce((a,r) => a + r.completed + r.failed + r.processing + r.pending, 0);
  const totalScoredRuns = SE_WEEKLY_TREND.reduce((a,r) => a + r.samples, 0);

  return (
    <AppLayout active="analytics" title="Analytics">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <header>
          <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 brand-gradient-text">
            <Icon name="TrendingUp" size={26} className="text-primary-500"/> Your analytics
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            12-week view of your code-quality trend, submission cadence, and assessment-driven knowledge profile.
          </p>
        </header>

        {/* Stats strip — 3 tiles */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center">
                  <Icon name="Activity" size={18} className="text-primary-600 dark:text-primary-300"/>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Submissions (12w)</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-0.5">{totalSubs}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card variant="glass">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <Icon name="TrendingUp" size={18} className="text-emerald-600 dark:text-emerald-300"/>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">AI-scored runs</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-0.5">{totalScoredRuns}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card variant="glass">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/15 flex items-center justify-center">
                  <Icon name="Sparkles" size={18} className="text-fuchsia-600 dark:text-fuchsia-300"/>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Knowledge categories</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-0.5">{SE_KNOWLEDGE.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Code-quality trend */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">Code-quality trend</h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Per-category averages from each week&apos;s AI-reviewed submissions. Empty weeks are skipped.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <LegendChip color="#8b5cf6" label="Correctness"/>
                <LegendChip color="#10b981" label="Readability"/>
                <LegendChip color="#ef4444" label="Security"/>
                <LegendChip color="#f59e0b" label="Performance"/>
                <LegendChip color="#06b6d4" label="Design"/>
              </div>
            </div>
            <SeLineTrendChart rows={SE_WEEKLY_TREND} height={300}/>
          </CardBody>
        </Card>

        {/* Submissions per week */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">Submissions per week</h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">Stacked count by status.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <LegendChip color="#10b981" label="Completed"/>
                <LegendChip color="#ef4444" label="Failed"/>
                <LegendChip color="#f59e0b" label="Processing"/>
                <LegendChip color="#94a3b8" label="Pending"/>
              </div>
            </div>
            <SeStackedBars rows={SE_WEEKLY_SUBS} height={260}/>
          </CardBody>
        </Card>

        {/* Knowledge profile snapshot */}
        <Card variant="glass">
          <CardBody className="p-6">
            <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">Knowledge profile</h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Snapshot from your latest assessment — distinct from the code-quality trend above.
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {SE_KNOWLEDGE.map(k => (
                <li key={k.category} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/40 dark:bg-slate-900/30">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{k.category}</p>
                  <p className="text-[26px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1">{k.score}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{k.level}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

      </div>
    </AppLayout>
  );
}

window.AnalyticsPage_Se = AnalyticsPage_Se;
