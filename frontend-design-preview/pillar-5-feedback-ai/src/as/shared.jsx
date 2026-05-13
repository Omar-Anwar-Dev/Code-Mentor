// Assessment-shared bits: TopBar variants, ExitModal, ScoreGauge, RadarChart, AnswerOption, ExpectationTile, TrackCard

const { useState: asUseState, useEffect: asUseEffect, useMemo: asUseMemo } = React;

/* ─────────────── TopBar ───────────────
   variant: "minimal" (Start/Results) | "exam" (Question)
*/
function TopBar({ variant = "minimal", dark, setDark, onExit, center, right }) {
  return (
    <header className="fixed top-0 inset-x-0 z-30 h-14 glass border-b border-white/30 dark:border-white/5">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
        </div>
        <div className="flex-1 flex items-center justify-center min-w-0">
          {center}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {variant === "exam" ? (
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[12.5px] text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/5 transition-colors ring-brand"
              aria-label="Exit assessment"
            >
              <Icon name="X" size={14}/>
              <span className="hidden sm:inline">Exit</span>
            </button>
          ) : null}
          <ThemeToggle dark={dark} setDark={setDark}/>
        </div>
      </div>
    </header>
  );
}

/* ─────────────── ExitModal ─────────────── */
function ExitModal({ open, onClose, onConfirm, answered = 10 }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exit assessment?"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="md" leftIcon="LogOut" onClick={onConfirm}>Exit &amp; save progress</Button>
        </>
      }
    >
      <p>
        Your progress (<span className="font-mono text-slate-900 dark:text-slate-100">{answered} answered</span>) will be saved. You can resume later from your dashboard.
      </p>
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
        The assessment timer pauses while you're away.
      </p>
    </Modal>
  );
}

/* ─────────────── ExpectationTile (Start page) ─────────────── */
function ExpectationTile({ icon, title, body }) {
  return (
    <div className="rounded-xl p-3.5 flex items-start gap-3 bg-white/50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
      <div className="shrink-0 w-9 h-9 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center">
        <Icon name={icon} size={18}/>
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{body}</div>
      </div>
    </div>
  );
}

/* ─────────────── TrackCard (Start page; matches Register pattern) ─────────────── */
function TrackCard({ icon, name, blurb, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left rounded-xl p-3.5 transition-all border ring-brand",
        selected
          ? "border-primary-500/80 bg-primary-500/10 ring-2 ring-primary-500/30 shadow-[0_8px_24px_-12px_rgba(139,92,246,.4)]"
          : "border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] hover:border-primary-400/60 hover:bg-primary-500/[0.04]"
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className={[
          "w-8 h-8 rounded-lg flex items-center justify-center",
          selected ? "brand-gradient-bg text-white" : "bg-primary-500/10 text-primary-600 dark:text-primary-300"
        ].join(" ")}>
          <Icon name={icon} size={16}/>
        </div>
        <span className="text-[13.5px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{name}</span>
        {selected ? <Icon name="Check" size={14} className="ml-auto text-primary-600 dark:text-primary-300"/> : null}
      </div>
      <div className="text-[12px] font-mono text-slate-500 dark:text-slate-400">{blurb}</div>
    </button>
  );
}

/* ─────────────── AnswerOption (Question page) ─────────────── */
function AnswerOption({ letter, text, code, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl p-3.5 flex items-start gap-3 transition-all ring-brand border",
        selected
          ? "border-primary-500/80 border-2 ring-2 ring-primary-500/25 bg-primary-500/[0.08] shadow-[0_8px_24px_-14px_rgba(139,92,246,.55)]"
          : "border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] hover:border-primary-300 dark:hover:border-primary-400/40 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
      ].join(" ")}
    >
      <div className={[
        "shrink-0 w-7 h-7 rounded-full font-mono text-[13px] flex items-center justify-center mt-0.5",
        selected
          ? "bg-primary-500 text-white shadow-[0_0_0_3px_rgba(139,92,246,.18)]"
          : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
      ].join(" ")}>{letter}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] leading-snug text-slate-800 dark:text-slate-200">{text}</div>
        {code ? (
          <code className="block mt-1.5 text-[12px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-500/[0.07] rounded-md px-2 py-1 break-all">{code}</code>
        ) : null}
      </div>
    </button>
  );
}

