/* Pillar 8 / Page 1 — Admin Dashboard (mirror AdminDashboard.tsx) */

function AdminDashboard_Ad() {
  const {
    AD_STATS, AD_USER_GROWTH, AD_TRACKS, AD_WEEK_SUBS, AD_RECENT_SUBS,
    AdDemoBanner, AdLineMini, AdBarMini, AdPieMini, AdStatCard,
  } = window.AdShared;
  const statusTone = (s) => s === "Completed" ? "success" : s === "Processing" ? "processing" : s === "Failed" ? "failed" : "neutral";

  return (
    <AppLayout active="" title="Admin · Overview">
      <div className="space-y-6 animate-fade-in">

        {/* Page header */}
        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Icon name="ShieldCheck" size={22} className="text-fuchsia-500"/> Admin Dashboard
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">Platform overview and analytics.</p>
        </header>

        <AdDemoBanner/>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdStatCard icon="Users"      tone="primary" value={AD_STATS.totalUsers.toLocaleString()} label="Total users"   trend={`+${AD_STATS.newUsersThisWeek}`}/>
          <AdStatCard icon="Activity"   tone="success" value={AD_STATS.activeUsers.toLocaleString()} label="Active today"/>
          <AdStatCard icon="FileCode"   tone="warning" value={AD_STATS.totalSubmissions.toLocaleString()} label="Submissions" trend={`+${AD_STATS.submissionsThisWeek}`}/>
          <AdStatCard icon="TrendingUp" tone="cyan"    value={`${AD_STATS.averageScore}%`}           label="Avg AI score"/>
        </div>

        {/* User Growth + Track Distribution row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <Card variant="glass" className="lg:col-span-2">
            <CardBody className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">User Growth</h3>
                <Badge tone="success" icon="TrendingUp">+{AD_STATS.newUsersThisWeek} this week</Badge>
              </div>
              <AdLineMini rows={AD_USER_GROWTH} valueKey="users" color="#8b5cf6" height={260}/>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Track Distribution</h3>
              <div className="flex items-center justify-center mb-3">
                <AdPieMini slices={AD_TRACKS} size={210}/>
              </div>
              <ul className="space-y-1.5">
                {AD_TRACKS.map(t => (
                  <li key={t.name} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }}/>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{t.name}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{t.value}%</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

        </div>

        {/* Weekly Submissions + Recent Submissions row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <Card variant="glass" className="lg:col-span-2">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Weekly Submissions</h3>
              <AdBarMini rows={AD_WEEK_SUBS} valueKey="submissions" color="#06b6d4" height={240}/>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-0">
              <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-white/10">
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">Recent Submissions</h3>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {AD_RECENT_SUBS.map(s => (
                  <li key={s.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Icon name={s.status === "Completed" ? "CheckCircle" : s.status === "Failed" ? "AlertCircle" : "Clock"}
                        size={14}
                        className={
                          s.status === "Completed" ? "text-emerald-500" :
                          s.status === "Failed"    ? "text-red-500" :
                                                     "text-amber-500"
                        }/>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-slate-900 dark:text-slate-50 truncate">{s.user}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{s.task}</p>
                    </div>
                    {s.score !== null
                      ? <Badge tone="success">{s.score}%</Badge>
                      : <Badge tone={statusTone(s.status)}>{s.status}</Badge>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}

window.AdminDashboard_Ad = AdminDashboard_Ad;
