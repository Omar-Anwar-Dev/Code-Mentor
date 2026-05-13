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
    // Tightened on 2026-05-12: py-12→py-5, mb-7→mb-4, mt-7→mt-4, BrandLogo lg→md so the
    // full auth card + chrome fits in a typical laptop viewport (~720px) without scroll.
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-5 sm:py-6 overflow-hidden">
      <AnimatedBackground />
      <div className="relative flex flex-col items-center w-full">
        <div className="mb-4"><BrandLogo size="md" /></div>
        <div className="w-full max-w-md">{children}</div>
        <div className="mt-4 flex items-center gap-4 text-[13px] text-slate-500 dark:text-slate-400">
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
// Landing page — public marketing home.

function LandingNav({ dark, setDark, onNav }) {
  const [mobile, setMobile] = paUseState(false);
  return (
    <nav className="sticky top-0 z-40 h-16 glass flex items-center px-5 lg:px-10 border-b border-slate-200/40 dark:border-white/5">
      <a href="#hero" onClick={(e)=>{e.preventDefault(); window.scrollTo({top:0, behavior:"smooth"});}} className="flex items-center">
        <BrandLogo />
      </a>
      <div className="hidden md:flex items-center gap-1 ml-10">
        {[["Features","features"],["How it works","journey"],["For students","audit"],["Project Audit","audit"]].map(([label,id]) => (
          <a key={label} href={"#"+id}
             className="px-3 py-1.5 text-[13.5px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 rounded-lg hover:bg-primary-50/60 dark:hover:bg-white/5 transition-colors">
            {label}
          </a>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle dark={dark} setDark={setDark} className="hidden sm:flex" />
        <button onClick={()=>onNav("login")}
          className="hidden sm:inline-flex h-9 px-3 items-center text-[13.5px] text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300">
          Sign in
        </button>
        <Button variant="gradient" size="md" rightIcon="ArrowRight" onClick={()=>onNav("register")} className="hidden sm:inline-flex">
          Get started
        </Button>
        <button className="md:hidden w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200" onClick={()=>setMobile(m=>!m)} aria-label="Menu">
          <Icon name={mobile ? "X" : "Menu"} size={18}/>
        </button>
      </div>
      {mobile && (
        <div className="absolute top-16 left-0 right-0 glass-frosted p-4 border-b border-slate-200/40 dark:border-white/5 flex flex-col gap-2 md:hidden">
          {[["Features","features"],["How it works","journey"],["For students","audit"],["Project Audit","audit"]].map(([label,id]) => (
            <a key={label} href={"#"+id} onClick={()=>setMobile(false)} className="px-3 py-2 text-[14px] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-primary-50/60 dark:hover:bg-white/5">{label}</a>
          ))}
          <div className="flex gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <Button variant="ghost" size="md" className="flex-1" onClick={()=>onNav("login")}>Sign in</Button>
            <Button variant="gradient" size="md" className="flex-1" onClick={()=>onNav("register")}>Get started</Button>
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero({ onNav }) {
  return (
    <section id="hero" className="relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full pl-2 pr-3 py-1 mb-7">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full brand-gradient-bg text-white">
            <Icon name="Sparkles" size={11} />
          </span>
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">AI-powered code review · 2026</span>
        </div>
        <h1 className="text-[44px] sm:text-[64px] lg:text-[72px] leading-[1.04] font-semibold tracking-tight text-slate-900 dark:text-slate-50 max-w-4xl mx-auto text-balance">
          Real code feedback, <span className="brand-gradient-text whitespace-nowrap">in under five minutes.</span>
        </h1>
        <p className="mt-6 text-[17px] sm:text-[19px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Drop your code in, see what a senior would say — inline, line-by-line. Then ask the AI mentor anything that's still fuzzy.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight" onClick={()=>onNav("register")}>Start free assessment</Button>
          <Button variant="outline" size="lg" leftIcon="ScanSearch" onClick={()=>{document.getElementById("audit")?.scrollIntoView()}}>Try project audit</Button>
        </div>
        <p className="mt-7 font-mono text-[12px] text-slate-500 dark:text-slate-400">
          Built by a 7-person CS team at Benha University · defending Sept 2026
        </p>

        {/* visual proof block — a glass card with a mocked annotation snippet */}
        <div className="mt-14 max-w-4xl mx-auto text-left">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Icon name="FileCode" size={14} className="text-slate-500" />
                <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">auth/user_lookup.py</span>
                <Badge tone="failed">1 critical</Badge>
                <Badge tone="primary" icon="Sparkles">mentor v2.3</Badge>
              </div>
              <span className="font-mono text-[11.5px] text-slate-500">reviewed · 4m 12s</span>
            </div>
            <div className="font-mono text-[13px] leading-[1.8] grid grid-cols-[44px_28px_1fr]">
              {[
                { n:1, t:<><span style={{color:"#a78bfa"}}>def </span><span style={{color:"#22d3ee"}}>get_user_by_email</span>(email):</> },
                { n:2, t:<span className="italic text-slate-500">    # Look up a user record by their email address.</span> },
                { n:3, t:<>    query = <span style={{color:"#34d399"}}>{`f"SELECT * FROM users WHERE email = '{email}'"`}</span></>, flag:true },
                { n:4, t:<>    cursor.<span style={{color:"#22d3ee"}}>execute</span>(query)</> },
                { n:5, t:<><span style={{color:"#a78bfa"}}>    return </span>cursor.<span style={{color:"#22d3ee"}}>fetchone</span>()</> },
              ].map((l) => (
                <React.Fragment key={l.n}>
                  <div className={["px-3 text-right select-none border-r", l.flag ? "border-primary-500 text-primary-700 dark:text-primary-300 font-semibold bg-primary-500/10" : "border-slate-200/60 dark:border-white/5 text-slate-400"].join(" ")} style={l.flag ? {boxShadow:"inset 4px 0 0 0 #8b5cf6"} : {}}>{l.n}</div>
                  <div className={"flex items-center justify-center " + (l.flag ? "bg-primary-500/10" : "")}>
                    {l.flag ? <span className="w-5 h-5 rounded-full bg-primary-500 text-white shadow-neon flex items-center justify-center"><Icon name="MessageSquare" size={11}/></span> : null}
                  </div>
                  <div className={"pl-3 pr-4 whitespace-pre " + (l.flag ? "bg-primary-500/10 text-slate-800 dark:text-slate-100" : "text-slate-800 dark:text-slate-100")}>{l.t}</div>
                </React.Fragment>
              ))}
              <div className="col-span-3 px-4 pb-4 pt-3">
                <div className="glass-frosted rounded-xl border border-primary-400/40 dark:border-primary-400/30 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-lg brand-gradient-bg flex items-center justify-center text-white"><Icon name="Sparkles" size={14}/></div>
                    <div className="text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-50">SQL injection risk.</span> Use parameterized queries via <code className="font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-300">cursor.execute(query, params)</code>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  { icon:"BookOpen",       title:"Adaptive Assessment",
    body:"30 questions that adapt to your level. Discover your strengths and gaps in 40 minutes, then get a personalized learning path." },
  { icon:"ScanSearch",     title:"Multi-layered Code Review",
    body:"Static analyzers (Bandit, ESLint, Cppcheck…) plus LLM architectural review, unified into per-category scores and inline annotations." },
  { icon:"MessageSquare",  title:"Inline Annotations",
    body:"Mentor comments appear inline, anchored to the exact line. Click to see the suggestion, apply it, or ask the mentor a follow-up." },
  { icon:"Sparkles",       title:"RAG-Powered Mentor Chat",
    body:"Ask the mentor about your code. Answers are grounded in your actual submission — chunked, embedded, retrieved per query." },
  { icon:"Map",            title:"Personalized Learning Path",
    body:"An ordered sequence of real coding tasks tuned to your weakest categories. Replace one with an AI-recommended task anytime." },
  { icon:"Trophy",         title:"Shareable Learning CV",
    body:"A verifiable, public profile of your scored submissions. A data-backed alternative to course-completion certificates." },
];

function FeaturesSection() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-24">
      <div className="max-w-3xl mb-12">
        <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">Features</div>
        <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Six pieces that work as one product.</h2>
        <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-400 max-w-2xl">
          Assessment, review, annotations, chat, path, CV. Each step feeds the next — no isolated tools, no dead ends.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <div key={i} className="glass-card p-6 hover:-translate-y-0.5 transition-transform duration-300">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200 mb-5">
              <Icon name={f.icon} size={22}/>
            </div>
            <h3 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{f.title}</h3>
            <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Vertical zig-zag timeline — matches the canonical frontend/src/features/landing/LandingPage.tsx JourneySection.
const JOURNEY = [
  { icon:"Target",     step:1, title:"Take the Assessment",     body:"Complete a quick skill assessment to help us understand your current level." },
  { icon:"Rocket",     step:2, title:"Get Your Learning Path",   body:"Receive a personalized curriculum tailored to your goals and skill gaps." },
  { icon:"Code",       step:3, title:"Code & Learn",             body:"Work through projects and challenges while getting real-time AI feedback." },
  { icon:"TrendingUp", step:4, title:"Track & Improve",          body:"Monitor your progress, earn achievements, and continuously level up." },
];

function JourneySection() {
  return (
    <section id="journey" className="relative py-20 sm:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Centered header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/10 dark:bg-primary-500/15 text-primary-700 dark:text-primary-200 text-[13px] font-medium mb-4">
            Your Journey
          </span>
          <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
            How It <span className="brand-gradient-text">Works</span>
          </h2>
          <p className="text-[16px] sm:text-[18px] text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A simple yet powerful learning process designed to maximize your growth.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-secondary-500 via-primary-500 to-fuchsia-500" />

          <div className="space-y-12 lg:space-y-4">
            {JOURNEY.map((item, index) => {
              const reverse = index % 2 !== 0;
              return (
                <div key={index} className="relative lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                  <div className={[
                    "mb-8 lg:mb-0",
                    reverse ? "lg:text-left lg:pl-16 lg:col-start-2" : "lg:text-right lg:pr-16"
                  ].join(" ")}>
                    <div className={["inline-flex items-center gap-2 mb-4", reverse ? "" : "lg:flex-row-reverse"].join(" ")}>
                      <span className="w-10 h-10 rounded-full brand-gradient-bg flex items-center justify-center text-white font-bold text-[15px] shadow-[0_8px_24px_-8px_rgba(139,92,246,.55)]">
                        {item.step}
                      </span>
                      <span className="text-[13px] font-medium text-primary-600 dark:text-primary-300 font-mono">Step {item.step}</span>
                    </div>
                    <h3 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-[15px] sm:text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-md lg:max-w-none">
                      {item.body}
                    </p>
                  </div>

                  <div className={reverse ? "lg:pr-16 lg:col-start-1 lg:row-start-1" : "lg:pl-16"}>
                    <div className="relative inline-block">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 dark:from-primary-500/10 dark:to-purple-500/10 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl brand-gradient-bg flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(139,92,246,.55)]">
                          <Icon name={item.icon} size={28} className="text-white"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-4 border-primary-500" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AuditTeaser() {
  return (
    <section id="audit" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 brand-gradient-bg opacity-[0.10] dark:opacity-[0.15]" />
      <div className="absolute inset-0 bg-grid" />
      <div className="relative max-w-3xl mx-auto px-6 lg:px-10">
        <div className="glass-card p-8 sm:p-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge tone="cyan" icon="FlaskConical">F11 · standalone</Badge>
          </div>
          <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Already have a project? Get an instant audit.</h2>
          <p className="mt-3 text-[15.5px] text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Skip the assessment. Upload a GitHub repo or ZIP plus a short description, and the AI returns an 8-section structured audit — overall score, security review, completeness against your description, and a top-5 prioritized fix list.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <Button variant="gradient" size="lg" leftIcon="ScanSearch" rightIcon="ArrowRight">Audit my project</Button>
          </div>
          <div className="mt-7 grid sm:grid-cols-4 gap-3 text-left">
            {[
              { k:"Overall score",    icon:"Gauge" },
              { k:"Security review",  icon:"ShieldCheck" },
              { k:"Completeness",     icon:"ListChecks" },
              { k:"Top-5 fix list",   icon:"Wrench" },
            ].map(s => (
              <div key={s.k} className="glass rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                <Icon name={s.icon} size={14} className="text-primary-600 dark:text-primary-300"/>
                <span className="text-[12.5px] text-slate-700 dark:text-slate-200">{s.k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onNav }) {
  return (
    <section className="relative py-20 sm:py-28 text-center max-w-3xl mx-auto px-6">
      <h2 className="text-[32px] sm:text-[44px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Ready to ship like a <span className="brand-gradient-text">senior?</span>
      </h2>
      <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-400">Free during the defense window. No credit card.</p>
      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <Button variant="gradient" size="lg" leftIcon="UserPlus" onClick={()=>onNav("register")}>Create account</Button>
        <Button variant="glass" size="lg" leftIcon="LogIn" onClick={()=>onNav("login")}>Sign in instead</Button>
      </div>
    </section>
  );
}

function LandingFooter({ onNav }) {
  return (
    <footer className="border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-950/60 mt-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid md:grid-cols-[1fr_auto] gap-8 items-start">
        <div>
          <BrandLogo size="sm" />
          <div className="mt-4 text-[13.5px] text-slate-600 dark:text-slate-300 max-w-md">
            Code Mentor — Benha University Faculty of Computers and AI · Class of 2026.
          </div>
          <div className="mt-1.5 text-[12.5px] text-slate-500 dark:text-slate-400">
            Instructor: Prof. Mostafa El-Gendy · TA: Eng. Fatma Ibrahim
          </div>
        </div>
        <div className="flex items-center gap-4 md:self-center">
          <a href="#" onClick={(e)=>{e.preventDefault(); onNav("privacy")}} className="text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300">Privacy</a>
          <a href="#" onClick={(e)=>{e.preventDefault(); onNav("terms")}} className="text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300">Terms</a>
          <a href="https://github.com/Omar-Anwar-Dev/Code-Mentor" target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300">
            <Icon name="Github" size={16}/>
          </a>
        </div>
      </div>
    </footer>
  );
}

function Landing({ onNav, dark, setDark }) {
  return (
    <div className="min-h-screen">
      <LandingNav dark={dark} setDark={setDark} onNav={onNav} />
      <Hero onNav={onNav} />
      <FeaturesSection />
      <JourneySection />
      <AuditTeaser />
      <FinalCTA onNav={onNav} />
      <LandingFooter onNav={onNav} />
    </div>
  );
}

window.Landing = Landing;
// Login, Register, GitHub OAuth Success

function Divider({ children }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-mono">{children}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function Login({ onNav, dark, setDark }) {
  return (
    <AuthLayout
      dark={dark} setDark={setDark}
      footerLink={<a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}} className="hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1.5"><Icon name="ArrowLeft" size={12}/> Back to home</a>}
    >
      <div className="glass-card p-5 sm:p-6">
        <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Welcome back.</h1>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Sign in to continue your learning path.</p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={(e)=>{e.preventDefault(); onNav("ghsuccess")}}>
          <Field label="Email" error="We couldn't find an account with this email.">
            <TextInput type="email" defaultValue="layla.ahmed@benha.edu" placeholder="you@university.edu" error />
          </Field>

          <Field
            label={
              <span className="flex items-center justify-between w-full">
                <span>Password</span>
                <a href="#" onClick={(e)=>e.preventDefault()} className="text-[12px] text-primary-600 dark:text-primary-300 font-medium hover:underline">Forgot password?</a>
              </span>
            }
          >
            <input
              type="password"
              defaultValue="superSecret123"
              autoFocus
              className="w-full h-10 px-3.5 text-[14px] rounded-xl bg-white dark:bg-slate-900/60 border border-primary-400 dark:border-primary-400 text-slate-900 dark:text-slate-100 outline-none"
              style={{ boxShadow: "0 0 0 3px rgba(139,92,246,0.35), 0 0 0 1px rgba(139,92,246,0.8)" }}
            />
          </Field>

          <Button variant="gradient" size="md" rightIcon="ArrowRight" className="w-full mt-0.5">Sign in</Button>

          <Divider>or continue with</Divider>

          <Button variant="glass" size="md" leftIcon="Github" className="w-full" onClick={()=>onNav("ghsuccess")}>Continue with GitHub</Button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-[13px] text-slate-600 dark:text-slate-300">
          Don't have an account? <a href="#" onClick={(e)=>{e.preventDefault(); onNav("register")}} className="text-primary-600 dark:text-primary-300 font-semibold hover:underline">Sign up</a>
        </div>
      </div>
    </AuthLayout>
  );
}

const TRACKS = [
  { id:"fullstack", title:"Full Stack", desc:"React + .NET",       icon:"Code" },
  { id:"backend",   title:"Backend",    desc:"ASP.NET + Python",   icon:"ScanSearch" },
  { id:"python",    title:"Python",     desc:"Data + Web",         icon:"BookOpen" },
];

function TrackCard({ track, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track.id)}
      className={[
        // Compacted 2026-05-12 to keep Register on a single viewport (no scroll).
        "flex flex-col items-start gap-1.5 p-2.5 rounded-lg border text-left transition-all ring-brand",
        selected
          ? "border-primary-500 bg-primary-50/70 dark:bg-primary-500/15 ring-2 ring-primary-400/30 dark:ring-primary-400/40"
          : "border-slate-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-400/60 bg-white/50 dark:bg-white/[0.02]"
      ].join(" ")}
    >
      <div className={["w-7 h-7 rounded-md flex items-center justify-center",
        selected
          ? "bg-primary-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.55)]"
          : "bg-primary-500/10 text-primary-700 dark:text-primary-200"
      ].join(" ")}>
        <Icon name={track.icon} size={14}/>
      </div>
      <div>
        <div className={["text-[12.5px] font-semibold leading-tight", selected ? "text-primary-700 dark:text-primary-200" : "text-slate-900 dark:text-slate-100"].join(" ")}>{track.title}</div>
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{track.desc}</div>
      </div>
    </button>
  );
}

function Register({ onNav, dark, setDark }) {
  const [track, setTrack] = paUseState("fullstack");
  const [agree, setAgree] = paUseState(true);
  return (
    <AuthLayout
      dark={dark} setDark={setDark}
      footerLink={<a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}} className="hover:text-primary-600 dark:hover:text-primary-300 inline-flex items-center gap-1.5"><Icon name="ArrowLeft" size={12}/> Back to home</a>}
    >
      <div className="glass-card p-4 sm:p-5">
        <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Create your account.</h1>

        <form className="mt-3 flex flex-col gap-1.5" onSubmit={(e)=>{e.preventDefault(); onNav("ghsuccess")}}>
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="First name">
              <TextInput placeholder="Layla" defaultValue="Layla" />
            </Field>
            <Field label="Last name">
              <TextInput placeholder="Ahmed" defaultValue="Ahmed" />
            </Field>
          </div>
          <Field label="Email">
            <TextInput type="email" placeholder="you@university.edu" defaultValue="layla.ahmed@benha.edu" />
          </Field>
          <Field label="Password" helper="At least 8 characters, with a number.">
            <TextInput type="password" defaultValue="superSecret123" />
          </Field>

          <div>
            <label className="text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Choose your track</label>
            <div className="grid grid-cols-3 gap-2">
              {TRACKS.map(t => <TrackCard key={t.id} track={t} selected={track === t.id} onSelect={setTrack} />)}
            </div>
          </div>

          <label className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 dark:border-white/20 text-primary-500 focus:ring-primary-400 accent-primary-500"
            />
            <span>
              I agree to the <a href="#" onClick={(e)=>{e.preventDefault(); onNav("privacy")}} className="text-primary-600 dark:text-primary-300 hover:underline">Privacy</a> and <a href="#" onClick={(e)=>{e.preventDefault(); onNav("terms")}} className="text-primary-600 dark:text-primary-300 hover:underline">Terms</a>.
            </span>
          </label>

          <Button variant="gradient" size="md" rightIcon="ArrowRight" className="w-full mt-0.5" disabled={!agree}>Create account</Button>

          <Divider>or continue with</Divider>

          <Button variant="glass" size="md" leftIcon="Github" className="w-full" onClick={()=>onNav("ghsuccess")}>Continue with GitHub</Button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-center text-[13px] text-slate-600 dark:text-slate-300">
          Already have an account? <a href="#" onClick={(e)=>{e.preventDefault(); onNav("login")}} className="text-primary-600 dark:text-primary-300 font-semibold hover:underline">Sign in</a>
        </div>
      </div>
    </AuthLayout>
  );
}

function GitHubSuccess({ onNav, dark, setDark }) {
  // animated progress bar
  const [pct, setPct] = paUseState(20);
  paUseEffect(() => {
    const id = setInterval(() => setPct(p => p < 90 ? p + 7 : p), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <AuthLayout dark={dark} setDark={setDark}
      footerLink={<a href="#" onClick={(e)=>{e.preventDefault(); onNav("login")}} className="hover:text-primary-600 dark:hover:text-primary-300">Cancel sign-in</a>}
    >
      <div className="glass-card p-8 sm:p-10 text-center flex flex-col items-center">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl brand-gradient-bg flex items-center justify-center text-white animate-glow-pulse shadow-[0_18px_40px_-10px_rgba(139,92,246,.6)]">
            <Icon name="Sparkles" size={36}/>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-white/10">
            <Icon name="Github" size={14} className="text-slate-700 dark:text-slate-200"/>
          </div>
        </div>
        <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">Signing you in via GitHub…</h2>
        <p className="mt-1.5 text-[13px] font-mono text-slate-500 dark:text-slate-400">Capturing your access token securely…</p>

        <div className="mt-6 w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div className="h-full brand-gradient-bg transition-[width] duration-300 ease-out" style={{ width: pct + "%" }} />
        </div>

        <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
          <Badge tone="processing" icon="LoaderCircle">handshake</Badge>
          <Badge tone="primary" icon="ShieldCheck">PKCE</Badge>
          <Badge tone="cyan" icon="KeyRound">scope: user:email</Badge>
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
        You should be redirected automatically. If nothing happens after 5 seconds, <a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}} className="text-primary-600 dark:text-primary-300 hover:underline">click here to continue.</a>
      </p>
    </AuthLayout>
  );
}

Object.assign(window, { Login, Register, GitHubSuccess });
// Privacy + Terms — content-heavy with sticky TOC, Print button

function LegalHeader({ title, dark, setDark, onNav }) {
  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-slate-200/40 dark:border-white/5 px-5 lg:px-10 flex items-center no-print">
      <a href="#" onClick={(e)=>{e.preventDefault(); onNav("landing")}}><BrandLogo size="sm" /></a>
      <div className="mx-auto hidden md:flex items-center gap-2">
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</span>
        <Badge tone="primary" icon="FileText">legal</Badge>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" leftIcon="ArrowLeft" onClick={()=>onNav("landing")}>Back</Button>
        <ThemeToggle dark={dark} setDark={setDark} />
      </div>
    </header>
  );
}

function TOC({ items, activeId, onClick }) {
  return (
    <aside className="hidden lg:block w-64 shrink-0 no-print">
      <div className="sticky top-24">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-3">Contents</div>
        <nav className="flex flex-col gap-0.5">
          {items.map((it, i) => (
            <a key={it.id} href={"#"+it.id}
               onClick={(e)=>{e.preventDefault(); onClick(it.id);}}
               className={[
                 "px-3 py-2 rounded-lg text-[13px] flex items-center gap-2.5 transition-colors",
                 activeId === it.id
                   ? "bg-primary-500/10 text-primary-700 dark:text-primary-200 border-l-2 border-primary-500"
                   : "text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-slate-100/60 dark:hover:bg-white/5 border-l-2 border-transparent"
               ].join(" ")}>
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 w-5 shrink-0">{String(i+1).padStart(2,'0')}</span>
              <span>{it.title}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function LegalPage({ title, lastUpdated, intro, sections, dark, setDark, onNav }) {
  const [active, setActive] = paUseState(sections[0].id);
  paUseEffect(() => {
    const handler = () => {
      const y = window.scrollY + 140;
      let cur = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= y) cur = s.id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [sections]);

  const goTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 90, behavior: "smooth" });
    setActive(id);
  };

  return (
    <div className="min-h-screen">
      <LegalHeader title={title} dark={dark} setDark={setDark} onNav={onNav} />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
        <div className="flex gap-10">
          <TOC items={sections} activeId={active} onClick={goTo} />
          <main className="flex-1 min-w-0 max-w-3xl">
            {/* page header */}
            <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
              <div>
                <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300 mb-2">{title}</div>
                <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
                <p className="mt-2 font-mono text-[12.5px] text-slate-500 dark:text-slate-400">Last updated: {lastUpdated}</p>
              </div>
              <Button variant="ghost" size="sm" leftIcon="Printer" onClick={()=>window.print()} className="no-print">Print</Button>
            </div>
            <p className="text-[15.5px] text-slate-600 dark:text-slate-300 leading-relaxed mb-10 max-w-2xl">{intro}</p>

            <div className="flex flex-col gap-12">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[12px] text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded-md bg-primary-500/10">{String(i+1).padStart(2,'0')}</span>
                    <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{s.title}</h2>
                  </div>
                  <div className="flex flex-col gap-3.5 text-[14.5px] text-slate-700 dark:text-slate-300 leading-[1.75] max-w-2xl">
                    {s.body.map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 pt-8 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
              <div className="font-mono text-[12px] text-slate-500 dark:text-slate-400">commit · 2026-05-12 · Benha University</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" leftIcon="Printer" onClick={()=>window.print()} className="no-print">Print</Button>
                <Button variant="outline" size="sm" leftIcon="Mail">Contact us</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const PRIVACY_SECTIONS = [
  { id:"overview", title:"Overview", body:[
    "Code Mentor is an AI-powered code review and learning platform built by a 7-person CS team at Benha University Faculty of Computers and AI as part of our 2026 graduation project. This Privacy Policy describes how we collect, use, and protect information when you use the platform during the defense window.",
    "The platform is operated by the project team under the academic supervision of Prof. Mohammed Belal and Eng. Mohamed El-Saied. If you have any question about the practices described here, contact us at privacy@codementor.benha.edu.eg or open an issue in our public repository."
  ]},
  { id:"data", title:"Data we collect", body:[
    "We collect three categories of data. First, account information: your full name, email address, hashed password, chosen learning track, and (if you sign in via GitHub) your GitHub user ID and the email scoped to that token.",
    "Second, learning content: the source code you submit (via GitHub URL or ZIP), your assessment answers, the AI feedback returned, and any follow-up messages you send in the mentor chat.",
    "Third, operational telemetry: timestamps, the routes you visit inside the platform, anonymized error reports, and aggregate counters used to size our review queue. We do not collect device fingerprints, location data, or any third-party advertising identifiers."
  ]},
  { id:"use", title:"How we use your data", body:[
    "We use your data to operate the service: to authenticate you, to run static analysis and AI review on your submissions, to render your scored Learning CV, and to surface inline annotations against the exact lines they refer to.",
    "We use aggregated, de-identified metrics to improve the AI mentor's prompting, retrieval quality, and category coverage. We do not use your individual code to train any third-party model, and we do not sell, rent, or share your personal data with marketers."
  ]},
  { id:"storage", title:"Where your data lives", body:[
    "Account records sit in Azure SQL (East US). Submitted ZIPs and any extracted artifacts live in Azure Blob Storage with private access. The Qdrant vector store, used for RAG-grounded mentor chat, holds embeddings of code chunks tied to your account but never the original code in plaintext.",
    "Calls to OpenAI's API are made under their commercial-API contract, which states that prompts and completions sent through the API are not used to train OpenAI models. We log only the request metadata (model, token count, latency) — not the prompt body — for cost accounting."
  ]},
  { id:"access", title:"Who can see your code", body:[
    "By default, your submissions are private and visible only to you and the AI service. The project team does not browse user submissions; access for debugging requires your written consent and is audited.",
    "When you explicitly publish a Learning CV, you choose which submissions to feature. Those become accessible at a shareable URL of your choice. You can unpublish or delete a published submission at any time from your profile settings."
  ]},
  { id:"cookies", title:"Cookies & analytics", body:[
    "We use httpOnly, SameSite=Strict session cookies exclusively for authentication. We do not use third-party analytics, cross-site tracking, or marketing pixels. The platform sets no cookies at all until you sign in.",
    "Our backend records anonymized request counts to monitor service health. These records are retained for 30 days and then aggregated; raw entries are dropped."
  ]},
  { id:"rights", title:"Your rights", body:[
    "You can view and edit your account information from your profile page. You can delete your account at any time; deletion removes your record from Azure SQL within 24 hours and triggers garbage collection of your blobs and embeddings within seven days.",
    "Data portability is available as a JSON export covering your assessments, submissions, scores, and chat history. This export is post-MVP and we will publish a self-serve endpoint before the September 2026 defense."
  ]},
  { id:"contact", title:"Contact", body:[
    "Reach the team at privacy@codementor.benha.edu.eg for any privacy question. For technical issues or feature requests, open an issue at github.com/Omar-Anwar-Dev/Code-Mentor — the team monitors the repository daily during the defense window."
  ]},
];

const TERMS_SECTIONS = [
  { id:"acceptance", title:"Acceptance", body:[
    "By creating an account or using any part of Code Mentor, you agree to these Terms of Service. If you do not agree, do not use the platform. These Terms apply to the version of the platform that is currently live during the September 2026 defense window.",
    "You confirm you are at least 16 years old, or have a parent or guardian's consent if you are between 13 and 16. The platform is not intended for users under 13."
  ]},
  { id:"service", title:"Service description", body:[
    "Code Mentor provides AI-powered code review, an adaptive assessment, a personalized learning path, a mentor chat grounded in your submissions, and a Learning CV you can share. We integrate static analyzers (Bandit, ESLint, Cppcheck, and others) and a large language model to produce structured feedback.",
    "We do not provide: certifications recognized by any governmental authority, paid mentoring by a human reviewer, or legal advice on the code you submit. The platform is an educational tool, not a substitute for professional engineering review."
  ]},
  { id:"account", title:"Account responsibilities", body:[
    "You are responsible for keeping your credentials safe. Do not share your password or session cookie with anyone, do not let another person sign in as you, and do not create multiple accounts to abuse the free quota.",
    "If you suspect your account has been compromised, change your password immediately and email security@codementor.benha.edu.eg. We are not responsible for losses that result from a credential leak you did not report."
  ]},
  { id:"acceptable", title:"Acceptable use", body:[
    "Do not abuse the AI review quota by submitting machine-generated junk, ZIP bombs, or recursive symlinks. Do not run automated scrapers against the platform. Do not submit code containing malware, exploits, or material whose distribution is illegal in Egypt or in your jurisdiction.",
    "We may rate-limit, queue, or refuse submissions that we identify as abusive. Persistent abuse results in account suspension and, in serious cases, an internal note shared with your university's academic integrity office."
  ]},
  { id:"ip", title:"Intellectual property", body:[
    "You retain all ownership of the code you submit. By submitting code, you grant Code Mentor a limited, non-exclusive, non-transferable license to process, embed, and analyze that code for the sole purpose of producing your review and powering the mentor chat for you.",
    "The platform's user interface, brand, illustrations, design tokens, and source code are the property of the project team and the university. You may not copy or republish them without permission."
  ]},
  { id:"ai", title:"AI limitations", body:[
    "Feedback produced by Code Mentor is AI-generated. It may be incorrect, incomplete, or out of date. It is not a substitute for professional code review, security audit, or legal review.",
    "Do not rely on the platform's feedback alone before deploying code to production, before submitting work for grading, or before making any decision with real-world consequences. Always confirm AI suggestions against authoritative sources."
  ]},
  { id:"availability", title:"Availability", body:[
    "We operate the platform on a best-effort basis during the defense window. There is no service-level agreement and no uptime guarantee. We may pause non-critical features (e.g., the mentor chat, the project audit) at short notice if running costs exceed our budget.",
    "Scheduled maintenance windows are announced inside the app at least 24 hours in advance. Emergency maintenance may happen without notice."
  ]},
  { id:"liability", title:"Liability", body:[
    "To the maximum extent permitted by law, the project team's total liability for any claim related to the platform is limited to the fees you have paid us — which is $0 during the MVP and defense period. We are not liable for indirect, incidental, or consequential damages.",
    "Nothing in these Terms limits liability for fraud, willful misconduct, or any other liability that cannot be limited under applicable law."
  ]},
  { id:"changes", title:"Changes", body:[
    "We may update these Terms. Material changes will be notified by email at least 7 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the updated Terms.",
    "The current version of the Terms is always available at this URL. A diff against the prior version is available on request."
  ]},
];

function Privacy(props) {
  return (
    <LegalPage
      {...props}
      title="Privacy Policy"
      lastUpdated="2026-05-07"
      intro="We take a minimum-collection approach: we ask for only what we need to run a review, store it for as long as you keep your account, and never sell, share, or train third-party models on your code."
      sections={PRIVACY_SECTIONS}
    />
  );
}
function Terms(props) {
  return (
    <LegalPage
      {...props}
      title="Terms of Service"
      lastUpdated="2026-05-07"
      intro="Plain-English terms governing your use of Code Mentor during the September 2026 defense window. Read sections 5 and 6 closely — they describe how the AI's limits apply to your work."
      sections={TERMS_SECTIONS}
    />
  );
}

Object.assign(window, { Privacy, Terms });
// 404 + small layout shells used by legal pages

function NotFound({ onNav, dark, setDark }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <div className="fixed top-5 left-5 z-30 no-print"><BrandLogo size="sm"/></div>
      <div className="fixed top-5 right-5 z-30 no-print"><ThemeToggle dark={dark} setDark={setDark}/></div>
      <div className="relative flex flex-col items-center justify-center text-center min-h-screen px-6">
        <div className="relative inline-flex items-center justify-center">
          <h1 className="text-[120px] sm:text-[160px] font-semibold tracking-tighter brand-gradient-text leading-none select-none">
            404
          </h1>
          <span className="absolute -top-1 right-[-10px] sm:right-[-14px] text-primary-400 animate-float pointer-events-none" style={{filter:"drop-shadow(0 0 10px rgba(139,92,246,.7))"}}>
            <Icon name="Sparkles" size={28}/>
          </span>
        </div>
        <h2 className="mt-2 text-[24px] sm:text-[30px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">We couldn't find that page.</h2>
        <p className="mt-3 text-[16px] text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
          It might've been moved, deleted, or maybe the URL has a typo. Try the homepage or browse the task library.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="gradient" size="lg" leftIcon="House" onClick={()=>onNav("landing")}>Go home</Button>
          <Button variant="glass" size="lg" leftIcon="ClipboardList">Browse tasks</Button>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
          <Icon name="CircleAlert" size={12}/>
          <span>requested: <span className="text-primary-700 dark:text-primary-300">/this/path/does-not-exist</span></span>
        </div>
      </div>
    </div>
  );
}

window.NotFound = NotFound;
// Page router + page-switcher pill

const PAGES = [
  { id:"landing",   label:"Landing",       icon:"House",       Comp: () => null },
  { id:"login",     label:"Login",         icon:"LogIn",       Comp: () => null },
  { id:"register",  label:"Register",      icon:"UserPlus",    Comp: () => null },
  { id:"ghsuccess", label:"GitHub Success",icon:"Github",      Comp: () => null },
  { id:"404",       label:"404",           icon:"CircleAlert", Comp: () => null },
  { id:"privacy",   label:"Privacy",       icon:"ShieldCheck", Comp: () => null },
  { id:"terms",     label:"Terms",         icon:"FileText",    Comp: () => null },
];

function PageSwitcher({ page, onNav }) {
  const [open, setOpen] = paUseState(false);
  return (
    <div className="fixed top-3 right-3 z-[200] no-print">
      <div className="glass-frosted rounded-full p-1 flex items-center gap-0.5 shadow-[0_10px_30px_-10px_rgba(15,23,42,.35)]">
        <button
          onClick={()=>setOpen(o=>!o)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
          aria-label="Toggle page switcher"
        >
          <Icon name={open ? "ChevronRight" : "ChevronLeft"} size={14}/>
        </button>
        {open && PAGES.map(p => (
          <button
            key={p.id}
            onClick={()=>onNav(p.id)}
            title={p.label}
            className={[
              "h-8 px-2.5 rounded-full text-[12px] font-medium flex items-center gap-1.5 transition-colors",
              page === p.id
                ? "bg-primary-500 text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.55)]"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10"
            ].join(" ")}
          >
            <Icon name={p.icon} size={12}/>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
        {!open && (
          <div className="px-2.5 h-8 flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
            <Icon name={PAGES.find(p=>p.id===page)?.icon || "House"} size={12}/>
            <span>{PAGES.find(p=>p.id===page)?.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useTheme();
  const [page, setPage] = paUseState("landing");
  const onNav = (id) => {
    setPage(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const props = { onNav, dark, setDark };
  let Page = null;
  switch (page) {
    case "landing":   Page = <Landing {...props} />; break;
    case "login":     Page = <Login {...props} />; break;
    case "register":  Page = <Register {...props} />; break;
    case "ghsuccess": Page = <GitHubSuccess {...props} />; break;
    case "404":       Page = <NotFound {...props} />; break;
    case "privacy":   Page = <Privacy {...props} />; break;
    case "terms":     Page = <Terms {...props} />; break;
    default:          Page = <Landing {...props} />;
  }
  return (
    <>
      <PageSwitcher page={page} onNav={onNav} />
      {Page}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
