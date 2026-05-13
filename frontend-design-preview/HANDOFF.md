# Design Preview — Handoff

> **You are a new Claude Code session picking up an in-flight UI redesign for the Code Mentor project. This file is the quick-start. Read it first.**

---

## Current state (2026-05-12)

| Pillar | Pages | Status |
|---|---|---|
| 1 — Foundation (Design System Showcase) | 1 | ✅ APPROVED |
| 2 — Public + Auth | 7 | ✅ APPROVED (after 2 iteration rounds) |
| 3 — Onboarding (Assessment) | 3 | ✅ APPROVED (after 1 Results-rewrite iteration) |
| 4 — Core Learning | 5 | ✅ APPROVED (first-shot) |
| **5 — Feedback & AI ⭐ defense-critical** | **5** | **⏳ Next — write `prompts/pillar-5-feedback-ai.md`** |
| 6 — Profile & CV | 4 | 🔒 Blocked on 5 |
| 7 — Secondary | 4 | 🔒 |
| 8 — Admin | 5 | 🔒 |

**Authoritative status sources** (read these first when in doubt):
- `walkthrough-notes.md` — per-pillar approval history with iteration details
- `README.md` — progress tracker table

---

## The workflow (per pillar)

```
1. I write a detailed prompt   →   prompts/pillar-N-name.md
2. Omar opens claude.ai/design (same chat session across pillars) and pastes the prompt
3. claude.ai/design returns a tarball URL like
   https://api.anthropic.com/v1/design/h/<hash>?open_file=…
4. Omar pastes the URL with "Fetch this design file, read its readme, and implement…"
5. I run the setup script (below) to stage the bundle, fix the known issues,
   add a preview entry to .claude/launch.json, and start the preview
6. Live walkthrough on localhost:517N (port = 5174 + N, except N=1 used port 5174)
7. Omar says "Approve Pillar N" or "Iterate — [feedback]"
8. On approval: update walkthrough-notes.md + README.md, stop preview, move to next pillar
```

### Setup script (apply for every Pillar N output)

```bash
# 1. Stage HTML + src/ + vendor/ at the pillar root
cd "frontend-design-preview/pillar-N-name"
cp "code-mentor/project/<HtmlName>.html" "index.html"
cp -r "code-mentor/project/src" "./src"
cp -r "../pillar-1-foundation/vendor" "./vendor"

# 2. Concatenate ALL JSX modules into a single bundle (Babel scope-isolation fix)
#    Order: P1 primitives → P2 shared → P-N's shared → P-N's pages → P-N's app
cat src/icons.jsx \
    src/primitives.jsx \
    src/pa/shared.jsx \
    src/<pillar-folder>/shared.jsx \
    src/<pillar-folder>/<page1>.jsx \
    src/<pillar-folder>/<page2>.jsx \
    ... \
    src/<pillar-folder>/app.jsx \
  > src/bundle.jsx
```

### HTML edits (3 of them per pillar)

1. **Replace Tailwind CDN with vendored copy:**
   `<script src="https://cdn.tailwindcss.com"></script>` → `<script src="vendor/tailwind.js"></script>`

