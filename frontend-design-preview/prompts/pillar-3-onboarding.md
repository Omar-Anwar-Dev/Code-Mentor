# Pillar 3 — Onboarding (Assessment): 3 pages

**How to use this file:** Copy the entire prompt below (everything inside the **4-backtick** block) into a session at https://claude.ai/design — **same session as Pillar 1 + 2 if possible** (the tool will already have the identity in working memory and will reuse the Pillar-1 primitives + Pillar-2 AuthLayout cleanly).

> ⚠️ The outer wrapper below uses **4 backticks** (` ```` `) intentionally — the prompt contains a nested Python code block (3 backticks). If you wrap with 3 backticks, your text editor will close the outer block at the first inner ` ``` ` and you'll only copy half. **Copy the whole region between the two ` ```` ` markers.**

**Important context:**
- **Pillar 1 + Pillar 2 are APPROVED.** The identity, components, layouts, page switcher pattern, and brand voice are canonical. This pillar must produce visually-consistent output.
- Pillar 2 introduced an `AuthLayout` (`pa/shared.jsx`) + page-switcher pattern (`pa/app.jsx`). Pillar 3 will use the **same page-switcher pattern** to navigate between Start / Question / Results, but the pages themselves use a **focused single-task layout** (no sidebar, minimal chrome) — closer to GitHubSuccess in feel than to Landing.
- After delivery, save the output into `pillar-3-onboarding/`, then tell me **"Pillar 3 output is ready"** and we'll wire up the preview on port 5177.

---

````
You are continuing the design of Code Mentor — Neon & Glass. The visual identity is APPROVED and codified across Pillars 1 + 2. This session designs the three Onboarding pages: the adaptive **skill assessment** flow.

# 1. Product context (recap)

Code Mentor is an AI-powered code review and learning platform. Onboarding is a one-time, focused, ~40-minute experience where a new learner takes an adaptive 30-question skill assessment, then sees their per-category scores and gets routed into a personalized learning path. This pillar is the entire onboarding flow.

# 2. Identity (canonical — same as Pillars 1 + 2, do not deviate)

## 2.1 Tokens (recap — full spec in Pillar 1)
- Primary Violet `#8b5cf6` (main accent ~60%)
- Secondary Cyan `#06b6d4` (~25%)
- Accent Fuchsia `#d946ef` (~15%, celebration only)
- Signature gradient `linear-gradient(135deg, #06b6d4 0%, #3b82f6 33%, #8b5cf6 66%, #ec4899 100%)`
- Semantic: Emerald success / Amber warning / Red error / Cyan info
- Dark bg radial gradient `linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%)`, fixed
- Light bg `#f8fafc`
- Inter + JetBrains Mono variable axis, Google Fonts
- Heading scale h1 36/48 · h2 30/36 · h3 24/30 · h4 20/24, semibold, tracking-tight (-0.025em)
- Radii: cards 16px / buttons-md+lg 12px / buttons-sm 8px / badges full

## 2.2 Glass + neon system
Same 5 glass variants (`.glass`, `.glass-card`, `.glass-card-neon`, `.glass-frosted`, `.glass-shimmer`), 5 shadow-neon variants, 5 text-neon variants, glow-sm/md/lg, animations (`animate-float`, `animate-pulse`, `animate-glow-pulse`, `animate-shimmer`, `animate-fade-in`, `animate-slide-up`). Use exactly as Pillar 1.

