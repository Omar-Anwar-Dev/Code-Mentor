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
/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 1 — Profile (mirror ProfilePage.tsx)
   max-w-5xl · Hero card (avatar + name + meta + View CV) + Level/XP
   strip · 4 stat tiles · 2-col grid (Edit form lg:col-span-2 + Recent
   badges aside)
   ───────────────────────────────────────────────────────────────── */

function ProfilePage_Pc({ onGotoLearningCv, onGotoProfileEdit }) {
  const { PC_LAYLA, PC_STATS, PC_BADGES, StatTilePc, EarnedBadgeRow, CvHeroAvatar } = window.PcShared;
  const xpProgress = Math.round(((PC_LAYLA.xp - PC_LAYLA.xpForLevel) / (PC_LAYLA.xpForNext - PC_LAYLA.xpForLevel)) * 100);
  const earned = PC_BADGES.filter(b => b.earned);
  const recentEarned = earned.slice(0, 5);

  return (
    <AppLayout active="" title="Profile">
      <div className="max-w-5xl mx-auto animate-fade-in">

        {/* ─── Hero ─── */}
        <Card variant="glass" className="mb-6 relative overflow-hidden">
          <CardBody className="p-6 md:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary-500/30 to-fuchsia-500/30 blur-3xl pointer-events-none" aria-hidden="true"/>
            <div className="relative flex flex-col md:flex-row gap-6 items-start">
              <CvHeroAvatar size={80} name={PC_LAYLA.name}/>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {PC_LAYLA.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.18em]
                    bg-gradient-to-r from-primary-500 to-fuchsia-500 text-white">
                    <Icon name="Star" size={11}/> Learner
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Mail" size={14}/> {PC_LAYLA.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Calendar" size={14}/> Joined {PC_LAYLA.joined}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Github" size={14}/> @{PC_LAYLA.gitHub}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 self-stretch md:self-start">
                <Button variant="outline" size="md" rightIcon="ArrowRight" onClick={onGotoLearningCv}>
                  View Learning CV
                </Button>
                <Button variant="ghost" size="md" leftIcon="Pencil" onClick={onGotoProfileEdit}>
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Level + XP progress strip */}
            <div className="relative mt-6 p-4 rounded-xl border border-primary-200/60 dark:border-primary-900/40
              bg-gradient-to-br from-primary-50/80 via-purple-50/60 to-fuchsia-50/60
              dark:from-primary-900/15 dark:via-purple-900/15 dark:to-fuchsia-900/15">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Icon name="Trophy" size={18} className="text-amber-500"/>
                  <span className="font-semibold text-slate-900 dark:text-slate-50">Level {PC_LAYLA.level}</span>
                  <span className="text-[13px] text-slate-600 dark:text-slate-300">
                    · {PC_LAYLA.xp.toLocaleString()} XP total
                  </span>
                </div>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-mono">
                  {(PC_LAYLA.xpForNext - PC_LAYLA.xp).toLocaleString()} XP to L{PC_LAYLA.level + 1}
                </span>
              </div>
              <ProgressBar value={xpProgress}/>
            </div>
          </CardBody>
        </Card>

        {/* ─── 4 stat tiles ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTilePc icon="Code"        tone="primary" value={PC_STATS.recentSubmissions}                          label="Recent submissions"/>
          <StatTilePc icon="CheckCircle" tone="success" value={PC_STATS.completedRecent}                            label="Completed"/>
          <StatTilePc icon="Star"        tone="warning" value={PC_STATS.avgRecentScore}                             label="Avg AI score"/>
          <StatTilePc icon="Trophy"      tone="purple"  value={`${PC_STATS.badgesEarned}/${PC_STATS.badgesTotal}`}  label="Badges earned"/>
        </div>

        {/* ─── 2-col: Editable profile + Recent badges ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfileEditFormCard layla={PC_LAYLA}/>
          </div>

          <Card variant="glass">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-50">Recent badges</h2>
                <a href="#" onClick={e=>e.preventDefault()} className="text-[11.5px] text-primary-600 dark:text-primary-300 hover:underline">View all</a>
              </div>
              {recentEarned.length === 0 ? (
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
                  No badges yet. Submit code or finish a path task to earn your first badge.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentEarned.map(b => <EarnedBadgeRow key={b.key} badge={b}/>)}
                </ul>
              )}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 text-[11.5px] text-slate-500 dark:text-slate-400">
                {earned.length} of {PC_BADGES.length} unlocked
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

/* ─────────── Inline edit form card (lives inside Profile) ─────────── */

function ProfileEditFormCard({ layla }) {
  return (
    <Card variant="glass">
      <CardBody className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">Edit profile</h3>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Update your name, GitHub handle, or profile picture. Email is fixed.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name"><TextInput defaultValue={layla.name}/></Field>
          <Field label="Email" helper="Email cannot be changed."><TextInput defaultValue={layla.email} disabled/></Field>
          <Field label="GitHub username"><TextInput defaultValue={layla.gitHub} prefix="Github"/></Field>
          <Field label="Profile picture URL"><TextInput placeholder="https://..."/></Field>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="primary" size="md" leftIcon="Save">Save changes</Button>
        </div>
      </CardBody>
    </Card>
  );
}

window.ProfilePage_Pc = ProfilePage_Pc;
/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 2 — Profile Edit (mirror ProfileEditSection.tsx as
   a standalone focused form page). max-w-2xl, single card, 4 fields
   (full name / email-disabled / GitHub / picture URL) + Save action.
   Includes validation-state demos (error + helper) inline so the
   reviewer sees all states without typing.
   ───────────────────────────────────────────────────────────────── */

function ProfileEditPage_Pc({ onBackToProfile }) {
  const { PC_LAYLA, CvHeroAvatar } = window.PcShared;

  return (
    <AppLayout active="" title="Edit Profile">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">

        {/* Back link */}
        <a href="#" onClick={e=>{e.preventDefault(); onBackToProfile?.();}}
          className="inline-flex items-center gap-1 text-[12.5px] text-primary-600 dark:text-primary-300 hover:underline">
          <Icon name="ArrowLeft" size={14}/> Back to Profile
        </a>

        {/* Page header */}
        <div>
          <h1 className="text-[26px] font-bold tracking-tight brand-gradient-text">Edit your profile</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            These changes hit <code className="font-mono text-[11.5px] text-cyan-700 dark:text-cyan-300">PATCH /api/auth/me</code> — your email is bound to your account and can&apos;t be changed here.
          </p>
        </div>

        {/* Form card */}
        <Card variant="glass">
          <CardBody className="p-6 space-y-5">

            {/* Avatar preview + replace */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <CvHeroAvatar size={64} name={PC_LAYLA.name}/>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Profile picture</div>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">PNG, JPG, or WebP. Recommended ≥256×256.</p>
              </div>
              <Button variant="outline" size="sm" leftIcon="Upload">Replace</Button>
            </div>

            {/* Fields */}
            <Field label="Full name" helper="Shown across the app and on your public CV.">
              <TextInput defaultValue={PC_LAYLA.name}/>
            </Field>

            <Field label="Email" helper="Email cannot be changed. Contact support if you need to migrate accounts.">
              <TextInput defaultValue={PC_LAYLA.email} disabled/>
            </Field>

            <Field label="GitHub username" helper="Used to verify repository submissions.">
              <TextInput defaultValue={PC_LAYLA.gitHub} prefix="Github"/>
            </Field>

            {/* Validation error demo */}
            <Field label="Profile picture URL" error="Must be a full https:// URL.">
              <TextInput defaultValue="layla-avatar.png" placeholder="https://..." error/>
            </Field>

            {/* Char counter demo */}
            <Field label="Short bio (optional)" helper="160 character limit. Shown on your public CV header.">
              <Textarea
                rows={3}
                defaultValue="Final-year CS student at Benha, currently focused on the Full Stack track. Open to backend internships in Cairo or remote-friendly EU teams."
                maxLength={160}
              />
            </Field>

            {/* Action row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">Last saved 2m ago</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="md">Discard</Button>
                <Button variant="primary" size="md" leftIcon="Save">Save changes</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Danger zone */}
        <Card variant="glass" className="border-red-200/60 dark:border-red-900/40">
          <CardBody className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="AlertTriangle" size={16} className="text-red-500"/>
              <h3 className="text-[14.5px] font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
            </div>
            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mb-3">
              Deleting your account also deletes your submissions, audits, and learning CV. This is permanent and cannot be undone.
            </p>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" leftIcon="Trash2" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                Delete account…
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}

window.ProfileEditPage_Pc = ProfileEditPage_Pc;
/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 3 — Learning CV (mirror LearningCVPage.tsx)
   max-w-6xl · Hero (avatar + name + meta + Public toggle + Download
   PDF) + Public URL row (when isPublic) + 4 stat tiles + 2-col
   Knowledge Profile (radar) / Code-Quality Profile (bars) +
   Verified Projects grid.
   ───────────────────────────────────────────────────────────────── */

function LearningCvPage_Pc({ onGotoPublicCv }) {
  const {
    PC_LAYLA, PC_STATS, PC_SKILL_PROFILE, PC_CODE_QUALITY, PC_VERIFIED,
    PcRadarChart, StatTilePc, CvProgressRow, VerifiedProjectCard, CvHeroAvatar, PcEmptyMsg,
  } = window.PcShared;
  const publicUrl = `https://codementor.benha.app/cv/${PC_LAYLA.publicSlug}`;
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => { setCopied(true); setTimeout(()=>setCopied(false), 1500); };

  return (
    <AppLayout active="" title="Learning CV">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-6 animate-fade-in">

        {/* ─── Hero ─── */}
        <Card variant="glass">
          <CardBody className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <CvHeroAvatar size={96} name={PC_LAYLA.name}/>

              <div className="flex-1 min-w-0">
                <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-50">{PC_LAYLA.name}</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Joined {PC_LAYLA.joined}
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <Badge tone="primary">{PC_SKILL_PROFILE.overallLevel}</Badge>
                </p>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Mail" size={13}/> {PC_LAYLA.email}
                  </span>
                  <a href="#" onClick={e=>e.preventDefault()}
                    className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-300 hover:underline">
                    <Icon name="Github" size={13}/> @{PC_LAYLA.gitHub}
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="MapPin" size={13}/> Benha, Egypt
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                <Button variant={PC_LAYLA.isPublic ? "outline" : "primary"} size="md"
                  leftIcon={PC_LAYLA.isPublic ? "Unlock" : "Lock"}>
                  {PC_LAYLA.isPublic ? "Public" : "Make Public"}
                </Button>
                <Button variant="ghost" size="md" leftIcon="Download">
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Public URL row */}
            {PC_LAYLA.isPublic && (
              <div className="mt-5 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/40
                bg-gradient-to-r from-cyan-50/80 to-primary-50/60
                dark:from-cyan-900/15 dark:to-primary-900/15
                flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 ring-1 ring-cyan-400/40
                  flex items-center justify-center text-cyan-600 dark:text-cyan-300 shrink-0">
                  <Icon name="Share2" size={15}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-cyan-700 dark:text-cyan-300">Public URL</p>
                  <a href="#" onClick={e=>{e.preventDefault(); onGotoPublicCv?.();}}
                    className="text-[13px] font-mono text-cyan-900 dark:text-cyan-100 break-all hover:underline">
                    {publicUrl}
                  </a>
                  <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/70 mt-1">
                    Viewed {PC_LAYLA.viewCount} times
                  </p>
                </div>
                <Button variant="ghost" size="sm" leftIcon={copied ? "Check" : "Copy"} onClick={handleCopy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ─── 4 stat tiles ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTilePc icon="Code"        tone="cyan"    value={PC_STATS.submissionsTotal}  label="Submissions"/>
          <StatTilePc icon="Trophy"      tone="warning" value={PC_STATS.assessmentsTotal}  label="Assessments"/>
          <StatTilePc icon="BookOpen"    tone="success" value={PC_STATS.pathsActive}       label="Active paths"/>
          <StatTilePc icon="CheckCircle" tone="purple"  value={PC_VERIFIED.length}         label="Verified projects"/>
        </div>

        {/* ─── 2-col: Knowledge profile (radar) / Code-quality profile (bars) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Card variant="glass">
            <CardBody className="p-6">
              <header className="mb-3">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Icon name="Brain" size={16} className="text-primary-500"/> Knowledge Profile
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Assessment-driven scores across CS domains.</p>
              </header>
              <div className="flex items-center justify-center py-2">
                <PcRadarChart
                  axes={PC_SKILL_PROFILE.scores.map(s=>s.category)}
                  values={PC_SKILL_PROFILE.scores.map(s=>s.score)}
                  size={300}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {PC_SKILL_PROFILE.scores.map(s => (
                  <div key={s.category} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                    <div className="text-[14.5px] font-bold text-slate-900 dark:text-slate-50">{s.score}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{s.category}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <header className="mb-4">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Icon name="Sparkles" size={16} className="text-cyan-500"/> Code-Quality Profile
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Running averages from AI-reviewed submissions.</p>
              </header>
              {PC_CODE_QUALITY.length === 0 ? (
                <PcEmptyMsg text="Submit a project to start building your code-quality profile."/>
              ) : (
                <ul className="space-y-3.5">
                  {PC_CODE_QUALITY.map(s => (
                    <CvProgressRow key={s.category} category={s.category} score={s.score} samples={s.samples}/>
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10
                text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Average across all dimensions</span>
                <span className="font-bold text-slate-900 dark:text-slate-50">
                  {Math.round(PC_CODE_QUALITY.reduce((a,c)=>a+c.score,0) / PC_CODE_QUALITY.length)}
                </span>
              </div>
            </CardBody>
          </Card>

        </div>

        {/* ─── Verified projects ─── */}
        <Card variant="glass">
          <CardBody className="p-6">
            <header className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Icon name="ShieldCheck" size={16} className="text-emerald-500"/> Verified Projects
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Top {PC_VERIFIED.length} highest-scoring AI-reviewed submissions on your Learning CV.
                </p>
              </div>
              <Badge tone="success">{PC_VERIFIED.length} verified</Badge>
            </header>
            {PC_VERIFIED.length === 0 ? (
              <PcEmptyMsg icon="Code" text="No verified projects yet — complete a submission with an AI review to show one here."/>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PC_VERIFIED.map(p => <VerifiedProjectCard key={p.id} project={p}/>)}
              </ul>
            )}
          </CardBody>
        </Card>

      </div>
    </AppLayout>
  );
}

window.LearningCvPage_Pc = LearningCvPage_Pc;
/* ─────────────────────────────────────────────────────────────────
   Pillar 6 / Page 4 — Public CV (mirror PublicCVPage.tsx)
   max-w-5xl, **NO AppLayout** — this is the anonymous share-link
   surface at /cv/:slug. No sidebar, no app chrome. Minimal Code
   Mentor brand bar at top. No email (server-side redaction).
   Includes the "Want a Learning CV like this?" CTA back to register.
   ───────────────────────────────────────────────────────────────── */

function PublicCvPage_Pc({ dark, setDark }) {
  const {
    PC_LAYLA, PC_STATS, PC_SKILL_PROFILE, PC_CODE_QUALITY, PC_VERIFIED,
    PcRadarChart, StatTilePc, CvProgressRow, CvHeroAvatar, PcEmptyMsg,
  } = window.PcShared;

  return (
    <div className="min-h-screen bg-grid">
      {/* Minimal public brand bar (replaces AppLayout) */}
      <header className="sticky top-0 z-30 glass border-b border-white/30 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BrandLogo size="sm"/>
          <div className="flex items-center gap-2">
            <Badge tone="primary"><Icon name="Eye" size={11} className="mr-1"/> Public view</Badge>
            <ThemeToggle dark={dark} setDark={setDark}/>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">

        {/* Hero (no email, no public-toggle, no PDF download) */}
        <Card variant="glass">
          <CardBody className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <CvHeroAvatar size={96} name={PC_LAYLA.name}/>
              <div className="flex-1 min-w-0">
                <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight brand-gradient-text">{PC_LAYLA.name}</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Joined {PC_LAYLA.joined}
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <Badge tone="primary">{PC_SKILL_PROFILE.overallLevel}</Badge>
                  <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="GraduationCap" size={13}/> Benha University · Faculty of Computers and AI
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-600 dark:text-slate-300">
                  <a href="#" onClick={e=>e.preventDefault()}
                    className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-300 hover:underline">
                    <Icon name="Github" size={13}/> @{PC_LAYLA.gitHub}
                  </a>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="MapPin" size={13}/> Benha, Egypt
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="Code" size={13}/> Full Stack track
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
                <Button variant="outline" size="md" leftIcon="Share2">
                  Share
                </Button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">/cv/{PC_LAYLA.publicSlug}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Stat tiles (no email-context tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTilePc icon="Code"        tone="cyan"    value={PC_STATS.submissionsTotal}  label="Submissions"/>
          <StatTilePc icon="Trophy"      tone="warning" value={PC_STATS.assessmentsTotal}  label="Assessments"/>
          <StatTilePc icon="BookOpen"    tone="success" value={PC_STATS.pathsActive}       label="Active paths"/>
          <StatTilePc icon="CheckCircle" tone="purple"  value={PC_VERIFIED.length}         label="Verified projects"/>
        </div>

        {/* Two skill axes — knowledge radar + code-quality bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Card variant="glass">
            <CardBody className="p-6">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
                <Icon name="Brain" size={16} className="text-primary-500"/> Knowledge Profile
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">CS-domain assessment scores.</p>
              <div className="flex items-center justify-center">
                <PcRadarChart
                  axes={PC_SKILL_PROFILE.scores.map(s=>s.category)}
                  values={PC_SKILL_PROFILE.scores.map(s=>s.score)}
                  size={280}
                />
              </div>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
                <Icon name="Sparkles" size={16} className="text-cyan-500"/> Code-Quality Profile
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">AI-reviewed submission averages.</p>
              {PC_CODE_QUALITY.length === 0 ? (
                <PcEmptyMsg text="No code-quality data yet."/>
              ) : (
                <ul className="space-y-3.5">
                  {PC_CODE_QUALITY.map(s => (
                    <CvProgressRow key={s.category} category={s.category} score={s.score} samples={s.samples}/>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Verified projects (no "View feedback" link in public view) */}
        <Card variant="glass">
          <CardBody className="p-6">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-1">
              <Icon name="ShieldCheck" size={16} className="text-emerald-500"/> Verified Projects
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
              Top {PC_VERIFIED.length} highest-scoring submissions.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PC_VERIFIED.map(p => (
                <li key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50 truncate">{p.title}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="neutral">{p.track}</Badge>
                        <Badge tone="neutral">{p.language}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        {new Date(p.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none">{p.score}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">/ 100</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* "Create your own" CTA */}
        <Card variant="glass" className="border-primary-200/60 dark:border-primary-900/40">
          <CardBody className="p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl brand-gradient-bg text-white flex items-center justify-center mb-3 shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
              <Icon name="Sparkles" size={20}/>
            </div>
            <h3 className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-1">Want a Learning CV like this?</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
              Get verified, AI-reviewed feedback on your projects. Build a portfolio that proves what you can do — not just what you claim.
            </p>
            <Button variant="primary" size="md" rightIcon="ArrowRight">Create your own</Button>
          </CardBody>
        </Card>

        {/* Footer (public-flavour) */}
        <footer className="text-center text-[11px] text-slate-500 dark:text-slate-400 py-6">
          <p>
            <span className="font-mono">codementor.benha.app</span>
            <span className="mx-2">·</span>
            Code Mentor — Benha University, Faculty of Computers and AI · Class of 2026
          </p>
          <p className="mt-1">
            <a href="#" onClick={e=>e.preventDefault()} className="hover:underline">Privacy</a>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <a href="#" onClick={e=>e.preventDefault()} className="hover:underline">Terms</a>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <a href="#" onClick={e=>e.preventDefault()} className="hover:underline">Report this CV</a>
          </p>
        </footer>

      </main>
    </div>
  );
}

window.PublicCvPage_Pc = PublicCvPage_Pc;
/* ─────────────────────────────────────────────────────────────────
   Pillar 6 — App entry: PAGES list + PageSwitcher pill + render
   ───────────────────────────────────────────────────────────────── */

function PcApp() {
  const { PcPageSwitcherPill } = window.PcShared;
  const [page, setPage] = React.useState("profile");
  const [dark, setDark] = useTheme();

  const pages = [
    { key: "profile",      render: () => <ProfilePage_Pc      onGotoLearningCv={() => setPage("learning-cv")} onGotoProfileEdit={() => setPage("profile-edit")}/> },
    { key: "profile-edit", render: () => <ProfileEditPage_Pc  onBackToProfile={() => setPage("profile")}/> },
    { key: "learning-cv",  render: () => <LearningCvPage_Pc   onGotoPublicCv={() => setPage("public-cv")}/> },
    { key: "public-cv",    render: () => <PublicCvPage_Pc     dark={dark} setDark={setDark}/> },
  ];

  const current = pages.find(p => p.key === page) || pages[0];

  return (
    <>
      {current.render()}
      <PcPageSwitcherPill active={page} setActive={setPage}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PcApp/>);
