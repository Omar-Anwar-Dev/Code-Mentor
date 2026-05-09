# Code Mentor — Design System

**Last updated:** 2026-04-27
**Status:** Living document — update when the direction evolves.
**Codified by:** ADR-030 (UI/UX direction).

---

## 1. Principles

1. **The chrome serves the code.** Every page is dense with syntax-highlighted source. Prism owns the colorful real estate. The application UI stays neutral so the code can be the signal.
2. **Three roles, one hierarchy.** Violet is the **primary brand** (95% of accent surface area — buttons, links, focus rings, active nav). Cyan is the **secondary** supporting accent (badges, charts where a second axis is needed). Fuchsia is the **celebration** accent (~5%, gamification only). Emerald is reserved for **success state** — always reads "passing/completed", never used for brand presence.
3. **Brand gradient, used sparingly.** A single 135° linear gradient from violet (`--accent`) to fuchsia (`--special`) is allowed on: the brand logo "C" mark (everywhere it appears), the most prominent CTA on each page (one per page), and the focal "Adaptive Difficulty" pill. Anywhere else, accent stays solid.
4. **Type does most of the work.** Hierarchy comes from a tight scale and confident negative tracking on headings — not from boxes, gradients on every line, or weight changes.
5. **Motion is a hint, not a performance.** 100–280 ms ease-out. No floating, flickering, shimmering, or rotating-gradient borders. `prefers-reduced-motion` is honored globally.
6. **Accessibility is baseline.** WCAG 2.1 AA contrast on every accent + state combination, every interactive element keyboard-reachable with a visible focus ring, every form input with a persistent label.

---

## 2. Direction

Technical, modern, confident. Inspired by **Linear** (chrome density and restraint), **Vercel** (empty / loading / error states), **Stripe** (the printable Learning CV — "credible business document" voice), and **GitHub** (code-review patterns — file tree, inline annotations, severity icons). Slate spine + violet primary + cyan secondary + fuchsia for celebration moments + emerald for success states. A single restrained brand gradient (violet → fuchsia) for the highest-focal moments only.

---

## 3. Tokens

All semantic tokens are CSS variables (space-separated RGB triplets) defined in `frontend/src/shared/styles/globals.css` under `:root` (light) and `.dark` (dark). They're exposed through `frontend/tailwind.config.js` as Tailwind colors with `<alpha-value>` syntax, so utilities like `bg-accent`, `text-fg-muted`, `border-border-subtle`, `bg-accent-soft/40` all work natively.

### 3.1 Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | slate-50 `#f8fafc` | slate-950 `#020617` | Page background |
| `bg-subtle` | slate-100 `#f1f5f9` | slate-900 `#0f172a` | Sidebar, section panels, sticky headers |
| `bg-elevated` | white `#ffffff` | slate-800 `#1e293b` | Cards, inputs, popovers, code-in-card |
| `bg-overlay` | white `#ffffff` | slate-700 `#334155` | Modals, dialogs, dropdowns |

### 3.2 Borders

| Token | Light | Dark |
|---|---|---|
| `border-subtle` | slate-100 | slate-800 |
| `border` | slate-200 | slate-700 |
| `border-strong` | slate-300 | slate-600 |

### 3.3 Text

| Token | Light | Dark | AA on bg-elevated |
|---|---|---|---|
| `fg` | slate-900 | slate-50 | 17.0 / 16.6 ✓ AAA |
| `fg-muted` | slate-600 | slate-400 | 7.5 / 5.1 ✓ AA |
| `fg-subtle` | slate-500 | slate-500 | 4.6 / 4.3 — placeholders + decorative only, **not for primary content** |
| `fg-on-accent` | white | emerald-950 | text on filled accent surface |

### 3.4 Accent — Violet (primary brand, workhorse ~95%)