/* ─────────────── ScoreGauge (Results page) ─────────────── */
function ScoreGauge({ score = 76, size = 200, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const cx = size / 2;
  const gid = "sg-grad-" + score;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width:size, height:size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/>
            <stop offset="33%" stopColor="#3b82f6"/>
            <stop offset="66%" stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} stroke="currentColor" strokeOpacity="0.12" strokeWidth={stroke} fill="none" className="text-slate-400 dark:text-white"/>
        <circle
          cx={cx} cy={cx} r={r}
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{filter:"drop-shadow(0 0 10px rgba(139,92,246,.45))"}}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono font-semibold leading-none brand-gradient-text" style={{ fontSize: size * 0.34 }}>{score}</div>
        <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">out of 100</div>
      </div>
    </div>
  );
}

/* ─────────────── RadarChart (Results page) ─────────────── */
function RadarChart({ data, size = 320 }) {
  // data: [{ label, value (0-100) }, ...]
  const n = data.length;
  const cx = size/2, cy = size/2;
  const radius = size/2 - 44;
  const angle = (i) => (-Math.PI/2) + (i * 2 * Math.PI / n);
  const point = (v, i) => {
    const r = (v/100) * radius;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };
  const labelPos = (i) => {
    const r = radius + 22;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };
  const rings = [20,40,60,80,100];
  const path = data.map((d,i) => {
    const [x,y] = point(d.value, i);
    return `${i===0?'M':'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z";
  const gid = "rc-grad";
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="block">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55"/>
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      {/* concentric rings */}
      {rings.map((ring, ri) => {
        const pts = data.map((_,i) => {
          const r = (ring/100) * radius;
          const x = cx + r * Math.cos(angle(i));
          const y = cy + r * Math.sin(angle(i));
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(" ");
        return (
          <polygon
            key={ri}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeOpacity={ring===100 ? 0.35 : 0.18}
            strokeDasharray={ring===100?"":"3 4"}
            className="text-slate-400 dark:text-white"
            strokeWidth="1"
          />
        );
      })}
      {/* axis lines */}
      {data.map((_,i) => {
        const [x,y] = point(100, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.12" className="text-slate-400 dark:text-white"/>;
      })}
      {/* shape */}
      <path d={path} fill={`url(#${gid})`} stroke="#8b5cf6" strokeWidth="1.5" style={{filter:"drop-shadow(0 0 8px rgba(139,92,246,.35))"}} />
      {/* points */}
      {data.map((d,i) => {
        const [x,y] = point(d.value, i);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#8b5cf6" stroke="white" strokeWidth="1.5"/>;
      })}
      {/* labels */}
      {data.map((d,i) => {
        const [x,y] = labelPos(i);
        // text-anchor based on position
        let anchor = "middle";
        if (x < cx - 6) anchor = "end";
        else if (x > cx + 6) anchor = "start";
        return (
          <g key={i}>
            <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontFamily='"JetBrains Mono", monospace' fontSize="11" fill="currentColor" className="text-slate-600 dark:text-slate-300" fontWeight="500">
              {d.label}
            </text>
            <text x={x} y={y+13} textAnchor={anchor} dominantBaseline="middle" fontFamily='"JetBrains Mono", monospace' fontSize="10.5" fill="currentColor" className="text-primary-600 dark:text-primary-300" opacity="0.85">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────── CategoryBar (Results) ─────────────── */
function CategoryBar({ icon, label, score }) {
  const tag = score >= 80 ? { text:"Strong", cls:"text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-400/30" }
            : score >= 60 ? { text:"Solid",  cls:"text-amber-700 dark:text-amber-300 bg-amber-500/10 ring-amber-400/30" }
            :              { text:"Focus area", cls:"text-red-700 dark:text-red-300 bg-red-500/10 ring-red-400/30" };
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-[140px] shrink-0">
        <div className="w-6 h-6 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300 flex items-center justify-center">
          <Icon name={icon} size={13}/>
        </div>
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{label}</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full brand-gradient-bg" style={{ width: score+'%' }}/>
      </div>
      <span className="font-mono text-[12px] text-slate-600 dark:text-slate-300 w-[58px] text-right">{score}/100</span>
      <span className={["text-[11px] px-2 py-0.5 rounded-full ring-1 font-medium whitespace-nowrap", tag.cls].join(" ")}>{tag.text}</span>
    </div>
  );
}

Object.assign(window, { TopBar, ExitModal, ExpectationTile, TrackCard, AnswerOption, ScoreGauge, RadarChart, CategoryBar });
