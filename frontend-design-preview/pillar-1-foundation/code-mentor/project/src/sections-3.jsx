// Sections 10-15: Toasts, Glass showcase, Neon showcase, Icons, Empty state, Code annotation signature

function ToastsSection() {
  return (
    <Section id="toasts" eyebrow="10 — Toasts" title="Stacked top-right, glass surface"
      description="Tone-coded by intent. Icons left, tight typography, never blocking content underneath.">
      <Card variant="default" className="relative p-6 min-h-[340px] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <Toast tone="success" title="Submission #142 completed" body="Review in 4m 12s. Score: 85/100." />
          <Toast tone="error"   title="Upload failed — file too large" body="ZIP exceeds the 25 MB limit. Trim node_modules and retry." />
          <Toast tone="warning" title="Connection slow — retrying" body="Switching to a lower-bandwidth review tier." />
          <Toast tone="info"    title="AI is reviewing your code…" body="Stage 2 of 4 · pattern matching pass." />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Stacked toast container</div>
        <div className="mt-2 text-[14px] text-slate-600 dark:text-slate-400 max-w-md">
          Fixed position, 8px gap, max 4 visible at once. New entries push older ones down with a 200ms slide.
        </div>
      </Card>
    </Section>
  );
}

/* ─────────────────────────── GLASS SHOWCASE ─────────────────────────── */
function GlassShowcase() {
  const variants = [
    { cls:"glass",          name:".glass",          desc:"Chrome glass for sticky headers & nav." },
    { cls:"glass-card",     name:".glass-card",     desc:"Default card surface — ambient context." },
    { cls:"glass-card glass-card-neon", name:".glass-card-neon", desc:"Reveals a rainbow border on hover." },
    { cls:"glass-frosted",  name:".glass-frosted",  desc:"Thicker blur for modals and sheets." },
    { cls:"glass-shimmer glass-card",  name:".glass-shimmer",  desc:"Light sweep every 3s — celebration only." },
  ];
  return (
    <Section id="glass" eyebrow="11 — Glass surfaces" title="Five variants, one vocabulary"
      description="Backdrop blur + subtle border + tonal background. Hover the third card.">
      <div className="relative">
        {/* ambient orbs behind glass to make it visible */}
        <div className="absolute -top-10 left-10 w-72 h-72 rounded-full blur-3xl opacity-50"
             style={{background:"radial-gradient(closest-side, rgba(139,92,246,.5), transparent)"}} />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-50"
             style={{background:"radial-gradient(closest-side, rgba(6,182,212,.5), transparent)"}} />
        <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-40"
             style={{background:"radial-gradient(closest-side, rgba(236,72,153,.45), transparent)"}} />
        <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {variants.map(v => (
            <div key={v.name} className={["p-6 rounded-2xl", v.cls].join(" ")}>
              <div className="font-mono text-[12px] text-primary-700 dark:text-primary-200">{v.name}</div>
              <div className="mt-3 text-[14px] text-slate-700 dark:text-slate-200">{v.desc}</div>
              <div className="mt-5 flex items-center justify-between text-[12px] text-slate-500">
                <span>blur · saturate · border</span>
                <Icon name="Layers" size={14}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── NEON SHOWCASE ─────────────────────────── */
function NeonShowcase() {
  const shadows = [
    { cls:"shadow-neon",        label:"shadow-neon",        color:"violet" },
    { cls:"shadow-neon-cyan",   label:"shadow-neon-cyan",   color:"cyan" },
    { cls:"shadow-neon-purple", label:"shadow-neon-purple", color:"purple" },
    { cls:"shadow-neon-pink",   label:"shadow-neon-pink",   color:"pink" },
    { cls:"shadow-neon-green",  label:"shadow-neon-green",  color:"green" },
  ];
  const texts = [
    { cls:"text-neon",        word:"AI" },
    { cls:"text-neon-cyan",   word:"LIVE" },
    { cls:"text-neon-purple", word:"VERIFIED" },
    { cls:"text-neon-pink",   word:"ACTIVE" },
    { cls:"text-neon-green",  word:"PRO" },
  ];
  return (
    <Section id="neon" eyebrow="12 — Neon effects" title="Glow, pulse, float — used with discipline"
      description="Never on body text. Never on rest state. Hover, focus, &ldquo;is live&rdquo;, and selection only.">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Column A: neon shadows on buttons */}
        <Card variant="glass" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">Shadows on buttons</div>
          <div className="flex flex-col gap-3">
            {shadows.map(s => (
              <div key={s.cls} className="flex items-center justify-between gap-3">
                <button className={["h-10 px-4 rounded-xl text-[13.5px] font-medium text-white",
                  s.color==="violet" ? "bg-primary-500" :
                  s.color==="cyan"   ? "bg-secondary-500" :
                  s.color==="purple" ? "bg-primary-600" :
                  s.color==="pink"   ? "bg-fuchsia-500" :
                                       "bg-emerald-500",
                  s.cls].join(" ")}>
                  {s.color}
                </button>
                <code className="font-mono text-[11.5px] text-slate-500">.{s.cls}</code>
              </div>
            ))}
          </div>
        </Card>

        {/* Column B: neon text */}
        <Card variant="glass" className="p-6 bg-slate-900/95 dark:bg-slate-900/60">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-4">Text shadows</div>
          <div className="flex flex-col gap-3">
            {texts.map(t => (
              <div key={t.cls} className="flex items-center justify-between gap-3">
                <span className={["font-semibold text-[22px] tracking-wider", t.cls].join(" ")}>{t.word}</span>
                <code className="font-mono text-[11.5px] text-slate-400">.{t.cls}</code>
              </div>
            ))}
          </div>
        </Card>

        {/* Column C: animated effects */}
        <Card variant="glass" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">Animations</div>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-primary-500 text-white font-semibold animate-neon-pulse">neon-pulse</div>
              <code className="font-mono text-[11.5px] text-slate-500">2s ease-in-out</code>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-full bg-primary-500 animate-glow-pulse"></div>
              <code className="font-mono text-[11.5px] text-slate-500">glow-pulse 2s</code>
            </div>
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-secondary-500 to-fuchsia-500 text-white font-semibold animate-float">animate-float</div>
              <code className="font-mono text-[11.5px] text-slate-500">6s y-axis bob</code>
            </div>
            <div className="flex items-center justify-between">
              <div className="px-3 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[12px] animate-neon-flicker border border-amber-500/30">VINTAGE NEON</div>
              <code className="font-mono text-[11.5px] text-slate-500">neon-flicker 3s</code>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ─────────────────────────── ICONS ─────────────────────────── */
const APP_ICONS = [
  { name:"House",         label:"Home",         ctx:"Dashboard nav" },
  { name:"BookOpen",      label:"BookOpen",     ctx:"Learning paths" },
  { name:"Map",           label:"Map",          ctx:"Track overview" },
  { name:"Code",          label:"Code",         ctx:"Editor surface" },
  { name:"ClipboardList", label:"ClipboardList",ctx:"Assessment" },
  { name:"ScanSearch",    label:"ScanSearch",   ctx:"Inline review" },
  { name:"TrendingUp",    label:"TrendingUp",   ctx:"Progress trend" },
  { name:"Trophy",        label:"Trophy",       ctx:"Achievements" },
  { name:"Settings",      label:"Settings",     ctx:"Preferences" },
  { name:"Shield",        label:"Shield",       ctx:"Safety / honor" },
  { name:"Sparkles",      label:"Sparkles",     ctx:"AI moments" },
  { name:"MessageSquare", label:"MessageSquare",ctx:"Mentor chat" },
];

function IconsSection() {
  return (
    <Section id="icons" eyebrow="13 — Iconography" title="Lucide, stroke-2, three sizes"
      description="16 / 20 / 24 for small / medium / large contexts. Stroke is always 2, never filled.">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {APP_ICONS.map(i => (
          <div key={i.label} className="glass-card p-4 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200">
              <Icon name={i.name} size={26}/>
            </div>
            <code className="font-mono text-[12.5px] text-slate-700 dark:text-slate-200 mt-1">{i.label}</code>
            <div className="text-[11.5px] text-slate-500">{i.ctx}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── EMPTY STATE ─────────────────────────── */
function EmptyStateSection() {
  return (
    <Section id="empty" eyebrow="14 — Empty state" title="Canonical empty surface"
      description="Soft circular icon, one heading, one sentence, one CTA. Always specific to the destination.">
      <Card variant="default" className="p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200 mb-5">
          <Icon name="Inbox" size={36}/>
        </div>
        <h3 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">No submissions yet</h3>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-400 max-w-md">
          Submit your first task to see AI-powered feedback here. We'll annotate inline, score by category, and start a mentor chat.
        </p>
        <div className="mt-6">
          <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight">Browse tasks</Button>
        </div>
      </Card>
    </Section>
  );
}

/* ─────────────────────────── CODE ANNOTATION (signature) ─────────────────────────── */
function CodeAnnotationSection() {
  const [open, setOpen] = useState(true); // start open so the signature pattern is visible
  const lines = [
    { n:1, kind:"def",   text:[["k","def "],["fn","get_user_by_email"],["p","(email):"]] },
    { n:2, kind:"plain", text:[["c","    # Look up a user record by their email address."]] },
    { n:3, kind:"plain", text:[["k","    "],["k","query"],["p"," = "],["s",'f"SELECT * FROM users WHERE email = \'{email}\'"']] },
    { n:4, kind:"flag",  text:[["p","    cursor."],["fn","execute"],["p","("],["k","query"],["p",")"]] },
    { n:5, kind:"plain", text:[["k","    return "],["k","cursor"],["p","."],["fn","fetchone"],["p","()"]] },
    { n:6, kind:"plain", text:[] },
    { n:7, kind:"plain", text:[["c","# Caller — note: no input validation on `email_input`."]] },
    { n:8, kind:"plain", text:[["k","user"],["p"," = "],["fn","get_user_by_email"],["p","(email_input)"]] },
  ];
  const colorFor = (k) => ({
    k:"#a78bfa", fn:"#22d3ee", s:"#34d399", c:"#94a3b8", p:"inherit"
  })[k];
  return (
    <Section id="annotation" eyebrow="15 — Code annotation pattern" title="The signature element"
      description="A reviewed line gets a violet left rail and a mentor bubble. Click the bubble to open the suggestion popover.">
      <Card variant="default" className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Icon name="FileCode" size={14} className="text-slate-500" />
            <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">auth/user_lookup.py</span>
            <Badge tone="failed">1 critical</Badge>
            <Badge tone="pending">2 suggestions</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon="Eye">View raw</Button>
            <Button variant="outline" size="sm" leftIcon="Sparkles">Open Mentor Chat</Button>
          </div>
        </div>

        <div className="relative font-mono text-[13px] leading-[1.75] bg-white dark:bg-slate-900/50">
          {lines.map((l) => {
            const isFlag = l.kind === "flag";
            return (
              <div key={l.n} className={[
                "grid grid-cols-[44px_28px_1fr] items-stretch relative",
                isFlag ? "bg-primary-500/10 dark:bg-primary-500/15" : ""
              ].join(" ")}>
                {/* line number */}
                <div className={[
                  "px-3 text-right select-none border-r",
                  isFlag
                    ? "border-primary-500 text-primary-700 dark:text-primary-300 font-semibold"
                    : "border-slate-200/60 dark:border-white/5 text-slate-400"
                ].join(" ")} style={isFlag ? { boxShadow:"inset 4px 0 0 0 #8b5cf6" } : {}}>{l.n}</div>
                {/* gutter slot */}
                <div className="flex items-center justify-center">
                  {isFlag ? (
                    <button
                      onClick={()=>setOpen(o=>!o)}
                      className="w-6 h-6 rounded-full bg-primary-500 text-white shadow-neon flex items-center justify-center hover:scale-110 transition-transform"
                      aria-label="Open mentor annotation"
                    >
                      <Icon name="MessageSquare" size={12}/>
                    </button>
                  ) : null}
                </div>
                {/* code */}
                <div className="pl-3 pr-4 whitespace-pre text-slate-800 dark:text-slate-100">
                  {l.text.length === 0 ? "\u00A0" : l.text.map(([k,t],i) => (
                    <span key={i} style={{ color: colorFor(k), fontStyle: k==="c" ? "italic" : "normal" }}>{t}</span>
                  ))}
                </div>

                {/* inline annotation popover anchored to flagged line */}
                {isFlag && open ? (
                  <div className="col-span-3 px-4 pb-4 pt-1">
                    <div className="glass-frosted rounded-xl border border-primary-400/40 dark:border-primary-400/30 p-4 max-w-2xl glow-md animate-slide-up">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg brand-gradient-bg flex items-center justify-center text-white">
                          <Icon name="Sparkles" size={16}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Mentor Annotation</span>
                            <Badge tone="failed" icon="ShieldAlert">SQL injection risk</Badge>
                          </div>
                          <p className="mt-1.5 text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed">
                            This concatenation creates a SQL injection risk. Use parameterized queries via
                            <code className="font-mono mx-1 px-1 rounded bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-300">cursor.execute(query, params)</code>
                            instead — the driver will escape input safely.
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <Button variant="gradient" size="sm" leftIcon="Wand">Apply suggestion</Button>
                            <Button variant="ghost" size="sm" leftIcon="X" onClick={()=>setOpen(false)}>Dismiss</Button>
                            <span className="ml-auto text-[11.5px] font-mono text-slate-500">confidence · 0.94</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}

Object.assign(window, { ToastsSection, GlassShowcase, NeonShowcase, IconsSection, EmptyStateSection, CodeAnnotationSection });
