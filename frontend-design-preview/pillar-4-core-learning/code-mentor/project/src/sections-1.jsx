// Sections 1-4: Hero/AnimatedBackground, Colors, Typography, Buttons

const ANIM_BG = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    {/* gradient orbs */}
    <div
      className="absolute -top-24 -left-24 w-[384px] h-[384px] rounded-full blur-3xl opacity-70 animate-pulse"
      style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))" }}
    />
    <div
      className="absolute top-1/3 -right-20 w-[320px] h-[320px] rounded-full blur-3xl opacity-70 animate-pulse"
      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.35), rgba(59,130,246,0.35))", animationDelay: "1s" }}
    />
    <div
      className="absolute -bottom-24 left-1/4 w-[256px] h-[256px] rounded-full blur-3xl opacity-60 animate-pulse"
      style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))", animationDelay: "2s" }}
    />
    {/* grid overlay */}
    <div className="absolute inset-0 bg-grid" />
    {/* floating particles */}
    <span className="absolute left-[18%] top-[28%] w-1.5 h-1.5 rounded-full bg-primary-400 animate-float opacity-60" />
    <span className="absolute right-[22%] top-[60%] w-1.5 h-1.5 rounded-full bg-secondary-400 animate-float opacity-50" style={{ animationDelay: "2.5s" }} />
    <span className="absolute left-[45%] bottom-[14%] w-2 h-2 rounded-full bg-fuchsia-400 animate-float opacity-50" style={{ animationDelay: "4s" }} />
  </div>
);

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <ANIM_BG />
      <div className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-28 pb-28 sm:pt-36 sm:pb-32 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full pl-2 pr-3 py-1 mb-7">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white">
            <Icon name="Sparkles" size={11} />
          </span>
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">Design System v1 — September 2026</span>
        </div>
        <h1 className="text-[44px] sm:text-[64px] leading-[1.05] font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
          Code Mentor — <span className="brand-gradient-text">Neon &amp; Glass</span> Design System
        </h1>
        <p className="mt-6 text-[16px] sm:text-[18px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Canonical reference for the visual identity. Every page in the platform inherits from this — colors, surfaces, motion, and rhythm.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="gradient" size="lg" leftIcon="Rocket" rightIcon="ArrowRight">Launch tour</Button>
          <Button variant="glass" size="lg" leftIcon="Github">View on GitHub</Button>
        </div>

        {/* live system stats */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { k: "112", v: "tokens" },
            { k: "38", v: "components" },
            { k: "5", v: "glass variants" },
            { k: "9", v: "neon utilities" },
          ].map((s) => (
            <div key={s.v} className="glass-card px-4 py-3 text-left">
              <div className="font-mono text-[22px] text-slate-900 dark:text-slate-50">{s.k}</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── COLORS ─────────────────────────── */
const PRIMARY_LADDER = [
  ["50","#f5f3ff"],["100","#ede9fe"],["200","#ddd6fe"],["300","#c4b5fd"],
  ["400","#a78bfa"],["500","#8b5cf6"],["600","#7c3aed"],["700","#6d28d9"],
  ["800","#5b21b6"],["900","#4c1d95"],["950","#2e1065"]
];
const SECONDARY_LADDER = [["400","#22d3ee"],["500","#06b6d4"],["600","#0891b2"]];
const ACCENT_LADDER    = [["400","#e879f9"],["500","#d946ef"],["600","#c026d3"]];

function Ladder({ stops }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200/60 dark:border-white/10">
      {stops.map(([k, c]) => (
        <div key={k} className="flex-1 min-w-0 group relative" title={`${k} — ${c}`}>
          <div className="h-9" style={{ background: c }} />
          <div className="px-1.5 py-1 text-[10px] font-mono text-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60">{k}</div>
        </div>
      ))}
    </div>
  );
}

function BrandColorCard({ name, role, hex, swatch, ladder, gradientChip }) {
  return (
    <Card variant="default" className="overflow-hidden">
      <div className="h-32 relative" style={{ background: swatch }}>
        {gradientChip ? (
          <div className="absolute inset-0 brand-gradient-bg opacity-0" />
        ) : null}
        <div className="absolute left-4 bottom-4 text-white/90 font-mono text-[11px] backdrop-blur-sm bg-black/20 rounded-md px-1.5 py-0.5">
          {hex}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{name}</div>
          <code className="font-mono text-[12px] text-slate-500">{hex}</code>
        </div>
        <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{role}</p>
        <div className="mt-4"><Ladder stops={ladder} /></div>
      </div>
    </Card>
  );
}

function ColorsSection() {
  const semantic = [
    { name:"Success", role:"Emerald 500", hex:"#10b981", c:"#10b981" },
    { name:"Warning", role:"Amber 500",   hex:"#f59e0b", c:"#f59e0b" },
    { name:"Error",   role:"Red 500",     hex:"#ef4444", c:"#ef4444" },
    { name:"Info",    role:"Cyan 500",    hex:"#06b6d4", c:"#06b6d4" },
  ];
  return (
    <Section id="colors" eyebrow="02 — Colors" title="Brand trio + semantic + signature gradient"
      description="Violet ≈ 60% of color use. Cyan ≈ 25%. Fuchsia ≈ 15% — celebration only. No other hues.">
      {/* 2a: brand trio */}
      <div className="grid md:grid-cols-3 gap-5">
        <BrandColorCard name="Primary — Violet" role="Main accent, surfaces, focus rings"
          hex="#8b5cf6" swatch="#8b5cf6" ladder={PRIMARY_LADDER} />
        <BrandColorCard name="Secondary — Cyan" role="Data, links, supportive signal"
          hex="#06b6d4" swatch="#06b6d4" ladder={SECONDARY_LADDER} />
        <BrandColorCard name="Accent — Fuchsia" role="Celebration & emphasis moments"
          hex="#d946ef" swatch="#d946ef" ladder={ACCENT_LADDER} />
      </div>

      {/* 2b: semantic */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {semantic.map(s => (
          <Card key={s.name} variant="default" className="overflow-hidden">
            <div className="h-16" style={{ background: s.c }} />
            <div className="p-4">
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">{s.name}</div>
              <div className="flex items-baseline justify-between mt-0.5">
                <div className="text-[12px] text-slate-500">{s.role}</div>
                <code className="font-mono text-[11.5px] text-slate-500">{s.hex}</code>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 2c: signature gradient */}
      <div className="mt-10 relative rounded-2xl overflow-hidden brand-gradient-bg p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.18),transparent_60%)]" />
        <div className="relative flex flex-col gap-2 text-white">
          <div className="text-[12px] font-mono uppercase tracking-[0.2em] text-white/80">Signature gradient</div>
          <div className="text-[22px] sm:text-[28px] font-semibold tracking-tight">Cyan → Blue → Violet → Pink</div>
          <code className="mt-2 font-mono text-[12.5px] text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit">
            linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899)
          </code>
          <p className="mt-2 text-[13.5px] text-white/85 max-w-2xl">
            Reserved for: animated card border on hover, hero CTAs, brand logo container. One per surface, never twice.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── TYPOGRAPHY ─────────────────────────── */
function TypeRow({ tag, sample, sizeMobile, sizeDesktop, weight, tracking, El = "div" }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-8 py-5 border-b border-slate-200/70 dark:border-white/5 last:border-0">
      <div className="md:w-2/3">
        <El className={[
          "tracking-tight font-semibold text-slate-900 dark:text-slate-50",
          tag === "h1" ? "text-[36px] md:text-[48px] leading-[1.05]" :
          tag === "h2" ? "text-[30px] md:text-[36px] leading-[1.1]" :
          tag === "h3" ? "text-[24px] md:text-[30px] leading-[1.15]" :
                          "text-[20px] md:text-[24px] leading-[1.2]"
        ].join(" ")}>
          {sample}
        </El>
      </div>
      <div className="md:w-1/3 font-mono text-[11.5px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-primary-600 dark:text-primary-300">{tag}</span>
        <span>{sizeMobile} / {sizeDesktop}</span>
        <span>{weight}</span>
        <span>{tracking}</span>
      </div>
    </div>
  );
}

function CodeBlock() {
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const K = ({children}) => <span style={{color:"#a78bfa"}}>{children}</span>;
  const S = ({children}) => <span style={{color:"#34d399"}}>{children}</span>;
  const F = ({children}) => <span style={{color:"#22d3ee"}}>{children}</span>;
  const C = ({children}) => <span className="italic text-slate-500">{children}</span>;
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70"></span>
          <span className="ml-3 font-mono text-[11.5px] text-slate-500">useFeedbackPolling.ts</span>
        </div>
        <Button variant="ghost" size="sm" leftIcon={copied ? "Check" : "Copy"} onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="px-4 py-4 text-[13px] leading-[1.7] font-mono overflow-x-auto whitespace-pre">
<C>{"// Polls submission status until the AI review is ready."}</C>{"\n"}
<K>export function </K><F>useFeedbackPolling</F>{"(submissionId: string) {\n"}
{"  "}<K>const </K>{"[status, setStatus] = React."}<F>useState</F>{"("}<S>"queued"</S>{");\n"}
{"  React."}<F>useEffect</F>{"(() => {\n"}
{"    "}<K>const </K>{"id = "}<F>setInterval</F>{"("}<K>async </K>{"() => {\n"}
{"      "}<K>const </K>{"res = "}<K>await </K><F>fetchStatus</F>{"(submissionId);\n"}
{"      setStatus(res.status);\n"}
{"      "}<K>if </K>{"(res.status === "}<S>"ready"</S>{") "}<F>clearInterval</F>{"(id);\n"}
{"    }, 1500);\n"}
{"  }, [submissionId]);\n"}
{"  "}<K>return </K>{"status;\n"}
{"}"}
      </pre>
    </div>
  );
}

function TypographySection() {
  return (
    <Section id="typography" eyebrow="03 — Typography" title="Inter for UI. JetBrains Mono for code."
      description="Variable axes, tight tracking on display sizes, contextual ligatures on code.">
      <Card variant="glass" className="p-2 md:p-4">
        <div className="p-5">
          <TypeRow tag="h1" El="div" sample="Senior-level feedback in five minutes." sizeMobile="36px/40" sizeDesktop="48px/52" weight="600" tracking="-0.025em" />
          <TypeRow tag="h2" El="div" sample="Submit your code. We'll handle the review." sizeMobile="30px/36" sizeDesktop="36px/42" weight="600" tracking="-0.025em" />
          <TypeRow tag="h3" El="div" sample="Pattern matching, static analysis, mentor chat." sizeMobile="24px/30" sizeDesktop="30px/36" weight="600" tracking="-0.025em" />
          <TypeRow tag="h4" El="div" sample="Annotations are inline and structured." sizeMobile="20px/26" sizeDesktop="24px/30" weight="600" tracking="-0.025em" />
        </div>
        <div className="px-5 pb-6">
          <p className="text-[15px] leading-[1.7] text-slate-700 dark:text-slate-300 max-w-3xl">
            Code Mentor closes the gap between basic coding literacy and professional engineering competency.
            Submit your code, get a senior-developer review in under five minutes, then keep iterating with the AI
            mentor on architecture, edge cases, and style — until the work is portfolio-grade.
          </p>
          <p className="text-[13px] mt-3 text-slate-500 dark:text-slate-400">
            Inline code:&nbsp;
            <code className="font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[12.5px] text-primary-700 dark:text-primary-300">const score = await analyzeSubmission(submissionId);</code>
          </p>
        </div>
      </Card>
      <div className="mt-5"><CodeBlock /></div>
    </Section>
  );
}

/* ─────────────────────────── BUTTONS ─────────────────────────── */
const VARIANTS = [
  { v: "primary",   label: "Run review",  icon: "Play" },
  { v: "secondary", label: "View report", icon: "FileText" },
  { v: "outline",   label: "Save draft",  icon: "Bookmark" },
  { v: "ghost",     label: "Dismiss",     icon: "X" },
  { v: "danger",    label: "Delete",      icon: "Trash2" },
  { v: "gradient",  label: "Submit & celebrate", icon: "Sparkles" },
  { v: "neon",      label: "Open in editor",     icon: "Code" },
  { v: "glass",     label: "Skim feedback",      icon: "Eye" },
];

function ButtonsSection() {
  return (
    <Section id="buttons" eyebrow="04 — Buttons" title="Eight variants × three sizes"
      description="Verbs first. Icons reinforce meaning. Hover lifts the surface 2px and grows the shadow.">
      <Card variant="default" className="p-6 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-x-5 gap-y-3 items-center">
            <div></div>
            {["sm","md","lg"].map(s => (
              <div key={s} className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">{s}</div>
            ))}
            {VARIANTS.map(({v, label, icon}) => (
              <React.Fragment key={v}>
                <div className="font-mono text-[11.5px] text-slate-500">{v}</div>
                {["sm","md","lg"].map(s => (
                  <div key={s}><Button variant={v} size={s} leftIcon={icon}>{label}</Button></div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid md:grid-cols-2 gap-5">
        <Card variant="bordered" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">States</div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary" leftIcon="Play">Default</Button>
            <Button variant="primary" leftIcon="Play" className="-translate-y-0.5 shadow-[0_8px_24px_-8px_rgba(139,92,246,.6)]">Hover</Button>
            <Button variant="primary" leftIcon="Play" className="ring-2 ring-primary-400/60 ring-offset-2 ring-offset-white dark:ring-offset-slate-900">Focus</Button>
            <Button variant="primary" leftIcon="Play" disabled>Disabled</Button>
            <Button variant="primary" loading>Reviewing…</Button>
          </div>
          <div className="mt-5 flex items-center gap-2 text-[12px] text-slate-500">
            <Icon name="ArrowRight" size={12} className="text-primary-500" />
            <span className="font-mono">hover →</span>
            <span>peer demonstrates lift + violet glow</span>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">CTAs in context</div>
          <div className="flex flex-col gap-3">
            <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight" className="w-full">Submit for review</Button>
            <Button variant="neon" size="lg" leftIcon="Code" className="w-full">Open inline annotations</Button>
            <div className="flex gap-2">
              <Button variant="outline" leftIcon="GitBranch" className="flex-1">Connect repo</Button>
              <Button variant="ghost" leftIcon="Upload" className="flex-1">Upload ZIP</Button>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}

Object.assign(window, { HeroSection, ColorsSection, TypographySection, ButtonsSection });