| Token | Light | Dark |
|---|---|---|
| `accent` | violet-600 `#7c3aed` | violet-400 `#a78bfa` |
| `accent-hover` | violet-700 | violet-300 |
| `accent-pressed` | violet-800 | violet-200 |
| `accent-fg` | white | violet-950 `#2e1065` |
| `accent-soft` | violet-50 `#f5f3ff` | violet-500 + 15 % alpha |
| `accent-soft-fg` | violet-700 | violet-300 |
| `accent-ring` | violet-500 + 40 % alpha | violet-400 + 45 % alpha |

**Contrast verified:** white-on-violet-600 = 5.68:1 ✓ AA · violet-700-on-white = 8.07:1 ✓ AAA · violet-950-on-violet-400 = 9.41:1 ✓ AAA · violet-400-on-slate-950 = 5.50:1 ✓ AA.

### 3.5 Secondary — Cyan (supporting accent for variety)

Used on: badges that need a second visual class (e.g., a "Backend track" tag next to a "Full-Stack track" tag), secondary chart axis, anywhere the page would otherwise have *two* accent-soft chips next to each other and wants visual differentiation. Not for buttons or default actions.

| Token | Light | Dark |
|---|---|---|
| `secondary` | cyan-700 `#0e7490` | cyan-400 `#22d3ee` |
| `secondary-fg` | white | cyan-950 `#082f49` |
| `secondary-soft` | cyan-50 `#ecfeff` | cyan-500 + 15 % alpha |
| `secondary-soft-fg` | cyan-800 `#155e75` | cyan-300 `#67e8f9` |

### 3.6 Special — Fuchsia (celebration only, ~5%)

| Token | Light | Dark |
|---|---|---|
| `special` | fuchsia-700 `#a21caf` | fuchsia-400 `#e879f9` |
| `special-fg` | white | fuchsia-950 |
| `special-soft` | fuchsia-50 | fuchsia-500 + 18 % alpha |
| `special-soft-fg` | fuchsia-700 | fuchsia-300 |

### 3.7 Success — Emerald (semantic, kept distinct from accent)

Always reads "passing / completed / verified". The success-state CheckCircle icon is emerald regardless of whether it's on a Submission, a PathTask, or a Toast — never violet.

| Token | Light | Dark |
|---|---|---|
| `success` | emerald-700 `#047857` | emerald-400 `#34d399` |
| `success-fg` | white | emerald-950 `#022c22` |
| `success-soft` | emerald-50 | emerald-500 + 15 % alpha |
| `success-soft-fg` | emerald-700 | emerald-300 |

### 3.8 Other semantics

| Token | Light | Dark | Notes |
|---|---|---|---|
| `warning` | amber-700 | amber-400 | white-on-amber-700 = 5.0:1 ✓ AA |
| `error` | red-700 | red-400 | white-on-red-700 = 5.61:1 ✓ AA |
| `info` | sky-700 | sky-400 | Use sparingly — most info should be muted slate |

Each has matching `-fg`, `-soft`, `-soft-fg` tokens for filled vs tinted contexts.

### 3.7 Code-review chart fills

Used by Recharts radar/bar fills. Vibrant 500-range tuned for chart visibility, separate from semantic tokens because they're decoration-on-data, not state signal.

| Token | Light | Dark | Use |
|---|---|---|---|
| `score-good` | emerald-500 | emerald-400 | ≥ 80 score, "passing" radar fill |
| `score-ok` | amber-500 | amber-400 | 60–79, "in progress" |
| `score-poor` | red-500 | red-400 | < 60, "needs work" |
| `chart-grid` | slate-200 | slate-700 | Recharts grid lines |
| `chart-axis` | slate-400 | slate-500 | Axis labels |

### 3.8 Glass (header / mobile sidebar overlay / modal backdrop ONLY)

| Token | Light | Dark |
|---|---|---|
| `--glass-bg` | rgba(255, 255, 255, 0.78) | rgba(15, 23, 42, 0.72) |
| `--glass-border` | rgba(15, 23, 42, 0.06) | rgba(255, 255, 255, 0.08) |

Always paired with `backdrop-filter: blur(16px) saturate(180%)`. Available as the `.glass` utility class.

---

## 4. Typography

### 4.1 Font stack

