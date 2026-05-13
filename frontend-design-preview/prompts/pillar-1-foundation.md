# Pillar 1 — Foundation: Design System Showcase

**How to use this file:** Copy the **entire prompt below** (everything inside the triple-dash block) into a new session at https://claude.ai/design. Submit it. Save the output as `DesignSystemShowcase.tsx` in `frontend-design-preview/pillar-1-foundation/`.

If the tool asks clarifying questions, anchor your answers to this prompt's "Hard constraints" section — do not invent new constraints.

---

```
You are designing the canonical "Design System Showcase" page for a product called Code Mentor.

# 1. Product context

Code Mentor is an AI-powered code review and learning platform. A learner submits real code (GitHub URL or ZIP), an AI service runs static analysis + LLM review, and the learner receives multi-layered feedback (per-category scores, inline annotations, follow-up Mentor Chat) within ~5 minutes. The product is built as the final-year graduation project of a 7-person CS team at Benha University, defending in September 2026. The audience is CS faculty, tech recruiters, and working developers — examiners should look at it and think "this team can ship."

The brand identity is "Neon & Glass" — luminous, technical, alive. It is already defined and is NOT up for negotiation in this session. Your job is to produce a faithful, polished visual rendering of this identity in a single design-system showcase page.

# 2. Hard constraints (do not deviate)

## 2.1 The only colors permitted

### Brand trio (all three are mandatory — do not drop or replace)
- Primary (Violet) — main accent, ~60% of color use
  - 50  #f5f3ff
  - 100 #ede9fe
  - 200 #ddd6fe
  - 300 #c4b5fd
  - 400 #a78bfa
  - 500 #8b5cf6  ← THE primary
  - 600 #7c3aed
  - 700 #6d28d9
  - 800 #5b21b6
  - 900 #4c1d95
  - 950 #2e1065
- Secondary (Cyan) — ~25% of color use
  - 400 #22d3ee
  - 500 #06b6d4
  - 600 #0891b2
- Accent (Fuchsia) — ~15% of color use, celebration moments
  - 400 #e879f9
  - 500 #d946ef
  - 600 #c026d3

### Signature multi-color gradient
linear-gradient(135deg, #06b6d4 → #3b82f6 → #8b5cf6 → #ec4899)
(cyan → blue → violet → pink)
Used on: animated card border on hover, hero CTAs, brand logo container. Use sparingly — one per surface max.

### Semantic colors
- Success (Emerald) — 500 #10b981, 100 #d1fae5, 400 #34d399
- Warning (Amber) — 500 #f59e0b
- Error (Red) — 500 #ef4444
- Neutrals — Tailwind slate ladder (50 #f8fafc → 950 #020617)

### Surfaces
- Light mode bg: #f8fafc (neutral-50)
- Dark mode bg: radial gradient `linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%)`, fixed attachment
- Light card bg: #ffffff (default), white/60 with backdrop-blur-xl (glass)
- Dark card bg: slate-800 at 30-50% opacity, with backdrop-blur-xl (glass)

NO other colors. NO emerald-only minimalism, NO slate-only "vercel-y" look. The brand trio (violet + cyan + fuchsia) and the glass + neon vocabulary are non-negotiable.

## 2.2 Typography

- Body / UI: Inter (variable axis), via Google Fonts
- Code / numeric: JetBrains Mono (variable axis), via Google Fonts
- Heading scale: h1 36/48px, h2 30/36px, h3 24/30px, h4 20/24px (mobile/desktop), all semibold, tracking-tight (-0.025em)
- Body: 15/16px regular
- Small: 13/14px regular
- Inter font features enabled: cv02, cv03, cv04, cv11

NO Geist, NO Roboto, NO IBM Plex, NO display fonts. Inter + JetBrains Mono only.

## 2.3 Border radii

- Cards, panels, modals: 16px (rounded-2xl)
- Buttons (md/lg), inputs: 12px (rounded-xl)
- Buttons (sm), tags, small surfaces: 8px (rounded-lg)
- Badges, avatars, pills: full circle (rounded-full)

## 2.4 The Glass system — 5 variants

1. .glass — chrome glass for headers/nav: `bg-white/70 dark:bg-neutral-800/30 backdrop-blur-xl border border-white/20 dark:border-white/10`
2. .glass-card — default card surface: `bg-white/60 dark:bg-neutral-800/30 backdrop-blur-xl border border-neutral-200/50 dark:border-white/10 rounded-2xl` + soft shadow
3. .glass-card-neon — same as glass-card, with a conic gradient border (cyan→violet→fuchsia) that appears ONLY on hover
4. .glass-frosted — thicker blur for modals/sheets: `bg-white/80 dark:bg-neutral-900/50 backdrop-blur-2xl`
5. .glass-shimmer — has a 30deg gradient highlight sweep animation every 3 seconds; used very rarely (welcome banners, "CV is live" moments)

## 2.5 The Neon system — accents only, never default

- Neon shadows: `shadow-neon` (violet), `shadow-neon-cyan`, `shadow-neon-purple`, `shadow-neon-pink`, `shadow-neon-green` — each is a multi-stop box-shadow with the named color at 5/20/35px blur
- Neon text shadow: same color variants, 4-stop text-shadow
- Glow utilities: `glow-sm/md/lg` — soft violet halos (dark mode only)
- Animations: `neon-pulse` (2s opacity+brightness), `neon-flicker` (3s old-sign flicker — vintage neon labels only), `glow-pulse` (2s box-shadow pulse), `animate-float` (6s y-axis bob), `shimmer` (3s gradient sweep)

Apply with discipline: hover state of CTAs, focus rings, "live" indicators, "this card is selected" emphasis. NEVER on body text. NEVER on rest state of routinely-viewed surfaces.

## 2.6 Icons

Use lucide-react throughout. Standard sizes: 16/20/24px for sm/md/lg contexts. Stroke width 2.

# 3. What I want you to design

A SINGLE PAGE: a "Design System Showcase" that demonstrates every brand element in one place. Think of it as the reference page a new designer or developer would open to internalize the system before they design or build anything else.

It should function as both:
- A visual proof that you understood the identity (so I can approve direction before we move on)
- A live reference we can point future page designs back to

# 4. Page structure (build these sections in this order)

## Section 0 — Page chrome

- Top nav (`.glass`, sticky, h-16) with: brand logo on the left (Sparkles lucide icon in a rounded-xl gradient-violet-to-purple container, "CodeMentor" wordmark next to it in Inter semibold), "Design System v1" badge in the center, Sun/Moon theme toggle on the right
- Theme toggle MUST WORK — clicking it toggles a `dark` class on `document.documentElement`. Use React state + useEffect.
- Page background: light mode neutral-50; dark mode the radial gradient (`background: linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%); background-attachment: fixed`)

## Section 1 — Hero

- Centered above the fold
- Headline: "Code Mentor — Neon & Glass Design System" (h1, semibold, tracking-tight)
- Use the signature gradient on a 2-word part of the headline ("Neon & Glass") via `bg-clip-text text-transparent`
- Subhead: one sentence — "Canonical reference for the visual identity. Every page in the platform inherits from this."
- Render the AnimatedBackground component behind this section ONLY (not the whole page)

### AnimatedBackground component
Three blurred gradient orbs with `animate-pulse` (Tailwind), staggered delays:
- Top-left: 384px circle, `from-primary-500/30 to-purple-500/30 blur-3xl`
- Center-right: 320px circle, `from-cyan-500/20 to-blue-500/20 blur-3xl`, animation-delay: 1s
- Bottom-left: 256px circle, `from-pink-500/20 to-orange-500/20 blur-3xl`, animation-delay: 2s
Plus a subtle grid overlay: `bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]` (slightly stronger in dark mode at 0.05 opacity)
Plus 3 small floating particles (2-3px dots, `animate-float`, opacity 40-60%, primary/purple/cyan colors)
`pointer-events-none` so it never blocks UI.

## Section 2 — Colors

Subsection 2a — Brand trio: three large color cards side-by-side (responsive: stack on mobile), each showing:
- The 500 swatch as a large rectangle (h-32)
- Token name (e.g., "Primary — Violet")
- Hex value in JetBrains Mono
- Role description (1 line)
Below each, a horizontal strip showing the full ladder (50-950 for primary; 400-600 for secondary and accent).

Subsection 2b — Semantic colors: 4 smaller cards (Success / Warning / Error / Info-as-secondary-cyan), each showing 500 swatch + name + hex.

Subsection 2c — Signature gradient: a single full-width card with the cyan→blue→violet→pink gradient as the bg, the gradient definition in JetBrains Mono overlaid in white.

## Section 3 — Typography

- Display each heading level (h1-h4) with a label below showing size in mobile/desktop + weight + tracking
- Body paragraph (one paragraph of real text — not Lorem ipsum — something like "Code Mentor closes the gap between basic coding literacy and professional engineering competency. Submit your code, get a senior-developer review in under 5 minutes.")
- Inline code sample: "const score = await analyzeSubmission(submissionId);" — JetBrains Mono, neutral-100 bg in light / neutral-800 in dark, rounded-md, px-1.5
- Block code sample: a 6-line TypeScript snippet (a real-looking function — e.g., a small `useFeedbackPolling` hook) in a `.glass-card` container with JetBrains Mono, syntax-coloring should at minimum distinguish: keywords (violet), strings (emerald), comments (neutral-500 italic), functions (cyan). Include a "Copy" button (ghost, top-right) and a 3-dot inline annotation marker in the gutter on one line.

## Section 4 — Buttons

Show the 8 variants × 3 sizes matrix, with realistic labels (no "Click me"):
- Variants (rows): primary, secondary, outline, ghost, danger, gradient, neon, glass
- Sizes (columns): sm, md, lg
- For each cell: the button with a leftIcon (relevant lucide icon — e.g., ArrowRight for primary, Trash2 for danger, Sparkles for gradient, Code for neon)

Below the matrix, a "States" row showing one button in: default, hover, focus-visible, disabled, loading (with Loader2 spinner). Hover state should be visible somehow — use a small note like "hover →" pointing to a button that has its hover styles applied via a peer-hover trick or via a separate "hover demo" instance.

Make the gradient button surface use the signature gradient (`bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500`), hover lifts `-translate-y-0.5` + grows shadow with violet tint.
Make the neon button surface use cyan→blue gradient (`bg-gradient-to-r from-cyan-500 to-blue-500`), hover adds cyan-shadow glow.

## Section 5 — Cards

Show the 5 card variants in a responsive 2- or 3-column grid:
1. default — white in light / slate-800/80 in dark, soft shadow
2. bordered — 2px neutral border, no shadow
3. elevated — larger shadow
4. glass — `.glass-card` styling
5. neon — has the conic gradient border ON HOVER (test it — hover should reveal a 1-2px animated rainbow border)

Each card has Card.Header + Card.Body + Card.Footer:
- Header: short title ("Pattern Matching Quiz" / "Submission #142" / "Active path") + subtitle
- Body: 2-3 lines of content — for the "neon" variant include a small inline metric like "94/100" in JetBrains Mono
- Footer: a button + a metadata line ("Updated 2 hours ago")

## Section 6 — Inputs

Two variants side-by-side:
- Base input: with label "Email address", placeholder "you@university.edu", helper text "We never share your email", error state below it labeled "Invalid format"
- Glass input: with label "Project name", placeholder "Trie-based fuzzy search"
Plus a search input (with Search icon prefix), a select dropdown (Headless UI style), and a textarea (rows=3, helper text "Max 2000 chars").

## Section 7 — Badges

A row of badges showing every variant:
- Status badges: "Completed" (emerald-50 bg, emerald-700 text), "Processing" (cyan-50 bg, cyan-700 text), "Failed" (red-50 bg, red-700 text), "Pending" (amber-50 bg, amber-700 text)
- Neon badges: "AI" (primary), "Beta" (cyan), "Pro" (fuchsia)
- Neon-glow badge: "Live" (with primary-500 glow + neon-pulse animation)

## Section 8 — Progress + radial score gauge

- Linear progress bar: h-2 rounded-full, primary→purple gradient fill, at 67% with label "67% complete"
- Radial score gauge (SVG): viewBox 0 0 36 36, stroke-dasharray sized to score, primary gradient stroke (use a gradient defs), center text showing "85" in large JetBrains Mono + "score" below in small neutral-500
- Side-by-side stat cards: 3 cards showing "Submissions: 24", "Avg score: 78", "Streak: 6 days" — each with a small trend arrow (TrendingUp icon, success-500 color)

## Section 9 — Tabs + Modal trigger

- Horizontal tab strip with 4 tabs: "Overview" (active) / "Annotations" / "Mentor Chat" / "History"
- Active tab: primary-500 bottom border (2px) + primary-700 text
- Below tabs, a small content area saying "Tab content for: Overview"
- A "Open modal" button (variant=outline) — clicking it shows a centered modal using `.glass-frosted` surface with:
  - Header: "Add task to your learning path"
  - Body: 2 lines + a select dropdown
  - Footer: Cancel (ghost) + Confirm (primary, gradient if you prefer the celebration treatment)
  - Backdrop: `bg-black/50 backdrop-blur-sm`
  - Enter animation: scale 0.95→1, opacity 0→1, duration 100ms
  - Esc closes it; click backdrop closes it
  - Trap focus inside the modal while open

## Section 10 — Toast samples

Show 4 stacked toasts in the top-right corner (purely visual — no auto-dismiss), one of each variant:
- Success: emerald, CheckCircle icon, "Submission #142 completed"
- Error: red, AlertCircle icon, "Upload failed — file too large"
- Warning: amber, AlertTriangle icon, "Connection slow — retrying"
- Info: cyan, Info icon, "AI is reviewing your code…"
Surfaces use `.glass` styling. Display them in their proper toast container position (fixed top-right, gap-2 between).

## Section 11 — Glass surfaces showcase

A grid of 5 cards, one per glass variant — each labeled with its class name and a 1-line description of when to use it. Background behind this section should show the gradient orbs so the glass effect is visible.

## Section 12 — Neon effects showcase

Three columns:
- Column A: 5 buttons each demonstrating one shadow-neon variant on hover (have them in a slightly-hovered state visually or use a marker — pick whatever works)
- Column B: 5 text labels each demonstrating one text-neon variant — labels read "AI", "LIVE", "VERIFIED", "ACTIVE", "PRO"
- Column C: 3 animated effects — one element with `neon-pulse`, one with `glow-pulse`, one with `animate-float`

Each effect labeled in JetBrains Mono with its class name.

## Section 13 — Iconography reference

Display the 12 lucide-react icons most used in the app, in a responsive grid, each in a small `.glass-card`:
Home, BookOpen, Map, Code, ClipboardList, ScanSearch, TrendingUp, Trophy, Settings, Shield, Sparkles, MessageSquare

Each card: 32px icon centered, name in JetBrains Mono below, context line ("Dashboard nav", "Assessment", etc.) in neutral-500.

## Section 14 — Empty state pattern

A single card showing the canonical empty state:
- A large lucide icon (e.g., `Inbox`) at 48px inside a `bg-primary-500/10 rounded-full p-4` circle
- Heading: "No submissions yet"
- Body: "Submit your first task to see AI-powered feedback here."
- Primary CTA: "Browse tasks" (gradient variant button)

## Section 15 — Code annotation pattern (the AI-review signature element)

A small code block (Python or TypeScript, 8-10 lines, realistic-looking — something like a buggy SQL string interpolation or a missing input-validation check), with:
- Line 4 highlighted with a violet-500 left border (4px) and violet-500/10 bg overlay
- A speech-bubble icon (MessageSquare) in the gutter next to line 4
- Hovering or clicking that icon expands an inline "Mentor Annotation" popover: violet border, glass-frosted bg, body "This concatenation creates a SQL injection risk. Use parameterized queries via `cursor.execute(query, params)` instead."
- A small "Apply suggestion" link button at the bottom of the popover

This pattern is the visual signature of the entire product — get it right.

# 5. Output format

- A single .tsx file: DesignSystemShowcase.tsx
- React 18 + TypeScript strict
- All styling via Tailwind CSS classes
- Custom utility classes (.glass, .glass-card, .glass-card-neon, .glass-frosted, .glass-shimmer, .shadow-neon-*, .text-neon-*, etc.) defined inside a `<style jsx global>` block at the top of the file OR via a `<style>` tag with the relevant CSS — your call, as long as they work standalone
- Inline helper components for Button, Card, Badge, Input, Modal, etc. — do not import from a UI library beyond `lucide-react` and `react`
- Theme toggle MUST work — use React state + a useEffect that adds/removes a 'dark' class on `document.documentElement`
- Mock data and copy: realistic, technical, no Lorem ipsum, no emoji
- File header: a short JSDoc comment explaining what the file is and when it was generated

The file should be runnable with: copy → paste into a fresh `create-vite@latest --template react-ts` project + install `lucide-react` + add the Tailwind config with the brand colors → npm run dev → the page renders.

# 6. Tailwind config snippet to assume

The page will be rendered with a tailwind.config.js that includes these custom colors and animations. You don't need to redefine them — just use them via class names.

```js
colors: {
  primary: { 50:'#f5f3ff', 100:'#ede9fe', 200:'#ddd6fe', 300:'#c4b5fd', 400:'#a78bfa', 500:'#8b5cf6', 600:'#7c3aed', 700:'#6d28d9', 800:'#5b21b6', 900:'#4c1d95', 950:'#2e1065' },
  secondary: { 400:'#22d3ee', 500:'#06b6d4', 600:'#0891b2' },
  accent: { 400:'#e879f9', 500:'#d946ef', 600:'#c026d3' },
  // success/warning/error/neutral are Tailwind defaults (emerald/amber/red/slate)
}
fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'Consolas', 'monospace'] }
animation: { 'float': 'float 6s ease-in-out infinite', 'fade-in': 'fadeIn 0.3s ease-out', 'slide-up': 'slideUp 0.3s ease-out' }
```

Inter + JetBrains Mono should be loaded from Google Fonts via a `<link>` tag — include it in the file (you can use an inline `<style>` block + `@import url(...)` or render a `<link>` at the top of the component).

# 7. Anti-patterns (DO NOT do any of these)

- Do NOT use emerald as a primary accent or replacement for violet
- Do NOT use a single accent across the whole page — the trio (violet + cyan + fuchsia) must all be visible
- Do NOT suggest Geist, IBM Plex, or any font besides Inter + JetBrains Mono
- Do NOT use dicebear, "boring avatars", or cartoony illustrations
- Do NOT use stock photography or hero illustrations
- Do NOT use emoji in any UI text
- Do NOT make the page feel like Linear or Vercel — those are accent-light + chrome-heavy; we are accent-rich + chrome-light
- Do NOT add light/dark mode CSS as separate stylesheets — use Tailwind's `dark:` prefix throughout
- Do NOT skip the AnimatedBackground in the hero — it's a brand signature
- Do NOT skip the inline annotation pattern in Section 15 — it's the product's defining visual

# 8. Tone of the page

Generous spacing. Hero feels alive. Component sections feel like reference documentation — neat, gridded, every example labeled. Dark mode is the "premium" mode — make sure dark mode shines. Light mode should look just as polished, not like a flipped afterthought.

Length: this is a long, scrolling reference page (8-12 screens worth of vertical scroll on desktop). That's expected — it covers the whole system in one place.

# 9. Acceptance criteria (what I'll check during walkthrough)

- All 16 sections present and labeled
- Theme toggle works in both directions, no flash, all surfaces handle both modes correctly
- The brand trio (violet + cyan + fuchsia) all visible on the same page
- Inter + JetBrains Mono actually loaded and visible (not falling back to system-ui)
- AnimatedBackground component visibly animating in the hero
- At least one neon hover effect demonstrable (gradient or neon button)
- At least one card with `.glass-card-neon` showing the conic gradient on hover
- The Section 15 code annotation pattern looks like the product's actual review surface (not generic syntax highlighting)
- Mobile viewport (320px DevTools) — no horizontal scroll, content readable, sections stack
- WCAG AA contrast on all text + on dark mode bg
- Focus-visible rings work on every interactive element (Tab through the page)
- Prefers-reduced-motion respected (test in DevTools — animations should freeze)

Deliver one .tsx file. If you want, also produce a small README inside the same response with notes on anything you compromised on or want to flag. But the file itself is the primary deliverable.
```

---

## After you have the output

1. Save it as `pillar-1-foundation/DesignSystemShowcase.tsx` (and the README into `pillar-1-foundation/notes.md` if there is one).
2. (Optional) Screenshot the page in both light and dark mode → save into `pillar-1-foundation/screenshots/`.
3. Tell me "Pillar 1 output is ready" — I'll generate a minimal Vite + Tailwind scaffold to run the showcase on `localhost:5174` and we'll do the live walkthrough together.

## Tips for the claude.ai/design session

- If the tool produces something off-brand, **don't accept it.** Reply with: *"This output uses [emerald / Geist / etc.]. Re-read the Hard Constraints section — the brand trio (violet + cyan + fuchsia) and Inter + JetBrains Mono are non-negotiable. Please regenerate respecting those constraints."*
- If it asks "should I add X feature," default to **"only if it's in the page structure section."** Don't expand scope.
- If it asks to "modernize" the aesthetic, decline: *"The aesthetic is defined. Render the brief as written. We can iterate on specifics after a walkthrough."*
- Multi-turn is OK if the first output misses some sections — ask for those sections specifically. But avoid the trap of incrementally drifting away from the brief over many turns.
