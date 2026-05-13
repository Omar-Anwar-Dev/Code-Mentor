# Handoff for a fresh session — UI Integration (Sprint 13)

> **You are a new Claude Code session picking up an in-flight UI redesign integration. Read this file in full, then proceed per the instructions at the bottom.**

---

## Project state (2026-05-12)

**The 8-pillar isolated preview workspace is COMPLETE and APPROVED.** Every pillar was walked through live in a browser by the owner; all 8 are stamped `✅ APPROVED` in `frontend-design-preview/walkthrough-notes.md`. The previews are the **structural truth** for the redesign — production pages mirror them section-by-section.

| Pillar | Pages | Workspace folder | Status |
|---|---|---|---|
| 1 — Foundation (Design System Showcase) | 1 | `pillar-1-foundation/` | ✅ APPROVED |
| 2 — Public + Auth | 7 | `pillar-2-public-auth/` | ✅ APPROVED |
| 3 — Onboarding (Assessment) | 3 | `pillar-3-onboarding/` | ✅ APPROVED |
| 4 — Core Learning + AppLayout | 5 | `pillar-4-core-learning/` | ✅ APPROVED |
| 5 — Feedback & AI ⭐ defense-critical | 5 | `pillar-5-feedback-ai/` | ✅ APPROVED |
| 6 — Profile & CV | 4 | `pillar-6-profile-cv/` | ✅ APPROVED |
| 7 — Secondary | 4 | `pillar-7-secondary/` | ✅ APPROVED |
| 8 — Admin | 5 | `pillar-8-admin/` | ✅ APPROVED |

**Total surfaces:** 34 (29 pages + 4 layouts + Notifications dropdown).

**Integration Round 1 already landed** (this session, before handoff):
- `frontend/src/shared/styles/globals.css` — added `.brand-gradient-bg` + `.brand-gradient-text` + `prefers-reduced-motion` global reset
- `frontend/tailwind.config.js` — added animation keys `neon-pulse` / `glow-pulse` / `shimmer`
- `frontend/src/components/ui/` — added `Field.tsx` + `Select.tsx` + `Textarea.tsx`; updated `index.ts` barrel
- `npx tsc -b` clean

**Sprint 13 in `docs/implementation-plan.md`** documents the full task list (S13-T1..T11). Round 1 above corresponds to the foundation; **next up is S13-T1** (primitive visual touch-ups) then **S13-T2** (AppLayout port).

---

## HARD CONSTRAINTS — read carefully before doing anything

### 1. The 8-pillar preview is the structural truth

Each production page mirrors its preview pillar **section-by-section**. NO inventing new sections, NO merging widgets, NO dropping sub-areas. If you find yourself thinking "this section feels redundant, let me remove it" or "let me add a Quick Tips card" — **STOP**. Stay structural-faithful.

To know what a page should look like, **open the preview**:
- `frontend-design-preview/pillar-N-*/index.html` for the page composition
- `frontend-design-preview/pillar-N-*/src/{prefix}/{page}.jsx` for the per-page JSX
- `frontend-design-preview/walkthrough-notes.md` for the per-pillar approval details + Sprint-13 carry-forwards

### 2. The Neon & Glass identity is NON-NEGOTIABLE

Violet primary (`#8b5cf6`) + Cyan secondary (`#06b6d4`) + Fuchsia accent (`#d946ef`) + signature 4-stop gradient + glass surfaces (`.glass`, `.glass-card`, `.glass-frosted`, `.glass-card-neon`) + neon utilities + Inter + JetBrains Mono.

**This is codified in memory** (`feedback_aesthetic_preferences.md`) and was **established via the painful rollback on 2026-04-27** (see `docs/decisions.md` ADR-030 for the full history: the `/ui-ux-refiner` skill at the time established a NEW direction and 4-5 hours of work had to be rolled back). The owner has explicitly said "the existing identity is non-negotiable."

### 3. DO NOT re-establish a design direction

If you are running `/ui-ux-refiner` — its default phase is "audit the current interface and establish a design direction with the user." **Skip that.** The direction is already established in `frontend-design-preview/`. Your job is **integration**, not redesign.

Tell `/ui-ux-refiner` explicitly in your first turn:

> "The design direction is already established in `frontend-design-preview/`. Skip Phase 1 'establish direction'. The 8 pillars in the workspace are APPROVED and are the structural truth. Your job is to port them into `frontend/`. Do NOT propose alternative palettes, fonts, or aesthetics. Read `frontend-design-preview/HANDOFF.md` first."

### 4. Live walkthrough before merge — every pillar, every time

When you finish porting a pillar, **stop and ask the owner to walk through it in a browser** before starting the next. Brief approval ≠ visual approval. The whole reason `frontend-design-preview/` exists is to never repeat 2026-04-27.

### 5. Owner-locked banner copy is verbatim

Two banners have owner-locked exact wording — keep byte-identical:

- **Settings "What's wired today" cyan banner** (Pillar 7 / SettingsPage):
  > "Profile fields and appearance preferences below persist for real. Notification preferences, privacy toggles, connected-accounts, and data export/delete need a future `UserSettings` backend — not in MVP. CV privacy is on the Learning CV page."

