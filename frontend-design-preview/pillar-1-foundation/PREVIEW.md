# Pillar 1 — How to preview locally

## Why you need an HTTP server (not file://)

The showcase loads its JSX from `src/*.jsx` via Babel's runtime transformer in the browser. Babel uses `fetch()` to pull those files, and modern browsers block `file://`-origin `fetch()` calls for security. So opening `index.html` directly in a browser by double-click **will fail** with CORS errors in DevTools.

**Solution:** serve the folder over HTTP on `localhost:5174`. Three easy ways, pick whichever you have.

---

## Option 1 — Node `npx http-server` (recommended, fastest)

You already have Node installed (the project uses Vite). Open PowerShell and run:

```powershell
cd "D:\Courses\Level_4\Graduation Project\Code_Review_Platform\Code Mentor V1\frontend-design-preview\pillar-1-foundation"
npx http-server . -p 5174 -c-1
```

- `-p 5174` — explicit port so it never collides with the real `frontend/` running on 5173.
- `-c-1` — disables caching so edits to JSX are picked up on reload (useful when we iterate).
- First run downloads `http-server` (~3 sec). Subsequent runs start instantly.

Open: **http://localhost:5174/** in any modern browser (Chrome / Edge / Firefox).

Stop with `Ctrl+C` in PowerShell.

---

## Option 2 — Python (if installed)

If Python 3 is on your `PATH`:

```powershell
cd "D:\Courses\Level_4\Graduation Project\Code_Review_Platform\Code Mentor V1\frontend-design-preview\pillar-1-foundation"
python -m http.server 5174
```

Open: **http://localhost:5174/**

Stop with `Ctrl+C`.

---

## Option 3 — VS Code "Live Server" extension

If you have it installed:

1. Open VS Code at `frontend-design-preview/pillar-1-foundation/`
2. Right-click `index.html` → **Open with Live Server**
3. Note the port it picks (usually `5500`) — open that URL in your browser

---

## What to check during the walkthrough

Open both modes, both viewports, key interactions. Use the checklist in [`../README.md`](../README.md#live-walkthrough-checklist-run-for-every-pillar) and capture findings in [`../walkthrough-notes.md`](../walkthrough-notes.md).

### Quick smoke test (2 minutes)

1. Page loads — no console errors in DevTools.
2. Click the Sun/Moon icon in the top-right of the nav — both modes render correctly, no broken colors.
3. Scroll to **Section 5 — Cards**. Hover the last card ("Capstone score · 94/100"). The conic-gradient rainbow border should rotate around it.
4. Scroll to **Section 9**. Click "Open modal". The frosted modal appears with focus trapped — press Esc to close.
5. Scroll to **Section 15 — Code annotation**. Line 4 should have a violet left rail and a round mentor icon in the gutter. The mentor popover should be open by default with the SQL injection suggestion.

### Full walkthrough (15 minutes)

Walk every section, check the boxes in `walkthrough-notes.md`. Things to watch for specifically:

| Where | What |
|---|---|
| Hero (§ 1) | Three blurred orbs pulsing at different rates. Grid overlay visible faintly. 3 floating particles. |
| Colors (§ 2) | All three brand ladders visible. Signature gradient card bottom. |
| Typography (§ 3) | h1 visibly larger than h2. Code block has 4 colors (violet keywords, emerald strings, cyan functions, slate-italic comments). |
| Buttons (§ 4) | 8 rows × 3 columns matrix. The "gradient" variant uses the signature cyan→pink. The "neon" variant uses cyan→blue. |
| Glass (§ 11) | Five cards each with a different glass treatment. Hover `.glass-card-neon` to see the conic rainbow border. |
| Neon (§ 12) | Three columns. Vintage Neon label in the third column actually flickers. |
| Annotation (§ 15) | The mentor popover has the "Apply suggestion" gradient button and a confidence score. |

### Things that may NOT work (known limitations of the runtime preview)

- **No Tailwind purge.** The CDN runtime applies classes on the fly — performance is slightly less crisp than a built Vite app. Don't judge final perf from this.
- **No `prefers-reduced-motion` handling** (the brief asked for it; not implemented in this iteration — flag it in walkthrough notes if you want it added before approval).
- **Babel transforms on each load** — first paint may have a 200-500ms delay while JSX gets transpiled in the browser. Normal.
- **`@property --a`** (used for the glass-card-neon spinning border) needs Chrome 85+ / Firefox 128+ / Safari 16+. Should be fine on your machine.

---

## After the walkthrough

Open [`../walkthrough-notes.md`](../walkthrough-notes.md) and fill in the Pillar 1 section. Then tell me one of:

- ✅ **"Approve Pillar 1"** — I'll start writing the Pillar 2 prompt (Public + Auth: Landing, Login, Register, etc.).
- 🔁 **"Iterate Pillar 1 — [specific changes]"** — I'll revise the prompt for `claude.ai/design` and we re-run.
- ❌ **"Reject Pillar 1 — [direction issue]"** — we discuss the brief and what needs to change.

---

## Troubleshooting

**Port 5174 already in use:**
Pick another port (5180, 5181, etc.) — just be consistent: `npx http-server . -p 5180 -c-1`.

**`npx` says "package not found":**
Install Node from https://nodejs.org/ first. Or use Python option above.

**Page loads but blank / console error like "Loading module from … was blocked":**
You opened the file directly via `file://`. Close that tab, use the HTTP URL `http://localhost:5174/`.

**Fonts look like Times New Roman:**
Google Fonts is being blocked (firewall / ad-blocker). The page falls back to `system-ui` — typography still readable but not branded. Disable the blocker for `localhost`.

**Icons missing (small squares):**
Lucide CDN blocked. Check DevTools Network tab — same firewall issue. Page still functions; icons just won't render.
