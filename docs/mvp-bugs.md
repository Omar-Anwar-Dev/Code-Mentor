# MVP Bug Backlog (Sprint 8 → defense rehearsal)

**Status legend:** 🔴 open · 🟡 in progress · ✅ fixed · 🟦 deferred (post-MVP / external dep) · 🚫 won't fix

This file is the live tracker for issues blocking M2 sign-off and the
defense demo. It bootstraps from carryovers across Sprints 1-7 plus
observations made during Sprint 8 execution. Sprint 8's S8-T9 acceptance
calls for clearing the top 10.

Bugs are stable-numbered (`B-NNN`); IDs do not shift if the list is reordered.

---

## Top 10 (Sprint 8 fix targets)

| ID | Severity | Title | Status |
|---|---|---|---|
| B-001 | high | Dashboard `OverallScore` is hardcoded `null` despite Sprint 6 wiring AI results | ✅ fixed in S8-T9 |
| B-002 | medium | Stale "Sprint 6 will fill in" comment in `SubmissionDetailPage` placeholder | ✅ fixed in S8-T9 |
| B-003 | medium | Achievements page rendered mock data (12 fake badges + leaderboard) | ✅ fixed in S8-T4 |
| B-004 | medium | Notifications bell missing "Mark all read" — power-user friction | ✅ fixed in S8-T9 |
| B-005 | low | Hangfire dashboard returns 401 for authenticated non-admin (should be 403) | ✅ fixed in S8-T9 |
| B-006 | medium | No static Privacy Policy / Terms of Service pages — PRD §8.3 says ship them with MVP | ✅ fixed in S8-T9 |
| B-007 | medium | Bundle warning >500 kB after minification; no code-split | 🟦 deferred |
| B-008 | medium | UX copy: empty-state messages on Dashboard / Tasks / Analytics inconsistent in tone | ✅ fixed in S8-T9 |
| B-009 | low | `<title>` and `<meta description>` only set on the public CV page | ✅ fixed in S8-T9 |
| B-010 | low | Footer with project name + supervisors info missing from `AppLayout` | ✅ fixed in S8-T9 |

