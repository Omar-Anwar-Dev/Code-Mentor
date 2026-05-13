# Pillar 2 — How to preview locally

Same model as Pillar 1: needs an HTTP server (Babel can't `fetch()` JSX from `file://`), serves `index.html`, navigates via the top-right page-switcher pill.

## Start the server

```powershell
cd "D:\Courses\Level_4\Graduation Project\Code_Review_Platform\Code Mentor V1\frontend-design-preview\pillar-2-public-auth"
npx http-server . -p 5175 -c-1
```

**Port 5175** (not 5174) — so Pillar 1 can stay running for side-by-side comparison if you want.

Open: **http://localhost:5175/**

---

## The page switcher

Top-right corner. Default state: glass-frosted pill showing only the current page's icon + label. Click the ChevronLeft to expand → 7 buttons appear (Landing / Login / Register / GitHub Success / 404 / Privacy / Terms). Click any to navigate; `window.scrollTo(0)` runs automatically.

---

## Smoke test (5 minutes — covers all 7 pages)

### 1. Landing (default)
- Hero loads with "Senior-level code feedback in under **five minutes**" — "five minutes" in signature gradient
- AnimatedBackground orbs pulsing, grid overlay faint, 3 floating particles
- Click `Get started` → goes to Register
- Embedded code-annotation surface below the CTAs — line 3 (the `f"SELECT..."`) has the violet rail + mentor popover with SQL injection warning. **Same signature pattern as Pillar 1 § 15** — verifies the Landing reads as part of the same product.
- Scroll to **Features** — 6 cards in a 3-col grid, hover any: lifts -0.5y
- Scroll to **How it works** — 4 `glass-card-neon` cards. Hover any: rainbow border rotates around it (same effect as Pillar 1 § 5)
- Scroll to **Audit teaser** — faded gradient bg + F11 badge + 4 micro tiles
- Scroll to **Final CTA** — "senior?" in gradient text
- Footer: brand + supervisors + Privacy/Terms/GitHub links

### 2. Login
Click the page-switcher → Login.
- Glass card centered with brand logo above
- Email field shown in **error state** (red text "We couldn't find an account with this email.")
- Password field shown with **focus ring** already applied (violet halo)
- "Forgot password?" link in the password row
- Click **Sign in** or **Continue with GitHub** → navigates to GitHub Success (mock auth)

### 3. Register
Click → Register.
- Same AuthLayout
- Track selector: 3 cards in a row (sm+). Full Stack selected by default (violet border + bg-primary-50). Click another → it becomes selected.
- **Untick** the Privacy checkbox → the "Create account" button becomes disabled (greyed out)
- "Sign in" link at the bottom goes back to Login

### 4. GitHub Success
Click → GitHub Success. (Or arrive via Login/Register's CTA.)
- 80×80 rounded-2xl gradient logo with Sparkles inside, **pulsing softly** (glow-pulse animation)
- Small Github icon in a corner badge bottom-right of the logo container
- "Signing you in via GitHub…" headline + mono subline
- **Animated progress bar fills from 20% → 90%** then waits
- 3 badges below: handshake (processing) / PKCE (primary) / scope: user:email (cyan)
- Mono redirect note at the bottom

### 5. 404
Click → 404.
- Massive **"404"** in signature gradient (120-160px responsive)
- Sparkles icon (28px) floating beside it with violet drop-shadow glow
- "We couldn't find that page." headline + body
- 2 CTAs: "Go home" (gradient) + "Browse tasks" (glass)
- Mono breadcrumb: "requested: /this/path/does-not-exist"

### 6. Privacy
Click → Privacy.
- Glass header with title "Privacy Policy" + legal badge
- **Sticky TOC sidebar on the left** (hidden on mobile) with 8 numbered items
- **Scroll the main content** — the TOC's active item updates as you scroll
- Click a TOC item → smooth-scrolls to that section
- Content is **realistic legalese** — Azure SQL, Qdrant embeddings, OpenAI API contract, etc. (NOT Lorem ipsum)
- "Last updated: 2026-05-07" + Print button (top right)
- Footer: commit + Print + Contact buttons

Optionally: Ctrl+P to verify print CSS — chrome strips out, content reads as a clean white-background doc.

### 7. Terms
Click → Terms.
- Same shell as Privacy
- 9 sections this time (one extra: "Changes")
- Notable copy: section 8 "Liability" — "total liability… is limited to the fees you have paid us — which is $0 during the MVP and defense period"

---

## Cross-cutting checks (do once anywhere)

| Check | Expected |
|---|---|
| Theme toggle (Sun/Moon in nav OR auth-layout footer OR legal header) | Flips entire surface treatment cleanly, no flash |
| Mobile viewport (DevTools 375px) | Every page readable; LandingNav collapses to hamburger; legal pages hide TOC; track selector stacks 1-col |
| DevTools Console | Should show **no errors**. Warnings from Tailwind CDN + Babel runtime + favicon 404 are expected (same as Pillar 1) |
| `prefers-reduced-motion` in DevTools rendering tab | Animations should freeze — **except this is not yet implemented**, so animations will still play. Known omission, flag in walkthrough notes if you want it before approval. |

---

## After the walkthrough

Open [`../walkthrough-notes.md`](../walkthrough-notes.md), fill in the Pillar 2 section, then tell me:

- ✅ **"Approve Pillar 2"** — I'll write Pillar 3 prompt (Onboarding / Assessment: 3 pages)
- 🔁 **"Iterate Pillar 2 — [specific changes]"** — I'll revise the prompt for `claude.ai/design`
- ❌ **"Reject Pillar 2 — [direction issue]"** — we discuss

---

## Known limitations (preview-only)

- **Tailwind via Play CDN** — slower than a built Vite app. Don't judge production perf from this.
- **Babel runtime in-browser** — first paint has a 200-500ms delay while JSX gets transpiled. Normal.
- **`@property --a`** (used for the glass-card-neon spinning border in Journey section) needs Chrome 85+ / Firefox 128+ / Safari 16+. Fine for any modern browser.
- **GitHub Success progress bar never reaches 100%** — that's intentional, mimics a real loading state.
- **No real navigation** — the page switcher is the only way to move between pages; clicking links inside the pages (e.g., "Sign up" on Login) uses the same switcher under the hood.
