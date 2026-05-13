# Code Mentor — Design Brief (Master Reference)

**For:** `claude.ai/design` — the design tool you will paste prompts into.
**Owner:** Omar (Backend Lead, Benha 2026 Code Mentor team)
**Date:** 2026-05-12
**Hard constraint:** This brief is non-negotiable. Every page generated must respect this identity. No alternative palettes, no font swaps, no aesthetic "modernization" suggestions. See [§ Rejected Directions](#rejected-directions) for what NOT to do.

---

## 1. Product, in one paragraph

**Code Mentor** is an AI-powered learning platform for self-taught developers and CS students who want professional code-review feedback. A learner takes an adaptive skill assessment, gets a personalized project-based learning path, submits real code (GitHub URL or ZIP), and receives multi-layered feedback within ~5 minutes — static analysis findings + AI architectural review unified into per-category scores (Correctness, Readability, Security, Performance, Design), inline annotations on their code, follow-up Mentor Chat to ask questions about the feedback, and a verified Learning CV they can share with employers. Three services: React/Vite frontend, ASP.NET Core 8 backend, Python/FastAPI AI service (OpenAI + static analyzers + Qdrant vector store).

**Audience:** technical (CS students, junior developers, supervisors evaluating thesis work). The aesthetic should feel **alive but precise** — celebratory enough to make a learner feel they're using something premium, technical enough that examiners take it seriously.

---

## 2. Brand identity: "Neon & Glass"

The product has a defined visual identity. Every page must read as part of the same brand.

### 2.1 Tone words (the feel we're after)

- **Neon** — luminous, glowing, "alive". Not loud — accents only.
- **Glass** — frosted surfaces, backdrop-blur, layered transparency.
- **Dark-first** — the product looks best in dark mode; light mode is fully supported but the brand was designed dark.
- **Technical** — code is the protagonist on most pages (Prism syntax highlighting, monospace, annotation gutters).
- **Generous** — generous spacing, generous radii, generous animation. Not minimalist; not cluttered.

### 2.2 What it is NOT

- NOT flat / brutalist / "vercel-y" (no pure black-on-white).
- NOT corporate / SaaS-generic (no slate-only + emerald-only).
- NOT skeuomorphic (no fake textures, paper, leather, etc.).
- NOT illustrated (no cartoony characters, mascots, dicebear-style avatars in the new design — use initials/gradients instead).

---

## 3. Color tokens (canonical)

These are the **only** colors permitted. Every other color in any output is a bug.

### 3.1 Brand trio (the three accents)

| Token | Hex | Role | When |
|---|---|---|---|
| **Primary (Violet)** | `#8b5cf6` (500) | Main accent — buttons, links, focus rings, active nav, brand gradients | ~60% of accent usage |
| **Secondary (Cyan)** | `#06b6d4` (500), `#22d3ee` (400) | Secondary accent — info states, code-related callouts, neon ring (left side of multi-color gradients) | ~25% |
| **Accent (Fuchsia)** | `#d946ef` (500), `#e879f9` (400) | Special accent — celebration moments, CV "live" banner, achievements, multi-color gradient terminus | ~15% |

**The signature gradient:** `linear-gradient(135deg, #06b6d4 → #3b82f6 → #8b5cf6 → #ec4899)` (cyan → blue → violet → pink). Used on: animated card borders (hover), hero CTAs (variant=`gradient`), brand logo. Use sparingly — one per page surface max.

### 3.2 Primary ladder (Violet)

```
50:  #f5f3ff
100: #ede9fe
200: #ddd6fe
300: #c4b5fd
400: #a78bfa
500: #8b5cf6   ← THE primary
600: #7c3aed
700: #6d28d9
800: #5b21b6
900: #4c1d95
950: #2e1065
```

### 3.3 Semantic colors

| Token | 500 hex | Usage |
|---|---|---|
| **Success** | `#10b981` (emerald) | Positive scores, completed tasks, success toasts |
| **Warning** | `#f59e0b` (amber) | Mid-tier scores, "in progress" with caveat, attention badges |
| **Error** | `#ef4444` (red) | Failed submissions, validation errors, destructive actions |
| **Neutral** | `#64748b` (slate-500) | Body text, dividers, secondary content |

### 3.4 Surface colors

| Mode | Background | Surface | Border |
|---|---|---|---|
| **Light** | `#f8fafc` (neutral-50) | `#ffffff` | `#e2e8f0` (neutral-200) |
| **Dark** | radial gradient `#0a0a0f → #111827 → #0f172a` (135deg), fixed attachment | `#1e293b` (slate-800) translucent / glass | `#334155` (slate-700) at 50% opacity |

---

## 4. Typography

| Family | Use | Source |
|---|---|---|
| **Inter** | All UI body, headings, labels | Google Fonts. Use the **variable** axis. Enable `cv02`, `cv03`, `cv04`, `cv11` font features. |
| **JetBrains Mono** | All code, identifiers, numeric scores, tabular data | Google Fonts. Use the **variable** axis. |

**Heading scale (responsive):**

| Tag | Mobile | Desktop (md+) | Weight | Tracking |
|---|---|---|---|---|
| h1 | 2.25rem (36px) | 3rem (48px) | 600 (semibold) | tight (-0.025em) |
| h2 | 1.875rem (30px) | 2.25rem (36px) | 600 | tight |
| h3 | 1.5rem (24px) | 1.875rem (30px) | 600 | tight |
| h4 | 1.25rem (20px) | 1.5rem (24px) | 600 | tight |
| body | 0.9375rem (15px) | 1rem (16px) | 400 (regular) | normal |
| small | 0.8125rem (13px) | 0.875rem (14px) | 400 | normal |

**Anti-pattern:** never use Inter Italic. Never use anything besides Inter and JetBrains Mono.

---

## 5. Spacing & sizing scale

Tailwind defaults — `0.25rem` increments. Standard surfaces:

- **Section vertical padding:** `py-12 md:py-16 lg:py-20` for marketing surfaces; `py-6 md:py-8` for app surfaces.
- **Page horizontal padding:** `px-4 md:px-6 lg:px-8`.
- **Max content width:** `max-w-7xl` (80rem / 1280px) for marketing; `max-w-6xl` for app content (within sidebar layout).
- **Card padding:** Header `px-6 py-4`, Body `px-6 py-4`, Footer `px-6 py-4`. Compact cards: `p-4`.
- **Grid gap:** `gap-4` (small grids), `gap-6` (cards), `gap-8` (section blocks).

**Border radii:**

| Surface | Radius |
|---|---|
| Cards, panels, modals | `rounded-2xl` (1rem / 16px) |
| Buttons (md/lg), inputs, selects | `rounded-xl` (0.75rem / 12px) |
| Buttons (sm), tags, small cards | `rounded-lg` (0.5rem / 8px) |
| Badges, pills, avatars | `rounded-full` |

---

## 6. Surfaces — the Glass system

Glassmorphism is the dominant surface treatment. There are **5 glass variants**, each with a specific use:

### 6.1 `.glass` — chrome glass (subtle, ubiquitous)

```css
bg-white/70 dark:bg-neutral-800/30
backdrop-blur-xl
border border-white/20 dark:border-white/10
shadow-soft dark:shadow-none
```

**Used on:** Sticky header. Mobile sidebar. Top nav. Anywhere the page chrome floats over content.

### 6.2 `.glass-card` — default card surface

```css
bg-white/60 dark:bg-neutral-800/30
backdrop-blur-xl
border border-neutral-200/50 dark:border-white/10
rounded-2xl
box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)
```

**Used on:** Most cards across the app — dashboard widgets, submission cards, profile cards. Default to this unless a stronger treatment is needed.

### 6.3 `.glass-card-neon` — hero card with hover gradient border

Same as `.glass-card`, but on **hover** a 1px conic-gradient border appears (cyan → violet → fuchsia). Used for:
- Hero cards on Landing
- Featured submission cards
- Active-task card on Dashboard

The neon border is **hover-only** — must not appear at rest.

### 6.4 `.glass-frosted` — thicker, more opaque (modals, sheets)

```css
bg-white/80 dark:bg-neutral-900/50
backdrop-blur-2xl  ← stronger blur
border border-white/30 dark:border-white/5
rounded-2xl
```

**Used on:** Modals, dropdowns, side sheets, mentor chat panel.

### 6.5 `.glass-shimmer` — animated highlight overlay

Has a `::after` pseudo-element that sweeps a 30deg gradient highlight across the surface every 3 seconds. **Used very rarely:** welcome banner on Dashboard (first session), loading skeletons, "your CV is live" celebration card. **Never on routinely-viewed surfaces.**

---

## 7. Neon effects (the celebration layer)

These are accents, not defaults. Apply with discipline.

### 7.1 Neon shadows (allowed on dark mode only)

```css
.shadow-neon         /* violet (primary) */
.shadow-neon-cyan
.shadow-neon-purple
.shadow-neon-pink
.shadow-neon-green
```

**Where:** Hover state of primary CTAs, focus ring of important inputs, "this card is selected" emphasis. **Never on rest state** — always tied to interaction or notable status.

### 7.2 Neon text (use sparingly)

```css
.text-neon, .text-neon-cyan, .text-neon-purple, .text-neon-pink, .text-neon-green
```

**Where:** "AI Mentor" label on chat header. "Verified" badge on Learning CV. Live status indicators. **Never on body text or headings** — only on labels/badges that should stand out.

### 7.3 Glow utilities (subtle, dark mode)

`.glow-sm`, `.glow-md`, `.glow-lg` — soft violet shadow halos. Used on dark-mode cards that are "active" (e.g., currently-selected sidebar item, the task you're working on).

### 7.4 Animated effects (handle with care)

| Class | Effect | When OK |
|---|---|---|
| `neon-pulse` | Opacity + brightness pulse, 2s | Live indicators ("AI is reviewing"), unread badges |
| `neon-flicker` | Old-neon-sign flicker, 3s | NEVER on body content — only on intentional "vintage neon" labels (e.g., maintenance banner) |
| `glow-pulse` | Box-shadow pulse, 2s | Card highlight when a new submission completes |
| `animate-float` | Y-axis bob, 6s | Hero illustrations, floating background orbs only |
| `shimmer` (3s) | Linear gradient sweep | Loading skeletons, premium feature reveal |
| `neon-border-rotate` (8s) | Animated conic gradient on border | Hover state of `.card-neon` only |

**Respect `prefers-reduced-motion`** — every animation must have a static fallback under reduced motion preference. (Owner cares about this — flag any animation that doesn't respect it.)

---

## 8. Component specifications

These are the components the existing app uses. Generated designs must use **these variants** so integration is straightforward.

### 8.1 Button (8 variants × 3 sizes)

| Variant | Surface | Use |
|---|---|---|
| `primary` | Violet 600, white text | Default action |
| `secondary` | Neutral 100/800, neutral text | Secondary action |
| `outline` | Border 2px neutral, transparent | Tertiary action |
| `ghost` | No bg, neutral text | Toolbar / nav buttons |
| `danger` | Error 600, white text | Destructive |
| `gradient` | violet → purple → pink, white text, hover lifts -0.5y + neon shadow | Hero CTA, primary marketing |
| `neon` | cyan → blue, white text, hover lifts + cyan glow | "AI" actions (submit code, ask mentor) |
| `glass` | white/10 + backdrop-blur, neutral text | On busy backgrounds (over hero, over images) |

**Sizes:** `sm` (px-3 py-1.5, text-sm, rounded-lg), `md` (px-4 py-2.5, text-sm, rounded-xl), `lg` (px-6 py-3, text-base, rounded-xl).

**Required slots:** `leftIcon`, `rightIcon`, `loading` (shows Loader2 spinner), `fullWidth`.

**Icons:** [lucide-react](https://lucide.dev) — 16px / 20px / 24px for sm / md / lg.

### 8.2 Card (5 variants)

| Variant | Surface | Use |
|---|---|---|
| `default` | white / slate-800/80, soft shadow | Default — most cards |
| `bordered` | 2px neutral-200/700 border, no shadow | Inline content blocks |
| `elevated` | white, larger shadow (shadow-lg) | Modals, popovers, important panels |
| `glass` | `.glass-card` styling | Dashboard widgets, feedback panels |
| `neon` | white / slate-900/90 with hover conic gradient | Hero/featured cards |

**Composition:** `Card` has subcomponents `Card.Header`, `Card.Body`, `Card.Footer` — each `px-6 py-4` with neutral border between. Hover prop adds scale + border-color transition.

### 8.3 Input

- **Base:** rounded-xl, neutral-200/700 border, focus violet-500 ring (2px, 20% opacity) + border violet-500. `bg-white dark:bg-neutral-900/50`.
- **Glass variant:** rounded-xl, white/50 + backdrop-blur-md, white/20 border, on dark focus → cyan-toned ring shadow.
- Always has `label` (above), `helperText`/`errorText` (below).
- Required indicator: red asterisk after label.

### 8.4 Badge

| Variant | Style | Use |
|---|---|---|
| Default | px-2.5 py-0.5, rounded-full, semantic color bg (10% opacity) + text (700) | Status, tags |
| `neon` | px-3 py-1, primary-500 bg/20, primary-400 text, primary-500/30 border | "AI", "Beta", emphasis labels |
| `neon-glow` | Adds `box-shadow: 0 0 10px rgba(59,130,246,0.3)` on top of `.neon` | Live indicators |

### 8.5 Progress (bars + radial)

- **Linear:** `h-2 rounded-full bg-neutral-100/700`, fill is gradient (violet → purple by default; emerald for success scores; amber for warnings; red for failures).
- **Radial / Score gauge:** SVG with stroke-dasharray, viewBox 0 0 36 36, primary gradient, text in center showing score and label below.

### 8.6 Tabs

Horizontal tabs with bottom border indicator. Active tab: primary-500 border + primary-700 text. Hover: neutral-700 text + neutral-300 border. Spacing: gap-6, py-3 per tab.

### 8.7 Modal

Centered, max-w-md/lg/2xl/4xl (configurable). Backdrop: `bg-black/50 backdrop-blur-sm`. Content surface: `.glass-frosted`. Close button top-right. Headless UI `<Transition>` for enter (scale 95→100, opacity 0→1, 100ms) / exit (75ms reverse).

### 8.8 Toast

Fixed top-right, stack 4 max. Auto-dismiss 5s. Variants: success (emerald icon + bg-emerald-50/500-10%), error (red), warning (amber), info (cyan). Surface: `.glass`. Slide-in from right.

### 8.9 Notifications bell

Header icon. Unread count badge top-right, primary-500 bg, `neon-pulse` if any unread. Dropdown is `.glass-frosted`, max-h-96 scrollable.

### 8.10 Radar chart (Recharts)

Used for per-category score breakdown (5 axes: Correctness, Readability, Security, Performance, Design). Stroke: primary-500. Fill: primary-500 at 20% opacity. Axis labels: JetBrains Mono, neutral-500. Grid: neutral-200/700 dashed.

### 8.11 Code blocks (Prism.js)

- Surface: `bg-neutral-900` (light + dark mode both — code is always dark).
- Font: JetBrains Mono, 14px, line-height 1.6.
- Inline annotations: violet-500 left-border (4px), violet-500/10 background overlay on the highlighted line. Comment marker: speech-bubble icon in left gutter, opens a popover with the AI comment.
- Copy button: top-right, ghost button, copies to clipboard, shows checkmark for 1s.

---

## 9. Layout patterns

### 9.1 Authenticated app layout

```
┌─ Sidebar (fixed left, 256px expanded / 80px collapsed, .glass) ─┐
│                                                                  │
│ ┌─ Header (sticky top, h-16, .glass, page title + search +     │
│ │   notifications + user menu)                                   │
│ │─────────────────────────────────────────────────────────────  │
│ │                                                                │
│ │ Main content                                                   │
│ │ (px-4 md:px-6 lg:px-8, py-6, max-w-6xl)                       │
│ │                                                                │
│ │─────────────────────────────────────────────────────────────  │
│ │ Footer (text-xs, neutral-500, project + supervisors + legal)  │
└──┴────────────────────────────────────────────────────────────────┘
```

**Sidebar collapsed (icon-only):** width 80px (`lg:w-20`). Toggle button in sidebar header. Nav items show icon only with tooltip on hover.

**Mobile (<lg, 1024px):** sidebar hidden by default, slides in over content (translate-x-0). Backdrop overlay `bg-black/50` behind it.

### 9.2 Auth layout (login/register)

Centered card, max-w-md, `.glass-card`, on a full-page background with the `AnimatedBackground` (3 gradient orbs + grid + floating particles). Logo above card, "back to home" link below.

### 9.3 Public layout (landing, legal, public CV)

Full-width with `AnimatedBackground` behind hero. No sidebar. Top nav `.glass` (fixed). Footer with brand + supervisor credits + social links.

---

## 10. The `AnimatedBackground` component (signature element)

Used on Landing + Auth pages. Composition:

1. **3 gradient orbs** (animate-pulse):
   - Top-left: 384px (`w-96 h-96`), `from-primary-500/30 to-purple-500/30`, blur-3xl
   - Center-right: 320px, `from-cyan-500/20 to-blue-500/20`, blur-3xl, delay 1s
   - Bottom-left: 256px, `from-pink-500/20 to-orange-500/20`, blur-3xl, delay 2s
2. **Grid pattern overlay** — `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px)` cross-hatched, 64px × 64px, slightly stronger in dark mode (0.05 opacity).
3. **3 floating particles** (`animate-float`, opacity 40-60%) — small dots (2-3px) in primary/purple/cyan.

`pointer-events-none` on the wrapper so it never blocks UI.

---

## 11. Dark mode rules

**Dark mode is first-class** — the brand was designed dark. Every screen must look "premium" in dark, not just functional.

- Background: radial gradient (`#0a0a0f → #111827 → #0f172a`, 135deg, fixed).
- Cards: translucent slate-800 (30-50% alpha) — let the gradient bg show through.
- Borders: `dark:border-white/10` (10% white) for glass surfaces, `dark:border-neutral-700/50` for solid.
- Shadows: replace soft shadows with `glow-sm/md/lg` (violet halo). Crisp shadows look heavy on dark.
- Text: `dark:text-white` for primary, `dark:text-neutral-300` for secondary, `dark:text-neutral-400` for tertiary.
- Inputs: `dark:bg-neutral-900/50` with strong inner shadow on focus.

**Toggle:** Sun/Moon icon in sidebar footer (visible). Add `class="dark"` to `<html>`. Persist preference in Redux + localStorage.

**Test every page in BOTH modes.** Light mode is not an afterthought — it must look as polished as dark.

---

## 12. Iconography

- **Library:** [lucide-react](https://lucide.dev). 24px default. Stroke width 2.
- **Brand logo icon:** `Sparkles` from lucide (used today). Keep this — it's recognizable. Inside a `rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 w-8 h-8 / w-10 h-10` container.
- **Icon coloring:** match parent text color. Use `text-primary-500` for active states. Never use raw lucide-provided colors.
- **Page-defining icons** (per feature):
  - Dashboard: `Home`
  - Assessment: `BookOpen`
  - Learning Path: `Map`
  - Submissions: `Code`
  - Tasks: `ClipboardList`
  - Audit: `ScanSearch`
  - Analytics: `TrendingUp`
  - Achievements: `Trophy`
  - Settings: `Settings`
  - Admin: `Shield`
  - Mentor Chat: `MessageSquare` or `Sparkles`
  - Notifications: `Bell`

---

## 13. Imagery & avatars

- **User avatars:** if `user.avatar` URL exists, render it (1:1, rounded-full, `bg-neutral-200` placeholder). If null, render initials (first letters of name/email, up to 2, uppercase) on a `bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500` circle.
- **NO dicebear / cartoon avatars.** That was in an earlier iteration — removed.
- **Hero illustrations:** none. The `AnimatedBackground` is the visual hero. Don't introduce stock illustration kits.
- **Empty states:** use a lucide icon (e.g., `Inbox`, `FolderOpen`) at 48px in `bg-primary-500/10 rounded-full p-4`, with a short heading + body + primary action button.

---

## 14. Motion & micro-interactions

- **Default transition:** `transition-all duration-300` for cards/buttons. `duration-200` for inputs and toggles. `duration-100` for hover-color-only.
- **Easing:** Tailwind default (`cubic-bezier(0.4, 0, 0.2, 1)`). For "premium" feel transitions (modals, sheets), use ease-out on enter, ease-in on exit.
- **Hover lifts:** primary CTAs (`gradient`, `neon` buttons) `-translate-y-0.5` on hover + grow shadow.
- **Page transitions:** `animate-in` (fadeIn + slideUp 0.3s) on route change wrapper.
- **Skeleton loading:** glass-shimmer overlay on `.glass-card` shaped to the expected content.

---

## 15. Accessibility (WCAG 2.1 AA minimum)

- **Contrast:** all text on backgrounds must meet AA. The accent gradients have visual contrast issues — use them for non-essential visual flourish, never for body text. Buttons that use the gradient surface have white text — verify 4.5:1 against the gradient midpoint.
- **Focus visible:** every interactive element gets a 2px ring + 2px offset in `primary-500`. Implemented as `:focus-visible` globally in `globals.css`.
- **Reduced motion:** `prefers-reduced-motion: reduce` disables all `animate-*` classes and replaces them with `transition-none` + static opacity.
- **Semantic HTML:** `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<article>`, `<section>`. Don't generate divs everywhere.
- **ARIA:** labels on icon-only buttons. `aria-live="polite"` on toast region. `aria-current="page"` on active nav item.
- **Keyboard:** Tab order must follow visual order. Modals trap focus. Esc closes modals/dropdowns.
- **Color is not the only signal:** errors get an icon + text in addition to red color. Success scores get a checkmark + text in addition to emerald color.

---

## 16. Page surface inventory

The full list of pages we'll generate, organized by pillar. Each prompt file targets one pillar.

### Pillar 1 — Foundation
1. Design System Showcase (single page demonstrating all tokens + components)

### Pillar 2 — Public + Auth
2. Landing (`/`) — marketing home
3. Login (`/login`)
4. Register (`/register`)
5. GitHub OAuth Success (`/auth/github/success`)
6. Not Found 404 (`*`)
7. Privacy Policy (`/privacy`)
8. Terms of Service (`/terms`)

### Pillar 3 — Onboarding (Assessment)
9. Assessment Start (`/assessment`)
10. Assessment Question — adaptive, 30 Qs (`/assessment/question`)
11. Assessment Results (`/assessment/results`)

### Pillar 4 — Core Learning
12. Dashboard (`/dashboard`)
13. Learning Path View (`/learning-path`)
14. Project Details — task in path (`/learning-path/project/:id`)
15. Tasks Library — filterable catalog (`/tasks`)
16. Task Detail — pre-submission view (`/tasks/:id`)

### Pillar 5 — Feedback & AI ⭐ (defense-critical)
17. Submission Form — GitHub URL / ZIP upload (`/tasks/:id` → submit modal)
18. Submission Detail with **FeedbackPanel + MentorChatPanel** side-by-side (`/submissions/:id`)
19. Audit New — project upload form (`/audit/new`)
20. Audit Detail — 8-section AI audit report (`/audit/:id`)
21. Audits History (`/audits/me`)

### Pillar 6 — Profile & CV
22. Profile (`/profile`)
23. Learning CV — owner view, editable visibility (`/learning-cv`)
24. Public CV — anonymous view (`/cv/:slug`)
25. Settings (`/settings`)

### Pillar 7 — Secondary
26. Activity (`/activity`)
27. Achievements (`/achievements`)
28. Analytics — skill trend (`/analytics`)
29. Notifications dropdown (component, not page)

### Pillar 8 — Admin
30. Admin Dashboard (`/admin`)
31. User Management (`/admin/users`)
32. Task Management (`/admin/tasks`)
33. Question Management (`/admin/questions`)
34. Admin Analytics (`/admin/analytics`)

---

## 17. Output format requirements

For every page generated:

1. **Format:** Single `.tsx` file using React + TypeScript + Tailwind CSS classes.
2. **Imports:** From `lucide-react` for icons. Do NOT import from `@/components/ui` — define inline `Button`, `Card`, etc. helpers within the file (or as separate files in the same folder) so the preview is standalone-runnable.
3. **No external deps beyond:** `react`, `react-router-dom` (for `Link`), `lucide-react`, `recharts` (only if the page genuinely needs a chart).
4. **Mock data inline.** All page content (user names, scores, task titles, code snippets) should be hardcoded constants at the top of the file so the page renders without any backend. Use realistic content — "Layla Ahmed", "Trie-Based Fuzzy Search", real-looking Python/JS snippets, etc. — not "Lorem ipsum" or "user_1".
5. **Both modes:** the page must render correctly in light AND dark mode. The Design System Showcase (Pillar 1) will include a theme toggle; subsequent pages assume the theme is set globally via `.dark` class on the root.
6. **Responsive:** ≥320px (mobile), ≥768px (tablet), ≥1024px (desktop). Test the breakpoints visually before delivering.
7. **Self-contained.** A `.tsx` file dropped into a fresh Vite+React+Tailwind project, with the brand colors copied to `tailwind.config.js`, must render the page correctly.

---

## 18. Rejected directions

(Lessons from prior attempts — DO NOT propose these.)

### Slate spine + emerald-only minimalism (ADR-030, 2026-04-27)

A polish pass tried to replace the brand with: slate-only neutrals, single emerald accent, Geist font, glass scoped to chrome only, no neon. **Rejected after live walkthrough.** Owner's call: "Three accents and glassmorphism are part of how the product feels — keep them." This brief explicitly preserves all three accents (violet/cyan/fuchsia) and the full glass + neon vocabulary.

### Single-accent rebrand

Don't propose dropping cyan or fuchsia in favor of "one strong accent." All three stay, with the role splits in §3.1.

### Font swap

Don't propose Geist, IBM Plex, or any other display font. **Inter + JetBrains Mono.** Variable axis.

### Dicebear avatars or cartoon mascots

Removed in current implementation. Initials on gradient circles only.

### Generic SaaS dashboard look

If the output starts feeling like Linear / Notion / Vercel / Stripe, it's wrong. Those products are accent-light + chrome-heavy. We're the opposite: accent-rich + chrome-light.

---

## 19. The defense narrative (use this when prompting)

When you write a prompt that asks `claude.ai/design` to "make this feel professional," anchor it with this narrative:

> "This is the final-year project of a 7-person CS team at Benha University, defending in September 2026. The platform helps self-taught developers get senior-level code review feedback in 5 minutes. The aesthetic is 'Neon & Glass' — luminous, technical, alive. The audience is CS faculty + tech recruiters + working developers. The product should feel like something a developer would want to use daily, not a generic SaaS dashboard. Examiners should look at it and think 'this team can ship.'"

---

## 20. Index of related files

- **Token source of truth:** `frontend/tailwind.config.js`
- **Surface + utility classes:** `frontend/src/shared/styles/globals.css`
- **Component reference implementations:** `frontend/src/shared/components/ui/{Button,Card,Input,Badge,Modal,Toast,Tabs,ProgressBar,LoadingSpinner}.tsx`
- **Layout reference:** `frontend/src/components/layout/{AppLayout,AuthLayout,Header,Sidebar}.tsx`
- **Animation samples:** `frontend/src/features/landing/LandingPage.tsx` (the `AnimatedBackground` component, lines 28-43)
- **Identity ADR (rejected polish pass, kept for posterity):** `docs/decisions.md` → ADR-030

When in doubt, open the existing implementation and match.

---

**End of brief.** Treat it as canonical. Every prompt you give `claude.ai/design` should reference back to this document (you can either paste the relevant section inline, or attach this whole file if the tool supports it).
