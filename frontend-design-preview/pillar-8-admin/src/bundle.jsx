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
/* Pillar 8 / Page 1 — Admin Dashboard (mirror AdminDashboard.tsx) */

function AdminDashboard_Ad() {
  const {
    AD_STATS, AD_USER_GROWTH, AD_TRACKS, AD_WEEK_SUBS, AD_RECENT_SUBS,
    AdDemoBanner, AdLineMini, AdBarMini, AdPieMini, AdStatCard,
  } = window.AdShared;
  const statusTone = (s) => s === "Completed" ? "success" : s === "Processing" ? "processing" : s === "Failed" ? "failed" : "neutral";

  return (
    <AppLayout active="" title="Admin · Overview">
      <div className="space-y-6 animate-fade-in">

        {/* Page header */}
        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Icon name="ShieldCheck" size={22} className="text-fuchsia-500"/> Admin Dashboard
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">Platform overview and analytics.</p>
        </header>

        <AdDemoBanner/>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdStatCard icon="Users"      tone="primary" value={AD_STATS.totalUsers.toLocaleString()} label="Total users"   trend={`+${AD_STATS.newUsersThisWeek}`}/>
          <AdStatCard icon="Activity"   tone="success" value={AD_STATS.activeUsers.toLocaleString()} label="Active today"/>
          <AdStatCard icon="FileCode"   tone="warning" value={AD_STATS.totalSubmissions.toLocaleString()} label="Submissions" trend={`+${AD_STATS.submissionsThisWeek}`}/>
          <AdStatCard icon="TrendingUp" tone="cyan"    value={`${AD_STATS.averageScore}%`}           label="Avg AI score"/>
        </div>

        {/* User Growth + Track Distribution row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <Card variant="glass" className="lg:col-span-2">
            <CardBody className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">User Growth</h3>
                <Badge tone="success" icon="TrendingUp">+{AD_STATS.newUsersThisWeek} this week</Badge>
              </div>
              <AdLineMini rows={AD_USER_GROWTH} valueKey="users" color="#8b5cf6" height={260}/>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Track Distribution</h3>
              <div className="flex items-center justify-center mb-3">
                <AdPieMini slices={AD_TRACKS} size={210}/>
              </div>
              <ul className="space-y-1.5">
                {AD_TRACKS.map(t => (
                  <li key={t.name} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }}/>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{t.name}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">{t.value}%</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

        </div>

        {/* Weekly Submissions + Recent Submissions row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <Card variant="glass" className="lg:col-span-2">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-4">Weekly Submissions</h3>
              <AdBarMini rows={AD_WEEK_SUBS} valueKey="submissions" color="#06b6d4" height={240}/>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-0">
              <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-white/10">
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">Recent Submissions</h3>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {AD_RECENT_SUBS.map(s => (
                  <li key={s.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Icon name={s.status === "Completed" ? "CheckCircle" : s.status === "Failed" ? "AlertCircle" : "Clock"}
                        size={14}
                        className={
                          s.status === "Completed" ? "text-emerald-500" :
                          s.status === "Failed"    ? "text-red-500" :
                                                     "text-amber-500"
                        }/>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-slate-900 dark:text-slate-50 truncate">{s.user}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{s.task}</p>
                    </div>
                    {s.score !== null
                      ? <Badge tone="success">{s.score}%</Badge>
                      : <Badge tone={statusTone(s.status)}>{s.status}</Badge>}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}

window.AdminDashboard_Ad = AdminDashboard_Ad;
/* Pillar 8 / Page 2 — User Management (mirror UserManagement.tsx)
   Header + count · Search card · Table (Email/Name/Roles/Status/
   LastSeen/Submissions/Actions) · Empty state · Pagination */

function UsersPage_Ad() {
  const { AD_USERS, AdTable } = window.AdShared;

  return (
    <AppLayout active="" title="Admin · Users">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Icon name="Users" size={20} className="text-primary-500"/> User Management
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
              {AD_USERS.length} of 1,247 users · last sync 2m ago
            </p>
          </div>
          <Button variant="outline" size="md" leftIcon="Download">Export CSV</Button>
        </header>

        {/* Search + filter card */}
        <Card variant="glass">
          <CardBody className="p-4">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <TextInput placeholder="Search by email or name…" prefix="Search" defaultValue=""/>
              </div>
              <Select
                value="all"
                onChange={()=>{}}
                options={[
                  { value: "all",     label: "All roles"   },
                  { value: "learner", label: "Learner"     },
                  { value: "admin",   label: "Admin"       },
                ]}
                className="min-w-[140px]"
              />
              <Select
                value="active"
                onChange={()=>{}}
                options={[
                  { value: "all",      label: "All statuses"   },
                  { value: "active",   label: "Active only"    },
                  { value: "inactive", label: "Deactivated"    },
                ]}
                className="min-w-[140px]"
              />
              <Button variant="primary" size="md" leftIcon="Search">Search</Button>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <AdTable
          columns={[
            { label: "Email" },
            { label: "Name" },
            { label: "Roles" },
            { label: "Status" },
            { label: "Last seen" },
            { label: "Subs.",   align: "right" },
            { label: "Actions", align: "right" },
          ]}
          footer={
            <div className="flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
              <span>Showing 1 – {AD_USERS.length} of 1,247</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" leftIcon="ChevronLeft" disabled>Prev</Button>
                <span className="font-mono">1 / 25</span>
                <Button variant="ghost" size="sm" rightIcon="ChevronRight">Next</Button>
              </div>
            </div>
          }
        >
          {AD_USERS.map(u => (
            <tr key={u.id} className={"hover:bg-slate-50 dark:hover:bg-white/5 " + (u.active ? "" : "opacity-60")}>
              <td className="px-4 py-3 font-mono text-[12.5px] text-slate-700 dark:text-slate-200">{u.email}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full brand-gradient-bg text-white inline-flex items-center justify-center text-[10.5px] font-bold">
                    {u.name.split(" ").map(w=>w[0]).slice(0,2).join("")}
                  </span>
                  <span className="text-slate-900 dark:text-slate-50 font-medium">{u.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.roles.map(r => (
                    <Badge key={r} tone={r === "Admin" ? "fuchsia" : "neutral"}>{r}</Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                {u.active
                  ? <Badge tone="success">Active</Badge>
                  : <Badge tone="failed">Deactivated</Badge>}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.lastSeen}</td>
              <td className="px-4 py-3 text-right font-mono">{u.submissions}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button title={u.roles.includes("Admin") ? "Demote to Learner" : "Promote to Admin"}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Shield" size={14} className={u.roles.includes("Admin") ? "text-fuchsia-500" : ""}/>
                  </button>
                  <button title={u.active ? "Deactivate" : "Reactivate"}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name={u.active ? "UserX" : "UserCheck"} size={14} className={u.active ? "text-red-500" : "text-emerald-500"}/>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </AdTable>

      </div>
    </AppLayout>
  );
}

window.UsersPage_Ad = UsersPage_Ad;
/* Pillar 8 / Page 3 — Task Management (mirror TaskManagement.tsx)
   Header + New Task button · Toggle (include inactive) · Table
   (Title/Track/Difficulty/Language/Hours/Status/Submissions/Actions)
   · Edit modal rendered open at the bottom as state coverage */

function TasksPage_Ad() {
  const { AD_TASKS, AdTable } = window.AdShared;

  return (
    <AppLayout active="" title="Admin · Tasks">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Icon name="ClipboardList" size={20} className="text-cyan-500"/> Task Management
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">Create, edit, and deactivate tasks in the catalog.</p>
          </div>
          <Button variant="primary" size="md" leftIcon="Plus">New Task</Button>
        </header>

        {/* Filter card */}
        <Card variant="glass">
          <CardBody className="p-4 flex items-center justify-between flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-primary-500 focus:ring-primary-500"/>
              Include inactive tasks
            </label>
            <div className="flex items-center gap-2">
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All tracks" },
                  { value:"fullstack", label:"FullStack" },
                  { value:"backend", label:"Backend" },
                  { value:"python", label:"Python" },
                ]}
                className="min-w-[140px]"/>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All difficulty" },
                  { value:"1", label:"★" },
                  { value:"2", label:"★★" },
                  { value:"3", label:"★★★" },
                  { value:"4", label:"★★★★" },
                  { value:"5", label:"★★★★★" },
                ]}
                className="min-w-[140px]"/>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <AdTable
          columns={[
            { label: "Title" },
            { label: "Track" },
            { label: "Category" },
            { label: "Difficulty" },
            { label: "Language" },
            { label: "Hours", align: "right" },
            { label: "Status" },
            { label: "Subs.", align: "right" },
            { label: "Actions", align: "right" },
          ]}
          footer={
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Showing {AD_TASKS.length} tasks · 28 active in catalog</div>
          }
        >
          {AD_TASKS.map(t => (
            <tr key={t.id} className={"hover:bg-slate-50 dark:hover:bg-white/5 " + (t.active ? "" : "opacity-55")}>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{t.title}</td>
              <td className="px-4 py-3"><Badge tone="primary">{t.track}</Badge></td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.category}</td>
              <td className="px-4 py-3">
                <div className="inline-flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={n <= t.difficulty ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}>★</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-[12px] text-slate-600 dark:text-slate-300">{t.language}</td>
              <td className="px-4 py-3 text-right font-mono">{t.hours}</td>
              <td className="px-4 py-3">
                {t.active
                  ? <Badge tone="success">Active</Badge>
                  : <Badge tone="neutral">Inactive</Badge>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{t.submissions}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button title="Edit" className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Pencil" size={14}/>
                  </button>
                  {t.active ? (
                    <button title="Deactivate" className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 dark:text-slate-300 hover:text-red-500">
                      <Icon name="Trash2" size={14}/>
                    </button>
                  ) : (
                    <button title="Restore" className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 dark:text-slate-300 hover:text-emerald-500">
                      <Icon name="RotateCcw" size={14}/>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </AdTable>

        {/* Edit modal — rendered open as state preview */}
        <div className="text-center text-[10.5px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 pt-4">↓ Edit modal preview ↓</div>
        <Card variant="glass" className="max-w-2xl mx-auto">
          <CardBody className="p-0">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Icon name="Pencil" size={15} className="text-primary-500"/> Edit Task — React Form Validation
              </h3>
              <button className="p-1.5 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10">
                <Icon name="X" size={14}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="Title"><TextInput defaultValue="React Form Validation"/></Field>
              <Field label="Description"><Textarea rows={3} defaultValue="Build a multi-step form with Zod schema validation, error states tied to specific fields, async username-availability check, and accessible error messaging."/></Field>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Track">
                  <Select value="fullstack" onChange={()=>{}}
                    options={[{value:"fullstack",label:"FullStack"},{value:"backend",label:"Backend"},{value:"python",label:"Python"}]}/>
                </Field>
                <Field label="Category">
                  <Select value="oop" onChange={()=>{}}
                    options={[{value:"oop",label:"OOP"},{value:"algorithms",label:"Algorithms"},{value:"ds",label:"DataStructures"}]}/>
                </Field>
                <Field label="Language">
                  <Select value="ts" onChange={()=>{}}
                    options={[{value:"ts",label:"TypeScript"},{value:"js",label:"JavaScript"},{value:"py",label:"Python"}]}/>
                </Field>
                <Field label="Hours"><TextInput type="number" defaultValue={5}/></Field>
              </div>
              <Field label="Difficulty">
                <Select value="3" onChange={()=>{}}
                  options={[{value:"1",label:"★"},{value:"2",label:"★★"},{value:"3",label:"★★★"},{value:"4",label:"★★★★"},{value:"5",label:"★★★★★"}]}/>
              </Field>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/40 dark:bg-white/5">
              <label className="inline-flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-200">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 dark:border-white/10 text-primary-500"/>
                Active (visible in catalog)
              </label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="primary" size="sm" leftIcon="Save">Save changes</Button>
              </div>
            </div>
          </CardBody>
        </Card>

      </div>
    </AppLayout>
  );
}

window.TasksPage_Ad = TasksPage_Ad;
/* Pillar 8 / Page 4 — Question Management (mirror QuestionManagement.tsx)
   Header + New Question · Search & filter card · Table (Prompt/Category/
   Difficulty/Type/Answers/Status/Uses/Actions) · Published vs Draft */

function QuestionsPage_Ad() {
  const { AD_QUESTIONS, AdTable } = window.AdShared;

  return (
    <AppLayout active="" title="Admin · Questions">
      <div className="max-w-6xl mx-auto p-1 sm:p-2 space-y-4 animate-fade-in">

        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Icon name="HelpCircle" size={20} className="text-fuchsia-500"/> Question Management
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
              Assessment-question bank · {AD_QUESTIONS.filter(q=>q.published).length} published / {AD_QUESTIONS.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" leftIcon="Upload">Import CSV</Button>
            <Button variant="primary" size="md" leftIcon="Plus">New Question</Button>
          </div>
        </header>

        <Card variant="glass">
          <CardBody className="p-4">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex-1 min-w-[260px]">
                <TextInput placeholder="Search question prompts…" prefix="Search"/>
              </div>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All categories" },
                  { value:"ds", label:"DataStructures" },
                  { value:"algo", label:"Algorithms" },
                  { value:"oop", label:"OOP" },
                  { value:"db", label:"Databases" },
                  { value:"sec", label:"Security" },
                  { value:"net", label:"Networking" },
                ]}
                className="min-w-[160px]"/>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All types" },
                  { value:"mcq", label:"MCQ" },
                  { value:"short", label:"Short answer" },
                ]}
                className="min-w-[140px]"/>
              <Select value="all" onChange={()=>{}}
                options={[
                  { value:"all", label:"All statuses" },
                  { value:"published", label:"Published" },
                  { value:"draft", label:"Draft" },
                ]}
                className="min-w-[140px]"/>
            </div>
          </CardBody>
        </Card>

        <AdTable
          columns={[
            { label: "Prompt" },
            { label: "Category" },
            { label: "Difficulty" },
            { label: "Type" },
            { label: "Answers", align: "right" },
            { label: "Status" },
            { label: "Uses", align: "right" },
            { label: "Actions", align: "right" },
          ]}
          footer={
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Showing {AD_QUESTIONS.length} of 142 questions in the bank</div>
          }
        >
          {AD_QUESTIONS.map(q => (
            <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
              <td className="px-4 py-3 max-w-[280px]">
                <p className="text-slate-900 dark:text-slate-50 font-medium line-clamp-2">{q.prompt}</p>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{q.category}</td>
              <td className="px-4 py-3">
                <div className="inline-flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={n <= q.difficulty ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}>★</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={q.type === "MCQ" ? "primary" : "cyan"}>{q.type}</Badge>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {q.answers > 0 ? q.answers : <span className="text-slate-400 dark:text-slate-500">—</span>}
              </td>
              <td className="px-4 py-3">
                {q.published
                  ? <Badge tone="success">Published</Badge>
                  : <Badge tone="neutral">Draft</Badge>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{q.uses}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  <button title="Edit" className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Pencil" size={14}/>
                  </button>
                  <button title="Duplicate" className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300">
                    <Icon name="Copy" size={14}/>
                  </button>
                  <button title="Delete" className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 dark:text-slate-300 hover:text-red-500">
                    <Icon name="Trash2" size={14}/>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </AdTable>

      </div>
    </AppLayout>
  );
}

window.QuestionsPage_Ad = QuestionsPage_Ad;
/* Pillar 8 / Page 5 — Admin Analytics (mirror admin/AnalyticsPage.tsx)
   Per-track AI score breakdown + Submission volume by status across
   tracks + Top tasks by submissions + System health metrics */

function AnalyticsPage_Ad() {
  const {
    AD_STATS, AD_WEEK_SUBS, AD_TRACK_SCORES, AD_TASKS,
    AdDemoBanner, AdBarMini, AdStatCard,
  } = window.AdShared;

  const topTasks = [...AD_TASKS].sort((a,b) => b.submissions - a.submissions).slice(0, 5);

  return (
    <AppLayout active="" title="Admin · Analytics">
      <div className="space-y-6 animate-fade-in">

        <header>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Icon name="TrendingUp" size={22} className="text-emerald-500"/> Platform Analytics
          </h1>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1">
            Aggregate AI scores, submission volume, and content health across all tracks.
          </p>
        </header>

        <AdDemoBanner/>

        {/* System health stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdStatCard icon="ClipboardList" tone="cyan"    value={AD_STATS.activeTasks}                  label="Active tasks"/>
          <AdStatCard icon="HelpCircle"    tone="fuchsia" value={AD_STATS.publishedQuestions}           label="Published questions"/>
          <AdStatCard icon="FileCode"      tone="warning" value={AD_STATS.submissionsThisWeek}          label="Submissions this week"/>
          <AdStatCard icon="TrendingUp"    tone="success" value={`${AD_STATS.averageScore}%`}            label="Avg AI score"/>
        </div>

        {/* Per-track AI score breakdown */}
        <Card variant="glass">
          <CardBody className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50">AI score breakdown by track</h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Average code-quality scores across the 5 review dimensions per track (last 30 days).</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                    <th className="px-3 py-2">Track</th>
                    <th className="px-3 py-2">Correctness</th>
                    <th className="px-3 py-2">Readability</th>
                    <th className="px-3 py-2">Security</th>
                    <th className="px-3 py-2">Performance</th>
                    <th className="px-3 py-2">Design</th>
                    <th className="px-3 py-2 text-right">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {AD_TRACK_SCORES.map(t => {
                    const avg = Math.round((t.correctness + t.readability + t.security + t.performance + t.design) / 5);
                    return (
                      <tr key={t.track}>
                        <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-50">{t.track}</td>
                        {["correctness","readability","security","performance","design"].map(k => (
                          <td key={k} className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                <div className="h-full brand-gradient-bg rounded-full" style={{ width: `${t[k]}%` }}/>
                              </div>
                              <span className="font-mono text-[11.5px] text-slate-600 dark:text-slate-300 w-8 text-right">{t[k]}</span>
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right">
                          <Badge tone={avg >= 80 ? "success" : avg >= 70 ? "primary" : "pending"}>{avg}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Weekly submissions volume */}
        <Card variant="glass">
          <CardBody className="p-6">
            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-1">Submission volume — past 7 days</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">Total daily submissions across all users and tracks.</p>
            <AdBarMini rows={AD_WEEK_SUBS} valueKey="submissions" color="#06b6d4" height={220}/>
          </CardBody>
        </Card>

        {/* Top tasks + Slowest review queue (2-col) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card variant="glass">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-1">Top tasks by submissions</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All-time, sorted by submission count.</p>
              <ul className="space-y-2">
                {topTasks.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
                    <span className={[
                      "w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0",
                      i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                      i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                      i === 2 ? "bg-gradient-to-br from-orange-700 to-amber-700 text-white" :
                                "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                    ].join(" ")}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.track} · {t.language}</p>
                    </div>
                    <span className="text-[13px] font-mono font-bold text-slate-900 dark:text-slate-50">{t.submissions}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card variant="glass">
            <CardBody className="p-6">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-50 mb-1">System health</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">AI review pipeline + worker queue snapshot.</p>
              <ul className="space-y-3">
                <HealthRow label="AI review pipeline"   value="Healthy"        tone="success" detail="p50 32s · p95 71s"/>
                <HealthRow label="Worker queue (active)" value="3 / 8 workers" tone="success" detail="0 stuck jobs"/>
                <HealthRow label="Backlog (pending)"     value="12 jobs"       tone="processing" detail="Oldest 2m"/>
                <HealthRow label="Storage (Blob)"        value="14.7 GB"       tone="neutral" detail="of 100 GB quota"/>
                <HealthRow label="Qdrant index"          value="1,892 vectors" tone="neutral" detail="Last sync 3m ago"/>
                <HealthRow label="OpenAI API quota"      value="62%"           tone="pending" detail="Resets in 3 days"/>
              </ul>
            </CardBody>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}

function HealthRow({ label, value, tone, detail }) {
  return (
    <li className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5">
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-slate-900 dark:text-slate-50 truncate">{label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <Badge tone={tone}>{value}</Badge>
    </li>
  );
}

window.AnalyticsPage_Ad = AnalyticsPage_Ad;
/* Pillar 8 — App entry */

function AdApp() {
  const { AdPageSwitcherPill } = window.AdShared;
  const [page, setPage] = React.useState("dashboard");
  const [dark, setDark] = useTheme();
  void dark; void setDark;

  const pages = {
    "dashboard":  () => <AdminDashboard_Ad/>,
    "users":      () => <UsersPage_Ad/>,
    "tasks":      () => <TasksPage_Ad/>,
    "questions":  () => <QuestionsPage_Ad/>,
    "analytics":  () => <AnalyticsPage_Ad/>,
  };

  return (
    <>
      {(pages[page] || pages.dashboard)()}
      <AdPageSwitcherPill active={page} setActive={setPage}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdApp/>);
