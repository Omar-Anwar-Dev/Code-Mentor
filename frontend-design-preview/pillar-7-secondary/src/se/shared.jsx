/* ─────────────────────────────────────────────────────────────────
   Pillar 7 — Secondary: shared helpers
   Page-switcher pill + mock chart components (LineTrend, StackedBars)
   + AchievementBadgeCard + ActivityIcon + mock data
   ───────────────────────────────────────────────────────────────── */

/* ─────────── Mock data (consistent with Pillars 4-6) ─────────── */

const SE_LAYLA = {
  name: "Layla Ahmed",
  email: "layla.ahmed@benha.edu",
  joined: "October 2024",
  level: 7,
  xp: 1240,
  xpForLevel: 1000,
  xpForNext: 2000,
  role: "Learner",
};

// 12-week code-quality trend — per-category averages, some weeks empty
const SE_WEEKLY_TREND = [
  { week: "Feb 24", samples: 0, correctness: null, readability: null, security: null, performance: null, design: null },
  { week: "Mar 03", samples: 1, correctness: 64, readability: 68, security: 55, performance: 70, design: 66 },
  { week: "Mar 10", samples: 0, correctness: null, readability: null, security: null, performance: null, design: null },
  { week: "Mar 17", samples: 2, correctness: 71, readability: 74, security: 60, performance: 73, design: 70 },
  { week: "Mar 24", samples: 1, correctness: 78, readability: 76, security: 64, performance: 75, design: 72 },
  { week: "Mar 31", samples: 0, correctness: null, readability: null, security: null, performance: null, design: null },
  { week: "Apr 07", samples: 2, correctness: 80, readability: 78, security: 68, performance: 78, design: 75 },
  { week: "Apr 14", samples: 1, correctness: 82, readability: 81, security: 70, performance: 80, design: 78 },
  { week: "Apr 21", samples: 1, correctness: 84, readability: 83, security: 72, performance: 80, design: 82 },
  { week: "Apr 28", samples: 2, correctness: 85, readability: 84, security: 73, performance: 82, design: 84 },
  { week: "May 05", samples: 1, correctness: 87, readability: 84, security: 75, performance: 83, design: 85 },
  { week: "May 12", samples: 2, correctness: 89, readability: 86, security: 78, performance: 84, design: 87 },
];

// Weekly submissions stacked by status
const SE_WEEKLY_SUBS = [
  { week: "Feb 24", completed: 0, failed: 0, processing: 0, pending: 0 },
  { week: "Mar 03", completed: 1, failed: 0, processing: 0, pending: 0 },
  { week: "Mar 10", completed: 0, failed: 1, processing: 0, pending: 0 },
  { week: "Mar 17", completed: 2, failed: 0, processing: 0, pending: 0 },
  { week: "Mar 24", completed: 1, failed: 0, processing: 0, pending: 0 },
  { week: "Mar 31", completed: 0, failed: 0, processing: 0, pending: 0 },
  { week: "Apr 07", completed: 2, failed: 1, processing: 0, pending: 0 },
  { week: "Apr 14", completed: 1, failed: 0, processing: 0, pending: 0 },
  { week: "Apr 21", completed: 1, failed: 0, processing: 0, pending: 0 },
  { week: "Apr 28", completed: 2, failed: 0, processing: 1, pending: 0 },
  { week: "May 05", completed: 1, failed: 0, processing: 0, pending: 0 },
  { week: "May 12", completed: 2, failed: 0, processing: 1, pending: 1 },
];

const SE_KNOWLEDGE = [
  { category: "DataStructures", score: 78, level: "Intermediate" },
  { category: "Algorithms",     score: 72, level: "Intermediate" },
  { category: "OOP",            score: 85, level: "Advanced"     },
  { category: "Databases",      score: 70, level: "Intermediate" },
  { category: "Security",       score: 65, level: "Beginner"     },
];

const SE_BADGES = [
  { key:"first-submission", name:"First Submission", desc:"Submitted your first project for AI review.", category:"learning",     earned:true,  earnedAt:"2026-03-03", tone:"emerald" },
  { key:"streak-7",         name:"7-Day Streak",      desc:"Practiced 7 days in a row.",                  category:"consistency",  earned:true,  earnedAt:"2026-03-21", tone:"amber"   },
  { key:"perfect-quiz",     name:"Perfect Quiz",      desc:"100% on a section assessment.",               category:"assessment",   earned:true,  earnedAt:"2026-03-28", tone:"primary" },
  { key:"first-track",      name:"Path Pioneer",      desc:"Completed your first learning-path task.",    category:"learning",     earned:true,  earnedAt:"2026-04-04", tone:"cyan"    },
  { key:"high-score",       name:"High Scorer",       desc:"Scored 90+ on an AI-reviewed submission.",    category:"craft",        earned:true,  earnedAt:"2026-05-08", tone:"fuchsia" },
  { key:"github-linked",    name:"GitHub Linked",     desc:"Connected your GitHub for repo submissions.", category:"account",      earned:true,  earnedAt:"2026-02-28", tone:"slate"   },
  { key:"audit-first",      name:"First Audit",       desc:"Ran your first F11 project audit.",           category:"audit",        earned:true,  earnedAt:"2026-05-11", tone:"orange"  },
  { key:"audit-10",         name:"10 Audits",         desc:"Reached 10 completed project audits.",        category:"audit",        earned:false, tone:"slate"   },
  { key:"top-5-percent",    name:"Top 5%",            desc:"Score above 95% of recent submissions in your track.", category:"craft", earned:false, tone:"slate" },
  { key:"path-complete",    name:"Path Complete",     desc:"Completed every task in your learning path.", category:"learning",     earned:false, tone:"slate"   },
  { key:"streak-30",        name:"30-Day Streak",     desc:"Practiced 30 days in a row.",                 category:"consistency",  earned:false, tone:"slate"   },
  { key:"cv-public",        name:"Public CV",         desc:"Made your Learning CV public.",               category:"profile",      earned:false, tone:"slate"   },
];

