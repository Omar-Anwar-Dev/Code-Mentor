// Wrap lucide UMD into a React <Icon name="..." size=20 /> component.
// lucide UMD exposes `lucide.icons` (PascalCase keys) and `lucide.createElement`.
// Each icon entry is [tag, attrs, children] or a function — we render an inline SVG.

const L = window.lucide;

function Icon({ name, size = 20, stroke = 2, className = "", style }) {
  const entry = L && L.icons && (L.icons[name] || L.icons[name?.charAt(0).toUpperCase()+name?.slice(1)]);
  if (!entry) {
    return <span style={{display:'inline-block', width:size, height:size}} className={className} aria-hidden />;
  }
  // entry shapes across lucide versions:
  //   array of [tag, attrs] tuples
  //   { iconNode: [[tag, attrs], ...] }
  //   [name, attrs, children]  ← UMD createIcons style
  let raw = Array.isArray(entry) ? entry : (entry.iconNode || entry.icon || []);
  // If it looks like [name, attrs, children] (single icon node), unwrap children
  if (Array.isArray(raw) && raw.length === 3 && typeof raw[0] === 'string' && raw[1] && typeof raw[1] === 'object' && !Array.isArray(raw[1])) {
    raw = Array.isArray(raw[2]) ? raw[2] : [];
  }
  const nodes = (raw || []).map(n => {
    if (Array.isArray(n)) return [n[0], n[1] || {}];
    if (n && typeof n === 'object') {
      // object form { tag, attrs? } or attribute-bag with __tag
      const tag = n.tag || n.name || 'path';
      const { tag:_t, name:_n, children:_c, ...attrs } = n;
      return [tag, attrs];
    }
    return null;
  }).filter(Boolean);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={"lucide " + className}
      style={style}
      aria-hidden="true"
    >
      {nodes.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

window.Icon = Icon;
// Primitive components: Button, Card, Badge, Input, Select, Textarea, Modal, Toast.
// All use the brand tokens defined in tailwind.config + global CSS in index.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ─────────────────────────── BUTTON ─────────────────────────── */
const BTN_SIZE = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-5 text-[15px] rounded-xl gap-2",
};

const BTN_VARIANT = {
  primary:
    "bg-primary-500 text-white border border-primary-600 hover:bg-primary-600 hover:-translate-y-0.5 shadow-sm hover:shadow-[0_8px_24px_-8px_rgba(139,92,246,.6)]",
  secondary:
    "bg-secondary-500 text-white border border-secondary-600 hover:bg-secondary-600 hover:-translate-y-0.5 shadow-sm hover:shadow-[0_8px_24px_-8px_rgba(6,182,212,.55)]",
  outline:
    "bg-transparent text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700/60 hover:bg-primary-50 dark:hover:bg-primary-500/10",
  ghost:
    "bg-transparent text-slate-700 dark:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-white/5",
  danger:
    "bg-red-500 text-white border border-red-600 hover:bg-red-600 hover:-translate-y-0.5 shadow-sm hover:shadow-[0_8px_24px_-8px_rgba(239,68,68,.55)]",
  gradient:
    "text-white border border-white/10 brand-gradient-bg hover:-translate-y-0.5 shadow-sm hover:shadow-[0_10px_30px_-8px_rgba(139,92,246,.6)] [background-size:200%_100%] hover:[background-position:100%_0%] transition-[background-position,transform,box-shadow] duration-500",
  neon:
    "text-white border border-white/10 bg-gradient-to-r from-secondary-500 to-blue-500 hover:-translate-y-0.5 hover:shadow-neon-cyan",
  glass:
    "glass text-slate-800 dark:text-slate-100 hover:bg-white/80 dark:hover:bg-white/10",
};

function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  className = "",
  forceHover = false,
  children,
  ...rest
}) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      data-force-hover={forceHover || undefined}
      className={[
        "inline-flex items-center justify-center font-medium select-none ring-brand",
        "transition-all duration-200 ease-out will-change-transform",
        BTN_SIZE[size],
        BTN_VARIANT[variant],
        isDisabled ? "opacity-50 pointer-events-none saturate-50" : "",
        className,
      ].join(" ")}
    >
      {loading ? (
        <Icon name="LoaderCircle" size={iconSize} className="animate-spin" />
      ) : leftIcon ? (
        <Icon name={leftIcon} size={iconSize} />
      ) : null}
      <span>{children}</span>
      {!loading && rightIcon ? <Icon name={rightIcon} size={iconSize} /> : null}
    </button>
  );
}

/* ─────────────────────────── CARD ─────────────────────────── */
const CARD_BASE = "rounded-2xl transition-all duration-300";
const CARD_VARIANT = {
  default:
    "bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_-12px_rgba(15,23,42,.1)]",
  bordered:
    "bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-white/10",
  elevated:
    "bg-white dark:bg-slate-800/80 border border-slate-200/40 dark:border-white/5 shadow-[0_4px_8px_rgba(15,23,42,.06),0_24px_48px_-16px_rgba(15,23,42,.16)]",
  glass: "glass-card",
  neon: "glass-card glass-card-neon hover:-translate-y-0.5",
};

function Card({ variant = "default", className = "", children, ...rest }) {
  return (
    <div
      {...rest}
      className={[CARD_BASE, CARD_VARIANT[variant], className].join(" ")}
    >
      {children}
    </div>
  );
}
function CardHeader({ title, subtitle, right, className = "" }) {
  return (
    <div className={"px-5 pt-5 pb-3 flex items-start justify-between gap-3 " + className}>
      <div>
        <div className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle ? <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div> : null}
      </div>
      {right}
    </div>
  );
}
function CardBody({ className = "", children }) {
  return <div className={"px-5 py-3 text-[14px] text-slate-700 dark:text-slate-300 " + className}>{children}</div>;
}
function CardFooter({ className = "", children }) {
  return <div className={"px-5 pt-3 pb-5 flex items-center justify-between gap-3 " + className}>{children}</div>;
}

/* ─────────────────────────── BADGE ─────────────────────────── */
const BADGE_BASE = "inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[12px] font-medium";

