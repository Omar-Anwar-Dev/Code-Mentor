/* ─────────────────────────────────────────────────────────────────
   Pillar 8 — Admin: shared helpers
   PageSwitcherPill + mock data + AdminTable shell + DemoBanner
   + LineMini / PieMini / BarMini / SparkSeries (SVG mocks)
   ───────────────────────────────────────────────────────────────── */

/* ─────────── Mock data (platform-wide, NOT Layla's personal data) ─────────── */

const AD_STATS = {
  totalUsers: 1247,
  activeUsers: 842,
  totalSubmissions: 4562,
  averageScore: 76.5,
  newUsersThisWeek: 87,
  submissionsThisWeek: 324,
  activeTasks: 28,
  publishedQuestions: 142,
};

// 6-month user growth
const AD_USER_GROWTH = [
  { month: "Dec", users: 120 },
  { month: "Jan", users: 180 },
  { month: "Feb", users: 240 },
  { month: "Mar", users: 320 },
  { month: "Apr", users: 420 },
  { month: "May", users: 580 },
];

// 5-track distribution (pie chart)
const AD_TRACKS = [
  { name: "Full Stack", value: 35, color: "#8b5cf6" },
  { name: "Backend",    value: 25, color: "#10b981" },
  { name: "Frontend",   value: 20, color: "#f59e0b" },
  { name: "Python",     value: 12, color: "#ef4444" },
  { name: "C#/.NET",    value:  8, color: "#06b6d4" },
];

// 7-day submissions
const AD_WEEK_SUBS = [
  { day: "Mon", submissions: 45 },
  { day: "Tue", submissions: 52 },
  { day: "Wed", submissions: 38 },
  { day: "Thu", submissions: 65 },
  { day: "Fri", submissions: 48 },
  { day: "Sat", submissions: 72 },
  { day: "Sun", submissions: 55 },
];

const AD_RECENT_SUBS = [
  { id:1, user:"Mostafa El-Sayed", task:"REST API with Express",     score:85, status:"Completed",  time:"10 min ago" },
  { id:2, user:"Yara Khaled",      task:"React Form Validation",     score:92, status:"Completed",  time:"25 min ago" },
  { id:3, user:"Omar Khalil",      task:"PostgreSQL with Prisma",    score:null, status:"Processing", time:"30 min ago" },
  { id:4, user:"Heba Ramy",        task:"JWT Authentication",         score:78, status:"Completed",  time:"1h ago" },
  { id:5, user:"Karim Adel",       task:"WebSocket Chat",            score:null, status:"Failed",     time:"1h ago" },
];

// Users table (admin/users)
const AD_USERS = [
  { id:"u1",  email:"layla.ahmed@benha.edu",         name:"Layla Ahmed",         roles:["Learner"],         active:true,  joined:"Oct 2024", lastSeen:"now",       submissions: 12 },
  { id:"u2",  email:"mostafa.elsayed@benha.edu",     name:"Mostafa El-Sayed",    roles:["Learner"],         active:true,  joined:"Sep 2024", lastSeen:"5m ago",    submissions: 18 },
  { id:"u3",  email:"yara.khaled@benha.edu",         name:"Yara Khaled",         roles:["Learner"],         active:true,  joined:"Oct 2024", lastSeen:"22m ago",   submissions: 9  },
  { id:"u4",  email:"omar.khalil@benha.edu",         name:"Omar Khalil",         roles:["Learner"],         active:true,  joined:"Oct 2024", lastSeen:"1h ago",    submissions: 14 },
  { id:"u5",  email:"heba.ramy@benha.edu",           name:"Heba Ramy",           roles:["Learner"],         active:true,  joined:"Nov 2024", lastSeen:"3h ago",    submissions: 7  },
  { id:"u6",  email:"karim.adel@benha.edu",          name:"Karim Adel",          roles:["Learner"],         active:false, joined:"Sep 2024", lastSeen:"3d ago",    submissions: 4  },
  { id:"u7",  email:"prof.elgendy@benha.edu",        name:"Prof. Mostafa El-Gendy",roles:["Admin"],         active:true,  joined:"Sep 2024", lastSeen:"2h ago",    submissions: 0  },
  { id:"u8",  email:"eng.fatma@benha.edu",           name:"Eng. Fatma Ibrahim",  roles:["Admin","Learner"], active:true,  joined:"Sep 2024", lastSeen:"15m ago",   submissions: 2  },
  { id:"u9",  email:"nour.hassan@benha.edu",         name:"Nour Hassan",         roles:["Learner"],         active:true,  joined:"Dec 2024", lastSeen:"1d ago",    submissions: 11 },
  { id:"u10", email:"ali.fawzy@benha.edu",           name:"Ali Fawzy",           roles:["Learner"],         active:true,  joined:"Feb 2025", lastSeen:"4h ago",    submissions: 3  },
];

