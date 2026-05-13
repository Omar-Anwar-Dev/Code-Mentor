/* Pillar 7 / Page 4 — Settings (mirror SettingsPage.tsx)
   Back link + Honest scope banner + 2-col grid (Profile slim form +
   Appearance + Account) */

function SettingsPage_Se({ dark, setDark }) {
  const { SE_LAYLA } = window.SeShared;
  const [compact, setCompact] = React.useState(false);

  return (
    <AppLayout active="" title="Settings">
      <div className="max-w-4xl mx-auto animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="#" onClick={e=>e.preventDefault()}
            className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
            aria-label="Back to dashboard">
            <Icon name="ArrowLeft" size={16} className="text-slate-600 dark:text-slate-300"/>
          </a>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight brand-gradient-text">Settings</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Account, appearance, and session controls.</p>
          </div>
        </div>

        {/* Honest scope banner */}
        <Card variant="glass" className="mb-6 border-cyan-200/60 dark:border-cyan-900/40">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <Icon name="Info" size={18} className="text-cyan-500 dark:text-cyan-300 shrink-0 mt-0.5"/>
              <div className="text-[13px] text-slate-700 dark:text-slate-200">
                <p className="font-semibold text-cyan-700 dark:text-cyan-200 mb-1">What&apos;s wired today</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Profile fields and appearance preferences below persist for real. Notification preferences,
                  privacy toggles, connected-accounts, and data export/delete need a future
                  &nbsp;<code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-cyan-100/60 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">UserSettings</code>
                  &nbsp;backend — not in MVP. CV privacy is on the&nbsp;
                  <a href="#" onClick={e=>e.preventDefault()} className="underline font-medium hover:text-primary-600 dark:hover:text-primary-300">Learning CV</a>
                  &nbsp;page.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Profile slim form — full width */}
          <div className="lg:col-span-2">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-3">Profile</h2>
            <Card variant="glass">
              <CardBody className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full name"><TextInput defaultValue={SE_LAYLA.name}/></Field>
                  <Field label="Email" helper="Email cannot be changed."><TextInput defaultValue={SE_LAYLA.email} disabled/></Field>
                  <Field label="GitHub username"><TextInput defaultValue="layla-ahmed" prefix="Github"/></Field>
                  <Field label="Profile picture URL"><TextInput placeholder="https://..."/></Field>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" size="md" leftIcon="Save">Save changes</Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Appearance */}
          <Card variant="glass">
            <CardBody className="p-5">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Appearance</h2>
              <div className="mb-5">
                <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200 mb-2">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id:"light", label:"Light",  icon:"Sun"     },
                    { id:"dark",  label:"Dark",   icon:"Moon"    },
                    { id:"system",label:"System", icon:"Monitor" },
                  ].map(t => {
                    const isCurrent = (t.id === "light" && !dark) || (t.id === "dark" && dark);
                    const isDisabled = t.id === "system";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { if (!isDisabled) setDark(t.id === "dark"); }}
                        aria-pressed={isCurrent}
                        className={[
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors",
                          isDisabled ? "border-dashed border-slate-200 dark:border-white/10 opacity-55 cursor-not-allowed" :
                          isCurrent
                            ? "border-primary-500 bg-primary-50/80 dark:bg-primary-500/15"
                            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                        ].join(" ")}
                      >
                        <Icon name={t.icon} size={18} className={isCurrent ? "text-primary-600 dark:text-primary-300" : "text-slate-500 dark:text-slate-400"}/>
                        <span className={"text-[11.5px] font-medium " + (isCurrent ? "text-primary-700 dark:text-primary-200" : "text-slate-600 dark:text-slate-300")}>
                          {t.label}
                        </span>
                        {isDisabled && <span className="text-[9px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Soon</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50">Compact mode</p>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">Tighter spacing across the app.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompact(c => !c)}
                  aria-pressed={compact}
                  aria-label="Toggle compact mode"
                  className={"relative w-11 h-6 rounded-full transition-colors shrink-0 " + (compact ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600")}
                >
                  <span className={"absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform " + (compact ? "translate-x-5" : "translate-x-0")}/>
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Account */}
          <Card variant="glass">
            <CardBody className="p-5">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Account</h2>
              <div className="space-y-2 mb-5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Email</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50 truncate font-mono text-[12.5px]">{SE_LAYLA.email}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Role</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{SE_LAYLA.role}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Joined</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{SE_LAYLA.joined}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Authentication</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50 inline-flex items-center gap-1.5">
                    <Icon name="Github" size={12}/> GitHub OAuth
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="md" rightIcon="ExternalLink" className="w-full justify-between">
                  Manage Learning CV
                </Button>
                <Button variant="outline" size="md" rightIcon="LogOut" className="w-full justify-between">
                  Sign out
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

window.SettingsPage_Se = SettingsPage_Se;