function Badge({ tone = "neutral", glow = false, pulse = false, children, className = "", icon }) {
  const tones = {
    neutral:   "bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300",
    success:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    processing:"bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    failed:    "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    pending:   "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    primary:   "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200 border border-primary-200/60 dark:border-primary-400/30",
    cyan:      "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200 border border-cyan-200/60 dark:border-cyan-400/30",
    fuchsia:   "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200 border border-fuchsia-200/60 dark:border-fuchsia-400/30",
  };
  return (
    <span className={[
      BADGE_BASE, tones[tone],
      glow ? "shadow-neon" : "",
      pulse ? "animate-neon-pulse" : "",
      className
    ].join(" ")}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

/* ─────────────────────────── INPUTS ─────────────────────────── */
function Field({ label, helper, error, children, className = "" }) {
  return (
    <div className={"flex flex-col gap-1.5 " + className}>
      {label ? (
        <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</label>
      ) : null}
      {children}
      {error ? (
        <div className="text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1">
          <Icon name="CircleAlert" size={12} />
          {error}
        </div>
      ) : helper ? (
        <div className="text-[12px] text-slate-500 dark:text-slate-400">{helper}</div>
      ) : null}
    </div>
  );
}

const inputCls = (variant, error) => [
  "w-full h-10 px-3.5 text-[14px] rounded-xl transition-colors ring-brand outline-none",
  "text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500",
  variant === "glass"
    ? "glass border-white/40 dark:border-white/10"
    : "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-primary-400 dark:focus:border-primary-400",
  error ? "border-red-400 dark:border-red-500/60 focus:border-red-500" : ""
].join(" ");

function TextInput({ variant = "base", error, prefix, className = "", ...rest }) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
          <Icon name={prefix} size={16} />
        </span>
      ) : null}
      <input
        {...rest}
        className={[inputCls(variant, error), prefix ? "pl-9" : "", className].join(" ")}
      />
    </div>
  );
}

