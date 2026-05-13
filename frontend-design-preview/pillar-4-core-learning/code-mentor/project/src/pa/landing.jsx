// Landing page — public marketing home.

function LandingNav({ dark, setDark, onNav }) {
  const [mobile, setMobile] = paUseState(false);
  return (
    <nav className="sticky top-0 z-40 h-16 glass flex items-center px-5 lg:px-10 border-b border-slate-200/40 dark:border-white/5">
      <a href="#hero" onClick={(e)=>{e.preventDefault(); window.scrollTo({top:0, behavior:"smooth"});}} className="flex items-center">
        <BrandLogo />
      </a>
      <div className="hidden md:flex items-center gap-1 ml-10">
        {[["Features","features"],["How it works","journey"],["For students","audit"],["Project Audit","audit"]].map(([label,id]) => (
          <a key={label} href={"#"+id}
             className="px-3 py-1.5 text-[13.5px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 rounded-lg hover:bg-primary-50/60 dark:hover:bg-white/5 transition-colors">
            {label}
          </a>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle dark={dark} setDark={setDark} className="hidden sm:flex" />
        <button onClick={()=>onNav("login")}
          className="hidden sm:inline-flex h-9 px-3 items-center text-[13.5px] text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300">
          Sign in
        </button>
        <Button variant="gradient" size="md" rightIcon="ArrowRight" onClick={()=>onNav("register")} className="hidden sm:inline-flex">
          Get started
        </Button>
        <button className="md:hidden w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200" onClick={()=>setMobile(m=>!m)} aria-label="Menu">
          <Icon name={mobile ? "X" : "Menu"} size={18}/>
        </button>
      </div>
      {mobile && (
        <div className="absolute top-16 left-0 right-0 glass-frosted p-4 border-b border-slate-200/40 dark:border-white/5 flex flex-col gap-2 md:hidden">
          {[["Features","features"],["How it works","journey"],["For students","audit"],["Project Audit","audit"]].map(([label,id]) => (
            <a key={label} href={"#"+id} onClick={()=>setMobile(false)} className="px-3 py-2 text-[14px] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-primary-50/60 dark:hover:bg-white/5">{label}</a>
          ))}
          <div className="flex gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <Button variant="ghost" size="md" className="flex-1" onClick={()=>onNav("login")}>Sign in</Button>
            <Button variant="gradient" size="md" className="flex-1" onClick={()=>onNav("register")}>Get started</Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero({ onNav }) {
  return (
    <section id="hero" className="relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full pl-2 pr-3 py-1 mb-7">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full brand-gradient-bg text-white">
            <Icon name="Sparkles" size={11} />
          </span>
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">AI-powered code review · 2026</span>
        </div>
        <h1 className="text-[44px] sm:text-[64px] lg:text-[72px] leading-[1.04] font-semibold tracking-tight text-slate-900 dark:text-slate-50 max-w-4xl mx-auto text-balance">
          Senior-level code feedback in under <span className="brand-gradient-text whitespace-nowrap">five minutes.</span>
        </h1>
        <p className="mt-6 text-[17px] sm:text-[19px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Submit your code, get multi-layered AI review with inline annotations, then keep iterating with the mentor chat. Built for self-taught developers and CS students who want to ship like seniors.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight" onClick={()=>onNav("register")}>Start free assessment</Button>
          <Button variant="outline" size="lg" leftIcon="ScanSearch" onClick={()=>{document.getElementById("audit")?.scrollIntoView()}}>Try project audit</Button>
        </div>
        <p className="mt-7 font-mono text-[12px] text-slate-500 dark:text-slate-400">
          Built by a 7-person CS team at Benha University · defending Sept 2026
        </p>

        {/* visual proof block — a glass card with a mocked annotation snippet */}
        <div className="mt-14 max-w-4xl mx-auto text-left">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Icon name="FileCode" size={14} className="text-slate-500" />
                <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">auth/user_lookup.py</span>
                <Badge tone="failed">1 critical</Badge>
                <Badge tone="primary" icon="Sparkles">mentor v2.3</Badge>
              </div>
              <span className="font-mono text-[11.5px] text-slate-500">reviewed · 4m 12s</span>
            </div>
            <div className="font-mono text-[13px] leading-[1.8] grid grid-cols-[44px_28px_1fr]">
              {[
                { n:1, t:<><span style={{color:"#a78bfa"}}>def </span><span style={{color:"#22d3ee"}}>get_user_by_email</span>(email):</> },
                { n:2, t:<span className="italic text-slate-500">    # Look up a user record by their email address.</span> },
                { n:3, t:<>    query = <span style={{color:"#34d399"}}>{`f"SELECT * FROM users WHERE email = '{email}'"`}</span></>, flag:true },
                { n:4, t:<>    cursor.<span style={{color:"#22d3ee"}}>execute</span>(query)</> },
                { n:5, t:<><span style={{color:"#a78bfa"}}>    return </span>cursor.<span style={{color:"#22d3ee"}}>fetchone</span>()</> },
              ].map((l) => (
                <React.Fragment key={l.n}>
                  <div className={["px-3 text-right select-none border-r", l.flag ? "border-primary-500 text-primary-700 dark:text-primary-300 font-semibold bg-primary-500/10" : "border-slate-200/60 dark:border-white/5 text-slate-400"].join(" ")} style={l.flag ? {boxShadow:"inset 4px 0 0 0 #8b5cf6"} : {}}>{l.n}</div>
                  <div className={"flex items-center justify-center " + (l.flag ? "bg-primary-500/10" : "")}>
                    {l.flag ? <span className="w-5 h-5 rounded-full bg-primary-500 text-white shadow-neon flex items-center justify-center"><Icon name="MessageSquare" size={11}/></span> : null}
                  </div>
                  <div className={"pl-3 pr-4 whitespace-pre " + (l.flag ? "bg-primary-500/10 text-slate-800 dark:text-slate-100" : "text-slate-800 dark:text-slate-100")}>{l.t}</div>
                </React.Fragment>
              ))}
              <div className="col-span-3 px-4 pb-4 pt-3">
                <div className="glass-frosted rounded-xl border border-primary-400/40 dark:border-primary-400/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-lg brand-gradient-bg flex items-center justify-center text-white"><Icon name="Sparkles" size={14}/></div>
                    <div className="text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-50">SQL injection risk.</span> Use parameterized queries via <code className="font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-300">cursor.execute(query, params)</code>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon:"BookOpen",       title:"Adaptive Assessment",
    body:"30 questions that adapt to your level. Discover your strengths and gaps in 40 minutes, then get a personalized learning path." },
  { icon:"ScanSearch",     title:"Multi-layered Code Review",
    body:"Static analyzers (Bandit, ESLint, Cppcheck…) plus LLM architectural review, unified into per-category scores and inline annotations." },
  { icon:"MessageSquare",  title:"Inline Annotations",
    body:"Mentor comments appear inline, anchored to the exact line. Click to see the suggestion, apply it, or ask the mentor a follow-up." },
  { icon:"Sparkles",       title:"RAG-Powered Mentor Chat",
    body:"Ask the mentor about your code. Answers are grounded in your actual submission — chunked, embedded, retrieved per query." },
  { icon:"Map",            title:"Personalized Learning Path",
    body:"An ordered sequence of real coding tasks tuned to your weakest categories. Replace one with an AI-recommended task anytime." },
  { icon:"Trophy",         title:"Shareable Learning CV",
    body:"A verifiable, public profile of your scored submissions. A data-backed alternative to course-completion certificates." },
];

function FeaturesSection() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-24">
      <div className="max-w-3xl mb-12">
        <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">Features</div>
        <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Six pieces that work as one product.</h2>
        <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-400 max-w-2xl">
          Assessment, review, annotations, chat, path, CV. Each step feeds the next — no isolated tools, no dead ends.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <div key={i} className="glass-card p-6 hover:-translate-y-0.5 transition-transform duration-300">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200 mb-5">
              <Icon name={f.icon} size={22}/>
            </div>
            <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{f.title}</h3>
            <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const JOURNEY = [
  { icon:"BookOpen",      title:"Take the assessment", body:"30 adaptive questions. ~40 minutes. We measure your level across 5 categories." },
  { icon:"Map",           title:"Get your path",        body:"An ordered list of real tasks tuned to where you're weakest. Start with the one we recommend." },
  { icon:"Code",          title:"Submit your code",     body:"GitHub URL or ZIP. We run static analysis + AI review in under 5 minutes." },
  { icon:"MessageSquare", title:"Iterate with mentor",  body:"Ask follow-up questions. Resubmit. Build your Learning CV as you go." },
];

function JourneySection() {
  return (
    <section id="journey" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-24">
      <div className="max-w-3xl mb-12">
        <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">How it works</div>
        <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">From submission to senior-level signal.</h2>
        <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-400 max-w-2xl">Four steps. Hover any card to feel the brand — the rainbow border is the signature.</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
        {JOURNEY.map((s, i) => (
          <React.Fragment key={i}>
            <div className="glass-card glass-card-neon p-6 flex-1 relative">
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200">
                  <Icon name={s.icon} size={22}/>
                </div>
                <span className="font-mono text-[11px] text-slate-400">0{i+1}</span>
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed">{s.body}</p>
            </div>
            {i < JOURNEY.length - 1 ? (
              <div className="hidden lg:flex items-center text-slate-400 dark:text-slate-500"><Icon name="ChevronRight" size={20}/></div>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function AuditTeaser() {
  return (
    <section id="audit" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 brand-gradient-bg opacity-[0.10] dark:opacity-[0.15]" />
      <div className="absolute inset-0 bg-grid" />
      <div className="relative max-w-3xl mx-auto px-6 lg:px-10">
        <div className="glass-card p-8 sm:p-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge tone="cyan" icon="FlaskConical">F11 · standalone</Badge>
          </div>
          <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Already have a project? Get an instant audit.</h2>
          <p className="mt-3 text-[15.5px] text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Skip the assessment. Upload a GitHub repo or ZIP plus a short description, and the AI returns an 8-section structured audit — overall score, security review, completeness against your description, and a top-5 prioritized fix list.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <Button variant="gradient" size="lg" leftIcon="ScanSearch" rightIcon="ArrowRight">Audit my project</Button>
          </div>
          <div className="mt-7 grid sm:grid-cols-4 gap-3 text-left">
            {[
              { k:"Overall score",    icon:"Gauge" },
              { k:"Security review",  icon:"ShieldCheck" },
              { k:"Completeness",     icon:"ListChecks" },
              { k:"Top-5 fix list",   icon:"Wrench" },
            ].map(s => (
              <div key={s.k} className="glass rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                <Icon name={s.icon} size={14} className="text-primary-600 dark:text-primary-300"/>
                <span className="text-[12.5px] text-slate-700 dark:text-slate-200">{s.k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onNav }) {
  return (
    <section className="relative py-20 sm:py-28 text-center max-w-3xl mx-auto px-6">
      <h2 className="text-[32px] sm:text-[44px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Ready to ship like a <span className="brand-gradient-text">senior?</span>
      </h2>
      <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-400">Free during the defense window. No credit card.</p>
      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <Button variant="gradient" size="lg" leftIcon="UserPlus" onClick={()=>onNav("register")}>Create account</Button>
        <Button variant="glass" size="lg" leftIcon="LogIn" onClick={()=>onNav("login")}>Sign in instead</Button>
      </div>
    </section>
  );
}

function LandingFooter({ onNav }) {
  return (
    <footer className="border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-950/60 mt-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-[1fr_auto] gap-8 items-start">
        <div>
          <BrandLogo size="sm" />
          <div className="mt-4 text-[13.5px] text-slate-600 dark:text-slate-300 max-w-md">
            Code Mentor — Benha University Faculty of Computers and AI · Class of 2026.
          </div>
          <div className="mt-1.5 text-[12.5px] text-slate-500 dark:text-slate-400">
            Supervisors: Prof. Mohammed Belal · Eng. Mohamed El-Saied
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <div className="flex items-center gap-4">
            <a href="#" onClick={(e)=>{e.preventDefault(); onNav("privacy")}} className="text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300">Privacy</a>
            <a href="#" onClick={(e)=>{e.preventDefault(); onNav("terms")}} className="text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300">Terms</a>
            <a href="https://github.com/Omar-Anwar-Dev/Code-Mentor" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300">
              <Icon name="Github" size={16}/>
            </a>
          </div>
          <div className="font-mono text-[11.5px] text-slate-500">commit · 2026-05-12</div>
        </div>
      </div>
    </footer>
  );
}

function Landing({ onNav, dark, setDark }) {
  return (
    <div className="min-h-screen">
      <LandingNav dark={dark} setDark={setDark} onNav={onNav} />
      <Hero onNav={onNav} />
      <FeaturesSection />
      <JourneySection />
      <AuditTeaser />
      <FinalCTA onNav={onNav} />
      <LandingFooter onNav={onNav} />
    </div>
  );
}

window.Landing = Landing;
