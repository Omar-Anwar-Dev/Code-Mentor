/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 1 — Profile (mirror ProfilePage.tsx)
   max-w-5xl · Hero card (avatar + name + meta + View CV) + Level/XP
   strip · 4 stat tiles · 2-col grid (Edit form lg:col-span-2 + Recent
   badges aside)
   ───────────────────────────────────────────────────────────────── */

function ProfilePage_Pc({ onGotoLearningCv, onGotoProfileEdit }) {
  const { PC_LAYLA, PC_STATS, PC_BADGES, StatTilePc, EarnedBadgeRow, CvHeroAvatar } = window.PcShared;
  const xpProgress = Math.round(((PC_LAYLA.xp - PC_LAYLA.xpForLevel) / (PC_LAYLA.xpForNext - PC_LAYLA.xpForLevel)) * 100);
  const earned = PC_BADGES.filter(b => b.earned);
  const recentEarned = earned.slice(0, 5);

  return (
    <AppLayout active="" title="Profile">
      <div className="max-w-5xl mx-auto animate-fade-in">

        {/* ─── Hero ─── */}
        <Card variant="glass" className="mb-6 relative overflow-hidden">
          <CardBody className="p-6 md:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary-500/30 to-fuchsia-500/30 blur-3xl pointer-events-none" aria-hidden="true"/>
            <div className="relative flex flex-col md:flex-row gap-6 items-start">
              <CvHeroAvatar size={80} name={PC_LAYLA.name}/>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {PC_LAYLA.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.18em]
                    bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white">
                    <Icon name="Star" size={11}/> Learner
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Mail" size={14}/> {PC_LAYLA.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Calendar" size={14}/> Joined {PC_LAYLA.joined}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Github" size={14}/> @{PC_LAYLA.gitHub}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 self-stretch md:self-start">
                <Button variant="outline" size="md" rightIcon="ArrowRight" onClick={onGotoLearningCv}>
                  View Learning CV
                </Button>
                <Button variant="ghost" size="md" leftIcon="Pencil" onClick={onGotoProfileEdit}>
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Level + XP progress strip */}
            <div className="relative mt-6 p-4 rounded-xl border border-primary-200/60 dark:border-primary-900/40
              bg-gradient-to-br from-primary-50/80 via-purple-50/60 to-fuchsia-50/60
              dark:from-primary-900/15 dark:via-purple-900/15 dark:to-fuchsia-900/15">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Icon name="Trophy" size={18} className="text-amber-500"/>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">Level {PC_LAYLA.level}</span>
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">
                    · {PC_LAYLA.xp.toLocaleString()} XP total
                  </span>
                </div>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-mono">
                  {(PC_LAYLA.xpForNext - PC_LAYLA.xp).toLocaleString()} XP to L{PC_LAYLA.level + 1}
                </span>
              </div>
              <ProgressBar value={xpProgress}/>
            </div>
          </CardBody>
        </Card>

        {/* ─── 4 stat tiles ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTilePc icon="Code"        tone="primary" value={PC_STATS.recentSubmissions}                          label="Recent submissions"/>
          <StatTilePc icon="CheckCircle" tone="success" value={PC_STATS.completedRecent}                            label="Completed"/>
          <StatTilePc icon="Star"        tone="warning" value={PC_STATS.avgRecentScore}                             label="Avg AI score"/>
          <StatTilePc icon="Trophy"      tone="purple"  value={`${PC_STATS.badgesEarned}/${PC_STATS.badgesTotal}`}  label="Badges earned"/>
        </div>

        {/* ─── 2-col: Editable profile + Recent badges ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfileEditFormCard layla={PC_LAYLA}/>
          </div>

          <Card variant="glass">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-50">Recent badges</h2>
                <a href="#" onClick={e=>e.preventDefault()} className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline">View all</a>
              </div>
              {recentEarned.length === 0 ? (
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
                  No badges yet. Submit code or finish a path task to earn your first badge.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentEarned.map(b => <EarnedBadgeRow key={b.key} badge={b}/>)}
                </ul>
              )}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 text-[11.5px] text-slate-500 dark:text-slate-400">
                {earned.length} of {PC_BADGES.length} unlocked
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

/* ─────────── Inline edit form card (lives inside Profile) ─────────── */

function ProfileEditFormCard({ layla }) {
  return (
    <Card variant="glass">
      <CardBody className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">Edit profile</h3>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Update your name, GitHub handle, or profile picture. Email is fixed.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name"><TextInput defaultValue={layla.name}/></Field>
          <Field label="Email" helper="Email cannot be changed."><TextInput defaultValue={layla.email} disabled/></Field>
          <Field label="GitHub username"><TextInput defaultValue={layla.gitHub} prefix="Github"/></Field>
          <Field label="Profile picture URL"><TextInput placeholder="https://..."/></Field>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="primary" size="md" leftIcon="Save">Save changes</Button>
        </div>
      </CardBody>
    </Card>
  );
}

window.ProfilePage_Pc = ProfilePage_Pc;
