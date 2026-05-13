/* ─────────────────────────────────────────────────────────────────
   Pillar 6 — Profile & CV: shared helpers
   - PageSwitcherPill (preview-only, top-right collapsible)
   - PcRadarChart (custom SVG, signature gradient fill)
   - StatTilePc (Profile + CV stat tiles)
   - CvProgressRow (Code-Quality bar list row)
   - VerifiedProjectCard
   - LaylaProfileData (mock identity, shared across pages)
   ───────────────────────────────────────────────────────────────── */

const PC_LAYLA = {
  name: "Layla Ahmed",
  initials: "LA",
  email: "layla.ahmed@benha.edu",
  gitHub: "layla-ahmed",
  joined: "October 2024",
  level: 7,
  xp: 1240,
  xpForLevel: 1000,
  xpForNext: 2000,
  role: "Learner",
  track: "Full Stack",
  publicSlug: "layla-ahmed",
  isPublic: true,
  viewCount: 14,
};

const PC_STATS = {
  recentSubmissions: 5,
  completedRecent: 4,
  avgRecentScore: 82,
  badgesEarned: 7,
  badgesTotal: 18,
  submissionsTotal: 12,
  assessmentsTotal: 1,
  pathsActive: 1,
};

const PC_SKILL_PROFILE = {
  overallLevel: "Intermediate",
  scores: [
    { category: "Data Structures", score: 78 },
    { category: "Algorithms",      score: 72 },
    { category: "OOP",             score: 85 },
    { category: "Databases",       score: 70 },
    { category: "Security",        score: 65 },
    { category: "Networking",      score: 60 },
  ],
};

const PC_CODE_QUALITY = [
  { category: "Correctness",  score: 86, samples: 4 },
  { category: "Readability",  score: 84, samples: 4 },
  { category: "Security",     score: 72, samples: 4 },
  { category: "Performance",  score: 80, samples: 4 },
  { category: "Design",       score: 82, samples: 4 },
];

const PC_VERIFIED = [
  { id:"1", title:"JWT Authentication",      track:"Full Stack", language:"JavaScript", score:91, completedAt:"2026-05-08", path:"/submissions/142" },
  { id:"2", title:"React Form Validation",   track:"Full Stack", language:"TypeScript", score:86, completedAt:"2026-05-12", path:"/submissions/143" },
  { id:"3", title:"REST API with Express",   track:"Full Stack", language:"JavaScript", score:79, completedAt:"2026-05-04", path:"/submissions/141" },
  { id:"4", title:"PostgreSQL with Prisma",  track:"Full Stack", language:"TypeScript", score:78, completedAt:"2026-05-10", path:"/submissions/140" },
];

const PC_BADGES = [
  { key:"first-submission",  name:"First Submission",   desc:"Submitted your first project for AI review.", earned:true,  tone:"emerald" },
  { key:"streak-7",          name:"7-Day Streak",       desc:"Practiced 7 days in a row. Consistency matters.", earned:true, tone:"amber"   },
  { key:"perfect-quiz",      name:"Perfect Quiz",       desc:"100% on a section assessment.",               earned:true,  tone:"primary" },
  { key:"first-track",       name:"Path Pioneer",       desc:"Completed your first learning-path task.",     earned:true,  tone:"cyan"    },
  { key:"high-score",        name:"High Scorer",        desc:"Scored 90+ on an AI-reviewed submission.",     earned:true,  tone:"fuchsia" },
  { key:"github-linked",     name:"GitHub Linked",      desc:"Connected your GitHub for repo submissions.",  earned:true,  tone:"slate"   },
  { key:"audit-first",       name:"First Audit",        desc:"Ran your first F11 project audit.",            earned:true,  tone:"orange"  },
  { key:"audit-10",          name:"10 Audits",          desc:"Reached 10 completed project audits.",         earned:false, tone:"slate"   },
  { key:"top-5-percent",     name:"Top 5%",             desc:"Score above 95% of recent submissions in your track.", earned:false, tone:"slate" },
];

/* ─────────── Page-switcher pill (preview only) ─────────── */