| Family | Source | Use |
|---|---|---|
| **Geist Sans** Variable | Google Fonts CDN | All UI text — body and headings (different weights only) |
| **Geist Mono** Variable | Google Fonts CDN | Code blocks, inline code, file paths, monospace UI |

System fallbacks: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` and `ui-monospace, 'JetBrains Mono', 'SF Mono', Consolas, monospace`.

Loaded via `<link>` in `frontend/index.html` with `display=swap`. Single CSS request, full variable axis (100..900), no FOIT.

### 4.2 Scale

Body base is **14 px** — Linear / GitHub-style density. Long-form prose (markdown task descriptions, AI feedback) bumps to body-lg.

| Name | Size | Line | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `display` | 36 px | 40 px | -0.025 em | 600 | Learning-CV header, marketing headline, defense-screenshot moments |
| `h1` | 30 px | 36 px | -0.020 em | 600 | Page titles |
| `h2` | 24 px | 32 px | -0.015 em | 600 | Section headers within a page |
| `h3` | 20 px | 28 px | -0.010 em | 600 | Card titles, modal titles |
| `h4` | 16 px | 24 px | -0.005 em | 600 | Subsections |
| `body-lg` | 16 px | 24 px | 0 | 400 | Markdown content, AI feedback narrative |
| `body` | 14 px | 20 px | 0 | 400 | Default UI |
| `body-sm` | 13 px | 18 px | 0 | 400 | Dense lists, secondary info |
| `caption` | 12 px | 16 px | +0.005 em | 500 | Labels, badges, "uploaded 2 h ago" |
| `code` | 13 px | 20 px | 0 | 400 | Inline `<code>`, syntax-highlighted blocks |
| `code-sm` | 12 px | 18 px | 0 | 400 | Inline code in dense surfaces |

### 4.3 Weight ladder

400 (regular) · 500 (caption, secondary buttons, table headers) · 600 (all headings + primary buttons). 700 is reserved for the rare hero-display moment; don't use it for h1.

---

## 5. Spacing

4 px baseline. Tailwind's default scale already covers the common stops (`p-1` 4 px, `p-2` 8 px, `p-3` 12 px, `p-4` 16 px, `p-5` 20 px, `p-6` 24 px, `p-8` 32 px, `p-10` 40 px, `p-12` 48 px). No extension needed.

**Card internal padding default: `p-6` (24 px).** Tight enough for moderate density, loose enough to breathe.

---

## 6. Radii

Linear-tight. Cards are 8 px, not 16 px. Buttons are 6 px, not 12 px.

| Token | px | Use |
|---|---|---|
| `xs` | 4 | Small chips, tag pills, tight badges |
| `sm` | 6 | **Buttons**, default inputs, segmented controls |
| `md` | 8 | **Cards**, panels, code blocks |
| `lg` | 12 | Modals, dialogs, hero surfaces |
| `xl` | 16 | Reserved — only the public Learning-CV hero card |
| `full` | 9999 | Pills, avatars, dot indicators |

---

## 7. Shadows

Light mode carries shadow weight; dark mode delegates elevation to `--bg-*` lifts and borders.

| Token | Light | Dark | Use |
|---|---|---|---|
| `shadow-sm` | `0 1px 2px 0 rgb(15 23 42 / 0.05)` | `0 0 0 1px rgb(255 255 255 / 0.04)` | Cards at rest |
| `shadow-md` | `0 4px 8px -2px / 0 2px 4px -2px` | `0 4px 12px 0 rgb(0 0 0 / 0.4)` | Popovers, dropdowns |
| `shadow-lg` | `0 12px 24px -8px / 0 4px 8px -4px` | `0 16px 40px -8px rgb(0 0 0 / 0.6)` | Modals |
| `shadow-focus` | `0 0 0 3px emerald-600/0.45` | `0 0 0 3px emerald-400/0.40` | Focus ring (auto-applied via `:focus-visible`) |

Cards-at-rest use `shadow-sm` in light mode and **no shadow** in dark mode (the slate lift carries elevation). `shadow-md` is for things that float. `shadow-lg` is for modals only.

---

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 100 ms | Color, opacity, simple state changes |
| `--duration-default` | 180 ms | Transforms, layout shifts (default for most transitions) |
| `--duration-slow` | 280 ms | Page transitions, large reveals |
| `--ease` | `cubic-bezier(0.2, 0.7, 0.3, 1)` | Default ease-out — snappy entry, soft settle |
| `--ease-spring` | `cubic-bezier(0.32, 1.4, 0.55, 1)` | Subtle overshoot — popover/dropdown openings ONLY |

`@media (prefers-reduced-motion: reduce)` collapses all durations to `0.01ms` globally.

---

## 9. Components

Single canonical source: `frontend/src/shared/components/ui/`. The legacy `frontend/src/components/ui/index.ts` is a re-export shim during migration.

| Component | File | Notes |
|---|---|---|
| **Button** | `Button.tsx` | 5 variants (`primary` filled accent · `secondary` bordered · `outline` (alias) · `ghost` transparent · `danger` filled red). Sizes `sm` (h-8) / `md` (h-9) / `lg` (h-10). Legacy variants (`gradient`, `neon`, `glass`) silently fall back to `primary`. |
| **Input** | `Input.tsx` | Persistent label, helper text, error message, password toggle. ARIA `invalid` + `describedby` wired automatically. |
| **Card** | `Card.tsx` | 3 variants (`default`, `bordered`, `elevated`) + `Card.Header / Body / Footer`. Legacy `glass`, `neon` fall back to `default`. Keyboard-activatable when `onClick` is provided. |
| **Badge** | `Badge.tsx` | 7 variants (`default`, `primary`, `success`, `warning`, `error`, `info`, `special`). Optional `dot` indicator. `special` uses fuchsia — gamification only. |
| **LoadingSpinner / PageLoader / Skeleton** | `LoadingSpinner.tsx` | Token-driven, role/aria-live, simple PageLoader with backdrop blur. |
| **Modal** | `Modal.tsx` | Headless UI Dialog wrapper. Glass backdrop (allowed here). `rounded-lg`, `shadow-lg`, ease-spring entry. |
| **ProgressBar / CircularProgress** | `ProgressBar.tsx` | Token-driven fill, slim default, tabular-nums for percentages. |
| **Tabs** | `Tabs.tsx` | Headless UI Tab wrapper. Bordered tab list, semantic tokens. |
| **Toast** | `Toast.tsx` | Solid bg-elevated with semantic-color border, role + aria-live, dismiss button accessible. |

---

## 10. Iconography

**Library:** [Lucide React](https://lucide.dev) (already installed). Default size 16 px or 20 px. Stroke 2 (Lucide default).

**No emoji in copy or design tokens.** `⚡✨🛡️🚀🔧🎨👋⚠✅❌🎉` are forbidden in default UI. Use the matching Lucide icon (Zap, Sparkles, ShieldCheck, Rocket, Wrench, Palette, Hand, AlertTriangle, CheckCircle2, XCircle, PartyPopper).

---

## 11. Accessibility baseline

- **WCAG 2.1 AA** on contrast (every accent + state combination verified — see token tables).
- **Keyboard-navigable** — every interactive element has a visible focus state via the global `:focus-visible` shadow ring (3 px, accent-color/0.45).
- **Persistent labels** on form inputs (no placeholder-only labels).
- **Semantic landmarks** — `<main>`, `<nav>`, `<header>`, `<aside>` correctly used in `AppLayout` and `AuthLayout`.
- **`prefers-reduced-motion`** honored globally — animations collapse to `0.01ms`.
- **Color is never the only signal** — error states pair red with an `AlertCircle` / `XCircle` icon; success pairs emerald with `CheckCircle2`.

---

## 12. Responsive breakpoints

Mobile-first. Design at 375 px and scale up.

| Name | Min width |
|---|---|
| `sm` | 640 px |
| `md` | 768 px |
| `lg` | 1024 px |
| `xl` | 1280 px |
| `2xl` | 1536 px |

`AppLayout` collapses the sidebar at `< lg` (mobile sidebar overlay uses `.glass`); above `lg` the sidebar is fixed at 64 (or 20 collapsed) rem and the main content gets `lg:ml-64`.

---

## 13. Usage discipline

### 13.1 `accent` vs `accent-soft`

**`accent`** is the strong color — use it when the element needs to *act* as the primary signal: filled buttons, active nav state (current page), progress bar fill, link text, focused input border, focus ring. The user's eye should be drawn to it on purpose.

**`accent-soft`** is the tinted background — use it when an element needs to be *categorized* as accent without dominating: badges (e.g., "Beginner", "In Progress"), the row in a list that's currently selected, the chip showing the user's current track. Pair with `accent-soft-fg` for legible text.

**Never** put `bg-accent` on a card or panel — too loud as a static surface. Use `bg-accent-soft` (tinted) or just `border-accent` (outlined) for accent-flavored panels.

### 13.2 When fuchsia is allowed (the only places — close the door on everything else)

1. **`XpLevelChip`** on the Dashboard header.
2. **Achievements page** (`/achievements`) — earned badges may use `border-special` or `bg-special-soft`.
3. **"Public CV is live" banner** when `IsPublic = true` on the Learning CV.
4. **Perfect-score moment** — if any submission category scores 100/100, the score number on the feedback page uses `text-special`.
5. **First-time onboarding completion** — subtle fuchsia underline on "Your learning path is ready" the first time a learner lands on Assessment Results.

If a use case isn't on this list, don't reach for fuchsia. Banned: default buttons, gradients with emerald, error states, status pills outside the gamification surfaces.

### 13.3 Button construction

```tsx
// Primary — filled emerald, white text. Default action.
<Button variant="primary" size="md">Submit</Button>

