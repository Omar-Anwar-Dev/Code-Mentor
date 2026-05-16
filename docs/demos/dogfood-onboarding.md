# Dogfood onboarding — S21-T8 / M4

**Window:** 2026-05-20 → 2026-08-15 (open before defense).
**Target:** ≥ 10 completed loops (7 team + 3 external). Acceptance fallback
per the implementation plan: ≥ 5 + honest count in `progress.md`.

This doc is the script Omar walks through for each dogfood volunteer. Plan
on ~30 minutes per person end-to-end (Stage A → G in
`sprint-21-walkthrough.md`).

---

## 1. Pre-recruit checklist (one-time, Omar)

Before reaching out to volunteers:

- ☐ Local stack runs cleanly (Stage A of the walkthrough completes
      without manual intervention).
- ☐ `tools/seed-sprint21-batch-5.sql` applied; bank at 207 questions.
- ☐ Admin user seeded (`admin@codementor.local` / known password).
- ☐ `/admin/dogfood-metrics` returns a valid baseline payload (smoke test).
- ☐ Backup video (S21-T7) recorded — show volunteers the demo flow if they
      get stuck.
- ☐ Tracking spreadsheet duplicated from §4 below into a shared Google
      Sheet.

---

## 2. Recruit roster (10 named accounts)

The implementation plan locks the roster at 7 team + 3 external. Sample
slate to drop into the spreadsheet:

| # | Name | Source | Track suggestion | Reach-out channel |
|---|---|---|---|---|
| 1 | Omar (owner) | Team | Backend | n/a |
| 2 | Team member 2 | Team | FullStack | Slack DM |
| 3 | Team member 3 | Team | Python | Slack DM |
| 4 | Team member 4 | Team | Backend | Slack DM |
| 5 | Team member 5 | Team | FullStack | Slack DM |
| 6 | Team member 6 | Team | Backend | Slack DM |
| 7 | Team member 7 | Team | Python | Slack DM |
| 8 | External 1 (Faculty TA) | External | FullStack | Email |
| 9 | External 2 (peer from another university) | External | Backend | Email |
| 10 | External 3 (self-taught contact) | External | Python | Email |

Personalize before sending.

---

## 3. The pitch (paste-able)

> Hey — quick favor. I'm running the dogfood phase for my graduation
> project, **Code Mentor**, an AI-powered learning platform. You'd take a
> 30-question skill assessment, then submit two or three real coding tasks
> (small ones, takes ~30 min total), and finish with a 10-question mini
> re-check at 50% and a 30-question full re-check at the end. The whole
> loop is ~90 minutes spread however you want — you can pause anywhere
> between stages and resume. I need 10 completions before defense; the
> data drives the empirical chapter of my thesis.
>
> Login link (no signup required, I'll seed your account):
>   http://localhost:5173 (I'll send a tunnel URL — Ngrok / Cloudflare — when
>   you're ready)
>
> Credentials:
>   email: <yourname>@dogfood.codementor.local
>   password: (one-time, in DM)
>
> Want in?

---

## 4. Tracking spreadsheet (template — paste into Google Sheets)

Each volunteer is one row. Columns:

| Field | Type | Filled by |
|---|---|---|
| #, Name, Source | text | Omar at recruit |
| Track | text | Volunteer at Stage A |
| OnboardedAt | datetime | Omar after account seed |
| InitialScore | int (0-100) | Auto from `/admin/users/{id}` |
| PathSource (AIGenerated / TemplateFallback) | text | Auto from `LearningPath.Source` |
| TasksCompleted | int | Auto from `PathTasks` |
| MiniTakenAt | datetime | Auto from `Assessments` Variant=Mini |
| FullTakenAt | datetime | Auto from `Assessments` Variant=Full |
| FinalScore | int | Auto from Full assessment `TotalScore` |
| PrePostDelta | decimal | Computed (FinalScore - InitialScore) |
| AdaptationsApproved | int | Auto from `PathAdaptationEvents` LearnerDecision=Approved |
| AdaptationsRejected | int | Auto from `PathAdaptationEvents` LearnerDecision=Rejected |
| NextPhaseTaken (Y/N) | text | Auto if `LearningPath.Version >= 2` |
| LoopCompletedAt | datetime | Auto when reaches 100% |
| QualNotes | text | Volunteer feedback (verbal at debrief) |

Populate the auto fields nightly via the admin endpoint:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:5000/api/admin/dogfood-metrics > metrics-snapshot.json
```

The Tier-2 totals (overall pre→post delta, approval rate, etc.) drop right
into the thesis chapter §10 Empirical Results table.

---

## 5. Per-volunteer onboarding script (Omar — 5 min each)

For each volunteer:

1. Seed their user via `/admin/users` (or register through the UI on their
   behalf).
2. DM the credentials + the live URL.
3. Walk through Stage A and Stage B of `sprint-21-walkthrough.md` with
   them on a screen-share (~5 min). After Stage B they can run solo.
4. Add their row to the tracking sheet. Set `OnboardedAt`.
5. Set a 2-day follow-up reminder; if no submission activity after 48 h,
   send a friendly nudge with a calendar link.

---

## 6. Mid-loop nudges

- **24 h after onboarding, no submissions:** "Did you hit a blocker?
  Happy to pair on it."
- **At 50%:** "You unlocked the mini-reassessment — takes 10 minutes.
  Don't skip it, it's the most valuable telemetry I get from this loop."
- **At 100%:** "Last stretch — 30-question reassessment + the new-phase
  page is where the magic happens. Try to do it in one sitting."

---

## 7. Debrief (5 min each)

After each volunteer hits 100% + Next Phase:

1. 3-question sit-down (or async form):
   - "On a scale of 1-5, did the adaptation feel relevant to your scores?"
   - "What's the single feature you'd actually use again?"
   - "What surprised you most about the AI feedback?"
2. Capture the qualitative answers in the `QualNotes` column.
3. Verify their tracking row is fully populated — fill any auto fields the
   nightly run missed.

---

## 8. Honest-count fallback

If recruitment slips below 10 by 2026-08-15:

1. Run the admin metrics endpoint one final time and snapshot the totals.
2. In `progress.md`, write under M4 declaration:
   > "Dogfood completions: N of 10 target. Reasons for shortfall: <X>.
   > Tier-2 metrics computed on N learners (sample size noted in thesis)."
3. The thesis chapter §10 honest-defects section names the actual N.
4. **Do not** pad with fake or duplicate accounts. Plan locks the sample
   honesty before defense.

---

## 9. Post-defense

- Archive the Google Sheet to `docs/demos/dogfood-data-final.csv`.
- Keep the user accounts active for 30 days post-defense for any
  examiner follow-up questions.
- After 30 days, run `/admin/users/{id}/deactivate` on each dogfood
  account (preserves data + blocks login).