**Sprint 8-T9 actuals:** 8 fixed inline (B-001/002/004/005/006/008/009/010), 1 fixed in earlier S8 task (B-003), 1 deferred (B-007). One pre-existing fix (B-003 closed by S8-T4's rewrite).

---

## Carryovers / Open

### Tracked but not in S8-T9 scope

| ID | Severity | Title | Defer reason |
|---|---|---|---|
| B-011 | medium | AI prompt token cost on small inputs (sample 2: 21 k tokens for 12 lines) | AI team prompt-tuning post-MVP; documented in `M1-dogfood.md`. Cost analysis in ADR-003 still acceptable for defense. |
| B-012 | low | Hangfire 1.8.17 pulls in `System.Security.Cryptography.Xml` 9.0.0 with two CVEs | Tracked as ADR-015 risk; release-engineer (Sprint 9) will evaluate upgrade or override. |
| B-013 | low | Duplicate frontend folder structure: `src/components/*` vs `src/shared/components/*` | ui-ux-refiner skill — clean up after MVP feature freeze. |
| B-014 | low | Notifications full-list page (paginated history) — bell + per-item link only | Out of MVP per PRD. |
| B-015 | low | "View task" link on text-only Recommendations is hidden (no `taskId` to link to) | Working as designed — text-only is informational. |
| B-016 | low | Bundle code-split (B-007) | Performance optimization; pre-defense polish, not blocker. |
| B-017 | low | Mobile 320 px visual verification still gated on Playwright (Sprints 2/3/4 carry) | Pre-defense Sprint 10 polish. |
| B-018 | low | AI prompt confidence on idiomatic clean code (sample 2 dogfood) — flagged false-negative pattern | AI team, post-MVP prompt iteration. |
| B-019 | medium | `AdminDashboard` + admin `AnalyticsPage` render hardcoded mock data ("1,247 Total Users", "John Doe REST API 85%", etc.) | 🟡 **partially mitigated 2026-04-27 (second pass).** Added an honest amber banner at the top of `/admin` ("Demo data — platform analytics endpoint pending") that links to the real CRUD pages. Real per-platform aggregates still need a new `GET /api/admin/dashboard/summary` endpoint — feature work, not a one-line fix. **For defense:** banner is now visible to supervisors, no silent mock data. |
| B-020 | high | `main.tsx` imported the **orphan** `@/app/App` instead of canonical `@/App`, so the live frontend used `@/app/router` (stale since Sprint 6) — `/analytics`, `/privacy`, `/terms`, `/admin/questions`, friendly `NotFoundPage`, `<aside>`/`<main>` accessibility landmarks, and the site footer were all missing in production. | ✅ fixed 2026-04-27 (one-line `main.tsx` change to import `@/App`). Orphan tree (`src/app/App.tsx`, `src/app/router/`, `src/shared/components/layout/`) **deleted** in second pass (2026-04-27). |
| B-021 | low | Sidebar "Submissions" link redirected to `/tasks` — misleading (users expect a submission history). | ✅ fixed 2026-04-27 (`/submissions` now redirects to `/dashboard`, where the Recent Submissions card lives). A real paginated submissions list page is post-MVP — backend `GET /api/submissions/me?page&size` already exists (S4-T7). |
| B-022 | low | Assessment start page hint #3 said "Get instant feedback after each question with explanations" — but per-answer feedback was removed in S2-T10 (single end-of-assessment scoring). | ✅ fixed 2026-04-27 (copy now reads "Finish in one sitting — you have 40 minutes; results are scored at the end"). |
| B-023 | high | `LearningPathView` (`/learning-path`) rendered a hardcoded JS-only curriculum (mock Redux slice from Sprint 1) — admin/learners without a real path saw fake "12 tasks" data, while their actual backend path (`GET /api/learning-paths/me/active` from S3-T5) was never queried. | ✅ fixed 2026-04-27 (second pass). Component rewritten to call the real backend, render loading skeleton, render path with per-task gradient progress + Start/Open buttons (`learningPathsApi.startTask` / `taskId` open), or render an empty state with "Start Assessment / Browse Task Library" CTAs. Preserves Neon & Glass identity (gradient title, `glass-frosted` cards, primary/purple/pink palette). |
| B-024 | high | `ProfilePage` (`/profile`) showed hardcoded mock data: bio "passionate about building scalable applications", location "Cairo, Egypt", joined "December 2024", "7 day streak", "Level 12, 2450 XP", fake badges. None of it matched the actual logged-in user. | ✅ fixed 2026-04-27 (second pass). Component rewritten to use real `auth.user` (name, email, role, joined date), real `gamificationApi.getMine` + `getBadges` (level, XP, badges), real `dashboardApi.getMine` (recent submissions, avg AI score). Drops fake bio / location / streak / website fields (no backend support). Preserves the existing `<ProfileEditSection />` from S2-T11 which is real-backend-wired. |
| B-025 | medium | `ActivityPage` (`/activity`) showed a hardcoded fake activity feed ("Monday Dec 23 — Completed React Basics", "Sunday Dec 22 — Earned Fast Learner badge"). | ✅ fixed 2026-04-27 (second pass). Replaced with a real-data feed assembled from existing backend signals: XP transactions (`gamificationApi.getMine.recentTransactions`) + recent submissions (`dashboardApi.getMine.recentSubmissions`). Sorted newest-first, with empty-state CTA when both are empty. A dedicated `/api/activity` endpoint can supersede this later if richer event types are wanted. |
| B-026 | medium | Landing page had fake social proof ("10,000+ learners", "★★★★★ 4.9/5 rating") and a full Pricing section (3 plans, dollar amounts, Stripe-style language) that conflicts with PRD §2.3 (free, no payment in MVP). | ✅ fixed 2026-04-27 (second pass). Replaced fake social proof with an academic-honest trust strip (6 analyzers · 5 skill axes / .NET 10 · React · FastAPI / Benha University · Class of 2026). PricingSection component + nav link + footer link removed. CheckCircle import cleaned up. |
| B-027 | low | `NotificationsBell` button missing `aria-label`, decorative bell icon and unread-count badge not `aria-hidden`. Screen readers announced an empty button. | ✅ fixed 2026-04-27 (second pass). Bell button gets dynamic `aria-label` ("Notifications, N unread" or "Notifications"); icon and badge marked `aria-hidden`. |
| B-028 | low | 10 protected pages (Profile, Settings, Learning Path, Tasks, Task Detail, Learning CV, Assessment Start, plus 4 admin pages: Overview / Users / Tasks / Questions / Analytics) had no `useDocumentTitle` — browser tab read "CodeMentor AI - Learning Platform" everywhere. | ✅ fixed 2026-04-27 (second pass). All 11 pages call `useDocumentTitle` with semantic titles; admin pages use the `Admin · X` prefix; TaskDetail uses the dynamic task title. |
| B-029 | medium | `SettingsPage` (~860 LoC) was 90 % fake state — Notification preferences, Privacy toggles, Connected Accounts (`@omar-dev` hardcoded), Data export & Account-deletion modals, "Save Changes" buttons that called nothing. Users adjusting any toggle thought they had persisted a preference. | ✅ fixed 2026-04-27 (third pass). Replaced with a lean ~150-LoC honest page: kept the real `<ProfileEditSection />` (S2-T11 PATCH `/api/auth/me`), real Appearance (theme + compact mode persisted via Redux Persist), real Account/Sign-out (`logoutThunk` revokes refresh token server-side + redirect to /login), and an Info-coloured banner that names the deferred sections. CV privacy still on `/cv/me`. |
| B-030 | medium | Header search input was decorative — typing did nothing on Enter; the form had no `onSubmit`. The placeholder "Search tasks, submissions..." promised functionality that didn't exist. | ✅ fixed 2026-04-27 (third pass). Wrapped input in a `<form role="search">` with controlled value + onSubmit; submit navigates to `/tasks?search=<term>` (the Tasks page already supports the `search` query param from S3-T11). |
| B-031 | low | Header sign-out called the **sync** `logout` action — the refresh token was cleared client-side but never revoked server-side, leaving a valid token in the database until natural expiry. | ✅ fixed 2026-04-27 (third pass). Header now uses `logoutThunk` (S1-T5/T6 wired POST `/api/auth/logout`); Settings page also uses the thunk. |
| B-032 | low | Header avatar fallback hit `https://api.dicebear.com/7.x/avataaars/svg?seed=…` — third-party request on every authenticated page load (privacy + slow load if dicebear is down). | ✅ fixed 2026-04-27 (third pass). Initials chip with the existing violet/cyan/fuchsia gradient when no `user.avatar` is set; `<img>` only when the user has a real avatar URL. |
| B-033 | low | `AssessmentResults` was missing `useDocumentTitle` (default tab title "CodeMentor AI - Learning Platform"), and the focus-areas footer copy said "Your **Sprint 3** learning path will be tailored around these" — internal team language that has nothing to do with what learners see. | ✅ fixed 2026-04-27 (third pass). Hook added (`Assessment results · Code Mentor`); copy reads "Your personalized learning path is being generated around these areas. Check the Dashboard or Learning Path in a few seconds." |
| B-034 | medium | Admin `AnalyticsPage` (`/admin/analytics`) renders entirely mock data — same root cause as B-019 (`AdminDashboard`). User Growth chart, Submissions chart, Track Distribution, AI cost figure ($456.78), all hardcoded. | 🟡 **partially mitigated 2026-04-27 (third pass).** Same honest amber banner as `AdminDashboard` ("Demo data — platform analytics endpoint pending") with a link to the real per-learner `/analytics` page. Real fix needs a `GET /api/admin/analytics/summary` endpoint (totals, growth, distributions, cost) — feature work, not a one-line fix. |
| B-035 | low | Submission failure surfaces the raw .NET HttpClient exception ("Analysis failed: Response status code does not indicate success: 400 (Bad Request).") instead of a learner-friendly explanation (e.g., "the repository doesn't contain code in the language this task expects"). Found 2026-04-27 third pass when submitting `octocat/Hello-World` to a Python task — AI service returned 400 because the repo had no Python code; FE just rendered the raw .NET error. | 🟦 deferred. Backend `SubmissionAnalysisJob` should catch `AiServiceUnavailableException` / Refit `ApiException` and translate the AI service's `detail` field into a human message before persisting on `Submission.ErrorMessage`. Tracked for AI/backend post-MVP polish; FE renders whatever the backend stores in `errorMessage`. |
| B-036 | medium | Login page "Forgot password?" link routed to `/forgot-password` — a dead route. No backend `POST /api/auth/forgot-password` endpoint exists either; password-reset wasn't in MVP scope. Users clicking it would land on the friendly NotFoundPage but never get a way back into their account if they actually forgot. | ✅ fixed 2026-04-27 (fourth pass). Link removed entirely (forgot-password flow is post-MVP; the dead link was a UX trap). The Remember-me row is now left-aligned only. |
| B-037 | medium | Login page "GitHub" button onClick showed a stale toast: "GitHub sign-in coming soon · GitHub OAuth ships in the next sprint." But S2-T0a actually shipped GitHub OAuth (`GET /api/auth/github/login` returns 302 when configured, 503 when `GITHUB_OAUTH_CLIENT_ID/SECRET` are missing). The button claimed unimplemented, but the backend was real — it just needs configuration. | ✅ fixed 2026-04-27 (fourth pass). `handleGitHubLogin` now navigates to `${VITE_API_BASE_URL}/api/auth/github/login`. Configured backends 302 to GitHub; unconfigured ones return the backend's 503 page. The button is no longer dishonest. |

---

## How to add a bug

1. New row in **Top 10** (if intended for current sprint) or **Carryovers**.
2. Severity: high (blocks demo), medium (visible polish miss), low (nice-to-have).
3. Status updates inline; when closed, link to the commit/sprint that fixed it.