// Secondary — bordered slate. Equal-weight alternatives.
<Button variant="secondary" size="md">Cancel</Button>

// Ghost — transparent, accent text. Tertiary, low-noise actions.
<Button variant="ghost" size="md">Dismiss</Button>

// Danger — filled red. Destructive only (delete account, drop submission).
<Button variant="danger" size="md">Delete</Button>
```

Sizes: default `md` (`h-9 px-4`). Compact `sm` (`h-8 px-3`) for in-table or in-toolbar. Large `lg` (`h-10 px-6`) for hero actions and primary CTAs only. Icon-only buttons require an `aria-label`.

### 13.4 Brand gradient (`bg-gradient-brand` / `text-gradient-brand`)

A single 135° linear gradient from `--accent` (violet) to `--special` (fuchsia). Defined as the `.bg-gradient-brand` (and `.text-gradient-brand`) utility classes in `globals.css`. Allowed only on:

1. **Brand logo "C" mark** — every appearance (Header, Sidebar, AuthLayout, Landing nav). 32×32 to 28×28 px square with `rounded-md` or `rounded-sm`, white text.
2. **The single most prominent CTA on each page.** Examples: Landing hero "Start your assessment", Assessment "Start Assessment". One per page. Form submit buttons inside Auth pages do *not* qualify — those stay solid `variant="primary"` to keep contrast tight on input-heavy surfaces.
3. **The "Adaptive Difficulty" pill** on Assessment Start. Small focal pill, drawing the eye once.

**Banned uses:** default buttons, headlines (no gradient text on h1/h2), links, badges, toggle states, table cells, list rows, card backgrounds, section bands. If a use case isn't on the list above, the answer is solid `bg-accent` or `bg-accent-soft`.

### 13.5 Chart colors

The user's score is the data narrative — color it confidently. Reference lines (averages, targets) recede.

```jsx
// Radar — single emerald series for user's data
<Radar
  dataKey="value"
  fill="rgb(var(--score-good))"
  fillOpacity={0.25}
  stroke="rgb(var(--score-good))"
  strokeWidth={2}