const SE_ACTIVITY = [
  { kind:"submission", at:"2026-05-12T09:25", title:"React Form Validation", status:"Completed",  score:86 },
  { kind:"xp",         at:"2026-05-12T09:25", amount:30, reason:"Submission scored 86 (React Form Validation)" },
  { kind:"submission", at:"2026-05-11T18:12", title:"REST API with Express", status:"Completed",  score:79 },
  { kind:"xp",         at:"2026-05-11T18:12", amount:20, reason:"Submission scored 79 (REST API with Express)" },
  { kind:"xp",         at:"2026-05-11T14:14", amount:25, reason:"Audit completed (todo-api, score 74)" },
  { kind:"submission", at:"2026-05-10T11:03", title:"PostgreSQL with Prisma", status:"Processing", score:null },
  { kind:"xp",         at:"2026-05-08T16:48", amount:40, reason:"High Scorer badge unlocked (91 on JWT Authentication)" },
  { kind:"submission", at:"2026-05-08T16:35", title:"JWT Authentication", status:"Completed",  score:91 },
  { kind:"xp",         at:"2026-05-04T12:00", amount:50, reason:"Assessment retake — 8 of 10" },
];

/* ─────────── Page-switcher pill (preview only) ─────────── */

function SePageSwitcherPill({ active, setActive }) {
  const [open, setOpen] = React.useState(true);
  const items = [
    { key:"analytics",    label:"Analytics"    },
    { key:"achievements", label:"Achievements" },
    { key:"activity",     label:"Activity"     },
    { key:"settings",     label:"Settings"     },
  ];
  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-1.5 rounded-full glass-frosted shadow-lg px-2 py-1.5 border border-white/40 dark:border-white/10">
      {open && items.map(it => (
        <button
          key={it.key}
          onClick={() => setActive(it.key)}
          className={[
            "px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all",
            active === it.key
              ? "bg-primary-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.6)]"
              : "text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
          ].join(" ")}
        >
          {it.label}
        </button>
      ))}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
        aria-label={open ? "Collapse page switcher" : "Expand page switcher"}
      >
        <Icon name={open ? "ChevronRight" : "ChevronLeft"} size={14}/>
      </button>
    </div>
  );
}

/* ─────────── Mini line trend chart (SVG) ─────────── */

