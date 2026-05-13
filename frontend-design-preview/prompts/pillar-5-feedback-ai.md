# Pillar 5 — Feedback & AI ⭐ defense-critical: 5 pages

**How to use this file:** Copy the entire prompt below (everything inside the **4-backtick** block) into a session at https://claude.ai/design — **same session as Pillars 1 + 2 + 3 + 4 if possible**.

> ⚠️ The outer wrapper uses **4 backticks** intentionally — the prompt contains nested code blocks. If you wrap with 3 backticks, your text editor will close the outer block at the first inner ` ``` ` and you'll only copy part of it.

**Important context:**
- **Pillars 1 + 2 + 3 + 4 are APPROVED.** Identity, primitives, AnimatedBackground, BrandLogo, ThemeToggle, ScoreGauge, RadarChart, AuthLayout, AppLayout (Sidebar + Header + Footer) are all canonical. Reuse them unchanged.
- **This pillar is defense-critical.** The Submission Detail page is the **signature surface** of the entire product — when judges open the project at defense, this is the screen we land on. It must read as: "structured AI feedback on the left, conversational AI mentor on the right, both alive at once."
- **Hard directive: each page MUST mirror the canonical structure** from `frontend/src/features/{submissions,audits,mentor-chat}/*.tsx`. Same widgets, same sections in the same order, same content categories. The Neon & Glass identity is applied on top — do not invent sections, do not merge widgets, do not drop sub-areas.
- **One intentional deviation from canonical**: in production, MentorChatPanel is a **fixed slide-out panel** (right edge, z-40). For Pillar 5 we render it **inline, side-by-side with FeedbackPanel** on Submission Detail. This is a deliberate design choice for defense — see §5.2 for details.

After delivery, save to `pillar-5-feedback-ai/`, then tell me **"Pillar 5 output is ready"** and we'll wire up preview on port 5179.

---

````
You are continuing the design of Code Mentor — Neon & Glass. The visual identity is APPROVED and codified across Pillars 1 + 2 + 3 + 4. This session designs the five Feedback & AI pages — the defense-critical heart of the product, where students see structured AI feedback on their code and talk to the AI mentor about it.

# 1. Hard directive

Each page in this pillar MUST mirror the canonical structure from the corresponding file in the production repo. **Same widgets, same sections in the same order, same content categories, same data fields displayed.** I'll list each canonical structure below in detail. The Neon & Glass identity is applied on top — glass cards, gradient text on key headings, brand-gradient-bg on primary CTAs, signature gradient on score visualizations, etc. — but the page **structure** is fixed.

If you find yourself thinking "this section feels redundant, let me remove it" or "let me merge Strengths and Weaknesses into a single Highlights card" — STOP. Stay structural-faithful. The owner has been explicit about this on Pillars 2-4.

**The one intentional deviation**: on Submission Detail (§5.2), the MentorChatPanel is rendered **inline as a right-side column**, not as a fixed slide-out panel. This is the defense-critical "signature surface" — judges should see structured feedback + conversational mentor at the same time. Everywhere else (Audit Detail) the chat stays in its production form (floating CTA + slide-out).

Canonical files to mirror, with line counts so you know the surface size:
- `frontend/src/features/submissions/SubmissionForm.tsx` (~195 lines)
- `frontend/src/features/submissions/SubmissionDetailPage.tsx` (~220 lines)
- `frontend/src/features/submissions/FeedbackPanel.tsx` (~700 lines — this is the dense one)
- `frontend/src/features/mentor-chat/MentorChatPanel.tsx` (~385 lines)
- `frontend/src/features/audits/AuditNewPage.tsx` (~545 lines)
- `frontend/src/features/audits/AuditDetailPage.tsx` (~660 lines)
- `frontend/src/features/audits/AuditsHistoryPage.tsx` (~455 lines)

# 2. Identity (canonical — same as Pillars 1-4)

(Recap, condensed — full spec lives in Pillar 1.)

- Primary Violet `#8b5cf6`, Secondary Cyan `#06b6d4`, Accent Fuchsia `#d946ef`
- Signature gradient `linear-gradient(135deg, #06b6d4 0%, #3b82f6 33%, #8b5cf6 66%, #ec4899 100%)`
- Semantic: Emerald success / Amber warning / Red error
- Dark bg radial gradient `linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%)`, fixed
- Inter + JetBrains Mono variable axes
- Glass system: `.glass`, `.glass-card`, `.glass-card-neon`, `.glass-frosted`, `.glass-shimmer`
- Neon system: `shadow-neon-*`, `text-neon-*`, `glow-sm/md/lg`, animations
- Radii: cards 16px / buttons-md+lg 12px / buttons-sm 8px / badges full
- Reusable from Pillar 1: Button (8 variants), Card (5 variants), Badge (8 tones), Field, TextInput, Select, Modal, Toast, CircularProgress, RadarChart
- Reusable from Pillar 2: AnimatedBackground, BrandLogo, ThemeToggle, useTheme, AuthLayout
- **Reusable from Pillar 4: the AppLayout (Sidebar + Header + Footer) — every page in this pillar sits inside it.**

# 3. AppLayout (reuse from Pillar 4, unchanged)

Same shell from Pillar 4. Do not redesign it.

- Sidebar (256/80px collapsed, `.glass` chrome) with 8 nav items + theme toggle + Settings at the bottom
- Header (sticky h-16, `.glass`) with page title + search + NotificationsBell + user menu (Layla A.)
- Main (`p-4 md:p-6 lg:p-8`) + Footer (Benha University · Instructor Prof. Mostafa El-Gendy · TA Eng. Fatma Ibrahim · Privacy · Terms)

**Sidebar active-state mapping for this pillar:**
- `/submissions/new` and `/submissions/:id` → **Submissions** item active (the 4th nav item)
- `/audit/new`, `/audit/:id`, `/audits/me` → **Audit** item active (the 6th nav item)

**Mock user identity (consistent with Pillar 4):**
- Name: **Layla Ahmed** · Email: layla.ahmed@benha.edu · Initials: "LA"
- Track: **Full Stack** · Level 7 · 1,240 XP
- Header page title is set per-page: "Submit Code", "Submission #142", "New Audit", "Audit · todo-api", "My Audits"

# 4. Page-switcher pill (preview-only)

Same pattern as previous pillars. Fixed top-right, glass-frosted rounded-full, collapsible. 5 buttons: **Submission Form / Submission Detail / Audit New / Audit Detail / Audits History**. Default open. Active button: primary-500 bg.

# 5. The 5 pages

For EACH page, I'm giving you the canonical structure section-by-section. Render it faithfully with the Neon & Glass identity.

---

## 5.1 Submission Form — `/submissions/new?taskId=4`

Mirrors `frontend/src/features/submissions/SubmissionForm.tsx`. The canonical is technically a component embedded in the Task Detail page, but for this pillar we render it as a standalone page surface (inside AppLayout) so it can be previewed as part of the F1/F2 submission flow.

Page wrapper: `max-w-2xl mx-auto animate-fade-in space-y-6`.

### A. Back link (top, mb-3)
- `<ArrowLeft>` + "Back to React Form Validation" — small primary-600, links back to `/tasks/4`

### B. Page header (no card, just text, mb-2)
- H1 (2xl bold, gradient text): "Submit Your Work"
- Subline (small slate-500): "Task: React Form Validation · Attempt #2"

### C. The submission card (`.glass-card`)
- **Card.Header**: a 2-tab strip (matches Pillar 1 Tabs primitive with primary-500 underline on active):
  1. **GitHub Repository** — leftIcon Github
  2. **Upload ZIP** — leftIcon Upload
  
  Default-active: GitHub Repository.

- **Card.Body p-6** with the active tab content.

#### Tab 1: GitHub Repository (default-active)
Inside `space-y-4`:
- **Input** labeled "Repository URL"
  - Placeholder: `https://github.com/username/repository`
  - leftIcon: Github
  - Value pre-filled for the preview: `https://github.com/layla-ahmed/react-form-validation`
  - Validation pattern: `^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$`
  - Show error state demo by also rendering (just BELOW the input, in a second instance, so reviewers see both): a duplicate input with the value `not-a-url` and the inline red error `Must be https://github.com/owner/repo`. Label that second one "Validation states demo".

- **Info banner** (flex items-start gap-2, p-3 rounded-xl, bg-blue-50/dark:bg-blue-900/30, text-blue-700/dark:text-blue-300, border-blue-100/800):
  - AlertCircle icon (w-4 h-4) + "Public repos work without setup. For private repos, make sure you've signed in with GitHub."

- **Primary Button** "Submit Repository" — full-width, rightIcon ArrowRight, brand-gradient-bg.

#### Tab 2: Upload ZIP
Inside `space-y-4`:
- **Drop zone** (border-2 border-dashed border-neutral-200/700, rounded-2xl, p-6, text-center, hover:border-primary-400/500):
  - Upload icon (w-8 h-8, mx-auto, text-neutral-400, mb-2)
  - "Click to choose a ZIP" font-medium
  - "Up to 50 MB" text-xs slate-500

- For the preview, show TWO additional states stacked below the drop zone (so reviewers see all three at once):
  
  **State A — file selected, ready to upload**: a slim success-50/700 row "✓ Ready to upload. react-form-validation.zip · 4.2 MB"
  
  **State B — uploading 73%**: a small progress strip — "Uploading…" left + "73%" right + a h-2 rounded bg-neutral-200 progress bar with 73% primary-500 fill.

- **Primary Button** "Upload & Submit" — full-width, rightIcon ArrowRight.

### D. Help footnote (below the card, text-xs text-slate-500 text-center)
- "Your submission will be analyzed by the AI mentor. Average turnaround: 30 seconds in the stub pipeline, 2-3 minutes in production."

---

## 5.2 Submission Detail — `/submissions/:id` ⭐ THE SIGNATURE SURFACE

Mirrors `frontend/src/features/submissions/SubmissionDetailPage.tsx` + `FeedbackPanel.tsx` + `MentorChatPanel.tsx`. **This is the most important page in the entire app.** Spend the most time here.

**Layout deviation from canonical (intentional, defense-critical):**
- Production renders MentorChatPanel as a fixed slide-out panel triggered by a floating "Ask the mentor" CTA.
- **For this pillar, render the mentor chat as an inline right-side column, side-by-side with the FeedbackPanel.** This is the screen judges see at defense: structured feedback + conversational mentor, alive at the same time.

Page wrapper: `max-w-7xl mx-auto animate-fade-in space-y-6` (wider than Pillar 4 pages because of the side-by-side).

For the preview, assume we're viewing submission #142 for task "React Form Validation" — status **Completed**, attempt **#2**, **mentorIndexedAt** is set (chat is ready).

### A. Back link + title block (full-width, above the 2-column grid, mb-2)
- `<ArrowLeft>` + "Back to task" — small primary-600
- H1 (2xl bold): "React Form Validation"
- Subline (small slate-500): "Attempt #2 · submitted 4m ago"

### B. Status banner (full-width)
Render the **Completed** state: `flex items-center gap-3 p-4 rounded-xl bg-success-50/dark:bg-success-900/30 text-success-700/300`:
- CheckCircle icon (w-5 h-5)
- "Completed" font-semibold
- (No hint sub-paragraph for Completed.)

(In the preview's source code, define the other 3 banner states too — Pending / Processing / Failed — but only render Completed on screen. The owner may want to swap states during the walkthrough.)

### C. Source + Timeline card (`.glass-card`, full-width)
- **Card.Body p-6 space-y-4**:
  - Row: `Github` icon (w-4 h-4) + "Source:" small slate-500 + a mono pill `<code class="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-xs">github.com/layla-ahmed/react-form-validation</code>`
  - Timeline (`<ol space-y-2 text-sm>`) with 3 rows, all done:
    1. ● Received · 09:24
    2. ● Started processing · 09:24
    3. ● Completed · 09:25
    
    Each dot: 2×2 rounded-full bg-primary-500 (or bg-neutral-300 if not done). Label font-medium. Time small slate-500.

### D. The signature surface — 2-column grid (this is THE moment)

A `grid lg:grid-cols-[1fr_400px] gap-6` container. On mobile/tablet (< lg) the chat column drops to a full-width second row below the feedback. On desktop the chat is a 400px-wide right column.

#### Left column — FeedbackPanel (mirrors `FeedbackPanel.tsx`, space-y-6)

Render ALL 9 sub-cards in this exact order:

##### D.1 PersonalizedChip (rounded-2xl, NOT inside a Card)
A pill at the very top:
```
<div class="flex items-center gap-2 px-4 py-2 rounded-2xl
            bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10
            border border-violet-500/30 backdrop-blur-sm">
  <Award class="w-4 h-4 text-violet-600 dark:text-violet-300" />
  <span class="text-sm font-medium text-violet-900 dark:text-violet-100">
    Personalized for your learning journey
  </span>
</div>
```
Tooltip on hover: "This review is informed by your learning history — past submissions, recurring patterns, and your improvement trend."

##### D.2 ScoreOverviewCard (`.glass-card`, p-6, grid md:grid-cols-2 gap-6 items-center)
**Left half**:
- Inline "OVERALL FEEDBACK" small caps + Award icon (text-xs uppercase tracking-wide text-slate-500)
- Huge number: `text-7xl font-extrabold text-success-600` (because score ≥ 80) → "**86**" + "/100" smaller text-2xl text-neutral-400 align-top
- Summary paragraph (small slate-500, max-w-md): "Strong second attempt — you addressed the schema validation gaps from your last submission and the async username check now blocks correctly. Security and design are where the marginal gains are now."

**Right half** (h-64):
- RadarChart (use Pillar 1's custom SVG RadarChart, NOT recharts in the preview) with 5 axes:
  - Correctness 92 · Readability 88 · Security 78 · Performance 84 · Design 88
  - Stroke + fill: signature-gradient applied via a violet `#8b5cf6` line + 30% fill.

##### D.3 CategoryRatingsCard (`.glass-card`, p-6, space-y-4)
- Header: "Was this feedback helpful?" font-semibold + subline "Rate each category — your votes help us tune the AI for future learners."
- Grid (`sm:grid-cols-2 lg:grid-cols-3 gap-3`) of 5 category rows:
  - Each row: `flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200/700`
  - Left: category name (font-medium 14px) + "Score: {N}" text-xs slate-500
  - Right: 2 thumb buttons (ThumbsUp / ThumbsDown) — each `p-2 rounded-md` with hover-tint. Show one row (Security) with the ThumbsUp button in active state: `bg-success-500 text-white border border-success-500`.

Categories + scores: Correctness 92 · Readability 88 · Security 78 · Performance 84 · Design 88.

##### D.4 StrengthsWeaknessesCard (grid md:grid-cols-2 gap-6)

**Left card** (`.glass-card`, p-6, space-y-3):
- Header: CheckCircle2 (text-success-500) + "Strengths" font-semibold (text-success-700/dark:text-success-300)
- `<ul class="list-disc list-inside space-y-2 text-sm text-neutral-700/200">`:
  - "Zod schema split at both step boundaries — no leakage between steps."
  - "Async username check correctly debounced (800ms) and doesn't block submit."
  - "Error messages bound to `aria-describedby` — screen readers announce them."
  - "Submit button stays disabled until both schemas validate. Honest UX."

**Right card** (`.glass-card`, p-6, space-y-3):
- Header: AlertTriangle (text-warning-500) + "Weaknesses" font-semibold (text-warning-700/dark:text-warning-300)
- `<ul class="list-disc list-inside space-y-2 text-sm text-neutral-700/200">`:
  - "No CSRF protection on the form POST — fine for a learning task, real apps need it."
  - "Password complexity rule lives in a regex string — extract to a Zod refinement."
  - "Optimistic submit state isn't rolled back if the network errors."

##### D.5 ProgressAnalysisCard (`.glass-card`, p-6, space-y-2)
- Header: Award icon (text-violet-600/300) + "Progress vs your earlier submissions" font-semibold
- Paragraph (text-sm text-neutral-700/300, leading-relaxed):
  
  "Your previous attempt at this task scored **62/100** — the username validator was synchronous and blocked the entire form. This time you moved it to a debounced async check, which is exactly what the rubric is testing for. Security is still your softest dimension across the last 4 submissions; consider a deeper pass on input sanitization next."

##### D.6 InlineAnnotationsCard (`.glass-card`, p-0, overflow-hidden)
A 2-column inner grid (`md:grid-cols-[220px_1fr]`).

**Left aside** (border-r border-neutral-100/800, max-h-96 overflow-y-auto):
- Header: "FILES" text-xs uppercase + FileCode icon (p-3 flex items-center gap-2)
- List of 3 files (each is a button, w-full px-3 py-2 text-left text-sm):
  1. `src/components/SignUpForm.tsx` · badge "2" — ACTIVE (primary-50/900 bg, primary-700 text)
  2. `src/lib/validators.ts` · badge "1"
  3. `src/api/auth.ts` · badge "1"

**Right main panel** (p-4 space-y-3 max-h-[28rem] overflow-y-auto):
3 annotation blocks (one expanded, two collapsed).

**Block 1 (expanded)** — Security/error severity:
- Collapsible header (bg-neutral-50/800 hover:neutral-100/700, p-3, flex items-start gap-3):
  - SeverityIcon: XOctagon w-5 h-5 text-error-500
  - "line 47–52 · Security" text-xs slate-500
  - "Hardcoded fallback secret" font-semibold text-sm
  - "If `process.env.JWT_SECRET` is unset, the code falls back to `'dev-secret'` — that string ships to prod." text-sm text-neutral-600/300 (truncate)
  - ChevronRight (rotated 90deg because open)
- Expanded body (p-3 space-y-3 bg-white/dark:bg-neutral-900):
  - "PROBLEMATIC CODE" small caps slate-500
  - Prism-highlighted TS code block (rounded-md bg-neutral-100/800 text-xs p-2):
    ```typescript
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ userId }, secret, { expiresIn: '1h' });
    ```
  - Explanation: "Fallback secrets get shipped to production by accident more often than you'd think. The OR-string makes the code 'work' in dev, which means nobody notices the env var is missing." (text-neutral-700/200)
  - "HOW TO FIX" small caps slate-500
  - Fix paragraph: "Throw a hard error at startup if `JWT_SECRET` is unset. Fail loud, fail early."
  - "EXAMPLE FIX" small caps slate-500
  - Prism-highlighted TS:
    ```typescript
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');
    ```
  - Repeated-mistake amber chip (text-xs font-semibold text-warning-700 bg-warning-50 px-2 py-1 rounded inline-block): "⚠ Repeated mistake from prior submissions"

**Block 2 (collapsed)** — Performance/warning:
- AlertTriangle text-warning-500 + "line 89 · Performance" + "Unmemoized validation function" + "Each render re-creates the Zod schema instance, which trips React's reconciliation…"

**Block 3 (collapsed)** — Design/info:
- Lightbulb text-primary-500 + "line 14 · Design" + "Type alias could be a Zod inference" + "You're maintaining two declarations of `FormValues` — once as a TS type, once as a Zod schema…"

##### D.7 RecommendationsCard (`.glass-card`, p-6, space-y-4)
- Header: Lightbulb (text-warning-500) + "Recommended next steps" font-semibold
- Grid (`sm:grid-cols-2 gap-3`) of 4 recommendation tiles. Each tile:
  - `p-4 rounded-lg border border-neutral-200/700 bg-neutral-50/800 space-y-2`
  - Top row: priority badge ("HIGH" error-100/700 OR "MEDIUM" warning-100/700 OR "LOW" neutral-200/700, px-2 py-0.5 rounded-full uppercase text-[10px] tracking-wide) + topic pill "· Security"
  - Reason paragraph (text-sm neutral-700/200): the prose below
  - Bottom row: a Link "View task" (small primary-600 with ChevronRight) + a small Button "Add to my path" (variant=primary, leftIcon Plus). Show one tile (#2) with the button in "On your path" state: variant=outline, disabled, leftIcon CheckCircle2, label "On your path".

Mock recommendations:
1. **HIGH** · Security — "Add CSRF token to the form POST. This is exactly what the next task in your path teaches — perfect timing." — task linked
2. **HIGH** · Design — "Refactor the password regex into a Zod `.refine()`. You'll need this pattern for the next 3 tasks." — **On your path**
3. **MEDIUM** · Performance — "Memoize the Zod schema with `useMemo`. Small win but the right reflex."
4. **MEDIUM** · Maintainability — "Pull the form validation into a custom hook. You'll see this exact pattern in the WebSocket Chat task."

##### D.8 ResourcesCard (`.glass-card`, p-6, space-y-4)
- Header: BookOpen (text-primary-500) + "Learning resources" font-semibold
- `<ul class="space-y-2">` of 3 resource links. Each:
  - `<a>` with `flex items-start gap-3 p-3 rounded-lg border border-neutral-200/700 hover:border-primary-400 hover:bg-primary-50/dark:bg-primary-900/20 transition-colors`
  - ExternalLink icon (w-4 h-4 text-neutral-400 mt-1)
  - Title (text-sm font-medium): the title below
  - Subline (text-xs slate-500): "{type} · {topic}"

Mock resources:
1. "Schema validation in React Hook Form" — article · Form validation
2. "CSRF tokens, explained without hand-waving" — article · Security
3. "Async validators without UI jank" — video (12 min) · Performance

##### D.9 NewAttemptCard (`.glass-card`, p-6)
- `flex flex-col sm:flex-row items-center justify-between gap-4`:
  - Left: "Ready to improve?" font-semibold + "Apply this feedback and submit a new attempt." text-sm text-neutral-500
  - Right: Primary Button "Submit new attempt" with rightIcon Send (links to `/submissions/new?taskId=4`)

#### Right column — Inline MentorChatPanel (sticky top-24)

A tall `.glass-card-neon` with a `sticky top-24 self-start max-h-[calc(100vh-7rem)] flex flex-col` shell. This is the **inline** version of the production MentorChatPanel (which is normally a slide-out). Visually it should feel like a chat workbench attached to the feedback.

##### Chat Header (border-b, p-3 flex items-center gap-3):
- 9×9 rounded-full bg-violet-500/20 ring-1 ring-violet-400/40 flex-center, with Sparkles icon (w-4 h-4 text-violet-300)
- Flex-1 column:
  - "Code Mentor" text-sm font-semibold
  - "React Form Validation" text-xs text-neutral-400 truncate
- Clear button: small RefreshCcw ghost icon (visible because conversation has messages)

##### Chat Body (flex-1 overflow-y-auto px-4 py-4 space-y-4)
Mock conversation showing a real defense-quality exchange. 4 messages total — 2 user, 2 assistant:

**Message 1 (assistant, fuchsia avatar)**:
- Bot icon in 8×8 rounded-full bg-fuchsia-500/15 ring-fuchsia-400/30 text-fuchsia-200 (left)
- Bubble (border-white/10 bg-neutral-900/60 text-neutral-100 max-w-[90%], rounded-lg px-3 py-2 text-sm):
  - Markdown-rendered: "Looking at your submission, the strongest move you made was **debouncing the async username check** — that was your weakest spot last time. Want me to walk through any of the inline annotations?"

**Message 2 (user, cyan avatar, right-aligned)**:
- User icon in 8×8 rounded-full bg-cyan-500/20 ring-cyan-400/40 text-cyan-200 (right)
- Bubble (border-cyan-400/20 bg-cyan-500/10 text-cyan-50 max-w-[85%]):
  - "Yeah — why is line 47 a security risk?"

**Message 3 (assistant)**:
- Bubble with markdown:
  - "The fallback `'dev-secret'` on line 47 is the issue. When you write `process.env.JWT_SECRET || 'dev-secret'`, the OR-string runs **in production** if the env var is unset — which happens more often than you'd think during deploys.\n\nThe fix:\n```typescript\nconst secret = process.env.JWT_SECRET;\nif (!secret) throw new Error('JWT_SECRET is required');\n```\nFail loud at startup, not silently at signing-time."

**Message 4 (user)**:
- "How do I make sure my CI catches this?"

**(Streaming indicator — show a 5th pending assistant bubble at the bottom)**:
- A bubble with `animate-pulse` and content "…" — give the impression an answer is streaming in.

##### Chat Input (border-t border-white/10 p-3)
- Textarea (flex-1, rounded-md, border-white/10, bg-neutral-900/70, px-3 py-2, text-sm, rows=2):
  - Placeholder: "Ask a follow-up about your code or feedback…"
  - Empty value
- Send Button (small primary): Send icon (w-4 h-4)
- Below the input row: tiny tip text-[11px] text-neutral-500 px-1 — "Enter to send · Shift+Enter for newline"

### E. (Optional) Limited-context amber banner
Below the chat body (only when the assistant's last contextMode was 'RawFallback'). For the preview, **do not render this** (the chat is in normal RAG mode). Just define the styling in source so it can be toggled.

---

## 5.3 Audit New — `/audit/new`

Mirrors `frontend/src/features/audits/AuditNewPage.tsx`. A 3-step wizard with 6 required fields + 3 optional. Page wrapper: `max-w-3xl mx-auto px-4 py-8 space-y-6`.

For the preview, render the wizard at **Step 1 (Project identity)** with realistic pre-filled values so reviewers see a populated form rather than empty placeholders. Also render Step 2 and Step 3 stacked below (each clearly labeled "Step 2 preview" / "Step 3 preview") so all states are visible on one page — but mark them as preview-only with a small text-slate-400 caption.

### A. Page header (space-y-2)
- Row: Sparkles (w-5 h-5 text-primary-500) + H1 (2xl font-semibold gradient): "Audit your project"
- Subline (text-sm text-neutral-500): "Get an honest, structured AI audit of your code in under 6 minutes."

### B. Stepper (`<ol class="flex items-center gap-3 text-sm">`)
3 numbered chips with arrows:
1. ✓ "Project" (green check, bg-success-500 text-white) — DONE
2. **2** "Tech & Features" (primary-500 white) — CURRENT
3. **3** "Source" (neutral-200/700 slate-500) — UPCOMING

Each chip: `h-7 w-7 rounded-full flex-center font-medium`. Between chips: a small "→" text-neutral-300/600.

(Adjust the active step depending on which step you're rendering as "current" — in the preview, render Step 1 as current with realistic data already in the inputs so the green-check state of step 0 doesn't fire. Actually: render the wizard at Step 1 IN PROGRESS — meaning chip 1 is current (primary), chips 2-3 are upcoming. Then **separately** render miniaturized previews of Step 2 and Step 3 below.)

### C. Active step card (`.glass-card`, Card.Body p-6 space-y-5)

#### Step 1 — Project identity (the active step in the preview)

- SectionHeader: Sparkles (w-4 h-4) + "Project identity" small font-medium
- **Input** "Project name" — value: "todo-api", maxLength 200
- **Input** "One-line summary" — value: "A short FastAPI service for personal to-do lists with auth and tags.", maxLength 200
- **Textarea** labeled "Detailed description" (min-h-[120px], rounded-xl, focus:ring-primary-500), value:

  ```
  todo-api is a learning project for the Code Mentor capstone. FastAPI + SQLAlchemy on
  Postgres, with JWT auth, per-user task isolation, and a small tagging system. In
  scope: REST endpoints for tasks (CRUD), tags (CRUD), auth (register/login/refresh),
  and a /me endpoint. Out of scope: collaborative tasks, websocket sync, email.
  ```
  Below the textarea: char counter "412/5000" right-aligned (text-xs slate-500).

- **Select** "Project type" — value: "API"
  - Options: "Pick one…" / "API" / "Web App" / "CLI Tool" / "Library" / "Mobile App" / "Other"

#### Step 2 preview (rendered below the active card, dimmed at opacity-90, with caption "↓ Step 2 preview ↓"):
Same `.glass-card` p-6 space-y-5:
- SectionHeader: Code2 + "Tech & features"
- **Tech stack input row**: text input "React, TypeScript, Vite (Enter or comma to add)" + outline Button "Add"
- Below it: 6 already-added tag chips (each Badge variant=primary with an `X` close icon): `Python` · `FastAPI` · `SQLAlchemy` · `PostgreSQL` · `Alembic` · `Docker`
- **Main features textarea** (min-h-[100px]) with value:
  ```
  JWT auth (register / login / refresh)
  Per-user task CRUD with pagination
  Tag CRUD + many-to-many to tasks
  Health check + readiness probe
  Alembic migrations
  ```
  Below: "5 listed (max 30)." text-xs slate-500.
- **Input** "Target audience (optional)" — value: "Solo dev portfolio"
- **Focus areas (optional)**: Target icon (w-4 h-4) label + flex wrap of 7 chip-buttons (px-3 py-1.5 rounded-full text-xs border):
  - `Security` (active: border-primary-500 bg-primary-500/10 text-primary-700)
  - `Performance` (active)
  - `Code quality` (inactive)
  - `Architecture` (inactive)
  - `Testing` (inactive)
  - `Documentation` (inactive)
  - `Database` (active)

#### Step 3 preview (rendered below Step 2, also dimmed, caption "↓ Step 3 preview ↓"):
Same `.glass-card` p-6 space-y-5:
- SectionHeader: Upload + "Where's the code?"
- 2-tab strip (GitHub Repository / Upload ZIP), GitHub active
- **Input** "Repository URL" value: `https://github.com/layla-ahmed/todo-api`, leftIcon Github
- Help text: "Public repos work without setup. For private repos, sign in with GitHub first."
- **Textarea** "Known issues (optional)" min-h-[80px], value:
  ```
  The /tasks/bulk-import endpoint is partially implemented but not exposed in the router.
  Test coverage is honest but thin — auth tests are missing.
  ```
- **90-day retention notice** (blue-50/900 banner): AlertCircle + "Your uploaded code is stored for **90 days**, then automatically deleted. The audit report is yours to keep."

### D. Footer action bar (flex items-center justify-between, OUTSIDE the card)
- Left: outline Button "Back" with leftIcon ArrowLeft (disabled because we're at Step 1)
- Right (when step < 2): primary Button "Next" with rightIcon ArrowRight
- Right (when step === 2, in Step 3 preview): primary Button "Start Audit" with rightIcon Send

(Render the bottom bar twice: once below the active Step 1 card showing the Next button, then once below the Step 3 preview showing the Start Audit button. Both visible for review.)

---

## 5.4 Audit Detail — `/audit/:id`

Mirrors `frontend/src/features/audits/AuditDetailPage.tsx`. The structured 8-section report. Page wrapper: `max-w-4xl mx-auto px-4 animate-fade-in space-y-6`.

For the preview, render the **Completed** state with a full report for the "todo-api" project — score 74/100, Grade C+. The mentor chat returns to its production form here (floating CTA bottom-right + slide-out panel) — we are NOT side-by-siding it on this page. The side-by-side is reserved for Submission Detail.

### A. Back link + title block
- `<ArrowLeft>` + "Back to my audits" — small primary-600, mb-3
- H1 (2xl bold): "todo-api"
- Subline (text-sm text-neutral-500): "Attempt #1 · started 12m ago"

### B. Status banner — Completed state
- `flex items-start gap-3 p-4 rounded-xl bg-success-50/dark:bg-success-900/30 text-success-700/300`:
  - CheckCircle (w-5 h-5 mt-0.5)
  - "Audit complete" font-semibold (no hint for Completed)

(Define the other 3 banner states in source — Pending "Queued" / Processing "Auditing your project…" with spinning Loader2 + "Static analysis + AI audit usually takes 3-6 minutes." / Failed "Failed" — but only render Completed.)

### C. Source + Timeline card (`.glass-card`)
- Card.Body p-6 space-y-4:
  - Source row: Github icon + "Source:" slate-500 + mono pill `github.com/layla-ahmed/todo-api`
  - Timeline (`<ol space-y-2 text-sm>`) — 3 rows all done:
    - ● Received · 14:08
    - ● Started processing · 14:08
    - ● Completed · 14:14

### D. The 8-section structured report

Render all 8 sections in order. Each section is its own `.glass-card`.

##### D.1 ScoreCard — Overall score + Grade pill
Card.Body p-6 flex items-center justify-between gap-6:
- **Left**: "OVERALL SCORE" small caps + Sparkles, then huge number "74" text-5xl font-bold + "/ 100" text-2xl text-neutral-400
- **Right**: a grade pill (px-6 py-4 rounded-2xl) — bg-amber-100/900 text-amber-800/200 (because grade=C): "GRADE" small caps + "C" text-4xl font-bold

##### D.2 ScoreRadar — 6-category breakdown
Card.Header: TrendingUp (text-primary-500) + "Score breakdown" font-semibold.
Card.Body p-6:
- A 6-axis RadarChart (use Pillar 1's custom SVG version) at full-width h-80:
  - **Code Quality 78 · Security 68 · Performance 82 · Architecture 72 · Maintainability 76 · Completeness 80**
  - Violet stroke `#8b5cf6`, 30% fill, ResponsiveContainer-equivalent.
- Below the chart, a 2-col (md) / 3-col (sm) grid of the same 6 values as small chips (p-2 rounded bg-neutral-50/800): label slate-600/400 + value font-semibold right.

##### D.3 StrengthsSection (`.glass-card`)
Card.Header: CheckCircle (text-success-500) + "Strengths" font-semibold.
Card.Body p-6 + `<ul space-y-2>` of 4 bullet items (each: emerald `✓` + text-sm):
- "Auth boundary is clean — every protected endpoint goes through the same `current_user` dependency. Easy to reason about."
- "Migrations are non-destructive — you've kept the Alembic history linear without any squash hacks."
- "Per-user isolation enforced at the query layer, not in Python — much harder to accidentally leak data."
- "Health and readiness endpoints actually do what their names suggest. Most projects collapse them into one liar."

##### D.4 Critical issues (`.glass-card`)
Card.Header: ShieldAlert (text-error-600) + "Critical issues" font-semibold + count chip "(2)".
Card.Body p-6 space-y-4. Each issue is a `border-l-2 border-neutral-200/700 pl-4` block:

**Issue 1**:
- Title row: "Possible SQL injection in `/tags/search`" font-medium + Badge variant=error "high"
- File line (mono, slate-500 text-xs): `app/api/tags.py:42`
- Description: "The `query` parameter is interpolated into a raw SQLAlchemy `text()` call. Any user can read tags they shouldn't see."
- Fix block (mt-2 p-2 rounded bg-neutral-50/800): **Fix:** "Use parametrized queries with `:query` bind, or — better — let the ORM build the WHERE clause."

**Issue 2**:
- Title: "Hardcoded `SECRET_KEY` fallback in `settings.py`" + Badge variant=error "high"
- File: `app/core/settings.py:18`
- Description: "If the env var is unset, the code falls back to `'change-me-in-prod'`. That string ships to prod by accident."
- Fix: "Fail loud at startup. Raise if the secret is missing."

##### D.5 Warnings (`.glass-card`)
Card.Header: AlertTriangle (text-amber-600) + "Warnings" font-semibold + "(4)".
4 issues, same layout, each with severity badge="warning":
1. "No rate limit on `/auth/login`" · `app/api/auth.py:24` · "Brute-force enumeration is trivial without a rate limit." · Fix: "Add a per-IP rate limit via slowapi or Redis-based throttling."
2. "Tests directory contains 6 tests for 23 endpoints" · `tests/` · "Auth tests are missing entirely." · Fix: "Aim for one happy-path + one error test per endpoint, at minimum."
3. "N+1 query in `/tasks` list endpoint" · `app/api/tasks.py:67` · "Each task triggers an extra SELECT for its tags." · Fix: "Use `joinedload(Task.tags)`."
4. "No CORS allowlist — `allow_origins=['*']`" · `app/main.py:31` · "Acceptable in dev, not for portfolio publishing." · Fix: "Restrict to your real frontend origin via env var."

##### D.6 Suggestions (`.glass-card`)
Card.Header: Lightbulb (text-neutral-500) + "Suggestions" font-semibold + "(3)".
3 issues, severity badge="info":
1. "Consider Pydantic v2 model_config for shared settings" · `app/schemas/*.py` · "You're repeating `Config` classes across schemas."
2. "Migrate from `print` to structured logging" · `app/api/auth.py:31, app/api/tasks.py:88` · "Two stray prints survived. Replace with `logger.info`."
3. "Add a `pre-commit` hook for `ruff format`" · `pyproject.toml` · "Saves you from inconsistent formatting in PRs."

##### D.7 MissingFeaturesSection (`.glass-card`)
Card.Header: Target (text-purple-500) + "Missing or incomplete features" font-semibold.
Card.Body p-6:
- Intro: "Capabilities mentioned in your project description but not yet implemented in the code." text-xs slate-500 mb-3
- `<ul space-y-2>` of 2 items (each: purple `○` + text-sm):
  - "Bulk task import — endpoint exists in `tasks.py` but the router doesn't expose it; no Pydantic schema for the input."
  - "Pagination ordering — listed as a goal in your description but the `/tasks` endpoint uses default ID order with no `?order_by` param."

##### D.8 RecommendationsSection — Top recommended improvements (`.glass-card`)
Card.Header: Lightbulb (text-primary-500) + "Top recommended improvements" font-semibold.
Card.Body p-6 space-y-4. 5 numbered items, each `flex gap-3`:
- Priority circle (w-7 h-7 rounded-full bg-primary-500 text-white flex-center text-xs font-bold): 1 / 2 / 3 / 4 / 5
- Right column: title font-medium + howTo (small slate-600/400)

Items:
1. "Plug the SQL-injection hole in `/tags/search`" — howTo: "Replace `text(f'...{query}')` with `text('... :q').bindparams(q=query)`. Add a regression test."
2. "Fail-loud on missing secrets" — howTo: "Drop the `or 'change-me-in-prod'` fallback. Validate at startup with Pydantic Settings."
3. "Add rate limiting to auth endpoints" — howTo: "slowapi works with FastAPI dependency injection. Limit `/auth/login` and `/auth/register` to 5 req/min/IP."
4. "Triple the test count, starting with auth" — howTo: "One happy + one failure case per endpoint. Use `httpx.AsyncClient` against a Postgres test DB."
5. "Document the bulk-import status" — howTo: "Either finish the endpoint OR remove the unreachable code path. Either way, mention it in the README."

##### D.9 TechStackSection (`.glass-card`)
Card.Header: Code2 (text-cyan-500) + "Tech stack assessment" font-semibold.
Card.Body p-6:
- Paragraph (text-sm whitespace-pre-line):
  
  "FastAPI + SQLAlchemy + Postgres is a sensible, boring stack for a learning project — and that's a compliment. Boring stacks let the project's real problems surface (auth, isolation, schema design) instead of being hidden behind shiny library choices.
  
  Two small flags. (1) SQLAlchemy 1.x-style queries in a few places — you're on 2.0, lean on the new `select()` API uniformly. (2) Alembic is set up but the autogenerate diffs aren't reviewed before commit — there's a migration that adds an index your model doesn't declare."

##### D.10 InlineAnnotationsSection (`.glass-card`, p-0)
Card.Header: FileText (text-primary-500) + "Inline annotations" font-semibold + "(3)".
Card.Body p-0:
- `<ul divide-y>` of 3 file rows. Each row is a collapsible header (w-full px-6 py-3 hover:bg-neutral-50/800):
  - File 1 (expanded): ChevronDown + `app/api/tags.py` mono + right text-xs slate-500 "1 finding"
  - File 2 (collapsed): ChevronRight + `app/core/settings.py` + "1 finding"
  - File 3 (collapsed): ChevronRight + `app/api/tasks.py` + "1 finding"

- For File 1 (expanded), show 1 annotation card below the header (px-6 pb-4):
  - `rounded-lg border border-neutral-200/700 p-3 space-y-2`:
    - Title row: "Raw text() with user input" font-medium + Badge variant=error "critical"
    - File line: "Line 42" mono text-xs slate-500
    - Prism-highlighted Python:
      ```python
      results = db.execute(
          text(f"SELECT * FROM tags WHERE name LIKE '%{query}%'")
      )
      ```
    - Description: "User-supplied `query` is interpolated into raw SQL. Even with the `%` wrapping, this is a SQL injection."
    - "Explanation": "SQLAlchemy's `text()` does not bind parameters from f-strings. The string is sent to the DB as-is."
    - Fix banner (p-2 rounded bg-success-50/900 text-success-800/300): "Fix: Use `text('SELECT * FROM tags WHERE name LIKE :pattern').bindparams(pattern=f'%{query}%')`. Or — better — write it via the ORM: `db.query(Tag).filter(Tag.name.ilike(f'%{query}%'))`."
    - Example fix (Prism Python in success-tinted pre):
      ```python
      pattern = f"%{query}%"
      results = db.query(Tag).filter(Tag.name.ilike(pattern)).all()
      ```

##### D.11 Footer (NOT a card — plain text-xs text-neutral-400 text-center)
"Audit produced by `gpt-4o-mini` · prompt `audit-v3.2` · 14,820 in / 3,140 out tokens · completed Mon May 12 2026, 14:14"

### E. Floating mentor chat CTA + slide-out (production form, NOT inline)
- Fixed bottom-right, z-30: a rounded-full pill with violet border + violet/15 bg + backdrop-blur-md, label "Ask the mentor" + Sparkles icon.
- DO NOT render the slide-out panel open in the preview (just the floating CTA). The owner has already seen the inline version on Submission Detail.

---

## 5.5 Audits History — `/audits/me`

Mirrors `frontend/src/features/audits/AuditsHistoryPage.tsx`. Page wrapper: `max-w-5xl mx-auto px-4 py-8 space-y-6`.

### A. Page header (flex items-start justify-between gap-4 flex-wrap)
- Left:
  - H1 (2xl bold, gradient): Sparkles (w-5 h-5 text-primary-500) + "My audits"
  - Subline (text-sm text-neutral-500 mt-1): "Past project audits — newest first. Reports are kept forever; uploaded code is deleted after 90 days."
- Right: primary Button "New audit" with leftIcon Plus (links to `/audit/new`)

### B. Filter bar (`.glass-card`)
- Card.Body p-4:
  - Top row (flex items-center gap-2 mb-3 text-sm font-medium):
    - Filter icon (w-4 h-4) + "Filter"
    - On the right (because filters are active in the preview): small "✕ Clear all" link (text-xs primary-600 hover:underline)
  - Grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`) of 4 filter inputs:
    - "From date" (type=date), value: "2026-04-01"
    - "To date" (type=date), value: empty
    - "Min score" (type=number, min=0 max=100), value: "60"
    - "Max score" (type=number, min=0 max=100), value: empty
  
  Each input: small label slate-500 text-xs + input (rounded-lg border border-neutral-200/700, focus:ring-primary-500).

### C. Audit list — 5 cards in a `<ul space-y-3>`
Each is a `.glass-card` with Card.Body p-4 flex items-center gap-4:

- **Left** (flex-shrink-0): source icon (w-6 h-6 text-neutral-400):
  - Github for GitHub-sourced audits
  - FileArchive for ZIP-uploaded audits

- **Middle** (flex-1 min-w-0):
  - Project name as a Link (font-semibold hover:text-primary-600 truncate)
  - Meta row (mt-1 flex flex-wrap text-xs text-neutral-500 gap-x-2):
    - StatusPill (Badge — see below)
    - " · "
    - Date (e.g., "May 11, 2026")
    - (if completed) " · finished 3h ago"

- **Right** (flex-shrink-0, hidden on small screens):
  - Score: `text-2xl font-bold` (e.g., "74")
  - Grade: `text-xs text-neutral-500` (e.g., "Grade C")

- **Actions** (flex-shrink-0 flex items-center gap-1):
  - Outline Button "Open" sm with rightIcon ChevronRight
  - Ghost Trash2 icon button (p-2 rounded hover:bg-error-50 hover:text-error-600)

**StatusPill** rules:
- Completed + AI Available → Badge variant=success "Completed"
- Completed + AI not Available → Badge variant=warning "Static-only"
- Processing → Badge variant=info "Processing"
- Pending → Badge variant=info "Pending"
- Failed → Badge variant=error "Failed"

Mock audits (5 rows, all for Layla):
1. **GitHub · todo-api** · Completed · May 11, 2026 · finished 12m ago · **74** · Grade C — this is the open audit from §5.4
2. **GitHub · code-mentor-frontend** · Completed · May 7, 2026 · finished 2d ago · **82** · Grade B
3. **ZIP · capstone-notebook-app** · Static-only · May 3, 2026 · finished 6d ago · **61** · Grade D
4. **GitHub · trie-fuzzy-search** · Failed · Apr 28, 2026 · — · (no score)
5. **GitHub · jwt-refresh-demo** · Completed · Apr 22, 2026 · finished 20d ago · **88** · Grade B+

### D. Pagination row (flex items-center justify-between text-sm)
- Left: "Page 1 of 1 · 5 audits" text-neutral-500
- Right (gap-2):
  - Outline Button sm "Previous" with leftIcon ChevronLeft (disabled)
  - Outline Button sm "Next" with rightIcon ChevronRight (disabled because totalPages=1)

### E. (Optional) Empty state — render below the list as a "state preview" so reviewers can see it
- A second `.glass-card` p-12 text-center space-y-3:
  - Sparkles (w-10 h-10 text-neutral-300 mx-auto)
  - "No audits match these filters" font-semibold text-lg
  - "Try widening the date range or adjusting the score bounds." text-sm slate-500
  - Outline Button "Clear filters" with leftIcon X (centered)

Label this with a small text-slate-400 caption above: "↓ Empty state preview ↓"

### F. (Optional) Delete confirm modal — render OPEN at the bottom so reviewers can see it
- A `<Modal size="sm">` rendered open (use the Modal primitive from Pillar 1):
  - Header: Trash2 (text-error-500) + "Delete this audit?" font-semibold
  - Body: "**code-mentor-frontend** will be hidden from your audit list. The underlying report metadata is kept for analytics; the uploaded code follows the standard 90-day retention." text-sm
  - Footer: outline Button "Cancel" + primary Button "Delete" with leftIcon Trash2

Anchor the modal in source so it can be opened from the trash icon in any row.

---

# 6. Output format

Same architecture as Pillars 1 + 2 + 3 + 4:
- HTML root file (`Feedback and AI.html` — or `FeedbackAI.html`) with: Google Fonts + Tailwind config + inline CSS (same identity blocks) + vendored scripts (or CDN URLs — we'll re-vendor on integration)
- All JSX bundled into ONE script tag pointing at `src/bundle.jsx` (same Babel-scope-isolation fix from previous pillars)
- Each page in its own source file under `src/fa/`; bundle order:
  1. `src/icons.jsx` (P1)
  2. `src/primitives.jsx` (P1)
  3. `src/pa/shared.jsx` (P2 — AnimatedBackground, BrandLogo, ThemeToggle, useTheme)
  4. `src/co/shared.jsx` (P4 — AppLayout (Sidebar + Header + Footer), Skeleton, ProgressBar, CircularProgress, TaskStatusIcon, TabsStrip, DifficultyStars)
  5. `src/fa/shared.jsx` (NEW — FeedbackPanel sub-components (PersonalizedChip, ScoreOverviewCard, CategoryRatingsCard, StrengthsWeaknessesCard, ProgressAnalysisCard, InlineAnnotationsCard, RecommendationsCard, ResourcesCard, NewAttemptCard), MentorChatInline (the inline side-by-side version), MentorChatFloatingCTA + MentorChatSlideout (the production form for Audit Detail), StatusBanner, SourceTimelineCard, SeverityBadge, GradePill, FilterBar, AuditCard, Pagination, DeleteConfirmModal, IssueBlock, AnnotationItem, PriorityCircle, PrismCodeBlock)
  6. `src/fa/submission-form.jsx`
  7. `src/fa/submission-detail.jsx`
  8. `src/fa/audit-new.jsx`
  9. `src/fa/audit-detail.jsx`
  10. `src/fa/audits-history.jsx`
  11. `src/fa/app.jsx` (PAGES list + PageSwitcher + App component + render)
- Theme toggle: reuse `useTheme()` from Pillar 2
- Mock data: realistic and consistent (Layla Ahmed / Full Stack track / React Form Validation submission / todo-api audit, as detailed above)
- Prism highlighting: do NOT pull the real Prism library. Hand-code a tiny inline syntax-highlighter for `typescript` and `python` only — enough to make the code blocks read as syntax-aware (keywords in violet, strings in cyan, comments in slate-500, function names in fuchsia). 8-10 keywords each language is enough.

# 7. Anti-patterns (DO NOT do these)

- DO NOT remove or merge sections from the canonical pages. Every sub-card in FeedbackPanel (§5.2 D.1-D.9), every section in the audit report (§5.4 D.1-D.10), every step in AuditNewPage (§5.3) must appear in the right order. If a section feels redundant or empty, that's a signal you missed mock data — fill it in, don't drop it.
- DO NOT add sections not in the canonical. No "Recent Activity" widget, no "Try the AI" tutorial banner, no marketing prompts in the chat empty state.
- DO NOT replace the FeedbackPanel's 9 sub-cards with a single "feedback overview" card. The 9-card stack IS the structure.
- DO NOT render MentorChatPanel as a slide-out on Submission Detail (§5.2). It is **inline, right column, sticky** there. Slide-out is reserved for Audit Detail (§5.4).
- DO NOT make the audit report tabbed. The 8 sections are stacked vertically — judges scroll the report end-to-end.
- DO NOT use emoji except where the canonical explicitly does (the "⚠ Repeated mistake" warning chip in §5.2 D.6 Block 1, and the `✓` / `○` bullet glyphs in §5.4 D.3 / D.7). Lucide icons everywhere else.
- DO NOT use stock illustrations, cartoon mentor avatars, or anthropomorphized AI characters. The mentor is a Sparkles icon in a violet circle. Nothing more.
- DO NOT invent a Tabs container around the FeedbackPanel sub-cards. The canonical is a flat 9-card vertical stack; the inline mentor chat is the second column. That's the entire layout.
- DO NOT make the chat panel scroll the entire page. It's `sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto` — the *page* scrolls the feedback while the chat stays anchored.
- DO NOT modify AppLayout from Pillar 4. Same Sidebar, same Header, same Footer. Just change the active sidebar item per page.

# 8. Acceptance criteria

- All 5 pages render via the page switcher
- AppLayout (sidebar + header + main + footer) consistent across all 5 pages
- Sidebar active state correct per page: Submissions for §5.1 + §5.2 · Audit for §5.3 + §5.4 + §5.5
- Theme toggle works on every page
- **§5.2 Submission Detail (signature surface):**
  - The 2-column grid is present and the chat panel is sticky on desktop
  - All 9 FeedbackPanel sub-cards render in order (PersonalizedChip → ScoreOverview → CategoryRatings → Strengths/Weaknesses → ProgressAnalysis → InlineAnnotations → Recommendations → Resources → NewAttempt)
  - The inline MentorChatInline shows 4 messages + 1 streaming pending bubble + the textarea input
  - One annotation block is expanded (Hardcoded fallback secret) with Prism-tinted code blocks
  - The PersonalizedChip is in the violet/fuchsia/cyan gradient pill
  - On lg breakpoint the chat sits in a 400px right column; below lg it stacks to full-width second row
- **§5.3 Audit New:**
  - Stepper renders 3 chips with correct active state (Step 1 = current in the main card)
  - Step 1 form is fully populated with realistic data (todo-api project)
  - Step 2 preview and Step 3 preview are rendered below the active card with the "↓ Step N preview ↓" caption
  - 6 required fields are visible (projectName / summary / description / projectType / techStack / features / source URL) + 3 optional (targetAudience / focusAreas / knownIssues)
  - 90-day retention notice present in Step 3
- **§5.4 Audit Detail:**
  - 8 structured sections render in order: ScoreCard → ScoreRadar (6 axes) → Strengths → Critical → Warnings → Suggestions → MissingFeatures → Recommendations → TechStack → InlineAnnotations
  - Floating "Ask the mentor" CTA visible bottom-right; slide-out NOT rendered open
  - Grade pill shows "C" with amber tone
  - One annotation block in Inline Annotations is expanded with Prism-tinted Python
- **§5.5 Audits History:**
  - 5 audit cards rendered with mixed states (3 Completed / 1 Static-only / 1 Failed)
  - Filter bar shows "From date: 2026-04-01" and "Min score: 60" pre-set + Clear-all link visible
  - Empty state preview and Delete confirm modal both rendered below for state-coverage
- Mock data is realistic AND consistent across pages (Layla Ahmed throughout; todo-api on §5.4 also appears as row #1 on §5.5; React Form Validation on §5.1 + §5.2 matches Pillar 4's in-progress task)
- No console errors
- Each page fits a reasonable viewport — §5.2 will scroll (content-rich, expected); §5.1 and §5.3 fit comfortably; §5.4 scrolls (8-section report); §5.5 fits

Deliver as a runnable HTML + bundled JSX, same architecture as previous pillars.
````

---

## After you have the output

1. Save HTML as `pillar-5-feedback-ai/index.html` (or rename after extraction).
2. Save JSX sources under `pillar-5-feedback-ai/src/` with the structure: `src/fa/{shared,submission-form,submission-detail,audit-new,audit-detail,audits-history,app}.jsx` plus the reused P1+P2+P4 sources.
3. Tell me **"Pillar 5 output is ready"** and I'll:
   - Stage files at the pillar root
   - Reuse `vendor/` from Pillar 1
   - Bundle the JSX into `src/bundle.jsx`
   - Add a `pillar-5-preview` entry to `.claude/launch.json` on port **5179**
   - Start the preview and we'll walk through together

## Tips for the `claude.ai/design` session

- **§5.2 is the make-or-break page.** If `claude.ai/design` returns a Submission Detail page where the chat is collapsed, hidden behind a button, or in a slide-out, push back: *"The signature surface is the inline 2-column layout. Render the chat as a sticky right column with the full conversation visible. This is the defense moment."*
- **The hard directive at §1 is the single most important sentence in this prompt.** If the tool starts inventing sections ("Live Code Preview!" / "Try the suggested fix in our sandbox!") — reject firmly: *"The canonical file does not have that section. Remove it and stay structural-faithful."*
- If the tool suggests "modernizing" the audit report into tabs or an accordion, decline: *"The canonical is a vertical 8-section stack. Judges scroll the whole report end-to-end. Keep it flat."*
- For mock data: the todo-api audit's score breakdown should make the C grade feel **earned** — not punitive. Two real critical issues (SQL injection, hardcoded secret) + four real warnings + actionable fixes. This is honest AI feedback, not a SaaS-template scorecard.
- For the chat conversation in §5.2: the assistant's tone should match the brand — *technical, honest, no hype*. The "Yeah — why is line 47 a security risk?" exchange is the chat's signature moment: it ties the inline annotation to the conversation, which is the entire product proposition.