/>
<PolarGrid stroke="rgb(var(--chart-grid))" />
<PolarAngleAxis tick={{ fill: 'rgb(var(--chart-axis))', fontSize: 12 }} />
```

For bar charts, color each bar by score band, not by category:
```jsx
<Cell fill={
  score >= 80 ? 'rgb(var(--score-good))' :
  score >= 60 ? 'rgb(var(--score-ok))'   :
                'rgb(var(--score-poor))'
} />
```

Time-series across multiple categories: use a slate-spectrum (emerald-700, emerald-500, sky-600, slate-600, slate-400) — never include amber/red/fuchsia in time-series colors (those are reserved for state signal).

---

## 14. Don'ts (anti-patterns specific to this project)

- No multi-stop rainbow gradients (`from-X via-Y to-Z`).
- No gradient text on welcome messages or headlines.
- No emoji in default copy or as decorative icons (replace with Lucide).
- No dicebear or external avatar services — fall back to initials on tinted surface.
- No glass on cards, buttons, inputs, badges (allowed only on header / mobile sidebar / modal backdrop).
- No floating, flickering, shimmering, or rotating-gradient borders.
- No more than one accent per primary surface (no button mixing emerald and fuchsia).
- No hover-only interactions without a click/touch fallback.
- No color as the only signal (always pair with an icon or text).

---

## 15. Migration status (as of 2026-04-27)

**Completed (Tier 1):**
- Foundation: `index.html`, `tailwind.config.js`, `globals.css`.
- All 9 shared UI primitives.
- Global shell: `AppLayout`, `AuthLayout`, `Header`, `Sidebar`, router 404 + `NotFoundPage`.
- Auth: `LoginPage`, `RegisterPage`.
- Dashboard.
- Landing.
- Submissions: `SubmissionDetailPage`, `FeedbackPanel` (radar tokens, emoji removal).
- Learning CV: `LearningCVPage`, `PublicCVPage` (radar tokens, accent icon).

**Pending (Tier 2 — light token sweeps):**
- Assessment: `AssessmentStart`, `AssessmentQuestion`, `AssessmentResults`.
- Tasks: `TasksPage`, `TaskDetailPage`.
- Learning Path: `LearningPathView`, `ProjectDetailsPage`.
- Submissions: `SubmissionForm`, legacy `FeedbackView` (decision: delete or rewrite).
- Profile, Settings, Activity, Achievements (style polish only — already structurally clean), Analytics.
- Notifications popup.
- Admin: `AdminDashboard`, `TaskManagement`, `UserManagement`, `QuestionManagement`, admin AnalyticsPage.

**Pending (cleanup):**
- Remove legacy aliases from `tailwind.config.js` (currently `primary`, `secondary`, `neutral`, `dark.*`, semantic-shade-ladder bridges) once Tier 2 sweeps are done.
- Decide on duplicate `src/components/` vs `src/shared/components/` trees (currently the former is a re-export shim; the latter is canonical).

**Pending (validation):**
- Cross-browser visual verification at 375 px / 768 px / 1280 px (carried since Sprint 2 — needs Playwright or manual browser session).
- Lighthouse accessibility audit on each Tier-1 page (target ≥ 90).

---

## 16. Change log

| Date | Change | Reason |
|---|---|---|
| 2026-04-27 | Initial design system | UI/UX refinement pass after Sprint 8 / M2. Codified by ADR-030. Initial palette: emerald primary + fuchsia celebration. |
| 2026-04-27 (same day) | Palette revision: violet primary + cyan secondary + fuchsia celebration; emerald promoted to dedicated `--success` token. Added restrained `.bg-gradient-brand` utility (violet → fuchsia, 135°) for logos / hero CTAs / Adaptive Difficulty pill only. Refactored `AssessmentStart` page off legacy gradient tropes. | Owner saw the emerald-only result on `/assessment` (still using legacy gradients) and requested return to the original violet/cyan/fuchsia color identity, tuned for credibility. ADR-030 revision note documents the change. All other discipline (Geist, semantic tokens, restricted glass, no orbs/flicker/dicebear, dark mode parity, AA contrast, restricted motion) preserved. |
