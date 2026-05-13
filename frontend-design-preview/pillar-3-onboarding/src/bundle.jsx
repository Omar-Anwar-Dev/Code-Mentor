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
// Assessment Start page — pre-launch screen

function AssessmentStart({ dark, setDark, onBegin }) {
  const [track, setTrack] = asUseState("fullstack");
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <TopBar variant="minimal" dark={dark} setDark={setDark} />
      <main className="relative pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card variant="glass" className="p-7 sm:p-9">
            <div className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1 text-[12px] font-medium text-slate-700 dark:text-slate-200">
              <Icon name="Sparkles" size={11} className="text-primary-500 dark:text-primary-300"/>
              Skill assessment · adaptive
            </div>
            <h1 className="mt-3 text-[34px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1]">
              Let&rsquo;s figure out where you are.
            </h1>
            <p className="mt-3 text-[15px] sm:text-[16px] text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Thirty adaptive questions that calibrate to your level as you answer. We&rsquo;ll plot your strengths across five engineering categories and generate a personalized learning path from the result.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ExpectationTile icon="Clock"      title="~40 minutes" body="Can pause anytime"/>
              <ExpectationTile icon="ListChecks" title="30 questions" body="Difficulty adapts to your answers"/>
              <ExpectationTile icon="Layers"     title="5 categories" body="Correctness · Readability · Security · Performance · Design"/>
              <ExpectationTile icon="TrendingUp" title="Beginner → Advanced" body="Get your level + per-category breakdown"/>
            </div>

            <div className="mt-5">
              <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">Track</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <TrackCard icon="Code"       name="Full Stack" blurb="React + .NET"        selected={track==="fullstack"} onClick={()=>setTrack("fullstack")}/>
                <TrackCard icon="ScanSearch" name="Backend"    blurb="ASP.NET + Python"    selected={track==="backend"}   onClick={()=>setTrack("backend")}/>
                <TrackCard icon="BookOpen"   name="Python"     blurb="Data + Web"          selected={track==="python"}    onClick={()=>setTrack("python")}/>
              </div>
            </div>

            <div className="mt-5">
              <Button variant="gradient" size="lg" leftIcon="Play" rightIcon="ArrowRight" className="w-full" onClick={onBegin}>
                Begin assessment
              </Button>
            </div>

            <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400 text-center">
              You can pause and resume at any time. Re-take available 30 days after completion.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
window.AssessmentStart = AssessmentStart;
// Assessment Question page — exam-mode focused screen

function ProgressDots({ total = 30, current = 11, answered = 10 }) {
  const dots = [];
  for (let i = 1; i <= total; i++) {
    let cls = "w-1.5 h-1.5 rounded-full ";
    if (i <= answered) cls += "bg-primary-500 shadow-[0_0_4px_rgba(139,92,246,.6)]";
    else if (i === current) cls += "ring-2 ring-primary-300 bg-primary-500/30";
    else cls += "bg-slate-300/70 dark:bg-white/15";
    dots.push(<span key={i} className={cls} aria-hidden/>);
  }
  return <div className="flex items-center gap-[3px] mt-1.5 justify-center">{dots}</div>;
}

function ProgressCenter({ current = 11, total = 30, answered = 10 }) {
  const pct = ((current - 1) / total) * 100; // 10 done before current
  return (
    <div className="flex flex-col items-center min-w-0">
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Question <span className="text-slate-800 dark:text-slate-100">{current}</span> of {total}
      </div>
      <div className="mt-1 w-[240px] h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full brand-gradient-bg" style={{ width: pct + '%' }}/>
      </div>
      <ProgressDots total={total} current={current} answered={answered}/>
    </div>
  );
}

function TimerChip({ remaining = "32:18", warn = false }) {
  return (
    <div className={[
      "hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg glass font-mono text-[12.5px]",
      warn ? "text-amber-600 dark:text-amber-300" : "text-slate-700 dark:text-slate-200"
    ].join(" ")}>
      <Icon name="Clock" size={13}/>
      <span>{remaining}</span>
      <span className="text-slate-400 dark:text-slate-500">remaining</span>
    </div>
  );
}

function DifficultyDots({ level = 2, max = 3 }) {
  const dots = [];
  for (let i = 1; i <= max; i++) {
    dots.push(
      <span key={i} className={[
        "w-1.5 h-1.5 rounded-full",
        i <= level ? "bg-primary-500" : "bg-slate-300 dark:bg-white/20"
      ].join(" ")}/>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-white/60 dark:bg-white/[0.04] ring-1 ring-slate-200/70 dark:ring-white/10 text-[11.5px] text-slate-700 dark:text-slate-200">
      <span className="inline-flex items-center gap-[3px]">{dots}</span>
      <span>Difficulty {level}/{max}</span>
    </span>
  );
}

function CodeBlock() {
  const kw  = "text-violet-500 dark:text-violet-300";
  const fn  = "text-cyan-600 dark:text-cyan-300";
  const str = "text-emerald-600 dark:text-emerald-300";
  return (
    <pre className="glass-card p-3.5 text-[12.5px] leading-[1.6] font-mono overflow-x-auto whitespace-pre"><code>
        <div><span className={kw}>def</span> <span className={fn}>get_user_by_email</span>(email):</div>
        <div>{"    "}query = <span className={str}>{"f\"SELECT * FROM users WHERE email = '{email}'\""}</span></div>
        <div>{"    "}<span className={kw}>return</span> db.execute(query).fetchone()</div>
      </code></pre>
  );
}

function AssessmentQuestion({ dark, setDark, onExit }) {
  const [selected, setSelected] = asUseState("C");
  const [exitOpen, setExitOpen] = asUseState(false);

  const opts = [
    { letter:"A", text:"Sanitize the email string using ", code:"email.replace(\"'\", \"\")" },
    { letter:"B", text:"Wrap the query in a try/except block to handle SQL errors gracefully." },
    { letter:"C", text:"Use a parameterized query: ", code:"db.execute('SELECT * FROM users WHERE email = %s', (email,))" },
    { letter:"D", text:"Hash the email before passing it to the query." },
  ];

  return (
    <div className="relative min-h-screen">
      {/* subtle grid only, no orbs */}
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden/>
      <TopBar
        variant="exam"
        dark={dark}
        setDark={setDark}
        onExit={() => setExitOpen(true)}
        center={<ProgressCenter current={11} total={30} answered={10}/>}
        right={<TimerChip remaining="32:18"/>}
      />
      <main className="relative pt-20 pb-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card variant="glass" className="p-5 sm:p-6">
            {/* top row */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <Badge tone="cyan" icon="ScanSearch">Security</Badge>
              <DifficultyDots level={2} max={3}/>
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/60 dark:bg-white/[0.04] ring-1 ring-slate-200/70 dark:ring-white/10 font-mono text-[11.5px] text-slate-500 dark:text-slate-400">
                <Icon name="Timer" size={11}/>~90s
              </span>
            </div>

            <h3 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
              Which of the following correctly mitigates a SQL injection vulnerability in this Python function?
            </h3>

            <div className="mt-3">
              <CodeBlock/>
            </div>

            {/* options */}
            <div className="mt-4 grid grid-cols-1 gap-2">
              {opts.map(o => (
                <AnswerOption
                  key={o.letter}
                  letter={o.letter}
                  text={o.text}
                  code={o.code}
                  selected={selected === o.letter}
                  onClick={() => setSelected(o.letter)}
                />
              ))}
            </div>

            {/* actions */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="ghost" size="md" leftIcon="ArrowLeft">Previous</Button>
              <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400">Skip this question</Button>
              <Button variant="gradient" size="md" rightIcon="ArrowRight">Next</Button>
            </div>
          </Card>

          <p className="mt-3 text-center text-[11.5px] font-mono text-slate-500 dark:text-slate-400">
            <Icon name="Keyboard" size={11} className="inline -mt-0.5 mr-1"/>
            Tip: press <span className="text-slate-700 dark:text-slate-200">A</span>–<span className="text-slate-700 dark:text-slate-200">D</span> to select, <span className="text-slate-700 dark:text-slate-200">Enter</span> to continue
          </p>
        </div>
      </main>

      <ExitModal open={exitOpen} onClose={() => setExitOpen(false)} onConfirm={() => { setExitOpen(false); onExit?.(); }} answered={10}/>
    </div>
  );
}
window.AssessmentQuestion = AssessmentQuestion;
// Assessment Results page — mirrors the canonical frontend/src/features/assessment/AssessmentResults.tsx
// structure (Trophy pill header → Track Assessment h1 → Status·Duration → Score+Skill breakdown 2-col →
// Per-category scores list → Strengths/Focus areas → Retake + Continue to dashboard), with the
// Neon & Glass identity preserved (glass cards, signature-gradient progress fills, custom ScoreGauge + RadarChart).

function AssessmentResults({ dark, setDark, onGenerate }) {
  // Mock data structured like the real assessmentSlice result payload.
  const result = {
    track: "Full Stack",
    status: "Completed",
    totalScore: 76,
    skillLevel: "Intermediate",
    answeredCount: 28,
    totalQuestions: 30,
    durationSec: 2322, // 38m 42s
    categoryScores: [
      { category:"Correctness", score:84, correctCount:5, totalAnswered:6 },
      { category:"Readability", score:81, correctCount:7, totalAnswered:8 },
      { category:"Security",    score:58, correctCount:4, totalAnswered:7 },
      { category:"Performance", score:65, correctCount:3, totalAnswered:5 },
      { category:"Design",      score:72, correctCount:3, totalAnswered:4 },
    ],
  };

  const overallScore = Math.round(result.totalScore);
  const level = result.skillLevel;
  const grade =
    overallScore >= 90 ? "A" :
    overallScore >= 80 ? "A-" :
    overallScore >= 70 ? "B" :
    overallScore >= 60 ? "C" :
    overallScore >= 50 ? "D" : "F";

  const radarData = result.categoryScores.map(c => ({ label: c.category, value: c.score }));
  const strengths = result.categoryScores
    .filter(c => c.score >= 70)
    .sort((a,b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.category);
  const weaknesses = result.categoryScores
    .filter(c => c.score < 60)
    .sort((a,b) => a.score - b.score)
    .slice(0, 3)
    .map(c => c.category);

  const minutes = Math.floor(result.durationSec / 60);
  const seconds = result.durationSec % 60;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      <TopBar variant="minimal" dark={dark} setDark={setDark} />
      <main className="relative pt-20 pb-10 px-4">
        <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
          {/* Header — centered */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-3 brand-gradient-bg text-white rounded-full px-4 py-1.5 text-[13px] font-medium shadow-[0_8px_24px_-10px_rgba(139,92,246,.55)]">
              <Icon name="Trophy" size={14}/>
              Assessment complete
            </div>
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {result.track} Assessment
            </h1>
            <p className="mt-2 text-[13.5px] text-slate-600 dark:text-slate-400">
              Status: <span className="font-semibold text-slate-800 dark:text-slate-200">{result.status}</span>
              {' · '}
              Duration: <span className="font-mono">{minutes}m {seconds}s</span>
            </p>
          </div>

          {/* Score + Skill breakdown — 2-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card variant="glass" className="p-6 flex flex-col items-center justify-center">
              <ScoreGauge score={overallScore} size={160} stroke={12}/>
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge tone="primary" icon="Gauge">{level}</Badge>
                  <Badge tone="neutral">Grade {grade}</Badge>
                </div>
                <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
                  Answered <span className="font-mono text-slate-800 dark:text-slate-200">{result.answeredCount}</span> of <span className="font-mono text-slate-800 dark:text-slate-200">{result.totalQuestions}</span> questions
                </p>
              </div>
            </Card>
            <Card variant="glass" className="p-5">
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-2">Skill breakdown</h3>
              <RadarChart data={radarData} size={280}/>
            </Card>
          </div>

          {/* Per-category scores list */}
          <Card variant="glass" className="p-5">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-4">Per-category scores</h3>
            <div className="space-y-3.5">
              {result.categoryScores.map(c => (
                <div key={c.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13.5px] font-medium text-slate-700 dark:text-slate-200">{c.category}</span>
                    <span className="text-[12.5px] text-slate-500 dark:text-slate-400 font-mono">
                      {c.correctCount}/{c.totalAnswered} correct · {Math.round(c.score)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full brand-gradient-bg" style={{ width: c.score + '%' }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Strengths + Focus areas — 2-col (conditional) */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <Card variant="glass" className="p-5">
                  <h3 className="text-[15px] font-semibold mb-3 text-emerald-600 dark:text-emerald-400">Strengths</h3>
                  <ul className="space-y-2 list-disc list-inside text-[13.5px] text-slate-700 dark:text-slate-300">
                    {strengths.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </Card>
              )}
              {weaknesses.length > 0 && (
                <Card variant="glass" className="p-5">
                  <h3 className="text-[15px] font-semibold mb-3 text-amber-600 dark:text-amber-400">Focus areas</h3>
                  <ul className="space-y-2 list-disc list-inside text-[13.5px] text-slate-700 dark:text-slate-300">
                    {weaknesses.map(w => <li key={w}>{w}</li>)}
                  </ul>
                  <p className="mt-3 text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your personalized learning path is being generated around these areas. Check the Dashboard or Learning Path in a few seconds.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Actions — right-aligned */}
          <div className="flex flex-wrap justify-end gap-2.5 pt-1">
            <Button variant="glass" size="md" leftIcon="RotateCcw">
              Retake (available after 30 days)
            </Button>
            <Button variant="gradient" size="md" rightIcon="ArrowRight" onClick={onGenerate}>
              Continue to dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
window.AssessmentResults = AssessmentResults;
// Assessment app — page switcher + router

const AS_PAGES = [
  { key:"start",    label:"Start",    icon:"Play" },
  { key:"question", label:"Question", icon:"HelpCircle" },
  { key:"results",  label:"Results",  icon:"Trophy" },
];

function AsPageSwitcher({ page, setPage }) {
  const [open, setOpen] = asUseState(true);
  return (
    <div className="fixed top-3 right-3 z-[200] no-print">
      {open ? (
        <div className="glass-frosted rounded-full p-1 flex items-center gap-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]">
          {AS_PAGES.map(p => (
            <button
              key={p.key}
              onClick={()=>setPage(p.key)}
              className={[
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors ring-brand",
                p.key === page
                  ? "bg-primary-500 text-white shadow-[0_0_0_3px_rgba(139,92,246,.18)]"
                  : "text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10"
              ].join(" ")}
            >
              <Icon name={p.icon} size={11}/>
              {p.label}
            </button>
          ))}
          <button
            onClick={()=>setOpen(false)}
            aria-label="Collapse"
            className="w-7 h-7 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10 inline-flex items-center justify-center"
          >
            <Icon name="ChevronUp" size={12}/>
          </button>
        </div>
      ) : (
        <button
          onClick={()=>setOpen(true)}
          className="glass-frosted rounded-full h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 shadow-[0_10px_30px_-10px_rgba(15,23,42,.4)]"
        >
          <Icon name="LayoutGrid" size={13}/>
          Pages
        </button>
      )}
    </div>
  );
}

function AssessmentApp() {
  const [dark, setDark] = useTheme();
  const [page, setPage] = asUseState("start");

  const onBegin    = () => setPage("question");
  const onExit     = () => setPage("start");
  const onGenerate = () => setPage("start"); // preview-only

  return (
    <>
      <AsPageSwitcher page={page} setPage={setPage}/>
      {page === "start"    && <AssessmentStart    dark={dark} setDark={setDark} onBegin={onBegin}/>}
      {page === "question" && <AssessmentQuestion dark={dark} setDark={setDark} onExit={onExit}/>}
      {page === "results"  && <AssessmentResults  dark={dark} setDark={setDark} onGenerate={onGenerate}/>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AssessmentApp/>);