// Tasks table (admin/tasks)
const AD_TASKS = [
  { id:"t1", title:"REST API with Express",      track:"FullStack", category:"Algorithms",     difficulty:3, language:"JavaScript", hours:6, active:true,  submissions: 287 },
  { id:"t2", title:"JWT Authentication",          track:"FullStack", category:"Security",       difficulty:4, language:"JavaScript", hours:4, active:true,  submissions: 312 },
  { id:"t3", title:"PostgreSQL with Prisma",     track:"FullStack", category:"Databases",      difficulty:3, language:"TypeScript", hours:8, active:true,  submissions: 198 },
  { id:"t4", title:"React Form Validation",      track:"FullStack", category:"OOP",            difficulty:3, language:"TypeScript", hours:5, active:true,  submissions: 264 },
  { id:"t5", title:"WebSocket Chat",             track:"FullStack", category:"DataStructures", difficulty:4, language:"TypeScript", hours:7, active:true,  submissions: 142 },
  { id:"t6", title:"Trie-Based Fuzzy Search",    track:"Python",    category:"Algorithms",     difficulty:4, language:"Python",     hours:8, active:true,  submissions:  89 },
  { id:"t7", title:"Async Job Queue (Hangfire)", track:"Backend",   category:"DataStructures", difficulty:4, language:"CSharp",     hours:6, active:true,  submissions:  76 },
  { id:"t8", title:"Type-Safe Reducers",         track:"FullStack", category:"DataStructures", difficulty:3, language:"TypeScript", hours:3, active:false, submissions: 184 },
  { id:"t9", title:"Docker Compose Stack",       track:"FullStack", category:"OOP",            difficulty:5, language:"CSharp",     hours:6, active:true,  submissions: 121 },
];

// Questions table (admin/questions) — assessment-question CRUD
const AD_QUESTIONS = [
  { id:"q1", prompt:"Big-O of inserting into a sorted dynamic array?",      category:"DataStructures", difficulty:2, type:"MCQ",     answers:4, published:true,  uses: 423 },
  { id:"q2", prompt:"Which is NOT a property of a hash table?",             category:"DataStructures", difficulty:2, type:"MCQ",     answers:4, published:true,  uses: 387 },
  { id:"q3", prompt:"Time complexity of in-order traversal on a BST?",      category:"Algorithms",     difficulty:3, type:"MCQ",     answers:4, published:true,  uses: 296 },
  { id:"q4", prompt:"Trade-offs between bcrypt and argon2 for password hashing?", category:"Security", difficulty:4, type:"Short",   answers:0, published:true,  uses: 142 },
  { id:"q5", prompt:"Why is `Object.freeze` shallow by default?",           category:"OOP",            difficulty:3, type:"MCQ",     answers:4, published:true,  uses: 218 },
  { id:"q6", prompt:"What ACID property is violated by READ UNCOMMITTED?", category:"Databases",       difficulty:3, type:"MCQ",     answers:4, published:true,  uses: 184 },
  { id:"q7", prompt:"Explain the difference between TCP and UDP.",          category:"Networking",     difficulty:2, type:"Short",   answers:0, published:false, uses:   0 },
  { id:"q8", prompt:"Compare server-side rendering vs static generation.",  category:"OOP",            difficulty:4, type:"Short",   answers:0, published:true,  uses:  76 },
];