- **Admin "Demo data" amber banner** (Pillar 8 / AdminDashboard + admin/AnalyticsPage):
  > "The aggregates below are illustrative. Real per-platform numbers need a new `/api/admin/dashboard/summary` endpoint. The CRUD pages — Users, Tasks, Questions — are wired to live data."

Both banners stay until the underlying backends ship.

### 6. Defense-critical signature surface

SubmissionDetailPage (`/submissions/:id`) is **the screen judges see first at defense**. Its layout is the **inline 2-column composition** at `lg+`: FeedbackPanel left (9 sub-cards) + MentorChatPanel as inline sticky right column (NOT slide-out). Below `lg`, the chat stacks to a full-width second row. **This is the one intentional deviation from the production slide-out chat** — AuditDetailPage keeps the slide-out, only SubmissionDetailPage gets the inline composition.

Port this **pixel-faithful** to `pillar-5-feedback-ai/src/fa/submission-detail.jsx`. Light-mode chat color variants are already in the preview (`bg-white/80 dark:bg-slate-900/60` for assistant, `bg-cyan-50 dark:bg-cyan-500/10` for user, etc.) — port those to `frontend/src/features/mentor-chat/MentorChatPanel.tsx` too.

---

## Files to read at the start (in order)

1. **This file (`frontend-design-preview/NEXT-SESSION.md`)** — done if you're reading.
2. **`frontend-design-preview/HANDOFF.md`** — the original preview-workspace handoff. Sets up the workflow context.
3. **`frontend-design-preview/walkthrough-notes.md`** — every pillar's APPROVED status + iteration history + per-pillar Sprint-13 carry-forwards (light-mode chat fix, banner-copy locks, AppLayout details, etc.).
4. **`docs/implementation-plan.md`** — find "Sprint 13" — full task list (S13-T1..T11). This is the plan `/project-executor` will execute.
5. **`docs/progress.md`** — find the most recent dated entry (`### 2026-05-12 — UI integration kickoff: Pillar 1 foundation landed in frontend/ ✅`) — this is the state the integration is resuming from.
6. **`docs/decisions.md`** — find **ADR-030** — the rollback history that established the "Neon & Glass non-negotiable" rule. Don't repeat that incident.

---

## Recommended skill invocation

The user wants `/project-executor` + `/ui-ux-refiner` working together. Here's how they fit:

### `/project-executor` is the right primary skill for this work

- It's designed for sprint execution: reads `implementation-plan.md`, executes tasks in order, saves progress task-by-task, raises blockers explicitly.
- Sprint 13 is documented in `implementation-plan.md` with 11 ordered tasks.
- The skill's phase-2 kickoff will surface real ambiguity (mobile breakpoint behavior, snapshot-test re-bless scope, etc.) — answer those, then it executes.

**Recommended first message in the new session:**

```
Please read frontend-design-preview/NEXT-SESSION.md in full. Then read the
files it points at, in order. After that, invoke /project-executor with
"start sprint 13" — Sprint 13 is documented in docs/implementation-plan.md.

CRITICAL: the 8-pillar preview workspace is the structural truth. Do not
re-establish a design direction. Neon & Glass identity is non-negotiable.
Live walkthrough every pillar before moving to the next.
```

### `/ui-ux-refiner` — use ONLY if you specifically want a polish pass AFTER integration

The skill's strength is establishing a design system + refining screens. For OUR case (where the design system is already established in 8 walked-through pillars), the skill is **risky** — its Phase 1 ("establish design direction") was the cause of the 2026-04-27 rollback.

**If you want to use it anyway**, invoke it AFTER `/project-executor` has finished the integration sprint, as a final polish pass. And in your first turn to the skill, paste the explicit instruction from Constraint 3 above ("skip Phase 1; the direction is established; port don't redesign").

**Do NOT invoke `/ui-ux-refiner` as the primary integration driver.** That's an inversion of what the skill is for.

---

## Quick-start: what to type in the new session

Open a fresh Claude Code session in the same working directory. Paste this as your first message:

```
Read frontend-design-preview/NEXT-SESSION.md in full, then read the files
it points at in order (HANDOFF.md, walkthrough-notes.md, implementation-plan.md
Sprint 13, progress.md latest entry, decisions.md ADR-030).

Then invoke /project-executor with "start sprint 13".

The 8-pillar preview is the structural truth. Neon & Glass is non-negotiable.
Live walkthrough each pillar before moving to the next.
```

That's it. The new session has everything it needs.

---

## Round-1 verification (what to spot-check before starting Round 2)

Before the new session executes S13-T1, it should run a quick sanity check that Round 1 didn't break anything:

```bash
cd frontend
npx tsc -b              # should pass cleanly
npm run build           # should build without warnings
npm run dev             # start the dev server
```

Open `http://localhost:5173` and confirm a few pre-existing pages still render correctly (Landing, Login, Dashboard). The Round-1 changes were additive (new CSS classes + 3 new primitives + new tailwind keys) — no existing page should look different.

If anything broke, that's a blocker — surface it before starting S13-T1.

---

## Where to stop in any session

The skill discipline ("save progress after every task; long sprints span multiple sessions") applies here. Each task ends with:

1. Mark complete in `docs/progress.md` with timestamp + verification note
2. Brief 1-2 line check-in in chat
3. Continue to next task, OR stop cleanly if context is running tight

The user can resume any time with `/project-executor continue sprint 13` (or `/project-executor` with no args — it'll infer from `progress.md`).
