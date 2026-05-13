// Login, Register, GitHub OAuth Success

function Divider({ children }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-mono">{children}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function Login({ onNav, dark, setDark }) {
  return (
    <AuthLayout
      dark={dark} setDark={setDark}
      footerLink={<a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}} className="hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1.5"><Icon name="ArrowLeft" size={12}/> Back to home</a>}
    >
      <div className="glass-card p-5 sm:p-6">
        <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Welcome back.</h1>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Sign in to continue your learning path.</p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={(e)=>{e.preventDefault(); onNav("ghsuccess")}}>
          <Field label="Email" error="We couldn't find an account with this email.">
            <TextInput type="email" defaultValue="layla.ahmed@benha.edu" placeholder="you@university.edu" error />
          </Field>

          <Field
            label={
              <span className="flex items-center justify-between w-full">
                <span>Password</span>
                <a href="#" onClick={(e)=>e.preventDefault()} className="text-[12px] text-primary-600 dark:text-primary-300 font-medium hover:underline">Forgot password?</a>
              </span>
            }
          >
            <input
              type="password"
              defaultValue="superSecret123"
              autoFocus
              className="w-full h-10 px-3.5 text-[14px] rounded-xl bg-white dark:bg-slate-900/60 border border-primary-400 dark:border-primary-400 text-slate-900 dark:text-slate-100 outline-none"
              style={{ boxShadow: "0 0 0 3px rgba(139,92,246,0.35), 0 0 0 1px rgba(139,92,246,0.8)" }}
            />
          </Field>

          <Button variant="gradient" size="md" rightIcon="ArrowRight" className="w-full mt-0.5">Sign in</Button>

          <Divider>or continue with</Divider>

          <Button variant="glass" size="md" leftIcon="Github" className="w-full" onClick={()=>onNav("ghsuccess")}>Continue with GitHub</Button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-[13px] text-slate-600 dark:text-slate-300">
          Don't have an account? <a href="#" onClick={(e)=>{e.preventDefault(); onNav("register")}} className="text-primary-600 dark:text-primary-300 font-semibold hover:underline">Sign up</a>
        </div>
      </div>
    </AuthLayout>
  );
}

const TRACKS = [
  { id:"fullstack", title:"Full Stack", desc:"React + .NET",       icon:"Code" },
  { id:"backend",   title:"Backend",    desc:"ASP.NET + Python",   icon:"ScanSearch" },
  { id:"python",    title:"Python",     desc:"Data + Web",         icon:"BookOpen" },
];

function TrackCard({ track, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track.id)}
      className={[
        // Compacted 2026-05-12 to keep Register on a single viewport (no scroll).
        "flex flex-col items-start gap-1.5 p-2.5 rounded-lg border text-left transition-all ring-brand",
        selected
          ? "border-primary-500 bg-primary-50/70 dark:bg-primary-500/15 ring-2 ring-primary-400/30 dark:ring-primary-400/40"
          : "border-slate-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-400/60 bg-white/50 dark:bg-white/[0.02]"
      ].join(" ")}
    >
      <div className={["w-7 h-7 rounded-md flex items-center justify-center",
        selected
          ? "bg-primary-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.55)]"
          : "bg-primary-500/10 text-primary-700 dark:text-primary-200"
      ].join(" ")}>
        <Icon name={track.icon} size={14}/>
      </div>
      <div>
        <div className={["text-[12.5px] font-semibold leading-tight", selected ? "text-primary-700 dark:text-primary-200" : "text-slate-900 dark:text-slate-100"].join(" ")}>{track.title}</div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{track.desc}</div>
      </div>
    </button>
  );
}

