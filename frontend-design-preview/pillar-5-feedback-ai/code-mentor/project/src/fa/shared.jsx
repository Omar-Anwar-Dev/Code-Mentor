// Feedback & AI — shared components: FeedbackPanel sub-cards, MentorChat (inline + slide-out), Status, Severity, Prism, Audit list, modals.

const { useState: faUseState, useEffect: faUseEffect, useRef: faUseRef, useMemo: faUseMemo } = React;

/* ─────────────── Mini Prism (TypeScript + Python only) ─────────────── */

const PRISM_KW = {
  typescript: ["const","let","var","function","return","if","else","throw","new","import","from","export","type","interface","extends","implements","await","async","try","catch","finally","null","undefined","true","false"],
  python:     ["def","return","if","else","elif","import","from","as","class","try","except","finally","raise","with","for","in","while","None","True","False","and","or","not","lambda","async","await"],
};
const PRISM_BUILTINS = {
  typescript: ["console","process","Error","Promise","jwt"],
  python:     ["db","text","print","range","len","str","int","dict","list"],
};

function escapeHtml(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function prismHighlight(code, lang) {
  const kws = new Set(PRISM_KW[lang] || []);
  const builtins = new Set(PRISM_BUILTINS[lang] || []);
  // tokenize line-by-line preserving newlines
  const lines = code.split("\n");
  return lines.map(line => {
    // mark comments
    const commentIdx = (() => {
      if (lang === "python") return line.indexOf("#");
      const a = line.indexOf("//");
      return a;
    })();
    let head = line, tail = "";
    if (commentIdx >= 0) { head = line.slice(0, commentIdx); tail = line.slice(commentIdx); }
    // strings (single/double/backtick + f-strings)
    head = head.replace(/(f?["'`])((?:\\.|(?!\1).)*)\1/g, (m) => `\u0001STR\u0002${escapeHtml(m)}\u0001/STR\u0002`);
    // identifiers / numbers
    head = escapeHtml(head);
    head = head.replace(/\b\d+(\.\d+)?\b/g, m => `<span class="t-num">${m}</span>`);
    head = head.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (m) => {
      if (kws.has(m))      return `<span class="t-kw">${m}</span>`;
      if (builtins.has(m)) return `<span class="t-bi">${m}</span>`;
      return m;
    });
    // function calls
    head = head.replace(/([A-Za-z_][A-Za-z0-9_]*)(\s*\()/g, (m, name, paren) => {
      if (kws.has(name) || builtins.has(name)) return m;
      return `<span class="t-fn">${name}</span>${paren}`;
    });
    // restore strings
    head = head.replace(/\u0001STR\u0002([\s\S]*?)\u0001\/STR\u0002/g, (m, s) => `<span class="t-str">${s}</span>`);
    if (tail) tail = `<span class="t-cm">${escapeHtml(tail)}</span>`;
    return head + tail;
  }).join("\n");
}

function PrismBlock({ code, lang = "typescript", className = "" }) {
  const html = faUseMemo(() => prismHighlight(code, lang), [code, lang]);
  return (
    <pre className={"prism-pre rounded-md bg-slate-900/80 dark:bg-black/40 ring-1 ring-white/5 text-[12px] leading-[1.55] p-3 overflow-x-auto font-mono " + className}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

/* ─────────────── StatusBanner ─────────────── */

function StatusBanner({ status = "completed" }) {
  const states = {
    completed:  { tone:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30", icon:"CircleCheck", title:"Completed",                hint:null },
    pending:    { tone:"bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-200 dark:border-white/10",                       icon:"Clock",       title:"Queued",                   hint:"Waiting for a worker." },
    processing: { tone:"bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:border-cyan-400/30",                    icon:"Loader",      title:"Processing your code…",    hint:"Static analysis + AI review usually takes 30 seconds to 3 minutes." },
    failed:     { tone:"bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30",                          icon:"CircleX",     title:"Failed",                    hint:"We hit an error during analysis. Try resubmitting." },
  };
  const s = states[status];
  return (
    <div className={"flex items-start gap-3 p-4 rounded-xl border " + s.tone}>
      <Icon name={s.icon} size={18} className={status === "processing" ? "animate-spin" : ""}/>
      <div>
        <div className="text-[14px] font-semibold">{s.title}</div>
        {s.hint ? <div className="text-[12.5px] opacity-80 mt-0.5">{s.hint}</div> : null}
      </div>
    </div>
  );
}

function SourceTimelineCard({ source, timeline }) {
  return (
    <Card variant="glass">
      <CardBody className="p-6 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon name="Github" size={15} className="text-slate-500"/>
          <span className="text-[12.5px] text-slate-500 dark:text-slate-400">Source:</span>
          <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-mono text-[12px] text-slate-700 dark:text-slate-200">{source}</code>
        </div>
        <ol className="space-y-2 text-[13.5px]">
          {timeline.map((t,i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className={"w-2 h-2 rounded-full " + (t.done ? "bg-primary-500 shadow-[0_0_6px_rgba(139,92,246,.7)]" : "bg-slate-300 dark:bg-white/15")}/>
              <span className="font-medium text-slate-800 dark:text-slate-100">{t.label}</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11.5px] ml-auto">{t.time}</span>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

/* ─────────────── Severity ─────────────── */

function SeverityIcon({ s }) {
  if (s === "critical" || s === "high" || s === "error") return <Icon name="OctagonX" size={18} className="text-red-500"/>;
  if (s === "warning") return <Icon name="TriangleAlert" size={18} className="text-amber-500"/>;
  return <Icon name="Lightbulb" size={18} className="text-primary-500"/>;
}
function SeverityBadge({ s }) {
  const map = {
    critical: { c:"bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", t:"critical" },
    high:     { c:"bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", t:"high" },
    warning:  { c:"bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", t:"warning" },
    info:     { c:"bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-slate-300", t:"info" },
  };
  const m = map[s] || map.info;
  return <span className={"inline-flex items-center px-2 h-5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider " + m.c}>{m.t}</span>;
}

/* ─────────────── FeedbackPanel sub-cards ─────────────── */

function PersonalizedChip() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-violet-400/40 backdrop-blur-sm w-fit"
      style={{ background:"linear-gradient(90deg, rgba(139,92,246,.10), rgba(217,70,239,.10), rgba(6,182,212,.10))" }}
      title="This review is informed by your learning history — past submissions, recurring patterns, and your improvement trend.">
      <Icon name="Award" size={15} className="text-violet-600 dark:text-violet-300"/>
      <span className="text-[13px] font-medium text-violet-900 dark:text-violet-100">Personalized for your learning journey</span>
    </div>
  );
}

function FaRadarChart({ axes, values, size = 280 }) {
  // axes: ["Correctness", ...], values: [92, ...]
  const cx = size/2, cy = size/2, r = size/2 - 32;
  const N = axes.length;
  const points = values.map((v,i) => {
    const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
    const rr = r * (v/100);
    return [cx + Math.cos(ang)*rr, cy + Math.sin(ang)*rr];
  });
  const grid = [0.25, 0.5, 0.75, 1].map(k => axes.map((_,i) => {
    const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
    return [cx + Math.cos(ang)*r*k, cy + Math.sin(ang)*r*k];
  }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4"/><stop offset="50%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
      {grid.map((ring,ri) => (
        <polygon key={ri} points={ring.map(p=>p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity={ri===3?0.25:0.10} className="text-slate-400 dark:text-white"/>
      ))}
      {axes.map((_,i) => {
        const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
        return <line key={i} x1={cx} y1={cy} x2={cx+Math.cos(ang)*r} y2={cy+Math.sin(ang)*r} stroke="currentColor" strokeOpacity={0.10} className="text-slate-400 dark:text-white"/>;
      })}
      <polygon points={points.map(p=>p.join(",")).join(" ")} fill="url(#radarFill)" fillOpacity={0.30} stroke="#8b5cf6" strokeWidth={2}/>
      {points.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#8b5cf6" stroke="white" strokeWidth={1.2}/>)}
      {axes.map((a,i) => {
        const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
        const lx = cx + Math.cos(ang)*(r+18), ly = cy + Math.sin(ang)*(r+18);
        return <text key={a} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize:11, fontWeight:600 }}>{a} <tspan className="fill-primary-600 dark:fill-primary-300" style={{ fontFamily:'JetBrains Mono', fontSize:10 }}>{values[i]}</tspan></text>;
      })}
    </svg>
  );
}

function ScoreOverviewCard({ score, summary, axes, values }) {
  const color = score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  return (
    <Card variant="glass">
      <CardBody className="p-6 grid md:grid-cols-2 gap-6 items-center">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <Icon name="Award" size={13} className="text-primary-500"/>
            Overall feedback
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={"text-[72px] font-extrabold leading-none tracking-tight " + color}>{score}</span>
            <span className="text-[24px] text-slate-400 dark:text-slate-500 align-top">/100</span>
          </div>
          <p className="mt-4 text-[13.5px] text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">{summary}</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <FaRadarChart axes={axes} values={values} size={280}/>
        </div>
      </CardBody>
    </Card>
  );
}

function CategoryRatingsCard({ categories }) {
  const [votes, setVotes] = faUseState({ Security: "up" });
  const v = (name, dir) => setVotes(p => ({ ...p, [name]: p[name]===dir ? null : dir }));
  return (
    <Card variant="glass">
      <CardBody className="p-6 space-y-4">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Was this feedback helpful?</div>
          <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">Rate each category — your votes help us tune the AI for future learners.</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map(c => (
            <div key={c.name} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/40 dark:bg-white/[0.03]">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{c.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Score: {c.score}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={()=>v(c.name,"up")} className={["p-1.5 rounded-md border transition-colors ring-brand", votes[c.name]==="up" ? "bg-emerald-500 text-white border-emerald-500" : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-emerald-500/10"].join(" ")} aria-label="Helpful">
                  <Icon name="ThumbsUp" size={13}/>
                </button>
                <button onClick={()=>v(c.name,"down")} className={["p-1.5 rounded-md border transition-colors ring-brand", votes[c.name]==="down" ? "bg-red-500 text-white border-red-500" : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-red-500/10"].join(" ")} aria-label="Not helpful">
                  <Icon name="ThumbsDown" size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function StrengthsWeaknessesCard({ strengths, weaknesses }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card variant="glass"><CardBody className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="CircleCheck" size={18} className="text-emerald-500"/>
          <span className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-300">Strengths</span>
        </div>
        <ul className="list-disc list-inside space-y-2 text-[13.5px] text-slate-700 dark:text-slate-200 marker:text-emerald-500/70">
          {strengths.map((s,i) => <li key={i}>{s}</li>)}
        </ul>
      </CardBody></Card>
      <Card variant="glass"><CardBody className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="TriangleAlert" size={18} className="text-amber-500"/>
          <span className="text-[15px] font-semibold text-amber-700 dark:text-amber-300">Weaknesses</span>
        </div>
        <ul className="list-disc list-inside space-y-2 text-[13.5px] text-slate-700 dark:text-slate-200 marker:text-amber-500/70">
          {weaknesses.map((w,i) => <li key={i}>{w}</li>)}
        </ul>
      </CardBody></Card>
    </div>
  );
}

function ProgressAnalysisCard({ children }) {
  return (
    <Card variant="glass"><CardBody className="p-6 space-y-2">
      <div className="flex items-center gap-2">
        <Icon name="Award" size={18} className="text-violet-600 dark:text-violet-300"/>
        <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">Progress vs your earlier submissions</span>
      </div>
      <p className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>
    </CardBody></Card>
  );
}

function InlineAnnotationsCard() {
  const [activeFile, setActiveFile] = faUseState(0);
  const [expanded, setExpanded] = faUseState(0);
  const files = [
    { name:"src/components/SignUpForm.tsx", count:2 },
    { name:"src/lib/validators.ts",          count:1 },
    { name:"src/api/auth.ts",                count:1 },
  ];
  return (
    <Card variant="glass" className="p-0 overflow-hidden">
      <div className="grid md:grid-cols-[220px_1fr]">
        <aside className="border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-white/8 max-h-96 overflow-y-auto">
          <div className="p-3 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-white/5">
            <Icon name="FileCode" size={12}/>Files
          </div>
          {files.map((f,i) => (
            <button key={f.name} onClick={()=>setActiveFile(i)} className={[
              "w-full px-3 py-2.5 text-left text-[12.5px] flex items-center justify-between gap-2 transition-colors ring-brand",
              i===activeFile ? "bg-primary-500/10 text-primary-700 dark:text-primary-200" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            ].join(" ")}>
              <span className="font-mono truncate">{f.name}</span>
              <span className="shrink-0 text-[10.5px] font-mono px-1.5 rounded-full bg-slate-200/70 dark:bg-white/10">{f.count}</span>
            </button>
          ))}
        </aside>
        <div className="p-4 space-y-3 max-h-[28rem] overflow-y-auto">
          {/* Block 1 expanded */}
          <div className="rounded-lg border border-red-200/60 dark:border-red-500/30 bg-white/50 dark:bg-white/[0.02]">
            <button onClick={()=>setExpanded(expanded===0?-1:0)} className="w-full p-3 flex items-start gap-3 text-left">
              <SeverityIcon s="critical"/>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">line 47–52 · Security</div>
                <div className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Hardcoded fallback secret</div>
                <div className="text-[12.5px] text-slate-600 dark:text-slate-300 truncate">If <code className="font-mono text-[11.5px]">process.env.JWT_SECRET</code> is unset, the code falls back to <code className="font-mono text-[11.5px]">'dev-secret'</code> — that string ships to prod.</div>
              </div>
              <Icon name="ChevronRight" size={14} className={"text-slate-400 mt-1 transition-transform " + (expanded===0?"rotate-90":"")}/>
            </button>
            {expanded===0 ? (
              <div className="px-3 pb-3 space-y-3 bg-white/40 dark:bg-white/[0.02] animate-fade-in">
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Problematic code</div>
                  <PrismBlock lang="typescript" code={`const secret = process.env.JWT_SECRET || 'dev-secret';\nconst token = jwt.sign({ userId }, secret, { expiresIn: '1h' });`}/>
                </div>
                <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">Fallback secrets get shipped to production by accident more often than you'd think. The OR-string makes the code "work" in dev, which means nobody notices the env var is missing.</p>
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">How to fix</div>
                  <p className="text-[13px] text-slate-700 dark:text-slate-300">Throw a hard error at startup if <code className="font-mono text-[11.5px]">JWT_SECRET</code> is unset. Fail loud, fail early.</p>
                </div>
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Example fix</div>
                  <PrismBlock lang="typescript" code={`const secret = process.env.JWT_SECRET;\nif (!secret) throw new Error('JWT_SECRET is required');`} className="ring-emerald-500/20"/>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/15 px-2 py-1 rounded-md">⚠ Repeated mistake from prior submissions</div>
              </div>
            ) : null}
          </div>
          {/* Block 2 */}
          <button onClick={()=>setExpanded(expanded===1?-1:1)} className="w-full rounded-lg border border-amber-200/50 dark:border-amber-500/30 p-3 flex items-start gap-3 text-left hover:bg-white/40 dark:hover:bg-white/[0.02]">
            <SeverityIcon s="warning"/>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-slate-500">line 89 · Performance</div>
              <div className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Unmemoized validation function</div>
              <div className="text-[12.5px] text-slate-600 dark:text-slate-300 truncate">Each render re-creates the Zod schema instance, which trips React's reconciliation…</div>
            </div>
            <Icon name="ChevronRight" size={14} className="text-slate-400 mt-1"/>
          </button>
          {/* Block 3 */}
          <button onClick={()=>setExpanded(expanded===2?-1:2)} className="w-full rounded-lg border border-primary-200/50 dark:border-primary-500/30 p-3 flex items-start gap-3 text-left hover:bg-white/40 dark:hover:bg-white/[0.02]">
            <SeverityIcon s="info"/>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-slate-500">line 14 · Design</div>
              <div className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Type alias could be a Zod inference</div>
              <div className="text-[12.5px] text-slate-600 dark:text-slate-300 truncate">You're maintaining two declarations of <code className="font-mono">FormValues</code> — once as a TS type, once as a Zod schema…</div>
            </div>
            <Icon name="ChevronRight" size={14} className="text-slate-400 mt-1"/>
          </button>
        </div>
      </div>
    </Card>
  );
}

function RecommendationsCard({ items }) {
  return (
    <Card variant="glass"><CardBody className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="Lightbulb" size={18} className="text-amber-500"/>
        <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">Recommended next steps</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((it,i) => {
          const prTone = it.priority === "HIGH" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : it.priority === "MEDIUM" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-slate-200/70 text-slate-700 dark:bg-white/8 dark:text-slate-300";
          return (
            <div key={i} className="p-4 rounded-lg border border-slate-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.03] space-y-2">
              <div className="flex items-center gap-2">
                <span className={"px-2 h-5 inline-flex items-center rounded-full text-[10px] font-semibold tracking-wider uppercase " + prTone}>{it.priority}</span>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">· {it.topic}</span>
              </div>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{it.reason}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <a href="#" onClick={e=>e.preventDefault()} className="text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline inline-flex items-center gap-1">View task <Icon name="ChevronRight" size={12}/></a>
                {it.onPath ? (
                  <Button variant="outline" size="sm" leftIcon="CircleCheck" disabled>On your path</Button>
                ) : (
                  <Button variant="primary" size="sm" leftIcon="Plus">Add to my path</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CardBody></Card>
  );
}

function ResourcesCard({ items }) {
  return (
    <Card variant="glass"><CardBody className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="BookOpen" size={18} className="text-primary-500"/>
        <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">Learning resources</span>
      </div>
      <ul className="space-y-2">
        {items.map((r,i) => (
          <li key={i}>
            <a href="#" onClick={e=>e.preventDefault()} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200/60 dark:border-white/10 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
              <Icon name="ExternalLink" size={14} className="text-slate-400 mt-0.5"/>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-slate-800 dark:text-slate-100">{r.title}</div>
                <div className="text-[11.5px] text-slate-500 dark:text-slate-400">{r.type} · {r.topic}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </CardBody></Card>
  );
}

function NewAttemptCard() {
  return (
    <Card variant="glass"><CardBody className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Ready to improve?</div>
        <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Apply this feedback and submit a new attempt.</div>
      </div>
      <Button variant="primary" size="md" rightIcon="Send">Submit new attempt</Button>
    </CardBody></Card>
  );
}

/* ─────────────── Inline Mentor Chat (signature surface) ─────────────── */

function MentorMessage_Assistant({ children }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40 text-fuchsia-300 flex items-center justify-center shrink-0"><Icon name="Sparkles" size={14}/></div>
      <div className="max-w-[90%] rounded-lg border border-white/10 bg-slate-900/60 text-slate-100 px-3 py-2 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
function MentorMessage_User({ children }) {
  return (
    <div className="flex items-start gap-2.5 justify-end">
      <div className="max-w-[85%] rounded-lg border border-cyan-400/20 bg-cyan-500/10 text-cyan-50 px-3 py-2 text-[13px] leading-relaxed">{children}</div>
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 ring-1 ring-cyan-400/40 text-cyan-200 flex items-center justify-center shrink-0"><Icon name="User" size={14}/></div>
    </div>
  );
}

function MentorChatInline() {
  return (
    <Card variant="neon" className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      <div className="p-3 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-violet-500/20 ring-1 ring-violet-400/40 flex items-center justify-center"><Icon name="Sparkles" size={15} className="text-violet-300"/></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Code Mentor</div>
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">React Form Validation</div>
        </div>
        <button className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 dark:text-slate-300" aria-label="Clear conversation"><Icon name="RefreshCcw" size={13}/></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-gradient-to-b from-transparent to-black/10 dark:to-black/30">
        <MentorMessage_Assistant>
          Looking at your submission, the strongest move you made was <strong className="text-white">debouncing the async username check</strong> — that was your weakest spot last time. Want me to walk through any of the inline annotations?
        </MentorMessage_Assistant>
        <MentorMessage_User>Yeah — why is line 47 a security risk?</MentorMessage_User>
        <MentorMessage_Assistant>
          The fallback <code className="font-mono text-[11.5px] text-cyan-300">'dev-secret'</code> on line 47 is the issue. When you write <code className="font-mono text-[11.5px] text-cyan-300">process.env.JWT_SECRET || 'dev-secret'</code>, the OR-string runs <strong className="text-white">in production</strong> if the env var is unset — which happens more often than you'd think during deploys.
          <div className="mt-2">The fix:</div>
          <div className="mt-1"><PrismBlock lang="typescript" code={`const secret = process.env.JWT_SECRET;\nif (!secret) throw new Error('JWT_SECRET is required');`}/></div>
          <div className="mt-2">Fail loud at startup, not silently at signing-time.</div>
        </MentorMessage_Assistant>
        <MentorMessage_User>How do I make sure my CI catches this?</MentorMessage_User>
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40 text-fuchsia-300 flex items-center justify-center shrink-0"><Icon name="Sparkles" size={14}/></div>
          <div className="max-w-[90%] rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 px-3 py-2 text-[13px] animate-pulse inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-300 animate-bounce" style={{ animationDelay:"0ms" }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-300 animate-bounce" style={{ animationDelay:"120ms" }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-300 animate-bounce" style={{ animationDelay:"240ms" }}/>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-end gap-2">
          <textarea rows={2} placeholder="Ask a follow-up about your code or feedback…" className="flex-1 rounded-md border border-white/10 bg-white/70 dark:bg-slate-900/70 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-brand resize-none"/>
          <button className="h-9 w-9 rounded-md brand-gradient-bg text-white inline-flex items-center justify-center shrink-0 hover:-translate-y-0.5 transition-transform shadow-[0_8px_24px_-8px_rgba(139,92,246,.6)]" aria-label="Send"><Icon name="Send" size={15}/></button>
        </div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 px-1 mt-1.5">Enter to send · Shift+Enter for newline</div>
      </div>
    </Card>
  );
}

/* ─────────────── Floating chat CTA (Audit Detail prod form) ─────────────── */

function MentorChatFloatingCTA() {
  return (
    <button className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-violet-400/40 bg-violet-500/15 backdrop-blur-md text-violet-900 dark:text-violet-100 hover:bg-violet-500/25 transition-all shadow-[0_8px_28px_-8px_rgba(139,92,246,.55)]">
      <Icon name="Sparkles" size={15} className="text-violet-500 dark:text-violet-300"/>
      <span className="text-[13.5px] font-medium">Ask the mentor</span>
    </button>
  );
}

/* ─────────────── Grade pill / Stepper / IssueBlock ─────────────── */

function GradePill({ grade = "C" }) {
  const tones = {
    "A+":"bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    "A": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    "B+":"bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
    "B": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
    "C+":"bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    "C": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    "D": "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
    "F": "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <div className={"px-6 py-4 rounded-2xl text-center " + (tones[grade] || tones.C)}>
      <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] opacity-80">Grade</div>
      <div className="text-[36px] font-bold leading-none mt-1">{grade}</div>
    </div>
  );
}

function Stepper({ step, labels = ["Project","Tech & Features","Source"] }) {
  return (
    <ol className="flex items-center gap-3 text-[13px]">
      {labels.map((l,i) => {
        const state = i < step ? "done" : i === step ? "current" : "upcoming";
        const chip = state === "done"
          ? "bg-emerald-500 text-white"
          : state === "current"
          ? "bg-primary-500 text-white shadow-[0_0_0_4px_rgba(139,92,246,.18)]"
          : "bg-slate-200/70 dark:bg-white/8 text-slate-500 dark:text-slate-400";
        return (
          <React.Fragment key={l}>
            <li className="flex items-center gap-2">
              <span className={"h-7 w-7 rounded-full inline-flex items-center justify-center text-[12.5px] font-semibold " + chip}>
                {state === "done" ? <Icon name="Check" size={13}/> : i+1}
              </span>
              <span className={state === "upcoming" ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-100 font-medium"}>{l}</span>
            </li>
            {i < labels.length - 1 ? <span className="text-slate-300 dark:text-slate-600">→</span> : null}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function IssueBlock({ severity, title, file, body, fix }) {
  return (
    <div className="border-l-2 border-slate-200 dark:border-white/10 pl-4 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">{title}</span>
        <SeverityBadge s={severity}/>
      </div>
      <div className="font-mono text-[11.5px] text-slate-500 dark:text-slate-400">{file}</div>
      <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{body}</p>
      {fix ? <div className="mt-2 p-2.5 rounded-lg bg-slate-50/80 dark:bg-white/[0.03] text-[12.5px] text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-slate-100">Fix:</strong> {fix}</div> : null}
    </div>
  );
}

function PriorityCircle({ n }) {
  return <span className="shrink-0 w-7 h-7 rounded-full brand-gradient-bg text-white inline-flex items-center justify-center text-[11.5px] font-bold shadow-[0_4px_14px_-4px_rgba(139,92,246,.6)]">{n}</span>;
}

/* ─────────────── Audit list / Filter / Pagination ─────────────── */

function AuditStatusPill({ status, aiAvailable = true }) {
  if (status === "completed" && aiAvailable) return <Badge tone="success" icon="CircleCheck">Completed</Badge>;
  if (status === "completed" && !aiAvailable) return <Badge tone="pending" icon="TriangleAlert">Static-only</Badge>;
  if (status === "processing") return <Badge tone="processing" icon="Loader">Processing</Badge>;
  if (status === "pending")    return <Badge tone="processing" icon="Clock">Pending</Badge>;
  return <Badge tone="failed" icon="CircleX">Failed</Badge>;
}

Object.assign(window, {
  PrismBlock, StatusBanner, SourceTimelineCard,
  SeverityIcon, SeverityBadge,
  PersonalizedChip, ScoreOverviewCard, CategoryRatingsCard,
  StrengthsWeaknessesCard, ProgressAnalysisCard, InlineAnnotationsCard,
  RecommendationsCard, ResourcesCard, NewAttemptCard,
  MentorChatInline, MentorChatFloatingCTA, FaRadarChart,
  GradePill, Stepper, IssueBlock, PriorityCircle, AuditStatusPill,
});