2. **Replace 4 unpkg CDN scripts (React/ReactDOM/Babel/Lucide) with vendored copies — and REMOVE the `integrity="sha384-..."` attributes** (claude.ai/design ships SRI hashes that don't match the real CDN file hashes; modern browsers refuse the scripts):

```html
<!-- before -->
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-..." crossorigin="anonymous"></script>
... (3 more like this for react-dom, babel, lucide)

<!-- after -->
<script src="vendor/react.js"></script>
<script src="vendor/react-dom.js"></script>
<script src="vendor/babel.js"></script>
<script src="vendor/lucide.js"></script>
```

3. **Collapse the N `<script type="text/babel">` source tags into one:**

```html
<!-- before: 5-10 separate babel scripts (icons, primitives, pa/shared, co/shared, dashboard, ...) -->
<!-- after: -->
<script type="text/babel" data-presets="react" src="src/bundle.jsx"></script>
```

### .claude/launch.json entry

Append to `configurations`:

```json
{
  "name": "pillar-N-preview",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["http-server", ".", "-p", "517N", "-c-1"],
  "cwd": "frontend-design-preview/pillar-N-name",
  "port": 517N
}
```

Port mapping (so far):
- 5174 — Pillar 1
- 5176 — Pillar 2 (5175 was occupied externally during P2)
- 5177 — Pillar 3
- 5178 — Pillar 4
- 5179 — Pillar 5 (next)

### Preview

```
mcp__Claude_Preview__preview_start({ name: "pillar-N-preview" })
mcp__Claude_Preview__preview_resize({ serverId, width: 1280, height: 800 })
```

Then verify with `preview_eval` and `preview_screenshot`. Known screenshot quirk: the screenshot tool sometimes times out or returns a stale frame after a `window.location.reload()` — fall back to `preview_eval` querying the DOM for verification.

---

## Hard rules (from owner, learned the hard way)

### 1. The Neon & Glass identity is non-negotiable

Violet primary (`#8b5cf6`) + Cyan secondary (`#06b6d4`) + Fuchsia accent (`#d946ef`) + signature 4-stop gradient + glass surfaces + neon utilities + Inter + JetBrains Mono. **Never propose a different palette, font, or aesthetic.** A prior `/ui-ux-refiner` pass got rolled back wholesale because it dropped these. See ADR-030 in `docs/decisions.md` for the full context.

### 2. Mirror the canonical structure

Starting with Pillar 2, the owner has been explicit: each page must match the structure of the corresponding file in `frontend/src/features/{X}/{Y}.tsx`. Same widgets, same sections in the same order, same content categories. The Neon & Glass identity is applied **on top** — do NOT invent new sections, do not merge widgets, do not drop sub-areas.

When writing a pillar prompt: read the original `.tsx` files first, then describe each page section-by-section with explicit "same as canonical" anchoring.

### 3. Owner is OK with vertical scroll on content-rich pages

The "no-scroll" rule applied to focused-task pages: Login, Register (Pillar 2), Assessment Question (Pillar 3). For content pages (Dashboard, Learning Path, Results, Project Details, etc.), scroll is expected and fine.

### 4. Mock data must be realistic AND consistent across pages

- Mock user: **Layla Ahmed** / layla.ahmed@benha.edu / Level 7 / 1,240 XP / Full Stack track
- The in-progress task throughout: **"React Form Validation"** (so Dashboard NEXT UP + Learning Path #4 + Project Details + Task Detail all show the same task)
- Track: **Full Stack** (with 7 tasks)
- Course staff (in footer): "Instructor: Prof. Mostafa El-Gendy · TA: Eng. Fatma Ibrahim"
- Public GitHub repo: https://github.com/Omar-Anwar-Dev/Code-Mentor
- No fake user counts, no emoji in UI text (except where explicitly noted), no SaaS-template lookalikes

### 5. Prompt file format

Use **4 backticks** for the outer code block in `prompts/pillar-N-name.md` (the prompt content contains nested 3-backtick code blocks — outer 3 would close early). Pillar 3 hit this bug; Pillars 4+ avoid it.

---

## Known pitfalls (don't re-debug these)

| Symptom | Root cause | Fix |
|---|---|---|
| Page is blank, `#root` empty, no obvious console error | SRI hashes from claude.ai/design don't match real unpkg hashes | Remove `integrity="..."` attributes from the 3 unpkg `<script>` tags |
| `ReferenceError: useState is not defined` / `Section is not defined` / etc. from inside JSX | Babel's in-browser transform isolates each `<script type="text/babel">` block in its own scope, AND emits colliding `_excluded` helpers across files | Concatenate all JSX modules into a single `src/bundle.jsx` and use exactly ONE `<script type="text/babel" src="src/bundle.jsx">` |
| Page works in IDE preview panel but blank in user's Brave/Chrome | Bitdefender Online Threat Prevention blocks unpkg.com / cdn.tailwindcss.com | Vendor everything to `vendor/` — Pillar 1 has the canonical set (`react.js`, `react-dom.js`, `babel.js`, `lucide.js`, `tailwind.js`), reuse via `cp -r ../pillar-1-foundation/vendor ./vendor` |
| Prompt copies only half when pasted into claude.ai/design | The prompt contains a nested triple-backtick code block (e.g., ```python ... ```), which closed the outer wrapper early | Use 4-backticks for the outer wrapper. See `prompts/pillar-3-onboarding.md` for the working example. |
| Screenshot tool times out | Intermittent preview-tool quirk after `window.location.reload()` | Fall back to `preview_eval` querying the DOM. Retry screenshot after a navigation click. |
| Foreground JSX `<` parsing issue | An edit removed a closing `</div>` and broke the JSX without throwing an obvious error | Re-read the surrounding file with `Read`, count opening vs closing tags, fix. |

---

## Files you should NOT touch

- `frontend/` — the real production code. Lives outside this workspace. Sprint-13 integration will eventually copy approved pillar output into it, but **not in this design-preview phase**.
- `docs/PRD.md`, `docs/architecture.md`, `docs/implementation-plan.md`, `docs/decisions.md`, `docs/progress.md` — these are the project's source-of-truth docs. Only update if the owner asks.
- Anything under `.claude/` other than appending one new entry to `launch.json` per pillar.

---

## Picking up: write Pillar 5 prompt

Pillar 5 is the **defense-critical** one. 5 pages, all heavy on the AI-feedback surface:

1. **Submission Form** — GitHub URL / ZIP upload
2. **Submission Detail** — the signature surface: per-category scores radar + inline annotations + **FeedbackPanel + MentorChatPanel side-by-side**
3. **Audit New** — F11 project audit form (6 required fields + 3 optional)
4. **Audit Detail** — 8-section structured audit report
5. **Audits History** — paginated list

Canonical files to mirror:
- `frontend/src/features/submissions/SubmissionDetailPage.tsx`
- `frontend/src/features/submissions/FeedbackView.tsx` (or `FeedbackPanel.tsx`)
- `frontend/src/features/submissions/SubmissionForm.tsx`
- `frontend/src/features/mentor-chat/MentorChatPanel.tsx`
- `frontend/src/features/audits/AuditNewPage.tsx`
- `frontend/src/features/audits/AuditDetailPage.tsx`
- `frontend/src/features/audits/AuditsHistoryPage.tsx`

Pillar 1 § 15's "code annotation pattern" is the visual signature for the Submission Detail page. Reuse that exact composition (violet rail on flagged line + mentor popover with Apply suggestion CTA) but anchor it to real inline annotations from a sample submission.

---

## When you (the new session) start

1. Read **this file** + `walkthrough-notes.md` + `README.md` (in that order)
2. If the owner says **"Write Pillar 5 prompt"** → write `prompts/pillar-5-feedback-ai.md` following the pattern in Pillars 2-4, 4-backticks wrapper, mirror-canonical directive, full per-page structure breakdown
3. If the owner says **"Fetch this design file…"** → run the setup script above (WebFetch → tar -xzf → cp + cat → 3 HTML edits → launch.json entry → preview_start → verify)
4. If the owner says **"Approve Pillar N"** → update `walkthrough-notes.md` + `README.md`, stop the preview, write the next pillar's prompt

That's the rhythm. The earlier pillars in this workspace are good references for every step.
