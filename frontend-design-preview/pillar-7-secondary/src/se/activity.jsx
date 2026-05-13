/* Pillar 7 / Page 3 — Activity (mirror ActivityPage.tsx) */

function ActivityPage_Se() {
  const { SE_ACTIVITY, ActivityRow } = window.SeShared;

  return (
    <AppLayout active="" title="Activity">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold tracking-tight brand-gradient-text">Activity</h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            Recent XP earned and submissions across your account.
          </p>
        </div>

        {/* Day separator example: "Today" */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">Today · May 12</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-white/10"/>
        </div>

        <ul className="space-y-3 mb-6">
          {SE_ACTIVITY.slice(0, 4).map((it,i) => <li key={i}><ActivityRow item={it}/></li>)}
        </ul>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">Earlier this week</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-white/10"/>
        </div>

        <ul className="space-y-3 mb-6">
          {SE_ACTIVITY.slice(4, 7).map((it,i) => <li key={i+4}><ActivityRow item={it}/></li>)}
        </ul>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">Last week</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-white/10"/>
        </div>

        <ul className="space-y-3 mb-8">
          {SE_ACTIVITY.slice(7).map((it,i) => <li key={i+7}><ActivityRow item={it}/></li>)}
        </ul>

        {/* Load more affordance */}
        <div className="text-center">
          <Button variant="outline" size="md" leftIcon="RotateCcw">Load earlier activity</Button>
        </div>
      </div>
    </AppLayout>
  );
}

window.ActivityPage_Se = ActivityPage_Se;