function Select({ value, onChange, options, variant = "base", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function close(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const current = options.find(o => o.value === value) || options[0];
  return (
    <div ref={ref} className={"relative " + className}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={inputCls(variant) + " flex items-center justify-between text-left"}
      >
        <span>{current?.label}</span>
        <Icon name="ChevronDown" size={16} className={"transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 glass-frosted rounded-xl p-1 shadow-lg animate-slide-up">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange?.(o.value); setOpen(false); }}
              className={[
                "w-full text-left px-3 h-9 rounded-lg text-[13.5px] flex items-center justify-between",
                o.value === value
                  ? "bg-primary-500/10 text-primary-700 dark:text-primary-200"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
              ].join(" ")}
            >
              {o.label}
              {o.value === value ? <Icon name="Check" size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Textarea({ rows = 3, className = "", variant="base", ...rest }) {
  return (
    <textarea
      rows={rows}
      {...rest}
      className={[
        inputCls(variant), "h-auto py-2.5 leading-relaxed resize-y", className
      ].join(" ")}
    />
  );
}

/* ─────────────────────────── MODAL ─────────────────────────── */
function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  // focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => ref.current?.querySelector("button,input,select,textarea")?.focus(), 30);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="relative glass-frosted w-[min(520px,100%)] p-6 rounded-2xl shadow-[0_30px_80px_-20px_rgba(15,23,42,.5)] glow-md"
        style={{ animation: "slideUp .12s ease-out", transformOrigin: "center" }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="text-[14px] text-slate-700 dark:text-slate-300 space-y-3">{children}</div>
        {footer ? <div className="mt-6 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── TOAST ─────────────────────────── */
function Toast({ tone = "info", title, body, icon }) {
  const tones = {
    success: { ring: "ring-emerald-400/30", text: "text-emerald-700 dark:text-emerald-300", icon: "CircleCheck", glow: "shadow-neon-green" },
    error:   { ring: "ring-red-400/30",     text: "text-red-700 dark:text-red-300",         icon: "CircleAlert", glow: "shadow-neon-pink" },
    warning: { ring: "ring-amber-400/30",   text: "text-amber-700 dark:text-amber-300",     icon: "TriangleAlert", glow: "" },
    info:    { ring: "ring-cyan-400/30",    text: "text-cyan-700 dark:text-cyan-300",       icon: "Info", glow: "shadow-neon-cyan" },
  };
  const t = tones[tone];
  return (
    <div className={["glass rounded-xl px-3.5 py-3 ring-1 flex items-start gap-3 min-w-[280px] max-w-[360px]", t.ring].join(" ")}>
      <div className={"shrink-0 rounded-lg p-1.5 bg-white/60 dark:bg-white/5 " + t.text}>
        <Icon name={icon || t.icon} size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {body ? <div className="text-[12.5px] text-slate-600 dark:text-slate-400 mt-0.5">{body}</div> : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── SECTION SHELL ─────────────────────────── */
function Section({ id, eyebrow, title, description, children, className = "" }) {
  return (
    <section id={id} className={"max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-20 " + className}>
      <div className="mb-10 max-w-3xl">
        <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">{eyebrow}</div>
        <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
        {description ? (
          <p className="mt-3 text-[15px] text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* ─── export to window ─── */
Object.assign(window, {
  Button, Card, CardHeader, CardBody, CardFooter,
  Badge, Field, TextInput, Select, Textarea, Modal, Toast, Section,
});
// Shared bits for Public & Auth: AnimatedBackground, BrandLogo, ThemeToggle hook, AuthLayout

const { useState: paUseState, useEffect: paUseEffect, useRef: paUseRef, useMemo: paUseMemo } = React;

function useTheme() {
  const [dark, setDark] = paUseState(true);
  paUseEffect(() => {
    const r = document.documentElement;
    if (dark) r.classList.add("dark"); else r.classList.remove("dark");
  }, [dark]);
  return [dark, setDark];
}

function AnimatedBackground({ className = "", subtle = false }) {
  const a = subtle ? 0.5 : 1;
  return (
    <div className={"absolute inset-0 overflow-hidden pointer-events-none " + className} aria-hidden>
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl animate-pulse"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))", opacity:0.7*a }} />
      <div className="absolute top-1/3 -right-24 w-[360px] h-[360px] rounded-full blur-3xl animate-pulse"
        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.4), rgba(59,130,246,0.35))", animationDelay: "1s", opacity:0.7*a }} />
      <div className="absolute -bottom-32 left-1/4 w-[300px] h-[300px] rounded-full blur-3xl animate-pulse"
        style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))", animationDelay: "2s", opacity:0.6*a }} />
      <div className="absolute inset-0 bg-grid" />
      <span className="absolute left-[18%] top-[28%] w-1.5 h-1.5 rounded-full bg-primary-400 animate-float opacity-60" />
      <span className="absolute right-[22%] top-[60%] w-1.5 h-1.5 rounded-full bg-secondary-400 animate-float opacity-50" style={{ animationDelay: "2.5s" }} />
      <span className="absolute left-[45%] bottom-[14%] w-2 h-2 rounded-full bg-fuchsia-400 animate-float opacity-50" style={{ animationDelay: "4s" }} />
    </div>
  );
}

function BrandLogo({ size = "md", showWordmark = true, mono = false }) {
  const sz = size === "lg" ? 56 : size === "sm" ? 32 : 40;
  const inner = size === "lg" ? 26 : size === "sm" ? 14 : 18;
  return (
    <div className="inline-flex items-center gap-3">
      <div
        className="rounded-xl brand-gradient-bg flex items-center justify-center text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]"
        style={{ width: sz, height: sz }}
      >
        <Icon name="Sparkles" size={inner} />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className={["font-semibold tracking-tight", size==="lg" ? "text-[22px]" : size==="sm" ? "text-[14px]" : "text-[17px]", mono ? "" : "brand-gradient-text"].join(" ")}>
            CodeMentor<span className="text-slate-400 dark:text-slate-500 ml-1 font-normal">AI</span>
          </span>
          {size === "lg" ? (
            <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">benha · 2026</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ dark, setDark, className="" }) {
  return (
    <button
      onClick={() => setDark(d => !d)}
      aria-label="Toggle theme"
      className={"w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors ring-brand " + className}
    >
      <Icon name={dark ? "Sun" : "Moon"} size={16}/>
    </button>
  );
}

function AuthLayout({ children, footerLink, dark, setDark }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <AnimatedBackground />
      <div className="relative flex flex-col items-center w-full">
        <div className="mb-7"><BrandLogo size="lg" /></div>
        <div className="w-full max-w-md">{children}</div>
        <div className="mt-7 flex items-center gap-4 text-[13px] text-slate-500 dark:text-slate-400">
          {footerLink}
          <span className="opacity-50">·</span>
          <ThemeToggle dark={dark} setDark={setDark} />
        </div>
      </div>
    </div>
  );
}

// helper: avatar initials on signature gradient
function InitialsAvatar({ name = "Layla Ahmed", size = 32 }) {
  const initials = name.split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase();
  return (
    <div
      className="rounded-full brand-gradient-bg text-white font-semibold flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size*0.42 }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

Object.assign(window, { useTheme, AnimatedBackground, BrandLogo, ThemeToggle, AuthLayout, InitialsAvatar });
// Core Learning shared: AppLayout (Sidebar + Header + Footer), atoms.

const { useState: coUseState, useEffect: coUseEffect, useMemo: coUseMemo, useRef: coUseRef } = React;

const NAV_ITEMS = [
  { key:"dashboard",      label:"Dashboard",     icon:"House" },
  { key:"assessment",     label:"Assessment",    icon:"BookOpen" },
  { key:"learning-path",  label:"Learning Path", icon:"Map" },
  { key:"submissions",    label:"Submissions",   icon:"Code" },
  { key:"tasks",          label:"Tasks",         icon:"ClipboardList" },
  { key:"audit",          label:"Audit",         icon:"ScanSearch" },
  { key:"analytics",      label:"Analytics",     icon:"TrendingUp" },
  { key:"achievements",   label:"Achievements",  icon:"Trophy" },
];

function Sidebar({ active, collapsed, setCollapsed, dark, setDark, mobileOpen, setMobileOpen }) {
  const w = collapsed ? 80 : 256;
  return (
    <>
      {/* mobile backdrop */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={()=>setMobileOpen(false)} aria-hidden/>
      ) : null}
      <aside
        style={{ width: w }}
        className={[
          "fixed top-0 bottom-0 left-0 z-50 glass border-r border-white/30 dark:border-white/5 flex flex-col transition-[width,transform] duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        ].join(" ")}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/30 dark:border-white/5">
          {!collapsed ? <BrandLogo size="sm"/> : <div className="mx-auto"><BrandLogo size="sm" showWordmark={false}/></div>}
          <button
            onClick={()=>setCollapsed(v=>!v)}
            className="hidden lg:inline-flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10 ring-brand"
            aria-label="Toggle sidebar"
          >
            <Icon name="ChevronLeft" size={14} className={collapsed ? "rotate-180" : ""}/>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = item.key === active;
            return (
              <a
                key={item.key}
                href={`#${item.key}`}
                onClick={(e)=>{ e.preventDefault(); setMobileOpen(false); window.__coGoto?.(item.key); }}
                title={collapsed ? item.label : undefined}
                className={[
                  "h-10 px-3 rounded-xl flex items-center gap-3 text-[13.5px] transition-colors ring-brand",
                  isActive
                    ? "bg-primary-500/10 dark:bg-primary-500/20 text-primary-700 dark:text-primary-200 font-medium"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5",
                  collapsed ? "justify-center px-0" : ""
                ].join(" ")}
              >
                <Icon name={item.icon} size={17} className={isActive ? "text-primary-600 dark:text-primary-300" : ""}/>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {isActive && !collapsed ? <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_6px_rgba(139,92,246,.7)]"/> : null}
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/30 dark:border-white/5 flex flex-col gap-1">
          <button
            onClick={()=>setDark(d=>!d)}
            className={[
              "h-10 rounded-xl flex items-center gap-3 text-[13.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 ring-brand",
              collapsed ? "justify-center px-0" : "px-3"
            ].join(" ")}
            aria-label="Toggle theme"
          >
            <Icon name={dark ? "Sun" : "Moon"} size={17}/>
            {!collapsed ? <span>{dark ? "Light mode" : "Dark mode"}</span> : null}
          </button>
          <a
            href="#settings"
            onClick={(e)=>e.preventDefault()}
            className={[
              "h-10 rounded-xl flex items-center gap-3 text-[13.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 ring-brand",
              collapsed ? "justify-center px-0" : "px-3"
            ].join(" ")}
          >
            <Icon name="Settings" size={17}/>
            {!collapsed ? <span>Settings</span> : null}
          </a>
        </div>
      </aside>
    </>
  );
}

function NotificationsBell() {
  return (
    <button className="relative w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 ring-brand" aria-label="Notifications">
      <Icon name="Bell" size={16}/>
      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary-500 text-[10px] font-semibold text-white flex items-center justify-center animate-neon-pulse">3</span>
    </button>
  );
}

function UserMenu() {
  const [open, setOpen] = coUseState(false);
  const ref = coUseRef(null);
  coUseEffect(() => {
    function close(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={()=>setOpen(v=>!v)}
        className="inline-flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full glass hover:bg-white/80 dark:hover:bg-white/10 ring-brand"
      >
        <InitialsAvatar name="Layla Ahmed" size={28}/>
        <span className="hidden md:inline text-[13px] font-medium text-slate-800 dark:text-slate-100">Layla A.</span>
        <Icon name="ChevronDown" size={13} className="text-slate-500"/>
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] w-56 glass-frosted rounded-xl p-1 shadow-[0_20px_50px_-10px_rgba(15,23,42,.4)] animate-slide-up z-50">
          <div className="px-3 py-2.5 border-b border-slate-200/60 dark:border-white/5">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Layla Ahmed</div>
            <div className="text-[11.5px] font-mono text-slate-500 dark:text-slate-400 truncate">layla.ahmed@benha.edu</div>
          </div>
          {[
            { icon:"User",     label:"Profile" },
            { icon:"Settings", label:"Settings" },
            { icon:"LogOut",   label:"Sign out", danger:true }
          ].map(i => (
            <button key={i.label} className={[
              "w-full h-9 px-3 rounded-lg flex items-center gap-2.5 text-[13px] transition-colors",
              i.danger ? "text-red-600 dark:text-red-400 hover:bg-red-500/8"
                       : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            ].join(" ")}>
              <Icon name={i.icon} size={14}/>
              {i.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Header({ title, dark, setDark, setMobileOpen }) {
  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-white/30 dark:border-white/5">
      <div className="h-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={()=>setMobileOpen(true)} className="lg:hidden w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 ring-brand" aria-label="Open menu">
            <Icon name="Menu" size={16}/>
          </button>
          <h4 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 truncate">{title}</h4>
        </div>
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="w-full max-w-md">
            <TextInput prefix="Search" placeholder="Search the task library…"/>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell/>
          <UserMenu/>
        </div>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-white/5 mt-8 px-4 md:px-6 lg:px-8 py-6 text-[12px] text-slate-500 dark:text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div>
        <div>Code Mentor — Benha University, Faculty of Computers and AI · Class of 2026.</div>
        <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Instructor: Prof. Mostafa El-Gendy · TA: Eng. Fatma Ibrahim</div>
      </div>
      <div className="flex items-center gap-4">
        <a href="#privacy" onClick={e=>e.preventDefault()} className="hover:text-primary-600">Privacy</a>
        <a href="#terms" onClick={e=>e.preventDefault()} className="hover:text-primary-600">Terms</a>
      </div>
    </footer>
  );
}

function AppLayout({ active, title, children }) {
  const [dark, setDark] = useTheme();
  const [collapsed, setCollapsed] = coUseState(false);
  const [mobileOpen, setMobileOpen] = coUseState(false);
  const pad = collapsed ? "lg:pl-[80px]" : "lg:pl-[256px]";
  return (
    <div className="min-h-screen">
      <Sidebar active={active} collapsed={collapsed} setCollapsed={setCollapsed} dark={dark} setDark={setDark} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>
      <div className={pad + " transition-[padding] duration-200"}>
        <Header title={title} dark={dark} setDark={setDark} setMobileOpen={setMobileOpen}/>
        <main className="p-4 md:p-6 lg:p-8 animate-fade-in">{children}</main>
        <AppFooter/>
      </div>
    </div>
  );
}

/* ─────────────── atoms ─────────────── */

function ProgressBar({ value = 0, size = "md", className = "" }) {
  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  return (
    <div className={["w-full rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden", h, className].join(" ")}>
      <div className="h-full rounded-full brand-gradient-bg transition-[width] duration-500" style={{ width: value + '%' }}/>
    </div>
  );
}

function CircularProgress({ value = 0, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const cx = size / 2;
  const gid = "cp-" + size + "-" + value;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width:size, height:size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4"/><stop offset="33%" stopColor="#3b82f6"/><stop offset="66%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#ec4899"/>
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} stroke="currentColor" strokeOpacity="0.12" strokeWidth={stroke} fill="none" className="text-slate-400 dark:text-white"/>
        <circle cx={cx} cy={cx} r={r} stroke={`url(#${gid})`} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${dash} ${c}`}/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono font-semibold text-[15px] brand-gradient-text">{value}%</div>
    </div>
  );
}

function XpLevelChip({ level = 7, xp = 1240, target = 2000 }) {
  const pct = Math.round((xp / target) * 100);
  return (
    <div className="inline-flex items-center gap-3 glass rounded-full pl-3 pr-3.5 py-1.5">
      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-800 dark:text-slate-100">
        <Icon name="Zap" size={12} className="text-primary-500 dark:text-primary-300"/>
        Level {level}
      </span>
      <div className="w-24 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full brand-gradient-bg" style={{ width: pct + '%' }}/>
      </div>
      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{xp.toLocaleString()} / {target.toLocaleString()} XP</span>
    </div>
  );
}

function TaskStatusIcon({ status }) {
  if (status === "completed")   return <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0"><Icon name="CircleCheck" size={16}/></span>;
  if (status === "in_progress") return <span className="w-7 h-7 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-300 flex items-center justify-center shrink-0"><Icon name="Play" size={14}/></span>;
  return <span className="w-7 h-7 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"><Icon name="Circle" size={14}/></span>;
}

function SubmissionStatusPill({ status }) {
  const map = {
    completed:  { tone:"success",    label:"Completed",  icon:"CircleCheck" },
    processing: { tone:"processing", label:"Processing", icon:"Loader" },
    failed:     { tone:"failed",     label:"Failed",     icon:"CircleX" },
    pending:    { tone:"pending",    label:"Pending",    icon:"Clock" },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} icon={m.icon}>{m.label}</Badge>;
}

function DifficultyStars({ level = 3, size = 12 }) {
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="Star" size={size} className={i <= level ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-white/15"} style={i<=level ? { fill:"#f59e0b" } : undefined}/>
      ))}
    </span>
  );
}

function TabsStrip({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
      {tabs.map(t => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange?.(t.key)}
            className={[
              "inline-flex items-center gap-2 h-10 px-3.5 text-[13.5px] font-medium transition-colors relative whitespace-nowrap ring-brand",
              isActive ? "text-primary-700 dark:text-primary-200" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            ].join(" ")}
          >
            <Icon name={t.icon} size={14}/>
            {t.label}
            {isActive ? <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full brand-gradient-bg"/> : null}
          </button>
        );
      })}
    </div>
  );
}

function StatCardGradient({ icon, gradient, value, label }) {
  return (
    <Card variant="glass" className="p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-10px_rgba(15,23,42,.35)]" style={{ backgroundImage: gradient }}>
        <Icon name={icon} size={22}/>
      </div>
      <div className="min-w-0">
        <div className="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-none brand-gradient-text">{value}</div>
        <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      </div>
    </Card>
  );
}

function CategoryBadge({ children }) {
  return <span className="inline-flex items-center h-5 px-1.5 rounded bg-slate-100 dark:bg-white/5 text-[11px] font-mono text-slate-600 dark:text-slate-300">{children}</span>;
}

Object.assign(window, {
  AppLayout, ProgressBar, CircularProgress, XpLevelChip,
  TaskStatusIcon, SubmissionStatusPill, DifficultyStars, TabsStrip,
  StatCardGradient, CategoryBadge,
});
// Dashboard page

const DASH_TASKS = [
  { id:1, title:"REST API with Express",      category:"Backend",   difficulty:3, hours:6, status:"completed" },
  { id:2, title:"JWT Authentication",         category:"Security",  difficulty:4, hours:4, status:"completed" },
  { id:3, title:"PostgreSQL with Prisma",     category:"Databases", difficulty:3, hours:8, status:"completed" },
  { id:4, title:"React Form Validation",      category:"Frontend",  difficulty:3, hours:5, status:"in_progress" },
  { id:5, title:"WebSocket Chat",             category:"Real-time", difficulty:4, hours:7, status:"not_started" },
];
const SKILLS = [
  { name:"Correctness", score:84, level:"Advanced" },
  { name:"Readability", score:81, level:"Advanced" },
  { name:"Security",    score:58, level:"Intermediate" },
  { name:"Performance", score:65, level:"Intermediate" },
  { name:"Design",      score:72, level:"Intermediate" },
];
const RECENT_SUBS = [
  { status:"completed",  task:"JWT Authentication",     meta:"2026-05-12 09:24",  score:86 },
  { status:"processing", task:"PostgreSQL with Prisma", meta:"2026-05-12 08:55" },
  { status:"completed",  task:"REST API with Express",  meta:"2026-05-11 18:12",  score:79 },
];

function DashWelcome() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-tight inline-flex items-center gap-2 flex-wrap">
          <span>Welcome back,</span>
          <span className="brand-gradient-text">Layla</span>
          <Icon name="Hand" size={28} className="text-amber-500 inline-block animate-float"/>
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-600 dark:text-slate-300">Your <span className="text-primary-700 dark:text-primary-200 font-medium">Full Stack</span> learning path has 7 tasks. 3 complete.</p>
        <div className="mt-3"><XpLevelChip level={7} xp={1240} target={2000}/></div>
      </div>
      <Button variant="outline" size="md" leftIcon="Sparkles">Retake Assessment</Button>
    </div>
  );
}

function ActivePathCard() {
  const total = 7, done = 3;
  const pct = Math.round((done/total)*100);
  const top5 = DASH_TASKS;
  const nextUp = DASH_TASKS.find(t => t.status === "in_progress");
  return (
    <Card variant="glass" className="lg:col-span-2">
      <CardHeader
        title="Active Learning Path"
        right={<Badge tone="primary" icon="Layers">Full Stack</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <CircularProgress value={Math.round((done/total)*100)} size={80} stroke={8}/>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">Overall progress</span>
              <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">{pct}%</span>
            </div>
            <ProgressBar value={pct} size="md"/>
            <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">{done} of {total} tasks complete</p>
          </div>
        </div>

        <div className="space-y-2">
          {top5.map(t => {
            const cta = t.status === "completed" ? "Review" : t.status === "in_progress" ? "Continue" : "Start";
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/70 dark:bg-white/[0.04] border border-slate-200/40 dark:border-white/5">
                <TaskStatusIcon status={t.status}/>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-slate-900 dark:text-slate-100 truncate">{t.title}</div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>{t.category}</span><span>·</span>
                    <span className="inline-flex items-center gap-1">difficulty <DifficultyStars level={t.difficulty} size={10}/></span><span>·</span>
                    <span>{t.hours}h</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" rightIcon="ArrowRight">{cta}</Button>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-700/40" style={{ background:"linear-gradient(135deg, rgba(139,92,246,0.08), rgba(168,85,247,0.08))" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-primary-700 dark:text-primary-200">Next up</div>
              <div className="mt-0.5 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{nextUp?.title}</div>
            </div>
            <Button variant="primary" size="md" rightIcon="ArrowRight">Continue Task</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SkillSnapshotCard() {
  return (
    <Card variant="glass">
      <CardHeader title="Skill Snapshot"/>
      <CardBody className="space-y-3.5">
        {SKILLS.map(s => (
          <div key={s.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
              <span className="text-[12px] text-slate-500 dark:text-slate-400">· <span className="font-mono">{s.score}%</span></span>
            </div>
            <ProgressBar value={s.score} size="sm"/>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{s.level}</div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function RecentSubmissionsCard() {
  return (
    <Card variant="glass">
      <CardHeader title="Recent Submissions" right={<a href="#" onClick={e=>e.preventDefault()} className="text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline">View all</a>}/>
      <div className="px-2 pb-2">
        {RECENT_SUBS.map((s,i) => (
          <div key={i} className={"flex items-center gap-3 px-3 py-3 " + (i>0 ? "border-t border-slate-200/40 dark:border-white/5" : "")}>
            <SubmissionStatusPill status={s.status}/>
            <div className="min-w-0 flex-1">
              <a href="#" onClick={e=>e.preventDefault()} className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-300 truncate block">{s.task}</a>
              <div className="text-[11.5px] font-mono text-slate-500 dark:text-slate-400">{s.meta}{s.score!=null ? ` · ${s.score}%` : ""}</div>
            </div>
            <Button variant="ghost" size="sm" rightIcon="ArrowRight">View</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickActionCard({ icon, gradient, title, description }) {
  return (
    <Card variant="glass" className="p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform cursor-pointer group">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-110" style={{ backgroundImage: gradient, boxShadow:"0 8px 24px -8px rgba(15,23,42,.35)" }}>
        <Icon name={icon} size={22}/>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>
      </div>
      <Icon name="ArrowUpRight" size={14} className="text-slate-400 group-hover:text-primary-500 transition-colors"/>
    </Card>
  );
}

function Dashboard() {
  return (
    <AppLayout active="dashboard" title="Dashboard">
      <div className="space-y-6">
        <DashWelcome/>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardGradient icon="Target" gradient="linear-gradient(135deg,#10b981,#34d399)" value="3 / 7" label="Tasks Complete"/>
          <StatCardGradient icon="Play"   gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" value="1"     label="In Progress"/>
          <StatCardGradient icon="Clock"  gradient="linear-gradient(135deg,#8b5cf6,#ec4899)" value="42h"   label="Estimated Path"/>
          <StatCardGradient icon="Trophy" gradient="linear-gradient(135deg,#f97316,#f59e0b)" value="78%"   label="Avg Skill Score"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActivePathCard/>
          <SkillSnapshotCard/>
        </div>

        <RecentSubmissionsCard/>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <QuickActionCard icon="BookOpen" gradient="linear-gradient(135deg,#10b981,#34d399)" title="Browse Task Library" description="Explore every task across all tracks"/>
          <QuickActionCard icon="Trophy"   gradient="linear-gradient(135deg,#f97316,#fbbf24)" title="Your Learning CV"     description="3 verified projects · public"/>
          <QuickActionCard icon="Code"     gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" title="Submit Code"          description="Get AI feedback on your work"/>
        </div>
      </div>
    </AppLayout>
  );
}
window.Dashboard = Dashboard;
// Learning Path page

const PATH_TASKS = [
  { n:1, title:"REST API with Express",        category:"Backend",   hours:6, diff:3, lang:"JavaScript", status:"completed" },
  { n:2, title:"JWT Authentication",           category:"Security",  hours:4, diff:4, lang:"JavaScript", status:"completed" },
  { n:3, title:"PostgreSQL with Prisma",       category:"Databases", hours:8, diff:3, lang:"TypeScript", status:"completed" },
  { n:4, title:"React Form Validation",        category:"Frontend",  hours:5, diff:3, lang:"TypeScript", status:"in_progress" },
  { n:5, title:"WebSocket Chat",               category:"Real-time", hours:7, diff:4, lang:"TypeScript", status:"not_started" },
  { n:6, title:"Docker Multi-Service Setup",   category:"DevOps",    hours:6, diff:5, lang:"Dockerfile", status:"locked" },
  { n:7, title:"End-to-End Testing",           category:"Testing",   hours:6, diff:4, lang:"TypeScript", status:"locked" },
];

function NumberCircle({ n, status }) {
  if (status === "completed") return <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0"><Icon name="Check" size={16}/></div>;
  if (status === "in_progress") return <div className="w-9 h-9 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-200 border border-primary-400/40 flex items-center justify-center shrink-0 font-mono text-[13px] font-semibold shadow-[0_0_0_3px_rgba(139,92,246,.12)]">{n}</div>;
  if (status === "locked") return <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 relative font-mono text-[13px]"><Icon name="Lock" size={13}/></div>;
  return <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 font-mono text-[13px]">{n}</div>;
}

function PathTaskRow({ task }) {
  return (
    <Card variant="glass" className="p-5 flex items-start gap-4">
      <NumberCircle n={task.n} status={task.status}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{task.title}</h3>
          {task.status === "completed" ? <Badge tone="success" icon="CircleCheck">Completed</Badge> : null}
          {task.status === "in_progress" ? <Badge tone="primary" icon="Play" glow pulse>In progress</Badge> : null}
        </div>
        <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><Icon name="BookOpen" size={11}/>{task.category}</span>
          <span className="inline-flex items-center gap-1"><Icon name="Clock" size={11}/>{task.hours}h</span>
          <span className="inline-flex items-center gap-1"><DifficultyStars level={task.diff} size={10}/></span>
          <CategoryBadge>{task.lang}</CategoryBadge>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <Button variant="outline" size="sm" rightIcon="ArrowRight">Open</Button>
        {task.status === "not_started" ? <Button variant="gradient" size="sm">Start</Button> : null}
        {task.status === "locked" ? <Button variant="outline" size="sm" leftIcon="Lock" disabled>Locked</Button> : null}
      </div>
    </Card>
  );
}

function LearningPathPage() {
  return (
    <AppLayout active="learning-path" title="Learning Path">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[30px] font-semibold tracking-tight brand-gradient-text">Your Full Stack Path</h1>
            <Badge tone="primary" icon="Layers">7 tasks</Badge>
          </div>
          <p className="mt-1.5 text-[13.5px] text-slate-500 dark:text-slate-400 font-mono">Generated May 7, 2026 · Estimated 42 h</p>
        </div>

        <div className="glass-frosted rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Overall Progress</span>
            <span className="brand-gradient-text font-bold text-[18px]">43% complete</span>
          </div>
          <ProgressBar value={43} size="md"/>
          <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">3 of 7 tasks done</p>
        </div>

        <div className="space-y-3">
          {PATH_TASKS.map(t => <PathTaskRow key={t.n} task={t}/>)}
        </div>
      </div>
    </AppLayout>
  );
}
window.LearningPathPage = LearningPathPage;
// Project Details page

function ProjectTabContent_Overview() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Project Overview</h3>
        <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
          Build a multi-step form with Zod schema validation, error states tied to specific fields, an async username-availability check that doesn't block the UI, and accessible error messaging surfaced through ARIA. Submission should pass a small Jest suite covering typing errors and only fire when both step schemas validate.
        </p>
      </div>

      <div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-3">Learning Objectives</h3>
        <ul className="space-y-2">
          {[
            "Validate complex form schemas with Zod",
            "Bind field-level error states to inputs",
            "Handle async validators without blocking the UI",
            "Surface accessible error messaging (ARIA + role=alert)",
          ].map((t,i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-700 dark:text-slate-300">
              <Icon name="CircleCheck" size={16} className="text-primary-500 dark:text-primary-300 shrink-0 mt-0.5"/>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-3 inline-flex items-center gap-2">
          <Icon name="History" size={16} className="text-slate-500"/>
          Previous Submissions
        </h3>
        <div className="rounded-xl border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] p-3 flex items-center gap-3 flex-wrap">
          <SubmissionStatusPill status="failed"/>
          <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">Dec 22, 2024 · 02:15 PM</span>
          <span className="ml-auto text-[14px] font-semibold text-red-600 dark:text-red-400">65%</span>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsPage() {
  const [tab, setTab] = coUseState("overview");
  const tabs = [
    { key:"overview",     label:"Overview",     icon:"FileText" },
    { key:"requirements", label:"Requirements", icon:"Target" },
    { key:"deliverables", label:"Deliverables", icon:"Package" },
    { key:"resources",    label:"Resources",    icon:"BookOpen" },
  ];
  return (
    <AppLayout active="learning-path" title="Project Details">
      <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
        <a href="#learning-path" onClick={(e)=>{ e.preventDefault(); window.__coGoto?.("learning-path"); }} className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300">
          <Icon name="ArrowLeft" size={14}/> Back to Learning Path
        </a>

        <div className="glass-frosted rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">Task 4</span>
                <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-primary-500/15 text-primary-700 dark:text-primary-200 border border-primary-400/30 text-[13px] font-medium">
                  <Icon name="Play" size={12}/> In Progress
                </span>
              </div>
              <h1 className="mt-2 text-[30px] font-semibold tracking-tight brand-gradient-text">React Form Validation</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300 max-w-2xl">
                Build a multi-step form with Zod schema validation, error states tied to specific fields, async username-availability check, and accessible error messaging. Should pass a small Jest suite of typing-error tests and submit only when all schemas validate.
              </p>
              <div className="mt-3 flex items-center gap-4 flex-wrap text-[13px] text-slate-600 dark:text-slate-300">
                <Badge tone="neutral">Frontend</Badge>
                <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={13}/>5 hours</span>
                <span className="inline-flex items-center gap-1.5">Difficulty: <DifficultyStars level={3} size={13}/></span>
              </div>
            </div>
            <div className="shrink-0">
              <Button variant="gradient" size="lg" rightIcon="Send">Submit Code</Button>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-[12.5px] text-slate-500 dark:text-slate-400 mr-3">Prerequisites:</span>
            <span className="inline-flex items-center gap-2 flex-wrap">
              <Badge tone="success" icon="CircleCheck">PostgreSQL with Prisma</Badge>
              <Badge tone="success" icon="CircleCheck">JWT Authentication</Badge>
            </span>
          </div>
        </div>

        <div className="glass-frosted rounded-2xl p-6 overflow-hidden">
          <TabsStrip tabs={tabs} active={tab} onChange={setTab}/>
          <div className="pt-6">
            {tab === "overview" ? <ProjectTabContent_Overview/> : (
              <div className="text-[14px] text-slate-500 dark:text-slate-400 py-8 text-center">
                <Icon name="FolderOpen" size={28} className="inline-block text-slate-300 dark:text-white/20 mb-2"/>
                <div>Content for the <span className="text-primary-600 dark:text-primary-300 font-medium">{tabs.find(t=>t.key===tab)?.label}</span> tab.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
window.ProjectDetailsPage = ProjectDetailsPage;
// Tasks Library page

const LIB_TASKS = [
  { id:1, title:"REST API with Express",       track:"FullStack", category:"Algorithms",     lang:"JavaScript", diff:3, hours:6 },
  { id:2, title:"JWT Authentication",          track:"FullStack", category:"Security",       lang:"JavaScript", diff:4, hours:4 },
  { id:3, title:"PostgreSQL with Prisma",      track:"FullStack", category:"Databases",      lang:"TypeScript", diff:3, hours:8 },
  { id:4, title:"React Form Validation",       track:"FullStack", category:"OOP",            lang:"TypeScript", diff:3, hours:5 },
  { id:5, title:"WebSocket Chat",              track:"FullStack", category:"DataStructures", lang:"TypeScript", diff:4, hours:7 },
  { id:6, title:"Docker Compose Stack",        track:"FullStack", category:"OOP",            lang:"CSharp",     diff:5, hours:6 },
  { id:7, title:"Type-Safe Reducers",          track:"FullStack", category:"DataStructures", lang:"TypeScript", diff:3, hours:3 },
  { id:8, title:"Trie-Based Fuzzy Search",     track:"FullStack", category:"Algorithms",     lang:"Python",     diff:4, hours:8 },
  { id:9, title:"Async Job Queue (Hangfire)",  track:"FullStack", category:"DataStructures", lang:"CSharp",     diff:4, hours:6 },
];

function NativeSelect({ label, value, options = ["Any"] }) {
  return (
    <div className="relative">
      <select defaultValue={value || options[0]} className="appearance-none h-10 pl-3 pr-8 rounded-xl text-[13px] bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 ring-brand">
        {options.map(o => <option key={o} value={o}>{label}: {o}</option>)}
      </select>
      <Icon name="ChevronDown" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );
}

function TaskCard({ t }) {
  return (
    <Card variant="glass" className="p-0 hover:-translate-y-0.5 transition-all cursor-pointer h-full group"
      onClick={()=>window.__coGoto?.("task-detail")}>
      <CardBody className="p-5 flex flex-col h-full gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15.5px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-200 transition-colors">{t.title}</h3>
          <Badge tone="primary">{t.track}</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="neutral">{t.category}</Badge>
          <Badge tone="neutral">{t.lang}</Badge>
        </div>
        <div className="mt-auto flex items-center gap-3 pt-2 text-[12px] text-slate-500 dark:text-slate-400">
          <DifficultyStars level={t.diff} size={12}/>
          <span className="inline-flex items-center gap-1"><Icon name="Clock" size={12}/>{t.hours}h</span>
          <Icon name="ChevronRight" size={14} className="ml-auto text-slate-400 group-hover:text-primary-500"/>
        </div>
      </CardBody>
    </Card>
  );
}

function TasksLibraryPage() {
  return (
    <AppLayout active="tasks" title="Task Library">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Task Library</h1>
          <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">Curated real-world tasks across Full Stack, Backend, and Python tracks.</p>
        </div>

        <Card variant="glass">
          <CardBody className="p-4 space-y-3">
            <TextInput prefix="Search" placeholder="Search task titles..."/>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect label="Track"      value="FullStack" options={["Any","FullStack","Backend","Python"]}/>
              <NativeSelect label="Category"   options={["Any","Algorithms","DataStructures","OOP","Security","Databases"]}/>
              <NativeSelect label="Language"   options={["Any","TypeScript","JavaScript","Python","CSharp"]}/>
              <NativeSelect label="Difficulty" options={["Any","1","2","3","4","5"]}/>
              <Button variant="ghost" size="sm" leftIcon="X" className="text-slate-500">Clear filters</Button>
            </div>
          </CardBody>
        </Card>

        <div>
          <div className="mb-3 text-[12.5px] font-mono text-slate-500 dark:text-slate-400">21 results · page 1 of 2</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIB_TASKS.map(t => <TaskCard key={t.id} t={t}/>)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 py-2">
          <Button variant="outline" size="sm" leftIcon="ArrowLeft" disabled>Prev</Button>
          <span className="font-mono text-[12.5px] text-slate-600 dark:text-slate-300">1 / 2</span>
          <Button variant="outline" size="sm" rightIcon="ArrowRight">Next</Button>
        </div>
      </div>
    </AppLayout>
  );
}
window.TasksLibraryPage = TasksLibraryPage;
// Task Detail page

function MarkdownRenderer() {
  return (
    <div className="space-y-5 text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Overview</h2>
        <p>
          Build a multi-step React form that validates against a <strong className="text-slate-900 dark:text-slate-50 font-semibold">Zod schema</strong>. Each field shows its own inline error state, an async username-availability check runs without blocking the UI, and the submit button is disabled until every schema rule passes.
        </p>
      </div>
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Requirements</h2>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Two-step form: account info → preferences</li>
          <li><strong className="text-slate-900 dark:text-slate-50 font-semibold">Zod</strong> schemas at both step boundaries</li>
          <li>Async validator for <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">username</code> (mock 800ms delay)</li>
          <li>Field errors render inside <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">aria-describedby</code> containers</li>
          <li>Submit only fires when both schemas validate</li>
        </ul>
      </div>
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Acceptance</h2>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Type-check passes with <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">tsc --noEmit</code></li>
          <li>Tests in <code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">tests/form.test.ts</code> all green</li>
          <li>No console errors in the happy path</li>
          <li><code className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">npm run lint</code> returns 0</li>
        </ul>
      </div>
    </div>
  );
}

function TaskDetailPage() {
  return (
    <AppLayout active="tasks" title="Task Detail">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <a href="#tasks" onClick={(e)=>{ e.preventDefault(); window.__coGoto?.("tasks-library"); }} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
          <Icon name="ArrowLeft" size={14}/> Back to Task Library
        </a>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[30px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">React Form Validation</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="primary">FullStack</Badge>
              <Badge tone="neutral">OOP</Badge>
              <Badge tone="neutral">TypeScript</Badge>
              <span className="inline-flex items-center gap-1 text-[12.5px] text-slate-500 dark:text-slate-400 ml-1"><Icon name="Clock" size={12}/>5h</span>
              <DifficultyStars level={3} size={12}/>
            </div>
          </div>
          <div>
            <Badge tone="primary" icon="Play" glow>In Progress</Badge>
          </div>
        </div>

        <Card variant="glass">
          <CardBody className="p-6">
            <MarkdownRenderer/>
          </CardBody>
        </Card>

        <Card variant="glass">
          <CardHeader title="Prerequisites"/>
          <CardBody className="pb-5">
            <ul className="space-y-1.5 text-[13.5px] text-slate-700 dark:text-slate-300 list-disc pl-5">
              <li>PostgreSQL with Prisma</li>
              <li>JWT Authentication</li>
            </ul>
          </CardBody>
        </Card>

        <Card variant="glass">
          <CardBody className="p-6 text-center space-y-3">
            <div className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Ready to submit your work?</div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">Paste a GitHub URL or upload a ZIP of your project for automated review.</div>
            <div className="pt-1">
              <Button variant="primary" size="lg" leftIcon="Send">Submit Your Work</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
window.TaskDetailPage = TaskDetailPage;
// Core Learning — page switcher + router

const CO_PAGES = [
  { key:"dashboard",        label:"Dashboard",        icon:"House" },
  { key:"learning-path",    label:"Learning Path",    icon:"Map" },
  { key:"project-details",  label:"Project Details",  icon:"FileText" },
  { key:"tasks-library",    label:"Tasks Library",    icon:"ClipboardList" },
  { key:"task-detail",      label:"Task Detail",      icon:"FileCode" },
];

function CoPageSwitcher({ page, setPage }) {
  const [open, setOpen] = coUseState(true);
  return (
    <div className="fixed top-3 right-3 z-[200] no-print">
      {open ? (
        <div className="glass-frosted rounded-full p-1 flex items-center gap-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]">
          {CO_PAGES.map(p => (
            <button key={p.key} onClick={()=>setPage(p.key)}
              className={[
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors ring-brand",
                p.key === page ? "bg-primary-500 text-white shadow-[0_0_0_3px_rgba(139,92,246,.18)]" : "text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
              ].join(" ")}>
              <Icon name={p.icon} size={11}/>{p.label}
            </button>
          ))}
          <button onClick={()=>setOpen(false)} aria-label="Collapse" className="w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10 inline-flex items-center justify-center">
            <Icon name="ChevronUp" size={12}/>
          </button>
        </div>
      ) : (
        <button onClick={()=>setOpen(true)} className="glass-frosted rounded-full h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]">
          <Icon name="LayoutGrid" size={13}/>Pages
        </button>
      )}
    </div>
  );
}

function CoreApp() {
  const [page, setPage] = coUseState("dashboard");
  // Allow children (nav links, internal anchors) to route by key
  coUseEffect(() => {
    window.__coGoto = (key) => {
      const map = { dashboard:"dashboard", "learning-path":"learning-path", tasks:"tasks-library", "task-detail":"task-detail", "tasks-library":"tasks-library", "project-details":"project-details" };
      if (map[key]) setPage(map[key]);
    };
  }, []);
  return (
    <>
      <CoPageSwitcher page={page} setPage={setPage}/>
      {page === "dashboard"       && <Dashboard/>}
      {page === "learning-path"   && <LearningPathPage/>}
      {page === "project-details" && <ProjectDetailsPage/>}
      {page === "tasks-library"   && <TasksLibraryPage/>}
      {page === "task-detail"     && <TaskDetailPage/>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CoreApp/>);
