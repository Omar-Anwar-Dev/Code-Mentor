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
/* Pillar 7 / Page 1 — Analytics (mirror AnalyticsPage.tsx) */

function AnalyticsPage_Se() {
  const { SE_WEEKLY_TREND, SE_WEEKLY_SUBS, SE_KNOWLEDGE, SeLineTrendChart, SeStackedBars, LegendChip } = window.SeShared;
  const totalSubs = SE_WEEKLY_SUBS.reduce((a,r) => a + r.completed + r.failed + r.processing + r.pending, 0);
  const totalScoredRuns = SE_WEEKLY_TREND.reduce((a,r) => a + r.samples, 0);

  return (
    <AppLayout active="analytics" title="Analytics">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <header>
          <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 brand-gradient-text">
            <Icon name="TrendingUp" size={26} className="text-primary-500"/> Your analytics
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            12-week view of your code-quality trend, submission cadence, and assessment-driven knowledge profile.
          </p>
        </header>

        {/* Stats strip — 3 tiles */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/15 flex items-center justify-center">
                  <Icon name="Activity" size={18} className="text-primary-600 dark:text-primary-300"/>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Submissions (12w)</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-0.5">{totalSubs}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card variant="glass">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <Icon name="TrendingUp" size={18} className="text-emerald-600 dark:text-emerald-300"/>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">AI-scored runs</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-0.5">{totalScoredRuns}</p>
                </div>
              </div>
            </CardBody>
          </Card>
          <Card variant="glass">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/15 flex items-center justify-center">
                  <Icon name="Sparkles" size={18} className="text-fuchsia-600 dark:text-fuchsia-300"/>
                </div>
                <div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Knowledge categories</p>
                  <p className="text-[24px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-0.5">{SE_KNOWLEDGE.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* Code-quality trend */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">Code-quality trend</h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Per-category averages from each week&apos;s AI-reviewed submissions. Empty weeks are skipped.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <LegendChip color="#8b5cf6" label="Correctness"/>
                <LegendChip color="#10b981" label="Readability"/>
                <LegendChip color="#ef4444" label="Security"/>
                <LegendChip color="#f59e0b" label="Performance"/>
                <LegendChip color="#06b6d4" label="Design"/>
              </div>
            </div>
            <SeLineTrendChart rows={SE_WEEKLY_TREND} height={300}/>
          </CardBody>
        </Card>

        {/* Submissions per week */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">Submissions per week</h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">Stacked count by status.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <LegendChip color="#10b981" label="Completed"/>
                <LegendChip color="#ef4444" label="Failed"/>
                <LegendChip color="#f59e0b" label="Processing"/>
                <LegendChip color="#94a3b8" label="Pending"/>
              </div>
            </div>
            <SeStackedBars rows={SE_WEEKLY_SUBS} height={260}/>
          </CardBody>
        </Card>

        {/* Knowledge profile snapshot */}
        <Card variant="glass">
          <CardBody className="p-6">
            <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50">Knowledge profile</h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Snapshot from your latest assessment — distinct from the code-quality trend above.
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {SE_KNOWLEDGE.map(k => (
                <li key={k.category} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/40 dark:bg-slate-900/30">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{k.category}</p>
                  <p className="text-[26px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1">{k.score}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{k.level}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

      </div>
    </AppLayout>
  );
}

window.AnalyticsPage_Se = AnalyticsPage_Se;
/* Pillar 7 / Page 2 — Achievements (mirror AchievementsPage.tsx) */

function AchievementsPage_Se() {
  const { SE_LAYLA, SE_BADGES, SeBadgeCard } = window.SeShared;
  const earned = SE_BADGES.filter(b => b.earned);
  const locked = SE_BADGES.filter(b => !b.earned);
  const xpInLevel = SE_LAYLA.xp - SE_LAYLA.xpForLevel;
  const span = SE_LAYLA.xpForNext - SE_LAYLA.xpForLevel;
  const pct = Math.round((xpInLevel / span) * 100);
  const xpToNext = SE_LAYLA.xpForNext - SE_LAYLA.xp;

  return (
    <AppLayout active="achievements" title="Achievements">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <header>
          <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 brand-gradient-text">
            <Icon name="Trophy" size={26} className="text-amber-500"/> Achievements
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            Earn XP for assessments and submissions; unlock badges as you build your craft.
          </p>
        </header>

        {/* Progress card — XP / Level / Badges */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Total XP</p>
                <p className="text-[34px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1">{SE_LAYLA.xp.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Level</p>
                <p className="text-[34px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1 flex items-center gap-2">
                  <Icon name="Sparkles" size={20} className="text-primary-500"/>
                  {SE_LAYLA.level}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Badges</p>
                <p className="text-[34px] font-bold text-slate-900 dark:text-slate-50 leading-none mt-1">
                  {earned.length}
                  <span className="text-[18px] text-slate-500 dark:text-slate-400">/{SE_BADGES.length}</span>
                </p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11.5px] text-slate-500 dark:text-slate-400 mb-1">
                <span className="font-mono">L{SE_LAYLA.level}</span>
                <span className="font-mono">{xpToNext.toLocaleString()} XP to L{SE_LAYLA.level + 1}</span>
              </div>
              <ProgressBar value={pct}/>
            </div>
          </CardBody>
        </Card>

        {/* Earned section */}
        <section>
          <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
            <Icon name="CheckCircle" size={18} className="text-emerald-500"/>
            Earned <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">({earned.length})</span>
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {earned.map(b => <li key={b.key}><SeBadgeCard badge={b}/></li>)}
          </ul>
        </section>

        {/* Locked section */}
        <section>
          <h2 className="text-[18px] font-semibold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
            <Icon name="Lock" size={18} className="text-slate-400"/>
            Locked <span className="text-[14px] font-medium text-slate-500 dark:text-slate-400">({locked.length})</span>
          </h2>
          {locked.length === 0 ? (
            <Card variant="glass">
              <CardBody className="p-6 text-center text-slate-500 dark:text-slate-400">
                You&apos;ve earned all available badges!
              </CardBody>
            </Card>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locked.map(b => <li key={b.key}><SeBadgeCard badge={b}/></li>)}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

window.AchievementsPage_Se = AchievementsPage_Se;
/* Pillar 7 / Page 3 — Activity (mirror ActivityPage.tsx) */

function ActivityPage_Se() {
  const { SE_ACTIVITY, ActivityRow } = window.SeShared;

  return (
    <AppLayout active="" title="Activity">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold tracking-tight brand-gradient-text">Activity</h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            Recent XP earned and submissions across your account.
          </p>
        </div>

        {/* Day separator example: "Today" */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">Today · May 12</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-white/10"/>
        </div>

        <ul className="space-y-3 mb-6">
          {SE_ACTIVITY.slice(0, 4).map((it,i) => <li key={i}><ActivityRow item={it}/></li>)}
        </ul>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">Earlier this week</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-white/10"/>
        </div>

        <ul className="space-y-3 mb-6">
          {SE_ACTIVITY.slice(4, 7).map((it,i) => <li key={i+4}><ActivityRow item={it}/></li>)}
        </ul>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-slate-400">Last week</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-white/10"/>
        </div>

        <ul className="space-y-3 mb-8">
          {SE_ACTIVITY.slice(7).map((it,i) => <li key={i+7}><ActivityRow item={it}/></li>)}
        </ul>

        {/* Load more affordance */}
        <div className="text-center">
          <Button variant="outline" size="md" leftIcon="RotateCcw">Load earlier activity</Button>
        </div>
      </div>
    </AppLayout>
  );
}

window.ActivityPage_Se = ActivityPage_Se;
/* Pillar 7 / Page 4 — Settings (mirror SettingsPage.tsx)
   Back link + Honest scope banner + 2-col grid (Profile slim form +
   Appearance + Account) */

function SettingsPage_Se({ dark, setDark }) {
  const { SE_LAYLA } = window.SeShared;
  const [compact, setCompact] = React.useState(false);

  return (
    <AppLayout active="" title="Settings">
      <div className="max-w-4xl mx-auto animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="#" onClick={e=>e.preventDefault()}
            className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
            aria-label="Back to dashboard">
            <Icon name="ArrowLeft" size={16} className="text-slate-600 dark:text-slate-300"/>
          </a>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight brand-gradient-text">Settings</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Account, appearance, and session controls.</p>
          </div>
        </div>

        {/* Honest scope banner */}
        <Card variant="glass" className="mb-6 border-cyan-200/60 dark:border-cyan-900/40">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <Icon name="Info" size={18} className="text-cyan-500 dark:text-cyan-300 shrink-0 mt-0.5"/>
              <div className="text-[13px] text-slate-700 dark:text-slate-200">
                <p className="font-semibold text-cyan-700 dark:text-cyan-200 mb-1">What&apos;s wired today</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Profile fields and appearance preferences below persist for real. Notification preferences,
                  privacy toggles, connected-accounts, and data export/delete need a future
                  &nbsp;<code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-cyan-100/60 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">UserSettings</code>
                  &nbsp;backend — not in MVP. CV privacy is on the&nbsp;
                  <a href="#" onClick={e=>e.preventDefault()} className="underline font-medium hover:text-primary-600 dark:hover:text-primary-300">Learning CV</a>
                  &nbsp;page.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Profile slim form — full width */}
          <div className="lg:col-span-2">
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-3">Profile</h2>
            <Card variant="glass">
              <CardBody className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full name"><TextInput defaultValue={SE_LAYLA.name}/></Field>
                  <Field label="Email" helper="Email cannot be changed."><TextInput defaultValue={SE_LAYLA.email} disabled/></Field>
                  <Field label="GitHub username"><TextInput defaultValue="layla-ahmed" prefix="Github"/></Field>
                  <Field label="Profile picture URL"><TextInput placeholder="https://..."/></Field>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" size="md" leftIcon="Save">Save changes</Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Appearance */}
          <Card variant="glass">
            <CardBody className="p-5">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Appearance</h2>
              <div className="mb-5">
                <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200 mb-2">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id:"light", label:"Light",  icon:"Sun"     },
                    { id:"dark",  label:"Dark",   icon:"Moon"    },
                    { id:"system",label:"System", icon:"Monitor" },
                  ].map(t => {
                    const isCurrent = (t.id === "light" && !dark) || (t.id === "dark" && dark);
                    const isDisabled = t.id === "system";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { if (!isDisabled) setDark(t.id === "dark"); }}
                        aria-pressed={isCurrent}
                        className={[
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors",
                          isDisabled ? "border-dashed border-slate-200 dark:border-white/10 opacity-55 cursor-not-allowed" :
                          isCurrent
                            ? "border-primary-500 bg-primary-50/80 dark:bg-primary-500/15"
                            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                        ].join(" ")}
                      >
                        <Icon name={t.icon} size={18} className={isCurrent ? "text-primary-600 dark:text-primary-300" : "text-slate-500 dark:text-slate-400"}/>
                        <span className={"text-[11.5px] font-medium " + (isCurrent ? "text-primary-700 dark:text-primary-200" : "text-slate-600 dark:text-slate-300")}>
                          {t.label}
                        </span>
                        {isDisabled && <span className="text-[9px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Soon</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50">Compact mode</p>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">Tighter spacing across the app.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCompact(c => !c)}
                  aria-pressed={compact}
                  aria-label="Toggle compact mode"
                  className={"relative w-11 h-6 rounded-full transition-colors shrink-0 " + (compact ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600")}
                >
                  <span className={"absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform " + (compact ? "translate-x-5" : "translate-x-0")}/>
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Account */}
          <Card variant="glass">
            <CardBody className="p-5">
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Account</h2>
              <div className="space-y-2 mb-5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Email</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50 truncate font-mono text-[12.5px]">{SE_LAYLA.email}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Role</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{SE_LAYLA.role}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Joined</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{SE_LAYLA.joined}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Authentication</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50 inline-flex items-center gap-1.5">
                    <Icon name="Github" size={12}/> GitHub OAuth
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="md" rightIcon="ExternalLink" className="w-full justify-between">
                  Manage Learning CV
                </Button>
                <Button variant="outline" size="md" rightIcon="LogOut" className="w-full justify-between">
                  Sign out
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

window.SettingsPage_Se = SettingsPage_Se;
/* Pillar 7 — App entry */

function SeApp() {
  const { SePageSwitcherPill } = window.SeShared;
  const [page, setPage] = React.useState("analytics");
  const [dark, setDark] = useTheme();

  const pages = {
    "analytics":    () => <AnalyticsPage_Se/>,
    "achievements": () => <AchievementsPage_Se/>,
    "activity":     () => <ActivityPage_Se/>,
    "settings":     () => <SettingsPage_Se dark={dark} setDark={setDark}/>,
  };

  return (
    <>
      {(pages[page] || pages.analytics)()}
      <SePageSwitcherPill active={page} setActive={setPage}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SeApp/>);
