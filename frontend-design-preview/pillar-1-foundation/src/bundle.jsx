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
// Sections 1-4: Hero/AnimatedBackground, Colors, Typography, Buttons

const ANIM_BG = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    {/* gradient orbs */}
    <div
      className="absolute -top-24 -left-24 w-[384px] h-[384px] rounded-full blur-3xl opacity-70 animate-pulse"
      style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.45), rgba(168,85,247,0.4))" }}
    />
    <div
      className="absolute top-1/3 -right-20 w-[320px] h-[320px] rounded-full blur-3xl opacity-70 animate-pulse"
      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.35), rgba(59,130,246,0.35))", animationDelay: "1s" }}
    />
    <div
      className="absolute -bottom-24 left-1/4 w-[256px] h-[256px] rounded-full blur-3xl opacity-60 animate-pulse"
      style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.35), rgba(249,115,22,0.3))", animationDelay: "2s" }}
    />
    {/* grid overlay */}
    <div className="absolute inset-0 bg-grid" />
    {/* floating particles */}
    <span className="absolute left-[18%] top-[28%] w-1.5 h-1.5 rounded-full bg-primary-400 animate-float opacity-60" />
    <span className="absolute right-[22%] top-[60%] w-1.5 h-1.5 rounded-full bg-secondary-400 animate-float opacity-50" style={{ animationDelay: "2.5s" }} />
    <span className="absolute left-[45%] bottom-[14%] w-2 h-2 rounded-full bg-fuchsia-400 animate-float opacity-50" style={{ animationDelay: "4s" }} />
  </div>
);

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <ANIM_BG />
      <div className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-28 pb-28 sm:pt-36 sm:pb-32 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full pl-2 pr-3 py-1 mb-7">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white">
            <Icon name="Sparkles" size={11} />
          </span>
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">Design System v1 — September 2026</span>
        </div>
        <h1 className="text-[44px] sm:text-[64px] leading-[1.05] font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
          Code Mentor — <span className="brand-gradient-text">Neon &amp; Glass</span> Design System
        </h1>
        <p className="mt-6 text-[16px] sm:text-[18px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Canonical reference for the visual identity. Every page in the platform inherits from this — colors, surfaces, motion, and rhythm.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Button variant="gradient" size="lg" leftIcon="Rocket" rightIcon="ArrowRight">Launch tour</Button>
          <Button variant="glass" size="lg" leftIcon="Github">View on GitHub</Button>
        </div>

        {/* live system stats */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { k: "112", v: "tokens" },
            { k: "38", v: "components" },
            { k: "5", v: "glass variants" },
            { k: "9", v: "neon utilities" },
          ].map((s) => (
            <div key={s.v} className="glass-card px-4 py-3 text-left">
              <div className="font-mono text-[22px] text-slate-900 dark:text-slate-50">{s.k}</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── COLORS ─────────────────────────── */
const PRIMARY_LADDER = [
  ["50","#f5f3ff"],["100","#ede9fe"],["200","#ddd6fe"],["300","#c4b5fd"],
  ["400","#a78bfa"],["500","#8b5cf6"],["600","#7c3aed"],["700","#6d28d9"],
  ["800","#5b21b6"],["900","#4c1d95"],["950","#2e1065"]
];
const SECONDARY_LADDER = [["400","#22d3ee"],["500","#06b6d4"],["600","#0891b2"]];
const ACCENT_LADDER    = [["400","#e879f9"],["500","#d946ef"],["600","#c026d3"]];

function Ladder({ stops }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200/60 dark:border-white/10">
      {stops.map(([k, c]) => (
        <div key={k} className="flex-1 min-w-0 group relative" title={`${k} — ${c}`}>
          <div className="h-9" style={{ background: c }} />
          <div className="px-1.5 py-1 text-[10px] font-mono text-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60">{k}</div>
        </div>
      ))}
    </div>
  );
}

function BrandColorCard({ name, role, hex, swatch, ladder, gradientChip }) {
  return (
    <Card variant="default" className="overflow-hidden">
      <div className="h-32 relative" style={{ background: swatch }}>
        {gradientChip ? (
          <div className="absolute inset-0 brand-gradient-bg opacity-0" />
        ) : null}
        <div className="absolute left-4 bottom-4 text-white/90 font-mono text-[11px] backdrop-blur-sm bg-black/20 rounded-md px-1.5 py-0.5">
          {hex}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{name}</div>
          <code className="font-mono text-[12px] text-slate-500">{hex}</code>
        </div>
        <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{role}</p>
        <div className="mt-4"><Ladder stops={ladder} /></div>
      </div>
    </Card>
  );
}

function ColorsSection() {
  const semantic = [
    { name:"Success", role:"Emerald 500", hex:"#10b981", c:"#10b981" },
    { name:"Warning", role:"Amber 500",   hex:"#f59e0b", c:"#f59e0b" },
    { name:"Error",   role:"Red 500",     hex:"#ef4444", c:"#ef4444" },
    { name:"Info",    role:"Cyan 500",    hex:"#06b6d4", c:"#06b6d4" },
  ];
  return (
    <Section id="colors" eyebrow="02 — Colors" title="Brand trio + semantic + signature gradient"
      description="Violet ≈ 60% of color use. Cyan ≈ 25%. Fuchsia ≈ 15% — celebration only. No other hues.">
      {/* 2a: brand trio */}
      <div className="grid md:grid-cols-3 gap-5">
        <BrandColorCard name="Primary — Violet" role="Main accent, surfaces, focus rings"
          hex="#8b5cf6" swatch="#8b5cf6" ladder={PRIMARY_LADDER} />
        <BrandColorCard name="Secondary — Cyan" role="Data, links, supportive signal"
          hex="#06b6d4" swatch="#06b6d4" ladder={SECONDARY_LADDER} />
        <BrandColorCard name="Accent — Fuchsia" role="Celebration & emphasis moments"
          hex="#d946ef" swatch="#d946ef" ladder={ACCENT_LADDER} />
      </div>

      {/* 2b: semantic */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {semantic.map(s => (
          <Card key={s.name} variant="default" className="overflow-hidden">
            <div className="h-16" style={{ background: s.c }} />
            <div className="p-4">
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">{s.name}</div>
              <div className="flex items-baseline justify-between mt-0.5">
                <div className="text-[12px] text-slate-500">{s.role}</div>
                <code className="font-mono text-[11.5px] text-slate-500">{s.hex}</code>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 2c: signature gradient */}
      <div className="mt-10 relative rounded-2xl overflow-hidden brand-gradient-bg p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.18),transparent_60%)]" />
        <div className="relative flex flex-col gap-2 text-white">
          <div className="text-[12px] font-mono uppercase tracking-[0.2em] text-white/80">Signature gradient</div>
          <div className="text-[22px] sm:text-[28px] font-semibold tracking-tight">Cyan → Blue → Violet → Pink</div>
          <code className="mt-2 font-mono text-[12.5px] text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit">
            linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899)
          </code>
          <p className="mt-2 text-[13.5px] text-white/85 max-w-2xl">
            Reserved for: animated card border on hover, hero CTAs, brand logo container. One per surface, never twice.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── TYPOGRAPHY ─────────────────────────── */
function TypeRow({ tag, sample, sizeMobile, sizeDesktop, weight, tracking, El = "div" }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-8 py-5 border-b border-slate-200/70 dark:border-white/5 last:border-0">
      <div className="md:w-2/3">
        <El className={[
          "tracking-tight font-semibold text-slate-900 dark:text-slate-50",
          tag === "h1" ? "text-[36px] md:text-[48px] leading-[1.05]" :
          tag === "h2" ? "text-[30px] md:text-[36px] leading-[1.1]" :
          tag === "h3" ? "text-[24px] md:text-[30px] leading-[1.15]" :
                          "text-[20px] md:text-[24px] leading-[1.2]"
        ].join(" ")}>
          {sample}
        </El>
      </div>
      <div className="md:w-1/3 font-mono text-[11.5px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-primary-600 dark:text-primary-300">{tag}</span>
        <span>{sizeMobile} / {sizeDesktop}</span>
        <span>{weight}</span>
        <span>{tracking}</span>
      </div>
    </div>
  );
}

function CodeBlock() {
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const K = ({children}) => <span style={{color:"#a78bfa"}}>{children}</span>;
  const S = ({children}) => <span style={{color:"#34d399"}}>{children}</span>;
  const F = ({children}) => <span style={{color:"#22d3ee"}}>{children}</span>;
  const C = ({children}) => <span className="italic text-slate-500">{children}</span>;
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70"></span>
          <span className="ml-3 font-mono text-[11.5px] text-slate-500">useFeedbackPolling.ts</span>
        </div>
        <Button variant="ghost" size="sm" leftIcon={copied ? "Check" : "Copy"} onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="px-4 py-4 text-[13px] leading-[1.7] font-mono overflow-x-auto whitespace-pre">
<C>{"// Polls submission status until the AI review is ready."}</C>{"\n"}
<K>export function </K><F>useFeedbackPolling</F>{"(submissionId: string) {\n"}
{"  "}<K>const </K>{"[status, setStatus] = React."}<F>useState</F>{"("}<S>"queued"</S>{");\n"}
{"  React."}<F>useEffect</F>{"(() => {\n"}
{"    "}<K>const </K>{"id = "}<F>setInterval</F>{"("}<K>async </K>{"() => {\n"}
{"      "}<K>const </K>{"res = "}<K>await </K><F>fetchStatus</F>{"(submissionId);\n"}
{"      setStatus(res.status);\n"}
{"      "}<K>if </K>{"(res.status === "}<S>"ready"</S>{") "}<F>clearInterval</F>{"(id);\n"}
{"    }, 1500);\n"}
{"  }, [submissionId]);\n"}
{"  "}<K>return </K>{"status;\n"}
{"}"}
      </pre>
    </div>
  );
}

function TypographySection() {
  return (
    <Section id="typography" eyebrow="03 — Typography" title="Inter for UI. JetBrains Mono for code."
      description="Variable axes, tight tracking on display sizes, contextual ligatures on code.">
      <Card variant="glass" className="p-2 md:p-4">
        <div className="p-5">
          <TypeRow tag="h1" El="div" sample="Senior-level feedback in five minutes." sizeMobile="36px/40" sizeDesktop="48px/52" weight="600" tracking="-0.025em" />
          <TypeRow tag="h2" El="div" sample="Submit your code. We'll handle the review." sizeMobile="30px/36" sizeDesktop="36px/42" weight="600" tracking="-0.025em" />
          <TypeRow tag="h3" El="div" sample="Pattern matching, static analysis, mentor chat." sizeMobile="24px/30" sizeDesktop="30px/36" weight="600" tracking="-0.025em" />
          <TypeRow tag="h4" El="div" sample="Annotations are inline and structured." sizeMobile="20px/26" sizeDesktop="24px/30" weight="600" tracking="-0.025em" />
        </div>
        <div className="px-5 pb-6">
          <p className="text-[15px] leading-[1.7] text-slate-700 dark:text-slate-300 max-w-3xl">
            Code Mentor closes the gap between basic coding literacy and professional engineering competency.
            Submit your code, get a senior-developer review in under five minutes, then keep iterating with the AI
            mentor on architecture, edge cases, and style — until the work is portfolio-grade.
          </p>
          <p className="text-[13px] mt-3 text-slate-500 dark:text-slate-400">
            Inline code:&nbsp;
            <code className="font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[12.5px] text-primary-700 dark:text-primary-300">const score = await analyzeSubmission(submissionId);</code>
          </p>
        </div>
      </Card>
      <div className="mt-5"><CodeBlock /></div>
    </Section>
  );
}

/* ─────────────────────────── BUTTONS ─────────────────────────── */
const VARIANTS = [
  { v: "primary",   label: "Run review",  icon: "Play" },
  { v: "secondary", label: "View report", icon: "FileText" },
  { v: "outline",   label: "Save draft",  icon: "Bookmark" },
  { v: "ghost",     label: "Dismiss",     icon: "X" },
  { v: "danger",    label: "Delete",      icon: "Trash2" },
  { v: "gradient",  label: "Submit & celebrate", icon: "Sparkles" },
  { v: "neon",      label: "Open in editor",     icon: "Code" },
  { v: "glass",     label: "Skim feedback",      icon: "Eye" },
];

function ButtonsSection() {
  return (
    <Section id="buttons" eyebrow="04 — Buttons" title="Eight variants × three sizes"
      description="Verbs first. Icons reinforce meaning. Hover lifts the surface 2px and grows the shadow.">
      <Card variant="default" className="p-6 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-x-5 gap-y-3 items-center">
            <div></div>
            {["sm","md","lg"].map(s => (
              <div key={s} className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">{s}</div>
            ))}
            {VARIANTS.map(({v, label, icon}) => (
              <React.Fragment key={v}>
                <div className="font-mono text-[11.5px] text-slate-500">{v}</div>
                {["sm","md","lg"].map(s => (
                  <div key={s}><Button variant={v} size={s} leftIcon={icon}>{label}</Button></div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid md:grid-cols-2 gap-5">
        <Card variant="bordered" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">States</div>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary" leftIcon="Play">Default</Button>
            <Button variant="primary" leftIcon="Play" className="-translate-y-0.5 shadow-[0_8px_24px_-8px_rgba(139,92,246,.6)]">Hover</Button>
            <Button variant="primary" leftIcon="Play" className="ring-2 ring-primary-400/60 ring-offset-2 ring-offset-white dark:ring-offset-slate-900">Focus</Button>
            <Button variant="primary" leftIcon="Play" disabled>Disabled</Button>
            <Button variant="primary" loading>Reviewing…</Button>
          </div>
          <div className="mt-5 flex items-center gap-2 text-[12px] text-slate-500">
            <Icon name="ArrowRight" size={12} className="text-primary-500" />
            <span className="font-mono">hover →</span>
            <span>peer demonstrates lift + violet glow</span>
          </div>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">CTAs in context</div>
          <div className="flex flex-col gap-3">
            <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight" className="w-full">Submit for review</Button>
            <Button variant="neon" size="lg" leftIcon="Code" className="w-full">Open inline annotations</Button>
            <div className="flex gap-2">
              <Button variant="outline" leftIcon="GitBranch" className="flex-1">Connect repo</Button>
              <Button variant="ghost" leftIcon="Upload" className="flex-1">Upload ZIP</Button>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}

Object.assign(window, { HeroSection, ColorsSection, TypographySection, ButtonsSection });
// Sections 5-9: Cards, Inputs, Badges, Progress, Tabs + Modal

function CardsSection() {
  const cards = [
    { v:"default",  title:"Pattern Matching Quiz",  subtitle:"Module 3 · 12 questions",
      body:"Hands-on practice with regex, glob, and trie-based search. Auto-graded with line-level feedback.",
      meta:"Updated 2 hours ago", cta:"Continue" },
    { v:"bordered", title:"Submission #142",        subtitle:"trie-fuzzy-search.ts",
      body:"Last reviewed by Mentor v2.3 — 3 warnings, 1 suggestion. Diff is ready to apply.",
      meta:"Reviewed 14 min ago", cta:"View diff" },
    { v:"elevated", title:"Active path",             subtitle:"Backend Foundations",
      body:"Database transactions next. You've cleared 7 of 11 milestones in this track.",
      meta:"Streak: 6 days", cta:"Resume" },
    { v:"glass",    title:"Mentor session",          subtitle:"asked about SQL injection",
      body:"Picks up where you left off. Context window includes your last 3 submissions.",
      meta:"Online · GPT-grade", cta:"Open chat" },
    { v:"neon",     title:"Capstone score",          subtitle:"Final review · graded",
      body:(<><span>Distinction-level result. Hover this card to feel the brand.</span>
        <div className="font-mono text-[28px] mt-2 text-primary-600 dark:text-primary-300">94<span className="text-slate-400 text-[16px]">/100</span></div></>),
      meta:"Locked-in 4 days ago", cta:"Share" },
  ];
  return (
    <Section id="cards" eyebrow="05 — Cards" title="Five surfaces, one rhythm"
      description="Default for product. Glass for ambient context. Neon for moments worth pausing on — hover the last one.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((c, i) => (
          <Card key={i} variant={c.v}>
            <CardHeader title={c.title} subtitle={c.subtitle}
              right={<Badge tone={c.v==="neon"?"primary":c.v==="glass"?"cyan":"neutral"}>{c.v}</Badge>} />
            <CardBody>{c.body}</CardBody>
            <CardFooter>
              <Button variant={c.v==="neon"?"gradient":"outline"} size="sm" rightIcon="ArrowRight">{c.cta}</Button>
              <span className="text-[12px] text-slate-500">{c.meta}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── INPUTS ─────────────────────────── */
function InputsSection() {
  const [project, setProject] = useState("Trie-based fuzzy search");
  const [model, setModel] = useState("gpt-4o-mini");
  return (
    <Section id="inputs" eyebrow="06 — Inputs" title="Forms with weight and clarity"
      description="Labels above. Helper below. Errors red, never shouting. Glass variant for editorial moments.">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="default" className="p-6 space-y-5">
          <Field label="Email address" helper="We never share your email." error="Invalid format">
            <TextInput value="ahmed.kahin@benha.edu" error placeholder="you@university.edu" readOnly />
          </Field>
          <Field label="Search submissions">
            <TextInput prefix="Search" placeholder="Find by title, repo, or score…" />
          </Field>
          <Field label="Model" helper="Used for the inline annotation pass.">
            <Select value={model} onChange={setModel} options={[
              { value:"gpt-4o-mini", label:"GPT-4o mini · fast"},
              { value:"gpt-4o",       label:"GPT-4o · balanced"},
              { value:"o1-pro",       label:"o1-pro · deep review"},
            ]}/>
          </Field>
        </Card>

        <Card variant="glass" className="p-6 space-y-5">
          <Field label="Project name" helper="Visible to mentors in the dashboard.">
            <TextInput variant="glass" value={project} onChange={(e)=>setProject(e.target.value)} placeholder="Trie-based fuzzy search" />
          </Field>
          <Field label="Notes for the reviewer" helper="Max 2000 chars.">
            <Textarea variant="glass" rows={3} defaultValue="Targeting O(k·n) lookup. Worried about edge cases when the trie depth exceeds 12." />
          </Field>
          <div className="flex items-center justify-between pt-1">
            <Badge tone="primary" icon="Lock">private until graded</Badge>
            <Button variant="gradient" leftIcon="Send">Submit for review</Button>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ─────────────────────────── BADGES ─────────────────────────── */
function BadgesSection() {
  return (
    <Section id="badges" eyebrow="07 — Badges" title="Status, identity, and signal"
      description="Tonal pairs for routine state. Outlined neon variants for identity. Pulsing only for things that are truly live.">
      <Card variant="default" className="p-6 space-y-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Status</div>
          <div className="flex flex-wrap gap-2.5">
            <Badge tone="success"    icon="CircleCheck">Completed</Badge>
            <Badge tone="processing" icon="LoaderCircle">Processing</Badge>
            <Badge tone="failed"     icon="CircleAlert">Failed</Badge>
            <Badge tone="pending"    icon="Clock">Pending</Badge>
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Identity</div>
          <div className="flex flex-wrap gap-2.5">
            <Badge tone="primary" icon="Sparkles">AI</Badge>
            <Badge tone="cyan"    icon="FlaskConical">Beta</Badge>
            <Badge tone="fuchsia" icon="Crown">Pro</Badge>
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Live</div>
          <div className="flex flex-wrap gap-2.5 items-center">
            <Badge tone="primary" glow pulse icon="Radio">Live</Badge>
            <span className="text-[12.5px] text-slate-500">violet glow + 2s pulse — for streaming reviews only</span>
          </div>
        </div>
      </Card>
    </Section>
  );
}

/* ─────────────────────────── PROGRESS + GAUGE + STATS ─────────────────────────── */
function RadialScore({ value=85 }) {
  const r = 16, c = 2*Math.PI*r;
  const dash = (value/100)*c;
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="url(#gauge)" strokeWidth="3"
          strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-[36px] leading-none text-slate-900 dark:text-slate-50">{value}</div>
        <div className="text-[11px] text-slate-500 mt-1">score</div>
      </div>
    </div>
  );
}

function ProgressSection() {
  return (
    <Section id="progress" eyebrow="08 — Progress" title="Bars, gauges, and momentum signals"
      description="One linear bar, one radial gauge, three stat cards. Trend arrows when motion matters.">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card variant="default" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-3">Linear progress</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13.5px] text-slate-700 dark:text-slate-300">Backend Foundations</span>
            <span className="font-mono text-[12.5px] text-slate-500">67% complete</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500" style={{width:"67%"}} />
          </div>
          <div className="mt-4 flex items-center justify-between text-[12px] text-slate-500">
            <span>7 of 11 milestones</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Icon name="TrendingUp" size={12}/> +14% this week</span>
          </div>
        </Card>

        <Card variant="glass" className="p-6 flex flex-col items-center justify-center">
          <RadialScore value={85} />
          <div className="mt-3 text-[12.5px] text-slate-500 text-center">Last submission · 85/100 · distinction</div>
        </Card>

        <div className="grid grid-cols-1 gap-3">
          {[
            { k:"Submissions", v:"24",     trend:"+3" },
            { k:"Avg score",   v:"78",     trend:"+6" },
            { k:"Streak",      v:"6 days", trend:"+1" },
          ].map(s => (
            <Card key={s.k} variant="default" className="p-4 flex items-center justify-between">
              <div>
                <div className="text-[12px] text-slate-500">{s.k}</div>
                <div className="font-mono text-[24px] text-slate-900 dark:text-slate-50 mt-0.5">{s.v}</div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[12px]">
                <Icon name="TrendingUp" size={14} />{s.trend}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── TABS + MODAL ─────────────────────────── */
function TabsModalSection() {
  const [tab, setTab] = useState("Overview");
  const [open, setOpen] = useState(false);
  const [pathChoice, setPathChoice] = useState("backend");
  const tabs = ["Overview","Annotations","Mentor Chat","History"];
  return (
    <Section id="tabs" eyebrow="09 — Tabs &amp; Modal" title="Navigation and momentary surfaces"
      description="Tabs use a 2px primary underline, never a pill background. Modals are frosted, ESC-aware, focus-trapped.">
      <Card variant="default" className="p-6">
        <div className="flex items-center border-b border-slate-200/70 dark:border-white/10 overflow-x-auto">
          {tabs.map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className={[
                "h-11 px-4 text-[14px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                tab === t
                  ? "border-primary-500 text-primary-700 dark:text-primary-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              ].join(" ")}>
              {t}
            </button>
          ))}
          <div className="ml-auto">
            <Button variant="outline" size="sm" leftIcon="Plus" onClick={()=>setOpen(true)}>Open modal</Button>
          </div>
        </div>
        <div className="mt-5 text-[14px] text-slate-700 dark:text-slate-300">
          Tab content for: <span className="font-semibold text-slate-900 dark:text-slate-50">{tab}</span>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={()=>setOpen(false)}
        title="Add task to your learning path"
        footer={
          <>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button variant="gradient" leftIcon="Sparkles" onClick={()=>setOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p>Pick a track for "Trie-based fuzzy search". The mentor will tune feedback to that track's standards.</p>
        <Field label="Path">
          <Select value={pathChoice} onChange={setPathChoice} variant="glass" options={[
            { value:"backend",    label:"Backend Foundations"},
            { value:"algorithms", label:"Algorithms & Data Structures"},
            { value:"systems",    label:"Distributed Systems · advanced"},
          ]}/>
        </Field>
      </Modal>
    </Section>
  );
}

Object.assign(window, { CardsSection, InputsSection, BadgesSection, ProgressSection, TabsModalSection });
// Sections 10-15: Toasts, Glass showcase, Neon showcase, Icons, Empty state, Code annotation signature

function ToastsSection() {
  return (
    <Section id="toasts" eyebrow="10 — Toasts" title="Stacked top-right, glass surface"
      description="Tone-coded by intent. Icons left, tight typography, never blocking content underneath.">
      <Card variant="default" className="relative p-6 min-h-[340px] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <Toast tone="success" title="Submission #142 completed" body="Review in 4m 12s. Score: 85/100." />
          <Toast tone="error"   title="Upload failed — file too large" body="ZIP exceeds the 25 MB limit. Trim node_modules and retry." />
          <Toast tone="warning" title="Connection slow — retrying" body="Switching to a lower-bandwidth review tier." />
          <Toast tone="info"    title="AI is reviewing your code…" body="Stage 2 of 4 · pattern matching pass." />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Stacked toast container</div>
        <div className="mt-2 text-[14px] text-slate-600 dark:text-slate-400 max-w-md">
          Fixed position, 8px gap, max 4 visible at once. New entries push older ones down with a 200ms slide.
        </div>
      </Card>
    </Section>
  );
}

/* ─────────────────────────── GLASS SHOWCASE ─────────────────────────── */
function GlassShowcase() {
  const variants = [
    { cls:"glass",          name:".glass",          desc:"Chrome glass for sticky headers & nav." },
    { cls:"glass-card",     name:".glass-card",     desc:"Default card surface — ambient context." },
    { cls:"glass-card glass-card-neon", name:".glass-card-neon", desc:"Reveals a rainbow border on hover." },
    { cls:"glass-frosted",  name:".glass-frosted",  desc:"Thicker blur for modals and sheets." },
    { cls:"glass-shimmer glass-card",  name:".glass-shimmer",  desc:"Light sweep every 3s — celebration only." },
  ];
  return (
    <Section id="glass" eyebrow="11 — Glass surfaces" title="Five variants, one vocabulary"
      description="Backdrop blur + subtle border + tonal background. Hover the third card.">
      <div className="relative">
        {/* ambient orbs behind glass to make it visible */}
        <div className="absolute -top-10 left-10 w-72 h-72 rounded-full blur-3xl opacity-50"
             style={{background:"radial-gradient(closest-side, rgba(139,92,246,.5), transparent)"}} />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-50"
             style={{background:"radial-gradient(closest-side, rgba(6,182,212,.5), transparent)"}} />
        <div className="absolute -bottom-10 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-40"
             style={{background:"radial-gradient(closest-side, rgba(236,72,153,.45), transparent)"}} />
        <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {variants.map(v => (
            <div key={v.name} className={["p-6 rounded-2xl", v.cls].join(" ")}>
              <div className="font-mono text-[12px] text-primary-700 dark:text-primary-200">{v.name}</div>
              <div className="mt-3 text-[14px] text-slate-700 dark:text-slate-200">{v.desc}</div>
              <div className="mt-5 flex items-center justify-between text-[12px] text-slate-500">
                <span>blur · saturate · border</span>
                <Icon name="Layers" size={14}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── NEON SHOWCASE ─────────────────────────── */
function NeonShowcase() {
  const shadows = [
    { cls:"shadow-neon",        label:"shadow-neon",        color:"violet" },
    { cls:"shadow-neon-cyan",   label:"shadow-neon-cyan",   color:"cyan" },
    { cls:"shadow-neon-purple", label:"shadow-neon-purple", color:"purple" },
    { cls:"shadow-neon-pink",   label:"shadow-neon-pink",   color:"pink" },
    { cls:"shadow-neon-green",  label:"shadow-neon-green",  color:"green" },
  ];
  const texts = [
    { cls:"text-neon",        word:"AI" },
    { cls:"text-neon-cyan",   word:"LIVE" },
    { cls:"text-neon-purple", word:"VERIFIED" },
    { cls:"text-neon-pink",   word:"ACTIVE" },
    { cls:"text-neon-green",  word:"PRO" },
  ];
  return (
    <Section id="neon" eyebrow="12 — Neon effects" title="Glow, pulse, float — used with discipline"
      description="Never on body text. Never on rest state. Hover, focus, &ldquo;is live&rdquo;, and selection only.">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Column A: neon shadows on buttons */}
        <Card variant="glass" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">Shadows on buttons</div>
          <div className="flex flex-col gap-3">
            {shadows.map(s => (
              <div key={s.cls} className="flex items-center justify-between gap-3">
                <button className={["h-10 px-4 rounded-xl text-[13.5px] font-medium text-white",
                  s.color==="violet" ? "bg-primary-500" :
                  s.color==="cyan"   ? "bg-secondary-500" :
                  s.color==="purple" ? "bg-primary-600" :
                  s.color==="pink"   ? "bg-fuchsia-500" :
                                       "bg-emerald-500",
                  s.cls].join(" ")}>
                  {s.color}
                </button>
                <code className="font-mono text-[11.5px] text-slate-500">.{s.cls}</code>
              </div>
            ))}
          </div>
        </Card>

        {/* Column B: neon text */}
        <Card variant="glass" className="p-6 bg-slate-900/95 dark:bg-slate-900/60">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-4">Text shadows</div>
          <div className="flex flex-col gap-3">
            {texts.map(t => (
              <div key={t.cls} className="flex items-center justify-between gap-3">
                <span className={["font-semibold text-[22px] tracking-wider", t.cls].join(" ")}>{t.word}</span>
                <code className="font-mono text-[11.5px] text-slate-400">.{t.cls}</code>
              </div>
            ))}
          </div>
        </Card>

        {/* Column C: animated effects */}
        <Card variant="glass" className="p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-4">Animations</div>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-primary-500 text-white font-semibold animate-neon-pulse">neon-pulse</div>
              <code className="font-mono text-[11.5px] text-slate-500">2s ease-in-out</code>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-full bg-primary-500 animate-glow-pulse"></div>
              <code className="font-mono text-[11.5px] text-slate-500">glow-pulse 2s</code>
            </div>
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-secondary-500 to-fuchsia-500 text-white font-semibold animate-float">animate-float</div>
              <code className="font-mono text-[11.5px] text-slate-500">6s y-axis bob</code>
            </div>
            <div className="flex items-center justify-between">
              <div className="px-3 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[12px] animate-neon-flicker border border-amber-500/30">VINTAGE NEON</div>
              <code className="font-mono text-[11.5px] text-slate-500">neon-flicker 3s</code>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  );
}

/* ─────────────────────────── ICONS ─────────────────────────── */
const APP_ICONS = [
  { name:"House",         label:"Home",         ctx:"Dashboard nav" },
  { name:"BookOpen",      label:"BookOpen",     ctx:"Learning paths" },
  { name:"Map",           label:"Map",          ctx:"Track overview" },
  { name:"Code",          label:"Code",         ctx:"Editor surface" },
  { name:"ClipboardList", label:"ClipboardList",ctx:"Assessment" },
  { name:"ScanSearch",    label:"ScanSearch",   ctx:"Inline review" },
  { name:"TrendingUp",    label:"TrendingUp",   ctx:"Progress trend" },
  { name:"Trophy",        label:"Trophy",       ctx:"Achievements" },
  { name:"Settings",      label:"Settings",     ctx:"Preferences" },
  { name:"Shield",        label:"Shield",       ctx:"Safety / honor" },
  { name:"Sparkles",      label:"Sparkles",     ctx:"AI moments" },
  { name:"MessageSquare", label:"MessageSquare",ctx:"Mentor chat" },
];

function IconsSection() {
  return (
    <Section id="icons" eyebrow="13 — Iconography" title="Lucide, stroke-2, three sizes"
      description="16 / 20 / 24 for small / medium / large contexts. Stroke is always 2, never filled.">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {APP_ICONS.map(i => (
          <div key={i.label} className="glass-card p-4 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200">
              <Icon name={i.name} size={26}/>
            </div>
            <code className="font-mono text-[12.5px] text-slate-700 dark:text-slate-200 mt-1">{i.label}</code>
            <div className="text-[11.5px] text-slate-500">{i.ctx}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────── EMPTY STATE ─────────────────────────── */
function EmptyStateSection() {
  return (
    <Section id="empty" eyebrow="14 — Empty state" title="Canonical empty surface"
      description="Soft circular icon, one heading, one sentence, one CTA. Always specific to the destination.">
      <Card variant="default" className="p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-full bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center text-primary-700 dark:text-primary-200 mb-5">
          <Icon name="Inbox" size={36}/>
        </div>
        <h3 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">No submissions yet</h3>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-400 max-w-md">
          Submit your first task to see AI-powered feedback here. We'll annotate inline, score by category, and start a mentor chat.
        </p>
        <div className="mt-6">
          <Button variant="gradient" size="lg" leftIcon="Sparkles" rightIcon="ArrowRight">Browse tasks</Button>
        </div>
      </Card>
    </Section>
  );
}

/* ─────────────────────────── CODE ANNOTATION (signature) ─────────────────────────── */
function CodeAnnotationSection() {
  const [open, setOpen] = useState(true); // start open so the signature pattern is visible
  const lines = [
    { n:1, kind:"def",   text:[["k","def "],["fn","get_user_by_email"],["p","(email):"]] },
    { n:2, kind:"plain", text:[["c","    # Look up a user record by their email address."]] },
    { n:3, kind:"plain", text:[["k","    "],["k","query"],["p"," = "],["s",'f"SELECT * FROM users WHERE email = \'{email}\'"']] },
    { n:4, kind:"flag",  text:[["p","    cursor."],["fn","execute"],["p","("],["k","query"],["p",")"]] },
    { n:5, kind:"plain", text:[["k","    return "],["k","cursor"],["p","."],["fn","fetchone"],["p","()"]] },
    { n:6, kind:"plain", text:[] },
    { n:7, kind:"plain", text:[["c","# Caller — note: no input validation on `email_input`."]] },
    { n:8, kind:"plain", text:[["k","user"],["p"," = "],["fn","get_user_by_email"],["p","(email_input)"]] },
  ];
  const colorFor = (k) => ({
    k:"#a78bfa", fn:"#22d3ee", s:"#34d399", c:"#94a3b8", p:"inherit"
  })[k];
  return (
    <Section id="annotation" eyebrow="15 — Code annotation pattern" title="The signature element"
      description="A reviewed line gets a violet left rail and a mentor bubble. Click the bubble to open the suggestion popover.">
      <Card variant="default" className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Icon name="FileCode" size={14} className="text-slate-500" />
            <span className="font-mono text-[12px] text-slate-700 dark:text-slate-200">auth/user_lookup.py</span>
            <Badge tone="failed">1 critical</Badge>
            <Badge tone="pending">2 suggestions</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon="Eye">View raw</Button>
            <Button variant="outline" size="sm" leftIcon="Sparkles">Open Mentor Chat</Button>
          </div>
        </div>

        <div className="relative font-mono text-[13px] leading-[1.75] bg-white dark:bg-slate-900/50">
          {lines.map((l) => {
            const isFlag = l.kind === "flag";
            return (
              <div key={l.n} className={[
                "grid grid-cols-[44px_28px_1fr] items-stretch relative",
                isFlag ? "bg-primary-500/10 dark:bg-primary-500/15" : ""
              ].join(" ")}>
                {/* line number */}
                <div className={[
                  "px-3 text-right select-none border-r",
                  isFlag
                    ? "border-primary-500 text-primary-700 dark:text-primary-300 font-semibold"
                    : "border-slate-200/60 dark:border-white/5 text-slate-400"
                ].join(" ")} style={isFlag ? { boxShadow:"inset 4px 0 0 0 #8b5cf6" } : {}}>{l.n}</div>
                {/* gutter slot */}
                <div className="flex items-center justify-center">
                  {isFlag ? (
                    <button
                      onClick={()=>setOpen(o=>!o)}
                      className="w-6 h-6 rounded-full bg-primary-500 text-white shadow-neon flex items-center justify-center hover:scale-110 transition-transform"
                      aria-label="Open mentor annotation"
                    >
                      <Icon name="MessageSquare" size={12}/>
                    </button>
                  ) : null}
                </div>
                {/* code */}
                <div className="pl-3 pr-4 whitespace-pre text-slate-800 dark:text-slate-100">
                  {l.text.length === 0 ? "\u00A0" : l.text.map(([k,t],i) => (
                    <span key={i} style={{ color: colorFor(k), fontStyle: k==="c" ? "italic" : "normal" }}>{t}</span>
                  ))}
                </div>

                {/* inline annotation popover anchored to flagged line */}
                {isFlag && open ? (
                  <div className="col-span-3 px-4 pb-4 pt-1">
                    <div className="glass-frosted rounded-xl border border-primary-400/40 dark:border-primary-400/30 p-4 max-w-2xl glow-md animate-slide-up">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg brand-gradient-bg flex items-center justify-center text-white">
                          <Icon name="Sparkles" size={16}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Mentor Annotation</span>
                            <Badge tone="failed" icon="ShieldAlert">SQL injection risk</Badge>
                          </div>
                          <p className="mt-1.5 text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed">
                            This concatenation creates a SQL injection risk. Use parameterized queries via
                            <code className="font-mono mx-1 px-1 rounded bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-300">cursor.execute(query, params)</code>
                            instead — the driver will escape input safely.
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <Button variant="gradient" size="sm" leftIcon="Wand">Apply suggestion</Button>
                            <Button variant="ghost" size="sm" leftIcon="X" onClick={()=>setOpen(false)}>Dismiss</Button>
                            <span className="ml-auto text-[11.5px] font-mono text-slate-500">confidence · 0.94</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}

Object.assign(window, { ToastsSection, GlassShowcase, NeonShowcase, IconsSection, EmptyStateSection, CodeAnnotationSection });
// Code Mentor — Design System Showcase
// Single-page reference. Theme toggle writes `dark` on <html>.

const { useState: u, useEffect: e } = React;

function Nav({ dark, setDark }) {
  return (
    <nav className="sticky top-0 z-50 h-16 glass flex items-center px-6 lg:px-10 border-b border-slate-200/40 dark:border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-[0_4px_14px_-4px_rgba(139,92,246,.6)]">
          <Icon name="Sparkles" size={18}/>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">CodeMentor</span>
          <span className="text-[11px] font-mono text-slate-500 -mt-0.5">benha · 2026</span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 mx-auto">
        <Badge tone="primary" icon="Layers">Design System v1</Badge>
        <Badge tone="cyan" icon="Radio">live preview</Badge>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <a href="#colors"      className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Colors</a>
        <a href="#typography"  className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Type</a>
        <a href="#buttons"     className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Buttons</a>
        <a href="#neon"        className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Neon</a>
        <a href="#annotation"  className="hidden lg:inline-flex text-[13px] text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-300 px-2.5">Annotation</a>
        <button
          onClick={() => setDark(d => !d)}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-xl glass flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        >
          <Icon name={dark ? "Sun" : "Moon"} size={16}/>
        </button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200/60 dark:border-white/5 mt-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
            <Icon name="Sparkles" size={14}/>
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">CodeMentor — Design System v1</div>
            <div className="text-[12px] text-slate-500">7-person CS team · Benha University · defending Sept 2026</div>
          </div>
        </div>
        <div className="font-mono text-[11.5px] text-slate-500">commit · ds-v1.0.0 · generated 2026-05-12</div>
      </div>
    </footer>
  );
}

function App() {
  const [dark, setDark] = u(true);
  e(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  return (
    <div className="min-h-screen">
      <Nav dark={dark} setDark={setDark} />
      <HeroSection />
      <ColorsSection />
      <TypographySection />
      <ButtonsSection />
      <CardsSection />
      <InputsSection />
      <BadgesSection />
      <ProgressSection />
      <TabsModalSection />
      <ToastsSection />
      <GlassShowcase />
      <NeonShowcase />
      <IconsSection />
      <EmptyStateSection />
      <CodeAnnotationSection />
      <Footer />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
