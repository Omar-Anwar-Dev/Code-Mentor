// Sections 5-9: Cards, Inputs, Badges, Progress, Tabs + Modal

function CardsSection() {
  const cards = [
    { v:"default",  title:"Pattern Matching Quiz",  subtitle:"Module 3 · 12 questions",
      body:"Hands-on practice with regex, glob, and trie-based search. Auto-graded with line-level feedback.",
      meta:"Updated 2 hours ago", cta:"Continue" },
    { v:"bordered", title:"Submission #142",        subtitle:"trie-fuzzy-search.ts",
      body:"Last reviewed by Mentor v2.3 — 3 warnings, 1 suggestion. Diff is ready to apply.",
      meta:"Reviewed 14 min ago", cta:"View diff" },
    { v:"elevated", title:"Active path",             subtitle:"Backend Foundations",
      body:"Database transactions next. You've cleared 7 of 11 milestones in this track.",
      meta:"Streak: 6 days", cta:"Resume" },
    { v:"glass",    title:"Mentor session",          subtitle:"asked about SQL injection",
      body:"Picks up where you left off. Context window includes your last 3 submissions.",
      meta:"Online · GPT-grade", cta:"Open chat" },
    { v:"neon",     title:"Capstone score",          subtitle:"Final review · graded",
      body:(<><span>Distinction-level result. Hover this card to feel the brand.</span>
        <div className="font-mono text-[28px] mt-2 text-primary-600 dark:text-primary-300">94<span className="text-slate-400 text-[16px]">/100</span></div></>),
      meta:"Locked-in 4 days ago", cta:"Share" },
  ];
  return (
    <Section id="cards" eyebrow="05 — Cards" title="Five surfaces, one rhythm"
      description="Default for product. Glass for ambient context. Neon for moments worth pausing on — hover the last one.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c, i) => (
          <Card key={i} variant={c.v}>
            <CardHeader title={c.title} subtitle={c.subtitle}
              right={<Badge tone={c.v==="neon"?"primary":c.v==="glass"?"cyan":"neutral"}>{c.v}</Badge>} />
            <CardBody>{c.body}</CardBody>
            <CardFooter>
              <Button variant={c.v==="neon"?"gradient":"outline"} size="sm" rightIcon="ArrowRight">{c.cta}</Button>
              <span className="text-[12px] text-slate-500">{c.meta}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── INPUTS ─────────────────────────── */
function InputsSection() {
  const [project, setProject] = useState("Trie-based fuzzy search");
  const [model, setModel] = useState("gpt-4o-mini");
  return (
    <Section id="inputs" eyebrow="06 — Inputs" title="Forms with weight and clarity"
      description="Labels above. Helper below. Errors red, never shouting. Glass variant for editorial moments.">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="default" className="p-6 space-y-5">
          <Field label="Email address" helper="We never share your email." error="Invalid format">
            <TextInput value="ahmed.kahin@benha.edu" error placeholder="you@university.edu" readOnly />
          </Field>
          <Field label="Search submissions">
            <TextInput prefix="Search" placeholder="Find by title, repo, or score…" />
          </Field>
          <Field label="Model" helper="Used for the inline annotation pass.">
            <Select value={model} onChange={setModel} options={[
              { value:"gpt-4o-mini", label:"GPT-4o mini · fast"},
              { value:"gpt-4o",       label:"GPT-4o · balanced"},
              { value:"o1-pro",       label:"o1-pro · deep review"},
            ]}/>
          </Field>
        </Card>

        <Card variant="glass" className="p-6 space-y-5">
          <Field label="Project name" helper="Visible to mentors in the dashboard.">
            <TextInput variant="glass" value={project} onChange={(e)=>setProject(e.target.value)} placeholder="Trie-based fuzzy search" />
          </Field>
          <Field label="Notes for the reviewer" helper="Max 2000 chars.">
            <Textarea variant="glass" rows={3} defaultValue="Targeting O(k·n) lookup. Worried about edge cases when the trie depth exceeds 12." />
          </Field>
          <div className="flex items-center justify-between pt-1">
            <Badge tone="primary" icon="Lock">private until graded</Badge>
            <Button variant="gradient" leftIcon="Send">Submit for review</Button>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ─────────────────────────── BADGES ─────────────────────────── */
function BadgesSection() {
  return (
    <Section id="badges" eyebrow="07 — Badges" title="Status, identity, and signal"
      description="Tonal pairs for routine state. Outlined neon variants for identity. Pulsing only for things that are truly live.">
      <Card variant="default" className="p-6 space-y-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Status</div>
          <div className="flex flex-wrap gap-2.5">
            <Badge tone="success"    icon="CircleCheck">Completed</Badge>
            <Badge tone="processing" icon="LoaderCircle">Processing</Badge>
            <Badge tone="failed"     icon="CircleAlert">Failed</Badge>
            <Badge tone="pending"    icon="Clock">Pending</Badge>
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Identity</div>
          <div className="flex flex-wrap gap-2.5">
            <Badge tone="primary" icon="Sparkles">AI</Badge>
            <Badge tone="cyan"    icon="FlaskConical">Beta</Badge>
            <Badge tone="fuchsia" icon="Crown">Pro</Badge>
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Live</div>
          <div className="flex flex-wrap gap-2.5 items-center">
            <Badge tone="primary" glow pulse icon="Radio">Live</Badge>
            <span className="text-[12.5px] text-slate-500">violet glow + 2s pulse — for streaming reviews only</span>
          </div>
        </div>
      </Card>
    </Section>
  );
}

/* ─────────────────────────── PROGRESS + GAUGE + STATS ─────────────────────────── */
function RadialScore({ value=85 }) {
  const r = 16, c = 2*Math.PI*r;
  const dash = (value/100)*c;
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="url(#gauge)" strokeWidth="3"
          strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-[36px] leading-none text-slate-900 dark:text-slate-50">{value}</div>
        <div className="text-[11px] text-slate-500 mt-1">score</div>
      </div>
    </div>
  );
}

function ProgressSection() {
  return (
    <Section id="progress" eyebrow="08 — Progress" title="Bars, gauges, and momentum signals"
      description="One linear bar, one radial gauge, three stat cards. Trend arrows when motion matters.">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card variant="default" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Linear progress</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13.5px] text-slate-700 dark:text-slate-300">Backend Foundations</span>
            <span className="font-mono text-[12.5px] text-slate-500">67% complete</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500" style={{width:"67%"}} />
          </div>
          <div className="mt-4 flex items-center justify-between text-[12px] text-slate-500">
            <span>7 of 11 milestones</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Icon name="TrendingUp" size={12}/> +14% this week</span>
          </div>
        </Card>

        <Card variant="glass" className="p-6 flex flex-col items-center justify-center">
          <RadialScore value={85} />
          <div className="mt-3 text-[12.5px] text-slate-500 text-center">Last submission · 85/100 · distinction</div>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          {[
            { k:"Submissions", v:"24",     trend:"+3" },
            { k:"Avg score",   v:"78",     trend:"+6" },
            { k:"Streak",      v:"6 days", trend:"+1" },
          ].map(s => (
            <Card key={s.k} variant="default" className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[12px] text-slate-500">{s.k}</div>
                <div className="font-mono text-[24px] text-slate-900 dark:text-slate-50 mt-0.5">{s.v}</div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[12px]">
                <Icon name="TrendingUp" size={14} />{s.trend}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── TABS + MODAL ─────────────────────────── */
function TabsModalSection() {
  const [tab, setTab] = useState("Overview");
  const [open, setOpen] = useState(false);
  const [pathChoice, setPathChoice] = useState("backend");
  const tabs = ["Overview","Annotations","Mentor Chat","History"];
  return (
    <Section id="tabs" eyebrow="09 — Tabs &amp; Modal" title="Navigation and momentary surfaces"
      description="Tabs use a 2px primary underline, never a pill background. Modals are frosted, ESC-aware, focus-trapped.">
      <Card variant="default" className="p-6">
        <div className="flex items-center border-b border-slate-200/70 dark:border-white/10 overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className={[
                "h-11 px-4 text-[14px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                tab === t
                  ? "border-primary-500 text-primary-700 dark:text-primary-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              ].join(" ")}>
              {t}
            </button>
          ))}
          <div className="ml-auto">
            <Button variant="outline" size="sm" leftIcon="Plus" onClick={()=>setOpen(true)}>Open modal</Button>
          </div>
        </div>
        <div className="mt-5 text-[14px] text-slate-700 dark:text-slate-300">
          Tab content for: <span className="font-semibold text-slate-900 dark:text-slate-50">{tab}</span>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={()=>setOpen(false)}
        title="Add task to your learning path"
        footer={
          <>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button variant="gradient" leftIcon="Sparkles" onClick={()=>setOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p>Pick a track for "Trie-based fuzzy search". The mentor will tune feedback to that track's standards.</p>
        <Field label="Path">
          <Select value={pathChoice} onChange={setPathChoice} variant="glass" options={[
            { value:"backend",    label:"Backend Foundations"},
            { value:"algorithms", label:"Algorithms & Data Structures"},
            { value:"systems",    label:"Distributed Systems · advanced"},
          ]}/>
        </Field>
      </Modal>
    </Section>
  );
}

Object.assign(window, { CardsSection, InputsSection, BadgesSection, ProgressSection, TabsModalSection });
