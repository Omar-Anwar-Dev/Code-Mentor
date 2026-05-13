/* Pillar 7 / Page 2 — Achievements (mirror AchievementsPage.tsx) */

function AchievementsPage_Se() {
  const { SE_LAYLA, SE_BADGES, SeBadgeCard } = window.SeShared;
  const earned = SE_BADGES.filter(b => b.earned);
  const locked = SE_BADGES.filter(b => !b.earned);
  const xpInLevel = SE_LAYLA.xp - SE_LAYLA.xpForLevel;
  const span = SE_LAYLA.xpForNext - SE_LAYLA.xpForLevel;
  const pct = Math.round((xpInLevel / span) * 100);
  const xpToNext = SE_LAYLA.xpForNext - SE_LAYLA.xp;

  return (
    <AppLayout active="achievements" title="Achievements">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <header>
          <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 brand-gradient-text">
            <Icon name="Trophy" size={26} className="text-amber-500"/> Achievements
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            Earn XP for assessments and submissions; unlock badges as you build your craft.
          </p>
        </header>

        {/* Progress card — XP / Level / Badges */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Total XP</p>
                <p className="text-[34px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1">{SE_LAYLA.xp.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Level</p>
                <p className="text-[34px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1 flex items-center gap-2">
                  <Icon name="Sparkles" size={20} className="text-primary-500"/>
                  {SE_LAYLA.level}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Badges</p>
                <p className="text-[34px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1">
                  {earned.length}
                  <span className="text-[18px] text-slate-500 dark:text-slate-400">/{SE_BADGES.length}</span>
                </p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11.5px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-mono">L{SE_LAYLA.level}</span>
                <span className="font-mono">{xpToNext.toLocaleString()} XP to L{SE_LAYLA.level + 1}</span>
              </div>
              <ProgressBar value={pct}/>
            </div>
          </CardBody>
        </Card>

        {/* Earned section */}
        <section>
          <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
            <Icon name="CheckCircle" size={18} className="text-emerald-500"/>
            Earned <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">({earned.length})</span>
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {earned.map(b => <li key={b.key}><SeBadgeCard badge={b}/></li>)}
          </ul>
        </section>

        {/* Locked section */}
        <section>
          <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
            <Icon name="Lock" size={18} className="text-slate-400"/>
            Locked <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">({locked.length})</span>
          </h2>
          {locked.length === 0 ? (
            <Card variant="glass">
              <CardBody className="p-6 text-center text-slate-500 dark:text-slate-400">
                You&apos;ve earned all available badges!
              </CardBody>
            </Card>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locked.map(b => <li key={b.key}><SeBadgeCard badge={b}/></li>)}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

window.AchievementsPage_Se = AchievementsPage_Se;
