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
      <div className="w-8 h-8 rounded-full bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40 text-fuchsia-600 dark:text-fuchsia-300 flex items-center justify-center shrink-0"><Icon name="Sparkles" size={14}/></div>
      <div className="max-w-[90%] rounded-lg border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 px-3 py-2 text-[13px] leading-relaxed shadow-sm">{children}</div>
    </div>
  );
}
function MentorMessage_User({ children }) {
  return (
    <div className="flex items-start gap-2.5 justify-end">
      <div className="max-w-[85%] rounded-lg border border-cyan-300 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-50 px-3 py-2 text-[13px] leading-relaxed">{children}</div>
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 ring-1 ring-cyan-400/40 text-cyan-700 dark:text-cyan-200 flex items-center justify-center shrink-0"><Icon name="User" size={14}/></div>
    </div>
  );
}

function MentorChatInline() {
  return (
    <Card variant="neon" className="lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      <div className="p-3 flex items-center gap-3 border-b border-slate-200 dark:border-white/10">
        <div className="w-9 h-9 rounded-full bg-violet-500/20 ring-1 ring-violet-400/40 flex items-center justify-center"><Icon name="Sparkles" size={15} className="text-violet-600 dark:text-violet-300"/></div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Code Mentor</div>
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">React Form Validation</div>
        </div>
        <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300" aria-label="Clear conversation"><Icon name="RefreshCcw" size={13}/></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-gradient-to-b from-transparent to-slate-100/40 dark:to-black/30">
        <MentorMessage_Assistant>
          Looking at your submission, the strongest move you made was <strong className="text-slate-900 dark:text-white">debouncing the async username check</strong> — that was your weakest spot last time. Want me to walk through any of the inline annotations?
        </MentorMessage_Assistant>
        <MentorMessage_User>Yeah — why is line 47 a security risk?</MentorMessage_User>
        <MentorMessage_Assistant>
          The fallback <code className="font-mono text-[11.5px] text-cyan-700 dark:text-cyan-300">'dev-secret'</code> on line 47 is the issue. When you write <code className="font-mono text-[11.5px] text-cyan-700 dark:text-cyan-300">process.env.JWT_SECRET || 'dev-secret'</code>, the OR-string runs <strong className="text-slate-900 dark:text-white">in production</strong> if the env var is unset — which happens more often than you'd think during deploys.
          <div className="mt-2">The fix:</div>
          <div className="mt-1"><PrismBlock lang="typescript" code={`const secret = process.env.JWT_SECRET;\nif (!secret) throw new Error('JWT_SECRET is required');`}/></div>
          <div className="mt-2">Fail loud at startup, not silently at signing-time.</div>
        </MentorMessage_Assistant>
        <MentorMessage_User>How do I make sure my CI catches this?</MentorMessage_User>
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40 text-fuchsia-600 dark:text-fuchsia-300 flex items-center justify-center shrink-0"><Icon name="Sparkles" size={14}/></div>
          <div className="max-w-[90%] rounded-lg border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-300 px-3 py-2 text-[13px] animate-pulse inline-flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300 animate-bounce" style={{ animationDelay:"0ms" }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300 animate-bounce" style={{ animationDelay:"120ms" }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300 animate-bounce" style={{ animationDelay:"240ms" }}/>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-white/10 p-3">
        <div className="flex items-end gap-2">
          <textarea rows={2} placeholder="Ask a follow-up about your code or feedback…" className="flex-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none ring-brand resize-none"/>
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
// Submission Form

function SubmissionFormPage() {
  const [tab, setTab] = faUseState("github");
  const tabs = [
    { key:"github", label:"GitHub Repository", icon:"Github" },
    { key:"zip",    label:"Upload ZIP",         icon:"Upload" },
  ];
  return (
    <AppLayout active="submissions" title="Submit Code">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
        <a href="#" onClick={e=>{e.preventDefault(); window.__faGoto?.("task-detail");}} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
          <Icon name="ArrowLeft" size={14}/> Back to React Form Validation
        </a>

        <div>
          <h1 className="text-[26px] font-semibold tracking-tight brand-gradient-text">Submit Your Work</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Task: React Form Validation · Attempt #2</p>
        </div>

        <Card variant="glass">
          <div className="px-2 pt-2">
            <TabsStrip tabs={tabs} active={tab} onChange={setTab}/>
          </div>
          <CardBody className="p-6">
            {tab === "github" ? (
              <div className="space-y-4">
                <Field label="Repository URL">
                  <TextInput prefix="Github" defaultValue="https://github.com/layla-ahmed/react-form-validation" placeholder="https://github.com/username/repository"/>
                </Field>

                <Field label="Validation states demo" error="Must be https://github.com/owner/repo">
                  <TextInput prefix="Github" defaultValue="not-a-url" error/>
                </Field>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-400/30 text-blue-700 dark:text-blue-300">
                  <Icon name="CircleAlert" size={15} className="mt-0.5 shrink-0"/>
                  <p className="text-[12.5px] leading-relaxed">Public repos work without setup. For private repos, make sure you've signed in with GitHub.</p>
                </div>

                <Button variant="gradient" size="lg" rightIcon="ArrowRight" className="w-full">Submit Repository</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <button className="w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/15 p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                  <Icon name="Upload" size={28} className="mx-auto text-slate-400 mb-2"/>
                  <div className="text-[14px] font-medium text-slate-800 dark:text-slate-100">Click to choose a ZIP</div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">Up to 50 MB</div>
                </button>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-300 text-[13px]">
                  <Icon name="CircleCheck" size={15}/> Ready to upload. <span className="font-mono text-[12px]">react-form-validation.zip</span> · 4.2 MB
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-600 dark:text-slate-300">Uploading…</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">73%</span>
                  </div>
                  <ProgressBar value={73} size="md"/>
                </div>

                <Button variant="gradient" size="lg" rightIcon="ArrowRight" className="w-full">Upload &amp; Submit</Button>
              </div>
            )}
          </CardBody>
        </Card>

        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 text-center">Your submission will be analyzed by the AI mentor. Average turnaround: 30 seconds in the stub pipeline, 2–3 minutes in production.</p>
      </div>
    </AppLayout>
  );
}
window.SubmissionFormPage = SubmissionFormPage;
// Submission Detail — THE SIGNATURE SURFACE

function SubmissionDetailPage() {
  const axes = ["Correctness","Readability","Security","Performance","Design"];
  const values = [92, 88, 78, 84, 88];
  const categories = axes.map((n,i) => ({ name:n, score:values[i] }));

  const strengths = [
    "Zod schema split at both step boundaries — no leakage between steps.",
    "Async username check correctly debounced (800ms) and doesn't block submit.",
    <>Error messages bound to <code className="font-mono text-[12px]">aria-describedby</code> — screen readers announce them.</>,
    "Submit button stays disabled until both schemas validate. Honest UX.",
  ];
  const weaknesses = [
    "No CSRF protection on the form POST — fine for a learning task, real apps need it.",
    <>Password complexity rule lives in a regex string — extract to a Zod <code className="font-mono text-[12px]">.refine()</code>.</>,
    "Optimistic submit state isn't rolled back if the network errors.",
  ];

  const recommendations = [
    { priority:"HIGH",   topic:"Security",        reason:"Add CSRF token to the form POST. This is exactly what the next task in your path teaches — perfect timing.", onPath:false },
    { priority:"HIGH",   topic:"Design",          reason:"Refactor the password regex into a Zod .refine(). You'll need this pattern for the next 3 tasks.",            onPath:true  },
    { priority:"MEDIUM", topic:"Performance",     reason:"Memoize the Zod schema with useMemo. Small win but the right reflex.",                                        onPath:false },
    { priority:"MEDIUM", topic:"Maintainability", reason:"Pull the form validation into a custom hook. You'll see this exact pattern in the WebSocket Chat task.",      onPath:false },
  ];
  const resources = [
    { title:"Schema validation in React Hook Form",     type:"article",       topic:"Form validation" },
    { title:"CSRF tokens, explained without hand-waving", type:"article",     topic:"Security" },
    { title:"Async validators without UI jank",         type:"video (12 min)", topic:"Performance" },
  ];

  return (
    <AppLayout active="submissions" title="Submission #142">
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <div>
          <a href="#" onClick={e=>{e.preventDefault(); window.__faGoto?.("task-detail");}} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
            <Icon name="ArrowLeft" size={14}/> Back to task
          </a>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">React Form Validation</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Attempt #2 · submitted 4m ago</p>
        </div>

        <StatusBanner status="completed"/>

        <SourceTimelineCard
          source="github.com/layla-ahmed/react-form-validation"
          timeline={[
            { label:"Received",           time:"09:24", done:true },
            { label:"Started processing", time:"09:24", done:true },
            { label:"Completed",          time:"09:25", done:true },
          ]}
        />

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Feedback column */}
          <div className="space-y-6 min-w-0">
            <PersonalizedChip/>
            <ScoreOverviewCard
              score={86}
              summary="Strong second attempt — you addressed the schema validation gaps from your last submission and the async username check now blocks correctly. Security and design are where the marginal gains are now."
              axes={axes} values={values}
            />
            <CategoryRatingsCard categories={categories}/>
            <StrengthsWeaknessesCard strengths={strengths} weaknesses={weaknesses}/>
            <ProgressAnalysisCard>
              Your previous attempt at this task scored <strong className="text-slate-900 dark:text-slate-50">62/100</strong> — the username validator was synchronous and blocked the entire form. This time you moved it to a debounced async check, which is exactly what the rubric is testing for. Security is still your softest dimension across the last 4 submissions; consider a deeper pass on input sanitization next.
            </ProgressAnalysisCard>
            <InlineAnnotationsCard/>
            <RecommendationsCard items={recommendations}/>
            <ResourcesCard items={resources}/>
            <NewAttemptCard/>
          </div>

          {/* Mentor chat column */}
          <div>
            <MentorChatInline/>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
window.SubmissionDetailPage = SubmissionDetailPage;
// Audit New — 3-step wizard, Step 1 active + Steps 2 & 3 preview

function AuditNewPage() {
  const focusActive = new Set(["Security","Performance","Database"]);
  const focusAreas = ["Security","Performance","Code quality","Architecture","Testing","Documentation","Database"];
  const tags = ["Python","FastAPI","SQLAlchemy","PostgreSQL","Alembic","Docker"];

  return (
    <AppLayout active="audit" title="New Audit">
      <div className="max-w-3xl mx-auto px-2 py-2 space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" size={18} className="text-primary-500"/>
            <h1 className="text-[26px] font-semibold tracking-tight brand-gradient-text">Audit your project</h1>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Get an honest, structured AI audit of your code in under 6 minutes.</p>
        </div>

        <Stepper step={0}/>

        {/* Active Step 1 */}
        <Card variant="glass">
          <CardBody className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Sparkles" size={15} className="text-primary-500"/>
              <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Project identity</span>
            </div>
            <Field label="Project name">
              <TextInput defaultValue="todo-api" maxLength={200}/>
            </Field>
            <Field label="One-line summary">
              <TextInput defaultValue="A short FastAPI service for personal to-do lists with auth and tags." maxLength={200}/>
            </Field>
            <Field label="Detailed description">
              <Textarea rows={5} defaultValue={`todo-api is a learning project for the Code Mentor capstone. FastAPI + SQLAlchemy on\nPostgres, with JWT auth, per-user task isolation, and a small tagging system. In\nscope: REST endpoints for tasks (CRUD), tags (CRUD), auth (register/login/refresh),\nand a /me endpoint. Out of scope: collaborative tasks, websocket sync, email.`}/>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 text-right">412/5000</div>
            </Field>
            <Field label="Project type">
              <Select value="api" onChange={()=>{}} options={[
                { value:"", label:"Pick one…" },
                { value:"api", label:"API" },
                { value:"web", label:"Web App" },
                { value:"cli", label:"CLI Tool" },
                { value:"lib", label:"Library" },
                { value:"mobile", label:"Mobile App" },
                { value:"other", label:"Other" },
              ]}/>
            </Field>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" leftIcon="ArrowLeft" disabled>Back</Button>
          <Button variant="primary" rightIcon="ArrowRight">Next</Button>
        </div>

        {/* Step 2 preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500">↓ Step 2 preview ↓</div>
        <Card variant="glass" className="opacity-95">
          <CardBody className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Code2" size={15} className="text-primary-500"/>
              <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Tech &amp; features</span>
            </div>
            <Field label="Tech stack">
              <div className="flex gap-2">
                <TextInput placeholder="React, TypeScript, Vite (Enter or comma to add)"/>
                <Button variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <Badge key={t} tone="primary" className="!h-7">{t}<Icon name="X" size={11} className="opacity-60 hover:opacity-100 cursor-pointer ml-0.5"/></Badge>
                ))}
              </div>
            </Field>
            <Field label="Main features">
              <Textarea rows={5} defaultValue={`JWT auth (register / login / refresh)\nPer-user task CRUD with pagination\nTag CRUD + many-to-many to tasks\nHealth check + readiness probe\nAlembic migrations`}/>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">5 listed (max 30).</div>
            </Field>
            <Field label="Target audience (optional)">
              <TextInput defaultValue="Solo dev portfolio"/>
            </Field>
            <Field label="Focus areas (optional)">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name="Target" size={14} className="text-slate-500"/>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">Pick the areas where you most want feedback.</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {focusAreas.map(f => {
                  const on = focusActive.has(f);
                  return (
                    <button key={f} className={["px-3 py-1.5 rounded-full text-[12px] border transition-colors", on ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-200" : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-primary-400"].join(" ")}>{f}</button>
                  );
                })}
              </div>
            </Field>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" leftIcon="ArrowLeft">Back</Button>
          <Button variant="primary" rightIcon="ArrowRight">Next</Button>
        </div>

        {/* Step 3 preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500">↓ Step 3 preview ↓</div>
        <Card variant="glass" className="opacity-95">
          <CardBody className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Upload" size={15} className="text-primary-500"/>
              <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Where's the code?</span>
            </div>
            <TabsStrip tabs={[{ key:"github", label:"GitHub Repository", icon:"Github" },{ key:"zip", label:"Upload ZIP", icon:"Upload" }]} active="github" onChange={()=>{}}/>
            <Field label="Repository URL">
              <TextInput prefix="Github" defaultValue="https://github.com/layla-ahmed/todo-api"/>
              <div className="text-[12px] text-slate-500 dark:text-slate-400">Public repos work without setup. For private repos, sign in with GitHub first.</div>
            </Field>
            <Field label="Known issues (optional)">
              <Textarea rows={3} defaultValue={`The /tasks/bulk-import endpoint is partially implemented but not exposed in the router.\nTest coverage is honest but thin — auth tests are missing.`}/>
            </Field>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-400/30 text-blue-700 dark:text-blue-300">
              <Icon name="CircleAlert" size={15} className="mt-0.5 shrink-0"/>
              <p className="text-[12.5px] leading-relaxed">Your uploaded code is stored for <strong>90 days</strong>, then automatically deleted. The audit report is yours to keep.</p>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" leftIcon="ArrowLeft">Back</Button>
          <Button variant="gradient" rightIcon="Send">Start Audit</Button>
        </div>
      </div>
    </AppLayout>
  );
}
window.AuditNewPage = AuditNewPage;
// Audit Detail — 8-section structured report

function AuditDetailPage() {
  const radarAxes = ["Code Quality","Security","Performance","Architecture","Maintainability","Completeness"];
  const radarVals = [78, 68, 82, 72, 76, 80];

  return (
    <AppLayout active="audit" title="Audit · todo-api">
      <div className="max-w-4xl mx-auto px-1 animate-fade-in space-y-6">
        <div>
          <a href="#" onClick={e=>{e.preventDefault(); window.__faGoto?.("audits-history");}} className="inline-flex items-center gap-1.5 text-[13px] text-primary-600 dark:text-primary-300 hover:underline">
            <Icon name="ArrowLeft" size={14}/> Back to my audits
          </a>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">todo-api</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Attempt #1 · started 12m ago</p>
        </div>

        <StatusBanner status="completed"/>

        <SourceTimelineCard
          source="github.com/layla-ahmed/todo-api"
          timeline={[
            { label:"Received",           time:"14:08", done:true },
            { label:"Started processing", time:"14:08", done:true },
            { label:"Completed",          time:"14:14", done:true },
          ]}
        />

        {/* D.1 Score card */}
        <Card variant="glass">
          <CardBody className="p-6 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                <Icon name="Sparkles" size={13} className="text-primary-500"/>Overall score
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[48px] font-bold tracking-tight text-amber-600 dark:text-amber-400 leading-none">74</span>
                <span className="text-[22px] text-slate-400 dark:text-slate-500">/ 100</span>
              </div>
            </div>
            <GradePill grade="C"/>
          </CardBody>
        </Card>

        {/* D.2 ScoreRadar */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="TrendingUp" size={16} className="text-primary-500"/>Score breakdown</span>}/>
          <CardBody className="p-6 pt-2">
            <div className="flex items-center justify-center h-80">
              <FaRadarChart axes={radarAxes} values={radarVals} size={340}/>
            </div>
            <div className="grid sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {radarAxes.map((a,i) => (
                <div key={a} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/8">
                  <span className="text-[12.5px] text-slate-600 dark:text-slate-300">{a}</span>
                  <span className="text-[13px] font-mono font-semibold text-slate-900 dark:text-slate-50">{radarVals[i]}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* D.3 Strengths */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="CircleCheck" size={16} className="text-emerald-500"/>Strengths</span>}/>
          <CardBody className="p-6 pt-2">
            <ul className="space-y-2 text-[13.5px] text-slate-700 dark:text-slate-200">
              {["Auth boundary is clean — every protected endpoint goes through the same current_user dependency. Easy to reason about.",
                "Migrations are non-destructive — you've kept the Alembic history linear without any squash hacks.",
                "Per-user isolation enforced at the query layer, not in Python — much harder to accidentally leak data.",
                "Health and readiness endpoints actually do what their names suggest. Most projects collapse them into one liar."
              ].map((s,i) => (
                <li key={i} className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span><span>{s}</span></li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* D.4 Critical issues */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="ShieldAlert" size={16} className="text-red-500"/>Critical issues <span className="text-[12px] font-mono text-slate-400">(2)</span></span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            <IssueBlock severity="high" title="Possible SQL injection in /tags/search" file="app/api/tags.py:42"
              body="The query parameter is interpolated into a raw SQLAlchemy text() call. Any user can read tags they shouldn't see."
              fix={<>Use parametrized queries with <code className="font-mono">:query</code> bind, or — better — let the ORM build the WHERE clause.</>}/>
            <IssueBlock severity="high" title="Hardcoded SECRET_KEY fallback in settings.py" file="app/core/settings.py:18"
              body="If the env var is unset, the code falls back to 'change-me-in-prod'. That string ships to prod by accident."
              fix="Fail loud at startup. Raise if the secret is missing."/>
          </CardBody>
        </Card>

        {/* D.5 Warnings */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="TriangleAlert" size={16} className="text-amber-500"/>Warnings <span className="text-[12px] font-mono text-slate-400">(4)</span></span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            <IssueBlock severity="warning" title="No rate limit on /auth/login" file="app/api/auth.py:24" body="Brute-force enumeration is trivial without a rate limit." fix="Add a per-IP rate limit via slowapi or Redis-based throttling."/>
            <IssueBlock severity="warning" title="Tests directory contains 6 tests for 23 endpoints" file="tests/" body="Auth tests are missing entirely." fix="Aim for one happy-path + one error test per endpoint, at minimum."/>
            <IssueBlock severity="warning" title="N+1 query in /tasks list endpoint" file="app/api/tasks.py:67" body="Each task triggers an extra SELECT for its tags." fix={<>Use <code className="font-mono">joinedload(Task.tags)</code>.</>}/>
            <IssueBlock severity="warning" title="No CORS allowlist — allow_origins=['*']" file="app/main.py:31" body="Acceptable in dev, not for portfolio publishing." fix="Restrict to your real frontend origin via env var."/>
          </CardBody>
        </Card>

        {/* D.6 Suggestions */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Lightbulb" size={16} className="text-slate-500"/>Suggestions <span className="text-[12px] font-mono text-slate-400">(3)</span></span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            <IssueBlock severity="info" title="Consider Pydantic v2 model_config for shared settings" file="app/schemas/*.py" body="You're repeating Config classes across schemas."/>
            <IssueBlock severity="info" title="Migrate from print to structured logging" file="app/api/auth.py:31, app/api/tasks.py:88" body="Two stray prints survived. Replace with logger.info."/>
            <IssueBlock severity="info" title="Add a pre-commit hook for ruff format" file="pyproject.toml" body="Saves you from inconsistent formatting in PRs."/>
          </CardBody>
        </Card>

        {/* D.7 Missing features */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Target" size={16} className="text-fuchsia-500"/>Missing or incomplete features</span>}/>
          <CardBody className="p-6 pt-2">
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mb-3">Capabilities mentioned in your project description but not yet implemented in the code.</p>
            <ul className="space-y-2 text-[13.5px] text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-2"><span className="text-fuchsia-500 mt-0.5">○</span><span>Bulk task import — endpoint exists in tasks.py but the router doesn't expose it; no Pydantic schema for the input.</span></li>
              <li className="flex items-start gap-2"><span className="text-fuchsia-500 mt-0.5">○</span><span>Pagination ordering — listed as a goal in your description but the /tasks endpoint uses default ID order with no ?order_by param.</span></li>
            </ul>
          </CardBody>
        </Card>

        {/* D.8 Recommendations */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Lightbulb" size={16} className="text-primary-500"/>Top recommended improvements</span>}/>
          <CardBody className="p-6 pt-2 space-y-4">
            {[
              { t:"Plug the SQL-injection hole in /tags/search", h:"Replace text(f'...{query}') with text('... :q').bindparams(q=query). Add a regression test." },
              { t:"Fail-loud on missing secrets",                h:"Drop the or 'change-me-in-prod' fallback. Validate at startup with Pydantic Settings." },
              { t:"Add rate limiting to auth endpoints",         h:"slowapi works with FastAPI dependency injection. Limit /auth/login and /auth/register to 5 req/min/IP." },
              { t:"Triple the test count, starting with auth",   h:"One happy + one failure case per endpoint. Use httpx.AsyncClient against a Postgres test DB." },
              { t:"Document the bulk-import status",             h:"Either finish the endpoint OR remove the unreachable code path. Either way, mention it in the README." },
            ].map((r,i) => (
              <div key={i} className="flex gap-3">
                <PriorityCircle n={i+1}/>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-slate-900 dark:text-slate-50">{r.t}</div>
                  <div className="text-[12.5px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{r.h}</div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* D.9 Tech stack */}
        <Card variant="glass">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="Code2" size={16} className="text-cyan-500"/>Tech stack assessment</span>}/>
          <CardBody className="p-6 pt-2">
            <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {`FastAPI + SQLAlchemy + Postgres is a sensible, boring stack for a learning project — and that's a compliment. Boring stacks let the project's real problems surface (auth, isolation, schema design) instead of being hidden behind shiny library choices.\n\nTwo small flags. (1) SQLAlchemy 1.x-style queries in a few places — you're on 2.0, lean on the new select() API uniformly. (2) Alembic is set up but the autogenerate diffs aren't reviewed before commit — there's a migration that adds an index your model doesn't declare.`}
            </p>
          </CardBody>
        </Card>

        {/* D.10 Inline annotations */}
        <Card variant="glass" className="p-0 overflow-hidden">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Icon name="FileText" size={16} className="text-primary-500"/>Inline annotations <span className="text-[12px] font-mono text-slate-400">(3)</span></span>}/>
          <ul className="divide-y divide-slate-200/60 dark:divide-white/8">
            {/* File 1 expanded */}
            <li>
              <div className="w-full px-6 py-3 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <Icon name="ChevronDown" size={14} className="text-slate-500"/>
                  <code className="font-mono text-[12.5px] text-slate-800 dark:text-slate-100">app/api/tags.py</code>
                </div>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">1 finding</span>
              </div>
              <div className="px-6 pb-4 pt-1">
                <div className="rounded-lg border border-red-200/60 dark:border-red-500/30 p-3 space-y-2 bg-white/40 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-slate-900 dark:text-slate-50">Raw text() with user input</span>
                    <SeverityBadge s="critical"/>
                  </div>
                  <div className="font-mono text-[11.5px] text-slate-500 dark:text-slate-400">Line 42</div>
                  <PrismBlock lang="python" code={`results = db.execute(\n    text(f"SELECT * FROM tags WHERE name LIKE '%{query}%'")\n)`}/>
                  <p className="text-[13px] text-slate-700 dark:text-slate-300">User-supplied <code className="font-mono">query</code> is interpolated into raw SQL. Even with the % wrapping, this is a SQL injection.</p>
                  <p className="text-[12.5px] text-slate-600 dark:text-slate-400"><strong>Explanation:</strong> SQLAlchemy's text() does not bind parameters from f-strings. The string is sent to the DB as-is.</p>
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[12.5px]">
                    <strong>Fix:</strong> Use <code className="font-mono">text('SELECT * FROM tags WHERE name LIKE :pattern').bindparams(pattern=f'%{`{query}`}%')</code>. Or — better — write it via the ORM: <code className="font-mono">db.query(Tag).filter(Tag.name.ilike(f'%{`{query}`}%'))</code>.
                  </div>
                  <PrismBlock lang="python" code={`pattern = f"%{query}%"\nresults = db.query(Tag).filter(Tag.name.ilike(pattern)).all()`} className="ring-emerald-500/20"/>
                </div>
              </div>
            </li>
            {[{ f:"app/core/settings.py" },{ f:"app/api/tasks.py" }].map(({ f }) => (
              <li key={f}>
                <button className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <Icon name="ChevronRight" size={14} className="text-slate-400"/>
                    <code className="font-mono text-[12.5px] text-slate-800 dark:text-slate-100">{f}</code>
                  </div>
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400">1 finding</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="text-center text-[11px] font-mono text-slate-400 dark:text-slate-500 py-4">
          Audit produced by gpt-4o-mini · prompt audit-v3.2 · 14,820 in / 3,140 out tokens · completed Mon May 12 2026, 14:14
        </div>
      </div>

      <MentorChatFloatingCTA/>
    </AppLayout>
  );
}
window.AuditDetailPage = AuditDetailPage;
// Audits History — list, filter bar, pagination, empty state preview, delete modal

function AuditsHistoryPage() {
  const audits = [
    { project:"todo-api",               source:"github", status:"completed", aiAvailable:true,  date:"May 11, 2026", finished:"finished 12m ago", score:74, grade:"C"  },
    { project:"code-mentor-frontend",   source:"github", status:"completed", aiAvailable:true,  date:"May 7, 2026",  finished:"finished 2d ago",  score:82, grade:"B"  },
    { project:"capstone-notebook-app",  source:"zip",    status:"completed", aiAvailable:false, date:"May 3, 2026",  finished:"finished 6d ago",  score:61, grade:"D"  },
    { project:"trie-fuzzy-search",      source:"github", status:"failed",    aiAvailable:false, date:"Apr 28, 2026", finished:"—",                score:null, grade:null },
    { project:"jwt-refresh-demo",       source:"github", status:"completed", aiAvailable:true,  date:"Apr 22, 2026", finished:"finished 20d ago", score:88, grade:"B+" },
  ];

  return (
    <AppLayout active="audit" title="My Audits">
      <div className="max-w-5xl mx-auto px-1 py-2 space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight inline-flex items-center gap-2">
              <Icon name="Sparkles" size={18} className="text-primary-500"/>
              <span className="brand-gradient-text">My audits</span>
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Past project audits — newest first. Reports are kept forever; uploaded code is deleted after 90 days.</p>
          </div>
          <Button variant="primary" leftIcon="Plus" onClick={()=>window.__faGoto?.("audit-new")}>New audit</Button>
        </div>

        {/* Filter bar */}
        <Card variant="glass">
          <CardBody className="p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 text-[13.5px] font-medium text-slate-800 dark:text-slate-100">
                <Icon name="Filter" size={14}/> Filter
              </div>
              <button className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline inline-flex items-center gap-1"><Icon name="X" size={11}/> Clear all</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l:"From date", t:"date", v:"2026-04-01" },
                { l:"To date",   t:"date", v:"" },
                { l:"Min score", t:"number", v:"60" },
                { l:"Max score", t:"number", v:"" },
              ].map((f,i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">{f.l}</label>
                  <input type={f.t} defaultValue={f.v} min={f.t==="number"?0:undefined} max={f.t==="number"?100:undefined}
                    className="w-full h-9 px-2.5 text-[13px] rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 outline-none ring-brand focus:border-primary-400"/>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* List */}
        <ul className="space-y-3">
          {audits.map((a,i) => (
            <li key={a.project}>
              <Card variant="glass">
                <CardBody className="p-4 flex items-center gap-4">
                  <Icon name={a.source === "github" ? "Github" : "FileArchive"} size={22} className="text-slate-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <button onClick={()=>{ if (a.status==="completed") window.__faGoto?.("audit-detail"); }} className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-50 hover:text-primary-600 dark:hover:text-primary-300 truncate text-left">{a.project}</button>
                    <div className="mt-1 flex flex-wrap items-center text-[11.5px] text-slate-500 dark:text-slate-400 gap-x-2 gap-y-1">
                      <AuditStatusPill status={a.status} aiAvailable={a.aiAvailable}/>
                      <span>·</span>
                      <span>{a.date}</span>
                      {a.finished !== "—" ? <><span>·</span><span>{a.finished}</span></> : null}
                    </div>
                  </div>
                  <div className="shrink-0 hidden sm:block text-right">
                    <div className="text-[22px] font-bold leading-none text-slate-900 dark:text-slate-50 font-mono">{a.score ?? "—"}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{a.grade ? `Grade ${a.grade}` : "no score"}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" rightIcon="ChevronRight" onClick={()=>{ if (a.status==="completed") window.__faGoto?.("audit-detail"); }}>Open</Button>
                    <button className="p-2 rounded-md text-slate-500 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Delete"><Icon name="Trash2" size={14}/></button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>

        {/* Pagination */}
        <div className="flex items-center justify-between text-[13px]">
          <div className="text-slate-500 dark:text-slate-400">Page 1 of 1 · 5 audits</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon="ChevronLeft" disabled>Previous</Button>
            <Button variant="outline" size="sm" rightIcon="ChevronRight" disabled>Next</Button>
          </div>
        </div>

        {/* Empty state preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500 pt-4">↓ Empty state preview ↓</div>
        <Card variant="glass">
          <CardBody className="p-12 text-center space-y-3">
            <Icon name="Sparkles" size={40} className="text-slate-300 dark:text-slate-600 mx-auto"/>
            <div className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">No audits match these filters</div>
            <div className="text-[13px] text-slate-500 dark:text-slate-400">Try widening the date range or adjusting the score bounds.</div>
            <div className="flex justify-center">
              <Button variant="outline" leftIcon="X">Clear filters</Button>
            </div>
          </CardBody>
        </Card>

        {/* Delete modal preview */}
        <div className="text-center text-[11.5px] uppercase tracking-[0.18em] font-mono text-slate-400 dark:text-slate-500 pt-4">↓ Delete confirm modal preview ↓</div>
        <div className="relative max-w-md mx-auto">
          <div className="glass-frosted rounded-2xl p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,.5)] glow-md">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 inline-flex items-center gap-2"><Icon name="Trash2" size={16} className="text-red-500"/>Delete this audit?</h3>
              <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Icon name="X" size={16}/></button>
            </div>
            <p className="text-[13px] text-slate-700 dark:text-slate-300"><strong>code-mentor-frontend</strong> will be hidden from your audit list. The underlying report metadata is kept for analytics; the uploaded code follows the standard 90-day retention.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="outline" size="md">Cancel</Button>
              <Button variant="danger" size="md" leftIcon="Trash2">Delete</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
window.AuditsHistoryPage = AuditsHistoryPage;
// Page switcher + router for Feedback & AI

const FA_PAGES = [
  { key:"submission-form",   label:"Submission Form",   Comp:SubmissionFormPage },
  { key:"submission-detail", label:"Submission Detail", Comp:SubmissionDetailPage },
  { key:"audit-new",         label:"Audit New",         Comp:AuditNewPage },
  { key:"audit-detail",      label:"Audit Detail",      Comp:AuditDetailPage },
  { key:"audits-history",    label:"Audits History",    Comp:AuditsHistoryPage },
];

function FaPageSwitcher({ page, setPage }) {
  const [open, setOpen] = faUseState(true);
  return (
    <div className="fixed top-3 right-3 z-[60]">
      {open ? (
        <div className="glass-frosted rounded-full p-1 flex items-center gap-1 shadow-[0_18px_50px_-18px_rgba(15,23,42,.6)]">
          {FA_PAGES.map(p => (
            <button key={p.key} onClick={()=>setPage(p.key)} className={[
              "px-3 h-8 rounded-full text-[11.5px] font-medium transition-colors ring-brand whitespace-nowrap",
              p.key === page ? "bg-primary-500 text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,.7)]" : "text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10",
            ].join(" ")}>{p.label}</button>
          ))}
          <button onClick={()=>setOpen(false)} className="ml-1 h-8 w-8 rounded-full text-slate-500 hover:bg-white/40 dark:hover:bg-white/10 inline-flex items-center justify-center" aria-label="Hide"><Icon name="ChevronUp" size={14}/></button>
        </div>
      ) : (
        <button onClick={()=>setOpen(true)} className="glass-frosted rounded-full px-3 h-9 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200"><Icon name="LayoutGrid" size={13}/> Pages</button>
      )}
    </div>
  );
}

function FaApp() {
  const [page, setPage] = faUseState("submission-detail");
  faUseEffect(() => { window.__faGoto = setPage; }, []);
  const Comp = (FA_PAGES.find(p => p.key === page) || FA_PAGES[0]).Comp;
  return (
    <>
      <FaPageSwitcher page={page} setPage={setPage}/>
      <Comp/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FaApp/>);
