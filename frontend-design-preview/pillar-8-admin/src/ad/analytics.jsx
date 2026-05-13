/* Pillar 8 / Page 5 — Admin Analytics (mirror admin/AnalyticsPage.tsx)
   Per-track AI score breakdown + Submission volume by status across
   tracks + Top tasks by submissions + System health metrics */

function AnalyticsPage_Ad() {
  const {
    AD_STATS, AD_WEEK_SUBS, AD_TRACK_SCORES, AD_TASKS,
    AdDemoBanner, AdBarMini, AdStatCard,
  } = window.AdShared;

  const topTasks = [...AD_TASKS].sort((a,b) => b.submissions - a.submissions).slice(0, 5);

  return (
    <AppLayout active="" title="Admin · Analytics">
      <div className="space-y-6 animate-fade-in">

        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Icon name="TrendingUp" size={22} className="text-emerald-500"/> Platform Analytics
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            Aggregate AI scores, submission volume, and content health across all tracks.
          </p>
        </header>

        <AdDemoBanner/>

        {/* System health stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdStatCard icon="ClipboardList" tone="cyan"    value={AD_STATS.activeTasks}                  label="Active tasks"/>
          <AdStatCard icon="HelpCircle"    tone="fuchsia" value={AD_STATS.publishedQuestions}           label="Published questions"/>
          <AdStatCard icon="FileCode"      tone="warning" value={AD_STATS.submissionsThisWeek}          label="Submissions this week"/>
          <AdStatCard icon="TrendingUp"    tone="success" value={`${AD_STATS.averageScore}%`}            label="Avg AI score"/>
        </div>

        {/* Per-track AI score breakdown */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">AI score breakdown by track</h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Average code-quality scores across the 5 review dimensions per track (last 30 days).</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                    <th className="px-3 py-2">Track</th>
                    <th className="px-3 py-2">Correctness</th>
                    <th className="px-3 py-2">Readability</th>
                    <th className="px-3 py-2">Security</th>
                    <th className="px-3 py-2">Performance</th>
                    <th className="px-3 py-2">Design</th>
                    <th className="px-3 py-2 text-right">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {AD_TRACK_SCORES.map(t => {
                    const avg = Math.round((t.correctness + t.readability + t.security + t.performance + t.design) / 5);
                    return (
                      <tr key={t.track}>
                        <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-50">{t.track}</td>
                        {["correctness","readability","security","performance","design"].map(k => (
                          <td key={k} className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div className="h-full brand-gradient-bg rounded-full" style={{ width: `${t[k]}%` }}/>
                              </div>
                              <span className="font-mono text-[11.5px] text-slate-600 dark:text-slate-300 w-8 text-right">{t[k]}</span>
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right">
                          <Badge tone={avg >= 80 ? "success" : avg >= 70 ? "primary" : "pending"}>{avg}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Weekly submissions volume */}
        <Card variant="glass">
          <CardBody className="p-6">
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-1">Submission volume — past 7 days</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">Total daily submissions across all users and tracks.</p>
            <AdBarMini rows={AD_WEEK_SUBS} valueKey="submissions" color="#06b6d4" height={220}/>
          </CardBody>
        </Card>

        {/* Top tasks + Slowest review queue (2-col) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card variant="glass">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-1">Top tasks by submissions</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All-time, sorted by submission count.</p>
              <ul className="space-y-2">
                {topTasks.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                    <span className={[
                      "w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0",
                      i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                      i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                      i === 2 ? "bg-gradient-to-br from-orange-700 to-amber-700 text-white" :
                                "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                    ].join(" ")}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.track} · {t.language}</p>
                    </div>
                    <span className="text-[13px] font-mono font-bold text-slate-900 dark:text-slate-50">{t.submissions}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-1">System health</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">AI review pipeline + worker queue snapshot.</p>
              <ul className="space-y-3">
                <HealthRow label="AI review pipeline"   value="Healthy"        tone="success" detail="p50 32s · p95 71s"/>
                <HealthRow label="Worker queue (active)" value="3 / 8 workers" tone="success" detail="0 stuck jobs"/>
                <HealthRow label="Backlog (pending)"     value="12 jobs"       tone="processing" detail="Oldest 2m"/>
                <HealthRow label="Storage (Blob)"        value="14.7 GB"       tone="neutral" detail="of 100 GB quota"/>
                <HealthRow label="Qdrant index"          value="1,892 vectors" tone="neutral" detail="Last sync 3m ago"/>
                <HealthRow label="OpenAI API quota"      value="62%"           tone="pending" detail="Resets in 3 days"/>
              </ul>
            </CardBody>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}

function HealthRow({ label, value, tone, detail }) {
  return (
    <li className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-slate-900 dark:text-slate-50 truncate">{label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <Badge tone={tone}>{value}</Badge>
    </li>
  );
}

window.AnalyticsPage_Ad = AnalyticsPage_Ad;