## 2.3 Reusable components
Assume these exist (from Pillar 1's `primitives.jsx`) and use them directly:
- **Button** — 8 variants (primary, secondary, outline, ghost, danger, gradient, neon, glass) × 3 sizes
- **Card** — 5 variants (default, bordered, elevated, glass, neon)
- **Badge** — 8 tones (neutral, success, processing, failed, pending, primary, cyan, fuchsia) + glow + pulse
- **Field** + **TextInput** + **Select** + **Textarea** + **Modal** + **Toast** + **Section**

From Pillar 2's `pa/shared.jsx`:
- **`<AnimatedBackground />`** — 3 orbs + grid + 3 floating particles
- **`<BrandLogo size="sm|md|lg" />`** — gradient container with Sparkles + "CodeMentor AI" wordmark
- **`<ThemeToggle dark setDark />`** — Sun/Moon button
- **`useTheme()`** hook

DO NOT redefine these. Import / use as-is. For the bundled preview, you'll re-include the same `icons.jsx`, `primitives.jsx`, and `pa/shared.jsx` from Pillars 1+2.

# 3. Layout philosophy for this pillar

The assessment is a focused, single-task experience — like an exam. The page chrome must NOT distract. Specifically:
- **No sidebar**, no full nav, no anchor links
- Top bar is minimal: small brand logo (left), progress + timer (center, on Question page only), theme toggle (right) + a small "Exit assessment" link (right of theme toggle) — with a confirmation modal before leaving
- The page content is centered, max-w-2xl to max-w-4xl depending on density
- AnimatedBackground is used on Start (welcoming feel) and Results (celebratory) — but on the Question page, drop the orbs so they don't distract from reading. Keep only the subtle grid overlay.

# 4. Deliverables — 3 pages

All 3 wrapped under the same page-switcher pattern from Pillar 2 (`pa/app.jsx`) so we can navigate between them in the preview. Default page: Start. Save the output as `Assessment.html` (root) + `src/as/start.jsx`, `src/as/question.jsx`, `src/as/results.jsx`, `src/as/shared.jsx` (page-specific shared bits — TopBar, ExitModal), `src/as/app.jsx` (page switcher + router). Reuse `src/icons.jsx`, `src/primitives.jsx`, `src/pa/shared.jsx` from Pillars 1+2 unchanged.

## 4.1 Assessment Start — `/assessment`

The pre-launch screen — confirms what's about to happen, sets the right expectations, and lets the learner pick a track before they begin.

### Layout
- `AnimatedBackground` full page, behind everything
- TopBar (fixed, glass, h-14): BrandLogo size sm (left) · empty center · ThemeToggle (right)
- Centered content, max-w-2xl, py-16 vertical
- Single `.glass-card` containing all the content

### Card content (in order)
1. **Eyebrow pill** — `.glass` small, rounded-full: `<Sparkles size=11>` icon + "Skill assessment · adaptive" in 12px font-medium
2. **H1** — "Let's figure out where you are." (40-44px, semibold, tracking-tight, dark:text-slate-50)
3. **Subline** — 16px, slate-600/300, max-w-xl: "Thirty adaptive questions that calibrate to your level as you answer. We'll plot your strengths across five engineering categories and generate a personalized learning path from the result."
4. **4 expectation tiles** in a 2-column responsive grid (1-col on mobile, 2-col on sm+):
   - **`<Clock>` icon** + "~40 minutes" + "Can pause anytime"
   - **`<ListChecks>` icon** + "30 questions" + "Difficulty adapts to your answers"
   - **`<Layers>` icon** + "5 categories" + "Correctness · Readability · Security · Performance · Design"
   - **`<TrendingUp>` icon** + "Beginner → Advanced" + "Get your level + per-category breakdown"
   Each tile: glass-bg (white/40 in light, white/[0.03] in dark), rounded-xl, p-4, icon on the left in a small primary-500/10 circle, text on the right.
5. **Track selector** — same pattern as Pillar 2's Register page TrackCard, 3 options in a sm:grid-cols-3 grid:
   - Full Stack (Code icon, "React + .NET")
   - Backend (ScanSearch icon, "ASP.NET + Python")
   - Python (BookOpen icon, "Data + Web")
   Default-select Full Stack. Selected state: violet border + ring + bg-primary-500/15.
6. **Primary CTA full-width** — "Begin assessment" (gradient lg, leftIcon Play, rightIcon ArrowRight). Click navigates to the Question page in the preview.
7. **Footer note** — 12px, slate-500, centered: "You can pause and resume at any time. Re-take available 30 days after completion."

### Microcopy tone
Honest, friendly, slightly nervous-reducing. Not "Crush your skills assessment!" — that's wrong tone. The vibe is "we're calibrating, not judging."

## 4.2 Assessment Question — `/assessment/question`

The most-used page in the flow. Has to feel calm, focused, and a little bit serious.

### Layout
- Background: NO AnimatedBackground orbs (too busy). Keep only the subtle `bg-grid` overlay on the body.
- TopBar (sticky top, glass, h-14): 
  - Left: BrandLogo sm + a small "Exit" ghost button (leftIcon X) — clicking opens an Exit confirmation Modal (using the canonical Modal from Pillar 1)
  - Center: **Progress bar** — a 240px wide horizontal bar (h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10) with a fill at width 37% (the current question is 11/30), brand-gradient-bg fill. Above the bar: "Question 11 of 30" in 11px mono. Below the bar: a tiny dot row showing the 30 questions with the answered ones (10) filled in primary-500, the current (1) ringed in primary-300, the upcoming (19) as outlines.
  - Right: **Timer** in JetBrains Mono — "32:18 remaining" with a small clock icon. Color: amber-600 if under 5 minutes (this preview shows 32 min, so neutral). Plus ThemeToggle.
- Centered content max-w-2xl, py-12 top padding (under the topbar)

### Question card content
1. **Top row** — 3 small inline chips:
   - Category badge: `<Badge tone="cyan" icon="ScanSearch">Security</Badge>`
   - Difficulty: small inline pill with 3 dots, 2 filled in violet, 1 empty: "Difficulty 2/3"
   - Estimated time: small mono "~90s"
2. **Question text** — h3 (24-30px, semibold tracking-tight): "Which of the following correctly mitigates a SQL injection vulnerability in this Python function?"
3. **Code block** (the question references code) — a small `.glass-card`-style code surface with Prism-style coloring, ~6 lines of Python:
   ```python
   def get_user_by_email(email):
       query = f"SELECT * FROM users WHERE email = '{email}'"
       return db.execute(query).fetchone()
   ```
   Colors: keywords (def, return) in violet (#a78bfa), function names (get_user_by_email) in cyan (#22d3ee), strings (the f-string) in emerald (#34d399), comments would be slate-italic.
4. **4 answer options** in a vertical stack (gap-2.5), each a clickable card:
   - Layout per option: `rounded-xl border p-4 flex items-start gap-3 transition-all`
   - Left: a 28px circle with the letter (A/B/C/D) in mono, bg-slate-100/dark-white/10
   - Right: option text + (optional) a small code snippet inline
   - Selected state: violet border-2 + ring + bg-primary-500/8 + the letter circle becomes primary-500 with white letter
   - Hover state (non-selected): border becomes primary-300 + bg-slate-50 / white/[0.02]
   - Option C is **selected** by default for the walkthrough
   
   Options:
   - **A** "Sanitize the email string using `email.replace(\"'\", \"\")`."
   - **B** "Wrap the query in a try/except block to handle SQL errors gracefully."
   - **C** "Use a parameterized query: `db.execute(\"SELECT * FROM users WHERE email = %s\", (email,))`." ← correct (selected)
   - **D** "Hash the email before passing it to the query."
   
5. **Bottom actions** in a flex row, justify-between:
   - Left: **Previous** ghost button (leftIcon ArrowLeft) — disabled if first question (this one is q11, so enabled)
   - Center: **Skip question** small ghost button (text only, "Skip this question")
   - Right: **Next →** gradient button (rightIcon ArrowRight)

### Exit modal (Pillar-1 Modal component)
- Title: "Exit assessment?"
- Body: "Your progress (10 answered questions) will be saved. You can resume later from your dashboard."
- Footer: Cancel (ghost) + Confirm "Exit & save progress" (danger variant)

## 4.3 Assessment Results — `/assessment/results`

Celebratory but not over-the-top. Mostly informational with one delightful moment.

### Layout
- `AnimatedBackground` (full, slightly more vivid orbs allowed here — this is the celebratory moment)
- TopBar (fixed glass, h-14): BrandLogo sm (left) + a small completion timestamp center "Completed in 38 minutes 42 seconds" mono small + ThemeToggle right
- Centered content, max-w-5xl, py-12

### Section A — Hero (top, centered)
- Big circular score gauge (radial SVG, 200×200, similar to Pillar 1's gauge but bigger). Stroke uses the brand-gradient via SVG linearGradient defs. Center text: 
  - Big number: "76" (signature-gradient text, 72px, mono)
  - Small below: "out of 100"
- To the right of the gauge (stack vertically on mobile, side-by-side on sm+):
  - Eyebrow mono "Your level"
  - **Level pill (large)**: "Intermediate" — `text-neon-cyan` style, larger (24px), with `.glass-card` chip surface. Ringed lightly with cyan/30.
  - One-sentence summary: "Strong on Correctness and Readability. Room to grow on Security and Performance."

### Section B — Radar + breakdown (2-column on desktop)

**Left column (Radar chart)** — wrapped in a `.glass-card`:
- A 5-axis SVG radar chart:
  - Axes: Correctness, Readability, Security, Performance, Design
  - Grid: concentric pentagons at 20/40/60/80/100, neutral-200/dark:white/10 dashed strokes
  - Filled shape with the brand-gradient at 20% alpha + stroke at primary-500
  - Axis labels in JetBrains Mono 12px slate-500
  - Data points marked with small dots
- Below chart: caption "Per-category breakdown"
- Sample data: Correctness 84, Readability 81, Security 58, Performance 65, Design 72

**Right column (Per-category list)** — wrapped in a `.glass-card`:
- 5 horizontal rows, gap-3, each:
  - Left: category icon + name (text-sm font-medium)
  - Center: a horizontal progress bar (h-1.5 rounded-full bg-slate-200/dark:white/10) with brand-gradient fill at the score percentage
  - Right: mono score "84/100" with a small trend indicator (emerald TrendingUp +5 vs last attempt — but for this is first attempt, hide trend)
- Color-codes by score:
  - ≥80: emerald (Strong)
  - 60-79: amber (Solid)
  - <60: red (Focus area)
  - Show a tiny tag at the right end: "Strong" / "Solid" / "Focus area"

### Section C — Strengths + weaknesses (2-column, sm+)
- Left card (.glass-card-neon): "What you nailed"
  - Bullet list (3 items, each with a CheckCircle in emerald):
    - "Clean function decomposition — your code is easy to read and reason about."
    - "Confident with control flow — you handled the trickiest correctness questions."
    - "Solid grasp of fundamentals — data types, scopes, mutation patterns."
- Right card (.glass-card): "What's worth working on"
  - Bullet list (3 items, each with an AlertCircle in amber):
    - "Security — particularly input validation and parameterized queries."
    - "Performance — recognize the cost of nested loops and unnecessary allocations."
    - "Design — when to introduce abstraction vs keep things flat."

### Section D — Primary CTAs (bottom, centered)
- Big gradient button: "Generate my learning path" (gradient lg, leftIcon Sparkles, rightIcon ArrowRight)
- Below it, a row of 2 secondary buttons:
  - "Save & share results" (glass, sm, leftIcon Share2)
  - "View the report (PDF)" (ghost, sm, leftIcon FileDown)
- Mono note: "Re-take available 30 days from today. Your results are saved to your profile."

# 5. Page switcher (preview only)

Same pattern as Pillar 2. A fixed top-right pill, glass-frosted rounded-full, collapsible. 3 buttons: Start / Question / Results. Default open. Active button: primary-500 bg + violet shadow.

# 6. Output format

Same architecture as Pillar 2:
- HTML root file (`Assessment.html`) with: Google Fonts + Tailwind config + inline CSS (same glass/neon system) + vendored scripts (or CDN, we'll re-vendor on integration)
- All JSX bundled into ONE script tag pointing at `src/bundle.jsx` (same fix from Pillar 1 — Babel runtime can't share scope across multiple `<script type="text/babel">` blocks)
- Each page in its own source file under `src/as/`; bundle order:
  1. `src/icons.jsx` (P1)
  2. `src/primitives.jsx` (P1)
  3. `src/pa/shared.jsx` (P2 — provides AnimatedBackground, BrandLogo, ThemeToggle, useTheme, AuthLayout)
  4. `src/as/shared.jsx` (NEW — TopBar variants, ExitModal, ScoreGauge, RadarChart, AnswerOption components)
  5. `src/as/start.jsx`
  6. `src/as/question.jsx`
  7. `src/as/results.jsx`
  8. `src/as/app.jsx` (PAGES list + PageSwitcher + App component + render)
- Theme toggle: same `useTheme()` from P2
- Mock data realistic and consistent: learner is "Layla Ahmed", track "Full Stack", completed in 38m42s, score 76/100, level Intermediate, etc.

# 7. Anti-patterns (DO NOT do these)

- No invented user counts or social proof. The trust signal is the platform itself.
- No emoji in copy.
- No green-for-positive everywhere — keep emerald for genuine "Strong" semantics, not as default decoration.
- No counter animations on the score (number animating from 0 to 76) — feels gimmicky. Just render 76.
- Don't put the radar chart in a black box — keep it on the glass surface so it inherits the page's mood.
- Don't add "Share to LinkedIn" or "Tweet your score" buttons. Privacy-first.
- Don't make the Question page feel like a quiz game — no streak meters, no XP popups during the assessment. Those belong post-completion (on Results or in achievements). The Question page is calm.
- Don't introduce orbs on the Question page background — bad for focus.

# 8. Acceptance criteria (what I'll check during walkthrough)

- All 3 pages render via the page switcher
- Theme toggle works on every page
- Start: 4 expectation tiles + 3-track selector both rendered, primary CTA prominent
- Question: progress bar + timer + dot row legible; 1 answer option pre-selected in violet; Exit modal opens with focus trap (same as Pillar 1 Modal)
- Results: radial gauge + radar chart + per-category bars all rendered; strengths and weaknesses cards differentiate (glass-card-neon on left); single big "Generate my learning path" CTA
- All 3 pages fit in 800px desktop viewport with NO vertical scroll (per the Pillar-2 norm for focused-task pages). If a page would overflow, prefer reducing padding / font sizes over splitting content across screens.
- No console errors (preview-only warnings from Tailwind + Babel + favicon are expected)

Deliver as a runnable HTML + bundled JSX, same architecture as Pillars 1 + 2.
````

---

## After you have the output

1. Save the HTML as `pillar-3-onboarding/Assessment.html` (or whatever name `claude.ai/design` gives it) → I'll rename to `index.html` for serving.
2. Save the JSX source files under `pillar-3-onboarding/src/` (reusing the `icons.jsx`, `primitives.jsx`, `pa/shared.jsx` structure from Pillars 1+2).
3. Tell me **"Pillar 3 output is ready"** and I'll:
   - Stage the files at the pillar root
   - Reuse `vendor/` from Pillar 1
   - Bundle the JSX into a single `src/bundle.jsx`
   - Add a `pillar-3-preview` entry to `.claude/launch.json` on port **5177**
   - Start the preview and we'll walk through together

## Tips for the `claude.ai/design` session

- **Same session as before** — the tool has the identity in working memory and reuses Pillar 1+2 components cleanly.
- If the Question page starts to feel "gamified" (XP, streaks, confetti during questions) → push back: *"The assessment is calm and serious, not a quiz game. Remove the gamification — those belong on the Results / Achievements page."*
- If the Results page over-celebrates (animations, confetti everywhere, fake testimonials) → push back: *"Celebratory but informational. One big number, one level pill, the radar chart, the breakdown, the strengths/weaknesses, the CTA. Restrained."*
- **3 pages = aim for tight viewport fit.** If Start or Results need a scroll, that's OK; but the Question page should be one-screen no-scroll (you should never be tempted to scroll during a timed question).