// Per-track AI score breakdown (admin/analytics)
const AD_TRACK_SCORES = [
  { track: "Full Stack", correctness: 82, readability: 79, security: 68, performance: 76, design: 78 },
  { track: "Backend",    correctness: 78, readability: 75, security: 72, performance: 80, design: 73 },
  { track: "Python",     correctness: 75, readability: 72, security: 64, performance: 70, design: 70 },
];

/* ─────────── Page-switcher pill (preview only) ─────────── */

function AdPageSwitcherPill({ active, setActive }) {
  const [open, setOpen] = React.useState(true);
  const items = [
    { key:"dashboard",  label:"Dashboard"  },
    { key:"users",      label:"Users"      },
    { key:"tasks",      label:"Tasks"      },
    { key:"questions",  label:"Questions"  },
    { key:"analytics",  label:"Analytics"  },
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

/* ─────────── Admin-flavor banner (gold warning, demo-data) ─────────── */

function AdDemoBanner() {
  return (
    <Card variant="glass" className="border-amber-200/60 dark:border-amber-900/40">
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={18} className="text-amber-500 dark:text-amber-300 shrink-0 mt-0.5"/>
          <div className="text-[13px] text-slate-700 dark:text-slate-200">
            <p className="font-semibold text-amber-700 dark:text-amber-200 mb-1">Demo data — platform analytics endpoint pending</p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The aggregates below are illustrative. Real per-platform numbers need a new&nbsp;
              <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-amber-100/60 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200">/api/admin/dashboard/summary</code>
              &nbsp;endpoint. The CRUD pages — Users, Tasks, Questions — are wired to live data.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* ─────────── Mini line chart (user growth) ─────────── */

function AdLineMini({ rows, valueKey, color = "#8b5cf6", height = 280 }) {
  const W = 760, H = height, padL = 36, padR = 12, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = rows.length;
  const max = Math.max(...rows.map(r => r[valueKey])) * 1.1;
  const xAt = i => padL + (i * (innerW / Math.max(1, N - 1)));
  const yAt = v => padT + innerH - (innerH * v / max);
  const d = rows.map((r,i) => (i===0?"M":"L") + xAt(i) + " " + yAt(r[valueKey])).join(" ");
  const area = d + ` L ${xAt(N-1)} ${padT+innerH} L ${xAt(0)} ${padT+innerH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id={`adLineFill-${valueKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(k => (
        <line key={k} x1={padL} y1={padT + innerH*(1-k)} x2={W-padR} y2={padT + innerH*(1-k)}
          stroke="currentColor" strokeOpacity={k===0?0.25:0.08}
          className="text-slate-400 dark:text-white"/>
      ))}
      <path d={area} fill={`url(#adLineFill-${valueKey})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {rows.map((r,i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(r[valueKey])} r="3.5" fill={color} stroke="white" strokeWidth="1.5"/>
          <text x={xAt(i)} y={H-padB+14} textAnchor="middle"
            className="text-[10.5px] fill-slate-500 dark:fill-slate-400">{r.month || r.day}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─────────── Mini bar chart (weekly submissions) ─────────── */

function AdBarMini({ rows, valueKey, color = "#8b5cf6", height = 240 }) {
  const W = 600, H = height, padL = 32, padR = 12, padT = 16, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = rows.length;
  const bw = innerW / N * 0.65;
  const gap = innerW / N - bw;
  const max = Math.max(...rows.map(r => r[valueKey])) * 1.15;
  const yAt = v => padT + innerH - (innerH * v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id={`adBarFill-${valueKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={color} stopOpacity="0.6"/>
        </linearGradient>
      </defs>
      <line x1={padL} y1={padT+innerH} x2={W-padR} y2={padT+innerH}
        stroke="currentColor" strokeOpacity={0.25}
        className="text-slate-400 dark:text-white"/>
      {rows.map((r,i) => {
        const x = padL + i * (innerW / N) + gap/2;
        const y = yAt(r[valueKey]);
        const h = innerH - (yAt(0) - y);
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={padT+innerH - y} rx="4"
              fill={`url(#adBarFill-${valueKey})`}/>
            <text x={x + bw/2} y={H-padB+14} textAnchor="middle"
              className="text-[10.5px] fill-slate-500 dark:fill-slate-400">{r.day}</text>
            <text x={x + bw/2} y={y - 5} textAnchor="middle"
              className="text-[10px] fill-slate-600 dark:fill-slate-300 font-semibold">{r[valueKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────── Donut / pie chart ─────────── */

function AdPieMini({ slices, size = 220 }) {
  const total = slices.reduce((a,s) => a + s.value, 0);
  const cx = size/2, cy = size/2, R = size/2 - 6, r = R * 0.62;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: size }}>
      {slices.map((s, i) => {
        const startAng = (acc / total) * 2 * Math.PI - Math.PI/2;
        acc += s.value;
        const endAng = (acc / total) * 2 * Math.PI - Math.PI/2;
        const large = (endAng - startAng) > Math.PI ? 1 : 0;
        const x1 = cx + Math.cos(startAng)*R, y1 = cy + Math.sin(startAng)*R;
        const x2 = cx + Math.cos(endAng)*R,   y2 = cy + Math.sin(endAng)*R;
        const x3 = cx + Math.cos(endAng)*r,   y3 = cy + Math.sin(endAng)*r;
        const x4 = cx + Math.cos(startAng)*r, y4 = cy + Math.sin(startAng)*r;
        const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
        return <path key={i} d={d} fill={s.color}/>;
      })}
      <circle cx={cx} cy={cy} r={r-1} fill="currentColor" fillOpacity="0.03"
        className="text-slate-900 dark:text-white"/>
      <text x={cx} y={cy-2} textAnchor="middle" dominantBaseline="middle"
        className="text-[10px] uppercase tracking-[0.18em] fill-slate-500 dark:fill-slate-400">Total</text>
      <text x={cx} y={cy+14} textAnchor="middle" dominantBaseline="middle"
        className="text-[22px] font-bold fill-slate-900 dark:fill-slate-50">{total}%</text>
    </svg>
  );
}

/* ─────────── Stat card with icon + value + label + trend ─────────── */

function AdStatCard({ icon, tone = "primary", value, label, trend }) {
  const tones = {
    primary: "bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-300",
    success: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    warning: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300",
    cyan:    "bg-cyan-100 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    fuchsia: "bg-fuchsia-100 dark:bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300",
  };
  return (
    <Card variant="glass">
      <CardBody className="p-4">
        <div className="flex items-center gap-3">
          <div className={["w-11 h-11 rounded-xl flex items-center justify-center", tones[tone]].join(" ")}>
            <Icon name={icon} size={20}/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-bold leading-none text-slate-900 dark:text-slate-50">{value}</p>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1">{label}</p>
          </div>
          {trend && (
            <span className={[
              "text-[10.5px] font-semibold inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full",
              trend.startsWith("+")
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
            ].join(" ")}>
              {trend}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/* ─────────── Admin table shell ─────────── */

function AdTable({ columns, children, footer }) {
  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <tr>
              {columns.map((c,i) => (
                <th key={i} className={[
                  "px-4 py-3 text-[11.5px] uppercase tracking-[0.16em] font-semibold text-slate-500 dark:text-slate-400",
                  c.align === "right" ? "text-right" : "text-left"
                ].join(" ")}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {children}
          </tbody>
        </table>
      </div>
      {footer && <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/5">{footer}</div>}
    </Card>
  );
}

window.AdShared = {
  AD_STATS, AD_USER_GROWTH, AD_TRACKS, AD_WEEK_SUBS, AD_RECENT_SUBS,
  AD_USERS, AD_TASKS, AD_QUESTIONS, AD_TRACK_SCORES,
  AdPageSwitcherPill, AdDemoBanner, AdLineMini, AdBarMini, AdPieMini, AdStatCard, AdTable,
};