function SeLineTrendChart({ rows, height = 280 }) {
  // rows: [{ week, correctness, readability, security, performance, design }]
  // Hand-rolled SVG line chart with 5 series.
  const colors = {
    correctness: "#8b5cf6",
    readability: "#10b981",
    security:    "#ef4444",
    performance: "#f59e0b",
    design:      "#06b6d4",
  };
  const series = Object.keys(colors);
  const W = 760, H = height;
  const padL = 36, padR = 12, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = rows.length;
  const xAt = i => padL + (i * (innerW / Math.max(1, N - 1)));
  const yAt = v => padT + innerH - (innerH * v / 100);

  // gridlines + y-axis labels at 0/25/50/75/100
  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {/* gridlines */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={padL} y1={yAt(t)} x2={W-padR} y2={yAt(t)}
            stroke="currentColor" strokeOpacity={t===0?0.25:0.08}
            className="text-slate-400 dark:text-white"/>
          <text x={padL-6} y={yAt(t)+3} textAnchor="end"
            className="text-[10px] fill-slate-500 dark:fill-slate-400">{t}</text>
        </g>
      ))}
      {/* x labels (every 2 weeks) */}
      {rows.map((r,i) => (i % 2 === 0 || i === N-1) && (
        <text key={i} x={xAt(i)} y={H-padB+14} textAnchor="middle"
          className="text-[9.5px] fill-slate-500 dark:fill-slate-400">{r.week}</text>
      ))}
      {/* lines */}
      {series.map(s => {
        const pts = rows.map((r,i) => r[s]==null ? null : [xAt(i), yAt(r[s])]).filter(Boolean);
        if (pts.length < 2) return null;
        const d = pts.map((p,i) => (i===0?"M":"L") + p[0] + " " + p[1]).join(" ");
        return (
          <g key={s}>
            <path d={d} fill="none" stroke={colors[s]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={colors[s]}/>)}
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────── Mini stacked bar chart (SVG) ─────────── */

function SeStackedBars({ rows, height = 280 }) {
  const colors = { completed:"#10b981", failed:"#ef4444", processing:"#f59e0b", pending:"#94a3b8" };
  const stack = ["completed","failed","processing","pending"];
  const W = 760, H = height;
  const padL = 36, padR = 12, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = rows.length;
  const bw = innerW / N * 0.7;
  const gap = innerW / N - bw;
  const max = Math.max(1, ...rows.map(r => r.completed + r.failed + r.processing + r.pending));
  const yAt = v => padT + innerH - (innerH * v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {/* baseline */}
      <line x1={padL} y1={padT+innerH} x2={W-padR} y2={padT+innerH}
        stroke="currentColor" strokeOpacity={0.25}
        className="text-slate-400 dark:text-white"/>
      {/* y ticks */}
      {[0, Math.ceil(max/2), max].map(t => (
        <text key={t} x={padL-6} y={yAt(t)+3} textAnchor="end"
          className="text-[10px] fill-slate-500 dark:fill-slate-400">{t}</text>
      ))}
      {/* bars */}
      {rows.map((r,i) => {
        const x = padL + i * (innerW / N) + gap/2;
        let acc = 0;
        return (
          <g key={i}>
            {stack.map(s => {
              const v = r[s];
              if (!v) return null;
              const y = yAt(acc + v);
              const h = yAt(acc) - yAt(acc + v);
              acc += v;
              return <rect key={s} x={x} y={y} width={bw} height={h} fill={colors[s]}/>;
            })}
            {(i % 2 === 0 || i === N-1) && (
              <text x={x + bw/2} y={H-padB+14} textAnchor="middle"
                className="text-[9.5px] fill-slate-500 dark:fill-slate-400">{r.week}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────── Legend chip ─────────── */

function LegendChip({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }}/>
      {label}
    </span>
  );
}

/* ─────────── Badge card (used by Achievements) ─────────── */

function SeBadgeCard({ badge }) {
  const tones = {
    emerald: "from-emerald-500 to-green-500",
    amber:   "from-amber-500 to-orange-500",
    primary: "from-primary-500 to-purple-500",
    cyan:    "from-cyan-500 to-blue-500",
    fuchsia: "from-fuchsia-500 to-pink-500",
    slate:   "from-slate-500 to-slate-600",
    orange:  "from-orange-500 to-red-500",
  };
  return (
    <Card variant="glass" className={badge.earned ? "" : "opacity-55"}>
      <CardBody className="p-4 h-full">
        <div className="flex items-start gap-3">
          <span className={[
            "w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-[0_6px_18px_-6px_rgba(15,23,42,.3)]",
            badge.earned ? "bg-gradient-to-br " + (tones[badge.tone] || tones.primary) : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
          ].join(" ")}>
            <Icon name={badge.earned ? "CheckCircle" : "Lock"} size={badge.earned ? 18 : 16}/>
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-50 truncate">{badge.name}</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{badge.desc}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone="neutral" className="capitalize">{badge.category}</Badge>
              {badge.earned && badge.earnedAt && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(badge.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ─────────── Activity row ─────────── */

function ActivityRow({ item }) {
  const when = new Date(item.at);
  const whenLabel = when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    + " · " + when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const statusTone = (s) => s === "Completed" ? "success" : s === "Failed" ? "failed" : s === "Processing" ? "processing" : "neutral";
  return (
    <Card variant="glass">
      <CardBody className="p-3.5">
        <div className="flex items-start gap-3">
          {item.kind === "xp" ? (
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0">
              <Icon name="Trophy" size={15}/>
            </span>
          ) : (
            <span className="w-9 h-9 rounded-xl brand-gradient-bg text-white flex items-center justify-center shrink-0">
              <Icon name="Code" size={15}/>
            </span>
          )}
          <div className="flex-1 min-w-0">
            {item.kind === "xp" ? (
              <>
                <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50">
                  +{item.amount} XP
                  <span className="text-slate-500 dark:text-slate-400 font-normal"> · {item.reason}</span>
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50 truncate">
                  Submitted &ldquo;{item.title}&rdquo;
                </p>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                {item.score !== null && item.score !== undefined && (
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">Score: {item.score}%</span>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1">
              <Icon name="Calendar" size={11}/> {whenLabel}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

window.SeShared = {
  SE_LAYLA, SE_WEEKLY_TREND, SE_WEEKLY_SUBS, SE_KNOWLEDGE, SE_BADGES, SE_ACTIVITY,
  SePageSwitcherPill, SeLineTrendChart, SeStackedBars, LegendChip, SeBadgeCard, ActivityRow,
};