function Register({ onNav, dark, setDark }) {
  const [track, setTrack] = paUseState("fullstack");
  const [agree, setAgree] = paUseState(true);
  return (
    <AuthLayout
      dark={dark} setDark={setDark}
      footerLink={<a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}} className="hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1.5"><Icon name="ArrowLeft" size={12}/> Back to home</a>}
    >
      <div className="glass-card p-4 sm:p-5">
        <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Create your account.</h1>

        <form className="mt-3 flex flex-col gap-1.5" onSubmit={(e)=>{e.preventDefault(); onNav("ghsuccess")}}>
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="First name">
              <TextInput placeholder="Layla" defaultValue="Layla" />
            </Field>
            <Field label="Last name">
              <TextInput placeholder="Ahmed" defaultValue="Ahmed" />
            </Field>
          </div>
          <Field label="Email">
            <TextInput type="email" placeholder="you@university.edu" defaultValue="layla.ahmed@benha.edu" />
          </Field>
          <Field label="Password" helper="At least 8 characters, with a number.">
            <TextInput type="password" defaultValue="superSecret123" />
          </Field>

          <div>
            <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Choose your track</label>
            <div className="grid grid-cols-3 gap-2">
              {TRACKS.map(t => <TrackCard key={t.id} track={t} selected={track === t.id} onSelect={setTrack} />)}
            </div>
          </div>

          <label className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 dark:border-white/20 text-primary-500 focus:ring-primary-400 accent-primary-500"
            />
            <span>
              I agree to the <a href="#" onClick={(e)=>{e.preventDefault(); onNav("privacy")}} className="text-primary-600 dark:text-primary-300 hover:underline">Privacy</a> and <a href="#" onClick={(e)=>{e.preventDefault(); onNav("terms")}} className="text-primary-600 dark:text-primary-300 hover:underline">Terms</a>.
            </span>
          </label>

          <Button variant="gradient" size="md" rightIcon="ArrowRight" className="w-full mt-0.5" disabled={!agree}>Create account</Button>

          <Divider>or continue with</Divider>

          <Button variant="glass" size="md" leftIcon="Github" className="w-full" onClick={()=>onNav("ghsuccess")}>Continue with GitHub</Button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-[13px] text-slate-600 dark:text-slate-300">
          Already have an account? <a href="#" onClick={(e)=>{e.preventDefault(); onNav("login")}} className="text-primary-600 dark:text-primary-300 font-semibold hover:underline">Sign in</a>
        </div>
      </div>
    </AuthLayout>
  );
}

function GitHubSuccess({ onNav, dark, setDark }) {
  // animated progress bar
  const [pct, setPct] = paUseState(20);
  paUseEffect(() => {
    const id = setInterval(() => setPct(p => p < 90 ? p + 7 : p), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <AuthLayout dark={dark} setDark={setDark}
      footerLink={<a href="#" onClick={(e)=>{e.preventDefault(); onNav("login")}} className="hover:text-primary-600 dark:hover:text-primary-300">Cancel sign-in</a>}
    >
      <div className="glass-card p-8 sm:p-10 text-center flex flex-col items-center">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl brand-gradient-bg flex items-center justify-center text-white animate-glow-pulse shadow-[0_18px_40px_-10px_rgba(139,92,246,.6)]">
            <Icon name="Sparkles" size={36}/>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-white/10">
            <Icon name="Github" size={14} className="text-slate-700 dark:text-slate-200"/>
          </div>
        </div>
        <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Signing you in via GitHub…</h2>
        <p className="mt-1.5 text-[13px] font-mono text-slate-500 dark:text-slate-400">Capturing your access token securely…</p>

        <div className="mt-6 w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div className="h-full brand-gradient-bg transition-[width] duration-300 ease-out" style={{ width: pct + "%" }} />
        </div>

        <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
          <Badge tone="processing" icon="LoaderCircle">handshake</Badge>
          <Badge tone="primary" icon="ShieldCheck">PKCE</Badge>
          <Badge tone="cyan" icon="KeyRound">scope: user:email</Badge>
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
        You should be redirected automatically. If nothing happens after 5 seconds, <a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}} className="text-primary-600 dark:text-primary-300 hover:underline">click here to continue.</a>
      </p>
    </AuthLayout>
  );
}

Object.assign(window, { Login, Register, GitHubSuccess });