function PcPageSwitcherPill({ active, setActive }) {
  const [open, setOpen] = React.useState(true);
  const items = [
    { key:"profile",       label:"Profile" },
    { key:"profile-edit",  label:"Profile Edit" },
    { key:"learning-cv",   label:"Learning CV" },
    { key:"public-cv",     label:"Public CV" },
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

/* ─────────── Custom SVG radar chart ─────────── */

function PcRadarChart({ axes, values, size = 280 }) {
  const cx = size/2, cy = size/2, r = size/2 - 36;
  const N = axes.length;
  const pts = values.map((v,i) => {
    const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
    const rr = r * (v/100);
    return [cx + Math.cos(ang)*rr, cy + Math.sin(ang)*rr];
  });
  const grid = [0.25, 0.5, 0.75, 1].map(k => axes.map((_,i) => {
    const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
    return [cx + Math.cos(ang)*r*k, cy + Math.sin(ang)*r*k];
  }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <linearGradient id="pcRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4"/>
          <stop offset="50%" stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
      {grid.map((ring,ri) => (
        <polygon key={ri} points={ring.map(p=>p.join(",")).join(" ")} fill="none"
          stroke="currentColor" strokeOpacity={ri===3?0.25:0.10}
          className="text-slate-400 dark:text-white"/>
      ))}
      {axes.map((label,i) => {
        const ang = -Math.PI/2 + (i * 2 * Math.PI / N);
        const lx = cx + Math.cos(ang)*(r+18);
        const ly = cy + Math.sin(ang)*(r+18);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx+Math.cos(ang)*r} y2={cy+Math.sin(ang)*r}
              stroke="currentColor" strokeOpacity={0.10}
              className="text-slate-400 dark:text-white"/>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              className="text-[10.5px] fill-slate-600 dark:fill-slate-300 font-medium">{label}</text>
          </g>
        );
      })}
      <polygon points={pts.map(p=>p.join(",")).join(" ")} fill="url(#pcRadarFill)" fillOpacity="0.45"
        stroke="#8b5cf6" strokeWidth="1.5"/>
      {pts.map((p,i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

/* ─────────── Stat tile (Profile-style, 2-line) ─────────── */

function StatTilePc({ icon, value, label, tone = "primary" }) {
  const tones = {
    primary: "text-primary-500 dark:text-primary-300",
    success: "text-emerald-500 dark:text-emerald-300",
    warning: "text-amber-500 dark:text-amber-300",
    purple:  "text-fuchsia-500 dark:text-fuchsia-300",
    cyan:    "text-cyan-500 dark:text-cyan-300",
  };
  return (
    <Card variant="glass">
      <CardBody className="p-4">
        <div className={["mb-2", tones[tone]].join(" ")}>
          <Icon name={icon} size={20}/>
        </div>
        <div className="text-[22px] font-bold leading-none text-slate-900 dark:text-slate-50">{value}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      </CardBody>
    </Card>
  );
}

/* ─────────── CV progress row (Code-Quality bar) ─────────── */

function CvProgressRow({ category, score, samples }) {
  return (
    <li>
      <div className="flex justify-between text-[12.5px] font-medium text-slate-700 dark:text-slate-200 mb-1">
        <span>{category}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {Math.round(score)} <span className="text-slate-400 dark:text-slate-500">· {samples} {samples === 1 ? "sample" : "samples"}</span>
        </span>
      </div>
      <ProgressBar value={score}/>
    </li>
  );
}

/* ─────────── Verified project card ─────────── */

function VerifiedProjectCard({ project }) {
  return (
    <li>
      <a href="#" onClick={e=>e.preventDefault()}
        className="block p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-primary-50/60 dark:hover:bg-primary-900/15 transition-colors group">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50 truncate">{project.title}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{project.track}</Badge>
              <Badge tone="neutral">{project.language}</Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {new Date(project.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none">{project.score}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">/ 100</div>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center text-[11.5px] text-primary-600 dark:text-primary-300 font-medium">
          View feedback <Icon name="ExternalLink" size={11} className="ml-1"/>
        </div>
      </a>
    </li>
  );
}

/* ─────────── Earned badge row (Profile sidebar) ─────────── */

function EarnedBadgeRow({ badge }) {
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
    <li className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <span className={["w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center shrink-0", tones[badge.tone] || tones.primary].join(" ")}>
        <Icon name="Trophy" size={15}/>
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50 truncate">{badge.name}</p>
        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2">{badge.desc}</p>
      </div>
    </li>
  );
}

/* ─────────── CV Hero Avatar (large initials) ─────────── */

function CvHeroAvatar({ size = 96, name = "Layla Ahmed" }) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div
      className="rounded-2xl text-white font-bold flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_rgba(139,92,246,.5)]"
      style={{
        width: size, height: size,
        fontSize: Math.round(size * 0.36),
        background: "linear-gradient(135deg,#06b6d4 0%,#3b82f6 33%,#8b5cf6 66%,#ec4899 100%)",
      }}
    >
      {initials}
    </div>
  );
}

/* ─────────── Empty message (CV cards) ─────────── */

function PcEmptyMsg({ icon = "Sparkles", text }) {
  return (
    <div className="text-center py-8">
      <Icon name={icon} size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2"/>
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400 italic">{text}</p>
    </div>
  );
}

window.PcShared = {
  PC_LAYLA, PC_STATS, PC_SKILL_PROFILE, PC_CODE_QUALITY, PC_VERIFIED, PC_BADGES,
  PcPageSwitcherPill, PcRadarChart, StatTilePc, CvProgressRow, VerifiedProjectCard,
  EarnedBadgeRow, CvHeroAvatar, PcEmptyMsg,
};
