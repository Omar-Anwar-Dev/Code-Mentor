# Pillar 4 — Core Learning: 5 pages

**How to use this file:** Copy the entire prompt below (everything inside the **4-backtick** block) into a session at https://claude.ai/design — **same session as Pillars 1 + 2 + 3 if possible**.

> ⚠️ The outer wrapper uses **4 backticks** intentionally — the prompt contains nested code blocks. If you wrap with 3 backticks, your text editor will close the outer block at the first inner ` ``` ` and you'll only copy part of it.

**Important context:**
- **Pillars 1 + 2 + 3 are APPROVED.** Identity, primitives, AnimatedBackground, BrandLogo, ThemeToggle, ScoreGauge, RadarChart, AuthLayout, TopBar are all canonical.
- **This pillar introduces the AppLayout** (sidebar + header + footer) — the shell every authenticated app surface uses. Pillars 5+ will reuse it unchanged.
- **Hard directive: each page MUST mirror the canonical structure** from `frontend/src/features/{dashboard,learning-path,tasks}/*.tsx`. Same widgets, same sections, same hierarchy, same content categories. The Neon & Glass identity is applied on top — do not invent new structures, do not remove sections, do not add new sections. The owner has been explicit about this on Pillars 2 + 3.

After delivery, save to `pillar-4-core-learning/`, then tell me **"Pillar 4 output is ready"** and we'll wire up preview on port 5178.

---

````
You are continuing the design of Code Mentor — Neon & Glass. The visual identity is APPROVED and codified across Pillars 1 + 2 + 3. This session designs the five Core Learning pages — the heart of the authenticated app.

# 1. Hard directive

Each page in this pillar MUST mirror the canonical structure from the corresponding file in the production repo. **Same widgets, same sections in the same order, same content categories, same data fields displayed.** I'll list each canonical structure below in detail. The Neon & Glass identity is applied on top — glass cards, gradient text on key headings, brand-gradient-bg on primary CTAs, signature gradient on progress fills, etc. — but the page **structure** is fixed.

If you find yourself thinking "this section feels redundant, let me remove it" or "let me add a Quick Tips section" — STOP. Stay structural-faithful.

# 2. Identity (canonical — same as Pillars 1 + 2 + 3)

(Recap, condensed — full spec lives in Pillar 1.)

- Primary Violet `#8b5cf6`, Secondary Cyan `#06b6d4`, Accent Fuchsia `#d946ef`
- Signature gradient `linear-gradient(135deg, #06b6d4 0%, #3b82f6 33%, #8b5cf6 66%, #ec4899 100%)`
- Semantic: Emerald success / Amber warning / Red error
- Dark bg radial gradient `linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%)`, fixed
- Inter + JetBrains Mono variable axes
- Glass system: `.glass`, `.glass-card`, `.glass-card-neon`, `.glass-frosted`, `.glass-shimmer`
- Neon system: `shadow-neon-*`, `text-neon-*`, `glow-sm/md/lg`, animations
- Radii: cards 16px / buttons-md+lg 12px / buttons-sm 8px / badges full
- Reusable components from Pillar 1: Button (8 variants), Card (5 variants), Badge (8 tones), Field, TextInput, Select, Modal, Toast
- Reusable from Pillar 2: AnimatedBackground, BrandLogo, ThemeToggle, useTheme

# 3. The AppLayout (new in Pillar 4 — reusable for Pillars 5+)

The shell every authenticated app page sits inside. Three regions:

## 3.1 Sidebar (fixed left)
- Width: 256px expanded, 80px collapsed (icon-only). Toggle button in sidebar header.
- Surface: `.glass` (chrome glass)
- Top: BrandLogo (sm size) + a chevron-left toggle button (rotates 180deg when collapsed)
- Nav items (vertical list, gap-1, px-3 py-2.5 each, rounded-xl):
  1. **Dashboard** (icon: `Home`) — active state demo
  2. **Assessment** (icon: `BookOpen`)
  3. **Learning Path** (icon: `Map`)
  4. **Submissions** (icon: `Code`)
  5. **Tasks** (icon: `ClipboardList`)
  6. **Audit** (icon: `ScanSearch`)
  7. **Analytics** (icon: `TrendingUp`)
  8. **Achievements** (icon: `Trophy`)
  
  Active item: `bg-primary-500/10 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-medium`. Inactive: `text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5`.

- Bottom (separated by a border-top):
  - Theme toggle button (full width, with icon + label when expanded — "Light mode" / "Dark mode")
  - **Settings** (icon: `Settings`)

- When collapsed (80px): show icons only, label hidden, theme toggle becomes a 9×9 square icon button.

## 3.2 Header (sticky top, h-16)
- Surface: `.glass`
- Left side: hamburger (mobile only, hidden lg+) + the current page title in h4 (e.g., "Dashboard"). The page title comes from page context.
- Center: search input (max-w-md, hidden md-) — placeholder "Search the task library…" + Search icon prefix. Submitting routes to `/tasks?search=…` (just a console.log in the preview).
- Right: NotificationsBell + user avatar dropdown menu
  - NotificationsBell: bell icon button with a small primary-500 badge "3" top-right (pulse animation)
  - User menu trigger: 32×32 initials-on-gradient circle + user name (md+ visible: "Layla A.") + ChevronDown icon
  - Click → glass-frosted dropdown (w-56) with: user info header (name + email) → Profile / Settings / Sign out items

## 3.3 Main + Footer
- Main: `<main>` element, padding `p-4 md:p-6 lg:p-8`, scrollable, contains the page's primary content
- Footer (under main, not full-page sticky): `border-t border-neutral-200 dark:border-neutral-800 mt-8 px-4 md:px-6 lg:px-8 py-6 text-xs text-slate-500`
  - Left: "Code Mentor — Benha University, Faculty of Computers and AI · Class of 2026." + "Instructor: Prof. Mostafa El-Gendy · TA: Eng. Fatma Ibrahim"
  - Right: Privacy + Terms links

## 3.4 Mock user identity (consistent across all pages)
- Name: **Layla Ahmed**
- Email: layla.ahmed@benha.edu
- Initials: "LA"
- Active path track: **Full Stack**
- XP: 1,240 · Level 7

# 4. Page-switcher pill (preview-only)

Same pattern as previous pillars. Fixed top-right, glass-frosted rounded-full, collapsible. 5 buttons: Dashboard / Learning Path / Project Details / Tasks Library / Task Detail. Default open. Active button: primary-500 bg.

# 5. The 5 pages

For EACH page, I'm giving you the canonical structure section-by-section. Render it faithfully with the Neon & Glass identity.

---

## 5.1 Dashboard — `/dashboard`

Mirrors `frontend/src/features/dashboard/DashboardPage.tsx`. Top-to-bottom, space-y-6:

### A. Welcome Header (row, justify-between, gap-4)
- Left:
  - **H1** with gradient: `<span>Welcome back, </span><span gradient>Layla</span><span> 👋</span>` (NOTE: the canonical uses the wave emoji — but we have a no-emoji rule. Replace 👋 with a small `<Hand>` lucide icon at 28px inline.)
  - Subline: "Your Full Stack learning path has 7 tasks. 3 complete."
  - **XpLevelChip below**: a glass pill — "Level 7" + a small horizontal progress bar showing XP-to-next-level (60% filled with brand-gradient) + "1,240 / 2,000 XP" in mono small
- Right:
  - "Retake Assessment" outline button with leftIcon `Sparkles` (border-primary, hover fills primary)

### B. 4 Stat Cards (grid-cols-2 lg:grid-cols-4 gap-4)
Each is a `.glass-card` with `<Card.Body p-5>` containing: a 48×48 rounded-2xl gradient icon container on the left + big value + small label on the right.

1. **Target icon** (gradient green→emerald) · "3 / 7" · "Tasks Complete"
2. **Play icon** (gradient blue→cyan) · "1" · "In Progress"
3. **Clock icon** (gradient purple→pink) · "42h" · "Estimated Path"
4. **Trophy icon** (gradient orange→yellow) · "78%" · "Avg Skill Score"

### C. Active Path + Skill Snapshot (grid-cols-1 lg:grid-cols-3 gap-6)

#### Active Learning Path (lg:col-span-2)
A `.glass-card` with header + body:
- **Card.Header**: "Active Learning Path" + a `Badge tone="primary"` with a dot showing "Full Stack"
- **Card.Body**:
  - Top row (items-center, gap-4): a CircularProgress 80px on the left (38%, brand-gradient stroke). Right: "Overall progress" label + horizontal ProgressBar (3/7 filled with brand gradient) + "3 of 7 tasks complete" small text below
  - **Top 5 tasks list** (space-y-2): each task is a row with `flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50`:
    - TaskStatusIcon (Completed=CheckCircle emerald · InProgress=Play primary · NotStarted=Circle neutral)
    - Middle (flex-1): task title font-medium + meta line `{category} · difficulty {1-5 dots} · {hours}h`
    - Right: ghost Button "Review"/"Continue"/"Start" with rightIcon ArrowRight
  - **NEXT UP card** (below the list, p-4, rounded-xl with `bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-200 dark:border-primary-800`): 
    - "NEXT UP" uppercase mono in primary-700
    - Task title font-semibold
    - Primary button "Continue Task" with rightIcon ArrowRight

Mock the 7 tasks; show top 5 with mixed statuses (2 Completed, 1 InProgress as the current NEXT UP, 2 NotStarted, then 2 more behind in the path).

Sample task names: "REST API with Express", "JWT Authentication", "PostgreSQL with Prisma", "React Form Validation", "WebSocket Chat", "Docker Multi-Service Setup", "End-to-End Testing".

#### Skill Snapshot (single col on the right)
A `.glass-card`:
- **Card.Header**: "Skill Snapshot"
- **Card.Body**: 5 categories, each:
  - Top row (justify-between): name (font-medium 14px) + score (text-slate-500 14px) like "Correctness · 84%"
  - Horizontal ProgressBar size=sm with brand-gradient fill
  - Below the bar: level label small (e.g., "Advanced", "Intermediate", "Beginner")
  
  Data: Correctness 84 (Advanced), Readability 81 (Advanced), Security 58 (Intermediate), Performance 65 (Intermediate), Design 72 (Intermediate).

### D. Recent Submissions (full-width Card)
- **Card.Header**: "Recent Submissions"
- **Card.Body**: list with divide-y between items. 3 items:
  - Each row: status badge pill (Completed=success, Processing=primary, Failed=error, Pending=default) + task title (clickable, hover primary) + small meta line "[timestamp] · [score]%" + ghost Button "View" with rightIcon ArrowRight

  Data:
  1. **Completed** · "JWT Authentication" · "2026-05-12 09:24 · 86%"
  2. **Processing** · "PostgreSQL with Prisma" · "2026-05-12 08:55"
  3. **Completed** · "REST API with Express" · "2026-05-11 18:12 · 79%"

### E. Quick Actions (grid-cols-1 md:grid-cols-3 gap-5)
Three identical-format cards (glass with hover lift). Each:
- 48×48 rounded-2xl gradient icon container (LEFT) + content (title + small description) right
- The icon container's gradient scales 110% on hover

1. **BookOpen** (green→emerald) · "Browse Task Library" · "Explore every task across all tracks"
2. **Trophy** (orange→yellow) · "Your Learning CV" · "3 verified projects · public"
3. **Code** (blue→cyan) · "Submit Code" · "Get AI feedback on your work"

Each card wraps a Link (just visual in preview).

---

## 5.2 Learning Path View — `/learning-path`

Mirrors `frontend/src/features/learning-path/LearningPathView.tsx`. max-w-4xl, animate-fade-in. Top-to-bottom:

### A. Header (mb-8)
- H1 (3xl bold, gradient text): "Your Full Stack Path"
- Inline next to H1: `Badge tone="primary"` with gradient bg "7 tasks"
- Subline: "Generated May 7, 2026 · Estimated 42 h"

### B. Overall Progress card (`.glass-frosted` rounded-2xl p-5)
- Top row (justify-between): "Overall Progress" label (font-medium 14px) + "43% complete" (gradient text, font-bold)
- Linear ProgressBar size=md primary (43% filled with brand-gradient)
- Below: "3 of 7 tasks done" small slate-500

### C. Task list (space-y-3)
7 ordered tasks. Each is a `.glass-card` p-5 with this layout (flex items-start gap-4):

- **Left column** (numbered circle, w-9 h-9 rounded-full border, items-center justify-center):
  - For completed: emerald-100/500-20 bg, emerald-700/300 text + CheckCircle icon
  - For in-progress: primary-100/500-20 bg, primary-700/300 text + the number
  - For not-started: neutral-100/800 bg, neutral-300/700 border, neutral-600/400 text + the number
  - For locked (sequential): same as not-started but adds a Lock icon overlay
- **Middle** (flex-1):
  - Title row: h2 (lg font-semibold) + inline Badge if Completed (success "Completed" with CheckCircle) or InProgress (primary "In progress" with Play)
  - Meta row (text-xs slate-500, gap-x-3 flex-wrap): category with BookOpen icon · hours with Clock icon · 5 difficulty stars (filled warning-500 up to difficulty level) · language pill (`px-1.5 py-0.5 rounded bg-neutral-100/800 font-mono`)
- **Right** (ml-auto, gap-2):
  - Outline Button "Open" with rightIcon ArrowRight
  - For not-started + unlocked: gradient Button "Start"; for locked: outline disabled with "Locked" + Lock icon

**Sample 7 tasks** (in this order — first 3 done, 4th in progress, rest queued):

1. ✅ **REST API with Express** — Backend · 6h · ★★★☆☆ · `JavaScript` — Completed
2. ✅ **JWT Authentication** — Security · 4h · ★★★★☆ · `JavaScript` — Completed
3. ✅ **PostgreSQL with Prisma** — Databases · 8h · ★★★☆☆ · `TypeScript` — Completed
4. ▶ **React Form Validation** — Frontend · 5h · ★★★☆☆ · `TypeScript` — In progress
5. **WebSocket Chat** — Real-time · 7h · ★★★★☆ · `TypeScript` — Not started, unlocked
6. **Docker Multi-Service Setup** — DevOps · 6h · ★★★★★ · `Dockerfile` — Locked (depends on #5)
7. **End-to-End Testing** — Testing · 6h · ★★★★☆ · `TypeScript` — Locked

---

## 5.3 Project Details — `/learning-path/project/:taskId`

Mirrors `frontend/src/features/learning-path/pages/ProjectDetailsPage.tsx`. max-w-5xl, animate-fade-in.

For the preview, assume we're viewing task #4 "React Form Validation" (status: in_progress).

### A. Back link (top, mb-4)
- `<ArrowLeft>` + "Back to Learning Path" — slate-600, hover primary

### B. Hero card (`.glass-frosted` rounded-2xl p-6)
Top section (flex flex-col md:flex-row md:items-start md:justify-between gap-4):
- **Left** (flex-1):
  - Row: "Task 4" small slate-500 + a Status Badge (large size: "In Progress" primary with Play icon)
  - H1 gradient: "React Form Validation"
  - Description paragraph (3 lines): "Build a multi-step form with Zod schema validation, error states tied to specific fields, async username-availability check, and accessible error messaging. Should pass a small Jest suite of typing-error tests and submit only when all schemas validate."
  - Meta row (flex flex-wrap items-center gap-4 text-sm):
    - Default Badge "Frontend"
    - Clock + "5 hours"
    - "Difficulty:" + 3 filled stars / 2 empty
- **Right** (flex flex-col gap-2):
  - Gradient Button "Submit Code" with rightIcon Send (because status is in_progress)

Below the hero content (mt-4 pt-4 border-t):
- "Prerequisites: " label + 2 Badges:
  - Success "PostgreSQL with Prisma" with CheckCircle
  - Success "JWT Authentication" with CheckCircle

### C. Tabs panel (`.glass-frosted` rounded-2xl p-6, overflow-hidden)
A horizontal Tabs strip at the top (matches Pillar 1's Tabs primitive — primary-500 underline on active). 5 tabs:

1. **Overview** (icon: FileText) — default-active
2. **Requirements** (icon: Target)
3. **Deliverables** (icon: Package)
4. **Resources** (icon: BookOpen)
5. (Optional, if status==="completed" — hide this for our in-progress preview) Rubric & Score (icon: Award)

Render only the Overview tab content as the active default (the other tabs visible as clickable, but content panel shows Overview):

#### Overview tab content (animate-fade-in, space-y-6):
- "Project Overview" h3 + 1-paragraph description
- "Learning Objectives" h3 + bullet list (4 items) with CheckCircle primary-500 icons:
  - "Validate complex form schemas with Zod"
  - "Bind field-level error states to inputs"
  - "Handle async validators without blocking the UI"
  - "Surface accessible error messaging (ARIA + role=alert)"
- "Previous Submissions" h3 with History icon. 1 submission card:
  - Failed badge · "Dec 22, 2024 · 02:15 PM" · score 65% in error-500

### D. Show all 5 tabs in their inactive states. The hover-state transitions live in the tab component.

---

## 5.4 Tasks Library — `/tasks`

Mirrors `frontend/src/features/tasks/TasksPage.tsx`. space-y-6, animate-fade-in.

### A. Page header (no card, just text)
- H1 (3xl bold): "Task Library"
- Subline: "Curated real-world tasks across Full Stack, Backend, and Python tracks."

### B. Filters Card (`.glass-card`)
- Body p-4 space-y-3:
  - Search input row: `<Search>` icon prefix + placeholder "Search task titles..." + the input fills the row (rounded-xl, py-2.5)
  - Filter row (flex flex-wrap gap-2):
    - 4 native `<select>` filters (rounded-xl py-2): "Track: Any", "Category: Any", "Language: Any", "Difficulty: Any"
    - "Clear filters" ghost button (hidden by default, visible when a filter is set — show it visible for the preview)
  - For preview: pre-set "Track: FullStack" so the Clear button is visible

### C. Results
- Count line: "21 results · page 1 of 2"
- Grid (`md:grid-cols-2 lg:grid-cols-3 gap-4`) of TaskCards.
- Each TaskCard:
  - `.glass-card` with hover (h-full)
  - Card.Body p-5 flex flex-col h-full:
    - Top row (items-start justify-between gap-2): h3 task title (2-line clamp) + Badge tone="primary" (right-aligned, e.g., "FullStack")
    - Middle (gap-2 mb-3 text-xs slate-500): 2 default Badges (Category + Language)
    - Bottom row (mt-auto, items-center, gap-3): difficulty stars (5, filled in warning-500 by level) + Clock icon + hours + ChevronRight icon ml-auto
- Show **9 task cards** filling the grid. Sample:
  1. "REST API with Express" · FullStack · Algorithms · JavaScript · ★★★☆☆ · 6h
  2. "JWT Authentication" · FullStack · Security · JavaScript · ★★★★☆ · 4h
  3. "PostgreSQL with Prisma" · FullStack · Databases · TypeScript · ★★★☆☆ · 8h
  4. "React Form Validation" · FullStack · OOP · TypeScript · ★★★☆☆ · 5h
  5. "WebSocket Chat" · FullStack · DataStructures · TypeScript · ★★★★☆ · 7h
  6. "Docker Compose Stack" · FullStack · OOP · CSharp · ★★★★★ · 6h
  7. "Type-Safe Reducers" · FullStack · DataStructures · TypeScript · ★★★☆☆ · 3h
  8. "Trie-Based Fuzzy Search" · FullStack · Algorithms · Python · ★★★★☆ · 8h
  9. "Async Job Queue (Hangfire)" · FullStack · DataStructures · CSharp · ★★★★☆ · 6h

### D. Pagination bar (centered, gap-2, py-2)
- Outline Button "← Prev" (disabled state because page=1)
- "1 / 2" small slate-600 mono
- Outline Button "Next →"

---

## 5.5 Task Detail — `/tasks/:id`

Mirrors `frontend/src/features/tasks/TaskDetailPage.tsx`. max-w-4xl mx-auto, animate-fade-in, space-y-6.

For the preview, assume we're viewing task "React Form Validation" (which IS on the active path — so we show the in-progress badge).

### A. Back link
- `<ArrowLeft>` + "Back to Task Library" — small primary-600, mb-3

### B. Title + meta + action (flex flex-col md:flex-row md:items-start justify-between gap-4)
Left side:
- H1 (3xl bold): "React Form Validation"
- Badges row (mt-3 flex flex-wrap items-center gap-2):
  - Badge tone="primary" "FullStack"
  - Badge tone="neutral" "OOP"
  - Badge tone="neutral" "TypeScript"
  - Clock + "5h" small slate-500
  - 5 difficulty stars (3 filled in warning-500)

Right side:
- `Badge tone="primary"` "In Progress" (because task is on the active path AND in-progress)

### C. Description Card (`.glass-card`)
Card.Body p-6 with rendered markdown content. Generate ~3 sections:

```markdown
## Overview

Build a multi-step React form that validates against a **Zod schema**. Each field shows its own inline error state, an async username-availability check runs without blocking the UI, and the submit button is disabled until every schema rule passes.

## Requirements

- Two-step form: account info → preferences
- **Zod** schemas at both step boundaries
- Async validator for `username` (mock 800ms delay)
- Field errors render inside `aria-describedby` containers
- Submit only fires when both schemas validate

## Acceptance

- Type-check passes with `tsc --noEmit`
- Tests in `tests/form.test.ts` all green
- No console errors in the happy path
- `npm run lint` returns 0
```

Render this with a small inline markdown renderer (h2 / paragraph / unordered list / inline code / bold). Same renderer pattern as the canonical file.

### D. Prerequisites Card (`.glass-card`)
- Card.Header: "Prerequisites" font-semibold
- Card.Body: bullet list (small slate-700):
  - "PostgreSQL with Prisma"
  - "JWT Authentication"

### E. Submit Your Work Card (`.glass-card`)
Card.Body p-6, text-center, space-y-3:
- "Ready to submit your work?" font-semibold
- "Paste a GitHub URL or upload a ZIP of your project for automated review." small slate-500
- Primary Button "Submit Your Work" with leftIcon Send

# 6. Output format

Same architecture as Pillars 1 + 2 + 3:
- HTML root file (`Core Learning.html` — or `CoreLearning.html`) with: Google Fonts + Tailwind config + inline CSS (same identity blocks) + vendored scripts (or CDN URLs — we'll re-vendor on integration)
- All JSX bundled into ONE script tag pointing at `src/bundle.jsx` (same Babel-scope-isolation fix from previous pillars)
- Each page in its own source file under `src/co/`; bundle order:
  1. `src/icons.jsx` (P1)
  2. `src/primitives.jsx` (P1)
  3. `src/pa/shared.jsx` (P2 — AnimatedBackground, BrandLogo, ThemeToggle, useTheme)
  4. `src/co/shared.jsx` (NEW — AppLayout (Sidebar + Header + Footer), Skeleton, ProgressBar, CircularProgress, XpLevelChip, TaskStatusIcon, SubmissionStatusPill, DifficultyStars, TabsStrip)
  5. `src/co/dashboard.jsx`
  6. `src/co/learning-path.jsx`
  7. `src/co/project-details.jsx`
  8. `src/co/tasks-library.jsx`
  9. `src/co/task-detail.jsx`
  10. `src/co/app.jsx` (PAGES list + PageSwitcher + App component + render)
- Theme toggle: reuse `useTheme()` from Pillar 2
- Mock data: realistic and consistent (Layla Ahmed / Full Stack / Level 7 / 1240 XP / etc., as detailed above)

# 7. Anti-patterns (DO NOT do these)

- DO NOT remove or merge sections from a canonical page. Every section listed in §5 must appear in the right order. If a section feels redundant or empty, that's a signal you missed mock data — fill it in, don't drop it.
- DO NOT add sections not in the canonical (no "Quick Tips", no "Trending Tasks", no "Daily Goal" widget, no streak meters on the dashboard).
- DO NOT replace the original component categories (e.g., don't replace 4 stat cards with a single combined card).
- DO NOT use emoji except where explicitly noted (the Hand icon stand-in for the dashboard welcome wave is fine; otherwise no emoji).
- DO NOT skip the AppLayout — every page in this pillar uses it. The page-switcher pill sits on top of it.
- DO NOT use stock illustrations or cartoon avatars. Use lucide icons + initials-on-gradient circles.
- DO NOT make the sidebar items horizontal on mobile — sidebar slides in from the left on mobile (backdrop overlay), stays vertical.
- DO NOT remove the Footer from AppLayout — it's a brand surface.

# 8. Acceptance criteria

- All 5 pages render via the page switcher
- AppLayout (sidebar + header + main + footer) consistent across all 5 pages
- Sidebar nav highlights the active route per page (Dashboard active on /dashboard, Learning Path active on /learning-path, Tasks active on both /tasks AND /tasks/:id, Learning Path active on /learning-path/project/:taskId)
- Theme toggle works on every page (use the sidebar-footer button OR top-right header button — both should drive the same `dark` class)
- Dashboard: all 5 sections present in order (Welcome, 4 stat cards, Active Path + Skill Snapshot 2-col, Recent Submissions, 3 Quick Actions)
- Learning Path: 7 ordered tasks with mixed statuses + correct status pills + locked state on the right 2
- Project Details: hero card + prerequisites + tab strip with 4 tabs visible + Overview content rendered (3 sub-sections)
- Tasks Library: filters card + 9 task cards in grid + pagination bar
- Task Detail: title + badges + description card with markdown rendered + prerequisites card + submit card
- Mock data is realistic AND consistent across pages (e.g., "React Form Validation" appears as the in-progress task on Dashboard, the in-progress row on Learning Path, and the active page for both Project Details and Task Detail)
- No console errors
- Each page fits a reasonable viewport with at most one screen of vertical scroll on 1280×800

Deliver as a runnable HTML + bundled JSX, same architecture as previous pillars.
````

---

## After you have the output

1. Save HTML as `pillar-4-core-learning/index.html` (or rename after extraction).
2. Save JSX sources under `pillar-4-core-learning/src/` with the structure: `src/co/{shared,dashboard,learning-path,project-details,tasks-library,task-detail,app}.jsx` plus the reused P1+P2 sources.
3. Tell me **"Pillar 4 output is ready"** and I'll:
   - Stage files at the pillar root
   - Reuse `vendor/` from Pillar 1
   - Bundle the JSX into `src/bundle.jsx`
   - Add a `pillar-4-preview` entry to `.claude/launch.json` on port **5178**
   - Start the preview and we'll walk through together

## Tips for the `claude.ai/design` session

- **The hard directive at §1 is the single most important sentence in this prompt.** If `claude.ai/design` starts inventing sections ("Trending tasks this week!" / "Daily focus widget") — push back firmly: *"The canonical file at frontend/src/features/{X}/{Y}.tsx does not have that section. Remove it and stay structural-faithful."*
- If the tool suggests "modernizing" the layout (e.g., merging Dashboard's stat cards into a single dashboard summary), decline: *"The canonical has 4 separate stat cards. Keep 4 separate cards."*
- **The AppLayout is the most reusable artifact in this pillar.** Make sure it ships clean — Pillars 5-8 will reuse the same Sidebar + Header.
