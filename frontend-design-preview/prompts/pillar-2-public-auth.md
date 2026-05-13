# Pillar 2 — Public + Auth: 7 pages

**How to use this file:** Copy the entire prompt below (everything inside the triple-backtick block) into a session at https://claude.ai/design.

**Important context:**
- **Pillar 1 was approved 2026-05-12** after live walkthrough. The identity, tokens, components (Button × 8 variants, Card × 5 variants, Badge, Field/Input, Modal, Toast, Section), the AnimatedBackground component, and the code-annotation pattern from Pillar 1 are now CANONICAL. This pillar must produce visual output consistent with Pillar 1.
- If you can paste this in the **same `claude.ai/design` session** you used for Pillar 1, do that — the tool will already remember the identity. Otherwise, paste it as a new session; the prompt below recaps everything it needs.

After delivery, save the output into `pillar-2-public-auth/`, then tell me **"Pillar 2 output is ready"** and we'll set up the preview server.

---

```
You are continuing the design of Code Mentor — an AI-powered code review and learning platform. The visual identity is "Neon & Glass" and it is already DEFINED and APPROVED. This session designs the seven Public + Auth pages.

# 1. Product context (recap)

Code Mentor is an AI-powered platform where self-taught developers and CS students get senior-level code review feedback in under 5 minutes. They submit code (GitHub URL or ZIP), receive multi-layered feedback (per-category scores, inline annotations, follow-up mentor chat), and accumulate a verifiable Learning CV. Three services: React/Vite frontend, ASP.NET Core 8 backend + Hangfire, Python/FastAPI AI service (OpenAI + static analyzers + Qdrant vector store). Final-year graduation project, 7-person CS team at Benha University, defending September 2026.

# 2. Identity (canonical — already approved in Pillar 1, do not deviate)

## 2.1 Colors

- Primary (Violet) — main accent, ~60% usage. Ladder: 50 #f5f3ff, 100 #ede9fe, 200 #ddd6fe, 300 #c4b5fd, 400 #a78bfa, 500 #8b5cf6, 600 #7c3aed, 700 #6d28d9, 800 #5b21b6, 900 #4c1d95, 950 #2e1065
- Secondary (Cyan) — ~25%. 400 #22d3ee, 500 #06b6d4, 600 #0891b2
- Accent (Fuchsia) — ~15%, celebration only. 400 #e879f9, 500 #d946ef, 600 #c026d3
- Signature gradient: `linear-gradient(135deg, #06b6d4 0%, #3b82f6 33%, #8b5cf6 66%, #ec4899 100%)` — used on hero CTAs, brand logo container, animated card border hover. One per surface max.
- Semantic: Success Emerald #10b981, Warning Amber #f59e0b, Error Red #ef4444, Info Cyan
- Surfaces: light bg #f8fafc; dark bg radial gradient `linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%)` with `background-attachment: fixed`
- Neutrals: Tailwind slate ladder

## 2.2 Typography

- Inter (variable axis, Google Fonts) — body / UI. Font-feature-settings: cv02, cv03, cv04, cv11.
- JetBrains Mono (variable axis, Google Fonts) — code / numeric / tabular
- Heading scale: h1 36/48px, h2 30/36px, h3 24/30px, h4 20/24px — all semibold, tracking-tight (-0.025em)
- Body: 15/16px regular. Small: 13/14px.

NO Geist, NO Roboto, NO other fonts.

## 2.3 Surfaces (Glass system, 5 variants — same as Pillar 1)

- `.glass` — chrome glass: `bg-white/70 dark:bg-neutral-800/30 backdrop-blur-xl border border-white/20 dark:border-white/10`. Used on sticky headers, nav.
- `.glass-card` — default card surface
- `.glass-card-neon` — same with hover-only conic gradient border (cyan→violet→fuchsia rotating)
- `.glass-frosted` — thicker blur for modals/sheets
- `.glass-shimmer` — animated 30deg highlight sweep (rare, celebration only)

Border radii: cards 16px (rounded-2xl), buttons md/lg 12px (rounded-xl), buttons sm 8px (rounded-lg), badges/pills/avatars full circle.

## 2.4 Neon system (accents only — same as Pillar 1)

- `shadow-neon` / `-cyan` / `-purple` / `-pink` / `-green` — multi-stop box-shadows
- `text-neon-*` — text-shadow variants
- `glow-sm/md/lg` — soft violet halos (dark mode only)
- Animations: `neon-pulse` (2s), `glow-pulse` (2s), `animate-float` (6s y-bob), `shimmer` (3s sweep). Use sparingly — never on body text, never on routinely-viewed surfaces.

## 2.5 Components (from Pillar 1 — assume they exist and reuse them)

**Button** — 8 variants × 3 sizes:
- variants: primary (violet-500 solid) / secondary (cyan-500) / outline / ghost / danger / **gradient** (signature 4-stop, lifts on hover) / **neon** (cyan→blue, hover cyan glow) / **glass**
- sizes: sm (h-8 px-3, rounded-lg), md (h-10 px-4, rounded-xl), lg (h-12 px-5, rounded-xl)
- props: leftIcon, rightIcon, loading (Loader2 spinner), disabled, fullWidth

**Card** — 5 variants: default / bordered / elevated / **glass** (`.glass-card`) / **neon** (`.glass-card-neon` with hover conic gradient). Has Card.Header (px-5 pt-5 pb-3) / Card.Body (px-5 py-3) / Card.Footer (px-5 pt-3 pb-5).

**Badge** — 8 tones: neutral / success / processing / failed / pending / primary / cyan / fuchsia. Props: glow, pulse, icon.

**Field** — wraps inputs with label (above), helper text or error (below, red).

**TextInput** — base + glass variants, optional prefix icon, error state with red border.

**Select** — custom popover with outside-click close, slide-up animation, `glass-frosted` dropdown.

**Modal** — centered, max-w-520px, `glass-frosted` surface + `glow-md` halo, `bg-black/50 backdrop-blur-sm` backdrop, ESC closes, focus-trap, auto-focus first focusable.

**Toast** — 4 tones (success/error/warning/info), glass surface, stacked top-right.

**Section** — shell wrapper: max-w-7xl mx-auto px-6 lg:px-10 py-16 sm:py-20, with eyebrow + title + description.

**AnimatedBackground** — 3 gradient orbs (violet/cyan/fuchsia, blur-3xl, animate-pulse with staggered delays), grid overlay (64px×64px, 4-6% alpha), 3 floating particles. `pointer-events-none`.

## 2.6 Icons

Lucide-react. 16/20/24px for sm/md/lg. Stroke 2.

# 3. Deliverables — 7 pages

Each page is its own React component. Save them as separate files in `src/pages/`. Compose them all into a single `app.jsx` that renders the active page based on a simple useState-based router (no react-router needed for preview) — show a fixed top-right page-switcher pill so we can click between pages in the walkthrough.

All pages: light AND dark mode both render correctly. Mobile responsive (320px → 1024px). Use the components defined in Pillar 1 (re-define them inline in this file's primitives section if needed — same API).

## 3.1 Landing — `/`

The public marketing home. The single most important page in this pillar.

### Page chrome
- Top nav (`.glass`, sticky, h-16, fixed top):
  - Left: brand logo container (rounded-xl, 40×40, signature gradient bg) with `<Sparkles>` lucide icon inside (20px, white) + "CodeMentor AI" wordmark (Inter semibold, signature-gradient text via `bg-clip-text`)
  - Center: anchor nav links "Features", "How it works", "For students", "Project Audit" — hidden on mobile, visible md+
  - Right: theme toggle (Sun/Moon) + "Sign in" ghost link + "Get started" gradient button. On mobile: hamburger.

### Hero section (full viewport height ish, AnimatedBackground behind)
- Eyebrow pill (`.glass` rounded-full, small): `<Sparkles size=12>` + "AI-powered code review · 2026"
- H1 (48-72px depending on viewport, tracking-tight, semibold): "Senior-level code feedback in under **five minutes**." (the words "five minutes" use the signature gradient via `bg-clip-text`)
- Sub-headline (18-20px, neutral-600 / neutral-300 dark, max-w-2xl, leading-relaxed): "Submit your code, get multi-layered AI review with inline annotations, then keep iterating with the mentor chat. Built for self-taught developers and CS students who want to ship like seniors."
- CTAs row: primary "Start free assessment" (gradient, lg, leftIcon Sparkles, rightIcon ArrowRight) + secondary "Try project audit" (outline, lg, leftIcon ScanSearch)
- Below CTAs: a small trust strip — "Built by a 7-person CS team at Benha University · defending Sept 2026" in neutral-500 mono small. **Do NOT invent user counts or testimonials.**

### Features section (id="features")
6 feature cards in a 3-column responsive grid (1 col mobile, 2 col tablet, 3 col desktop). Each card is `.glass-card` with hover lift. Layout per card: 40×40 rounded-xl bg-primary-500/10 with lucide icon centered (24px, primary-500), then h3 title (20px, semibold), then 2-line body (14px, neutral-600/300).

The 6 features:
1. **Adaptive Assessment** (icon: BookOpen) — "30 questions that adapt to your level. Discover your strengths and gaps in 40 minutes, then get a personalized learning path."
2. **Multi-layered Code Review** (icon: ScanSearch) — "Static analyzers (Bandit, ESLint, Cppcheck...) + LLM architectural review, unified into per-category scores and inline annotations."
3. **Inline Annotations** (icon: MessageSquare) — "Mentor comments appear inline, anchored to the exact line. Click to see the suggestion, apply it, or ask the mentor a follow-up."
4. **RAG-Powered Mentor Chat** (icon: Sparkles) — "Ask the mentor about your code. Answers are grounded in your actual submission — chunked, embedded, retrieved per query."
5. **Personalized Learning Path** (icon: Map) — "An ordered sequence of real coding tasks tuned to your weakest categories. Replace one with an AI-recommended task anytime."
6. **Shareable Learning CV** (icon: Trophy) — "A verifiable, public profile of your scored submissions. A data-backed alternative to course-completion certificates."

### How it works section (id="journey")
A 4-step horizontal journey (vertical stack on mobile). Each step in a `.glass-card-neon` (hover the 2nd or 3rd to demonstrate the rainbow border). Steps:
1. **Take the assessment** (BookOpen icon) — "30 adaptive questions. ~40 minutes. We measure your level across 5 categories."
2. **Get your path** (Map icon) — "An ordered list of real tasks tuned to where you're weakest. Start with the one we recommend."
3. **Submit your code** (Code icon) — "GitHub URL or ZIP. We run static analysis + AI review in under 5 minutes."
4. **Iterate with the mentor** (MessageSquare icon) — "Ask follow-up questions. Resubmit. Build your Learning CV as you go."

Between steps on desktop: a small chevron-right separator.

### Project Audit teaser section
Full-width band, background uses signature gradient at 8-12% opacity (faded), with a centered card on top:
- Eyebrow: "F11 · standalone"
- H2: "Already have a project? Get an instant audit."
- Body: "Skip the assessment. Upload a GitHub repo or ZIP plus a short description, and the AI returns an 8-section structured audit — overall score, security review, completeness against your description, and a top-5 prioritized fix list."
- CTA: "Audit my project" (gradient lg button, leftIcon ScanSearch)

### Final CTA section
- H2 centered: "Ready to ship like a senior?"
- Subline: "Free during the defense window. No credit card."
- Two CTAs centered: gradient "Create account" + glass "Sign in instead"

### Footer
Solid surface (not glass — the boundary of the page). Border-top neutral-200/dark:white/5.
- Left: brand logo (smaller) + brand line "Code Mentor — Benha University Faculty of Computers and AI · Class of 2026" + supervisor credits "Supervisors: Prof. Mohammed Belal · Eng. Mohamed El-Saied"
- Right: column of legal links (Privacy / Terms) + social icons (Github only — link to https://github.com/Omar-Anwar-Dev/Code-Mentor)
- Bottom: mono small "commit · 2026-05-12"

## 3.2 Login — `/login`

### Layout
`AuthLayout`: full-page with the `AnimatedBackground` behind. Centered card, max-w-md (28rem), `.glass-card`. Above the card, brand logo (rounded-xl gradient, 56×56). Below the card, "Back to home" ghost link + theme toggle (small).

### Card content
- H1 (28px, semibold, tracking-tight): "Welcome back."
- Subline (14px, neutral-500): "Sign in to continue your learning path."
- Stack:
  - `<Field label="Email">` with `<TextInput type="email" placeholder="you@university.edu">` 
  - `<Field label="Password">` with `<TextInput type="password">` + a "Forgot password?" link on the right side of the label row (small, primary-600)
  - Primary CTA full-width: "Sign in" (gradient, lg, rightIcon ArrowRight)
- Divider: thin line + "or continue with" centered (text-xs, neutral-500)
- GitHub OAuth button full-width: "Continue with GitHub" (glass variant, lg, leftIcon Github lucide icon)
- Bottom of card: "Don't have an account? **Sign up**" — Sign up is a primary-600 link

### Accessibility & states
Show the Email field in an *error state* for the walkthrough (red border, error text "We couldn't find an account with this email"). Show the Password field in a *focused state* (primary-500 ring).

## 3.3 Register — `/register`

Same layout as Login (AuthLayout, AnimatedBackground, centered card, glass-card, max-w-md, logo above, theme toggle below).

### Card content
- H1: "Create your account."
- Subline: "Free during the defense window. Takes less than a minute."
- Stack:
  - `<Field label="Full name">` with `<TextInput placeholder="Layla Ahmed">`
  - `<Field label="Email">` with `<TextInput type="email" placeholder="you@university.edu">`
  - `<Field label="Password" helper="At least 8 characters, with a number.">` with `<TextInput type="password">` 
  - Track selector — 3 radio cards in a 3-column responsive grid (1 col on mobile, 3 col on sm+):
    - **Full Stack** (icon: Code) — "React + .NET" — selected state shows primary-500 border + ring + bg-primary-50/10
    - **Backend** (icon: ScanSearch) — "ASP.NET + Python" — unselected
    - **Python** (icon: BookOpen) — "Data + Web" — unselected
  - Privacy checkbox: small `<input type="checkbox">` + label with "Privacy" + "Terms" links inline
  - Primary CTA full-width: "Create account" (gradient, lg, rightIcon ArrowRight)
- Divider + "or continue with" + GitHub OAuth button (glass, lg, leftIcon Github)
- Bottom: "Already have an account? **Sign in**"

## 3.4 GitHub OAuth Success — `/auth/github/success`

A loading / handoff screen. Full viewport with `AnimatedBackground`, centered card glass-card max-w-md.

### Card content (stacked, centered text)
- Animated brand logo container (rounded-2xl 80×80, signature gradient, `animate-glow-pulse`) with `<Sparkles size=36 color=white>` inside
- H2: "Signing you in via GitHub…"
- Subline (small, neutral-500, mono): "Capturing your access token securely…"
- A subtle progress indicator below — a horizontal bar with `animate-pulse` filling at signature gradient, OR a small spinner.

Below the card (outside it): a tiny mono note "You should be redirected automatically. If nothing happens after 5 seconds, **click here to continue.**" (the "click here" is a primary-600 link)

## 3.5 Not Found — `/404`

Full-page centered content over `AnimatedBackground`. No sidebar / nav chrome — just a brand logo at the top-left fixed (no nav). Use one centered column.

### Content (centered, max-w-lg)
- Large "404" number — h1 sized at 144px, **signature gradient text** via `bg-clip-text text-transparent`, semibold, tracking-tighter. Slightly slanted? No — keep it upright, with a small float animation on `Sparkles` (lucide, 24px) just to the right of the "4" first digit.
- H2: "We couldn't find that page."
- Subline (16px, neutral-600/dark:300): "It might've been moved, deleted, or maybe the URL has a typo. Try the homepage or browse the task library."
- CTA row: "Go home" (gradient, lg, leftIcon Home) + "Browse tasks" (glass, lg, leftIcon ClipboardList)
- Optional: a small mono breadcrumb note below — "requested: /this/path/does-not-exist"

## 3.6 Privacy Policy — `/privacy`

Content-heavy page. Uses a different layout — `AppLayout` chrome (sidebar collapsed icon-only on the left, header on top, footer below) — but since we haven't designed the sidebar yet (Pillar 4 will), for THIS preview just use a simplified version:

- Top header bar (`.glass`, sticky, h-16) with: brand logo (left) + "Privacy Policy" page title (center, h4) + theme toggle (right). No sidebar in this preview.
- Two-column layout below the header:
  - Left column (sticky, w-64, max-h-screen): a Table of Contents — section headings as anchor links, primary-500 active state
  - Right column: the content, max-w-3xl

### Content sections
Each section is a `<section id="...">` with an h2 + paragraphs. Generate plausible-looking placeholder legal text (realistic length: 2-3 paragraphs per section) for the 8 sections below. Do NOT use Lorem ipsum.

1. **Overview** — what the platform is, who runs it, contact email
2. **Data we collect** — account info, submission code, assessment answers, usage analytics
3. **How we use your data** — to provide reviews, to improve the AI, to operate the service
4. **Where your data lives** — Azure SQL, Azure Blob, Qdrant, OpenAI (note: code is not used for OpenAI training per their API contract)
5. **Who can see your code** — only you and the AI service unless you explicitly publish a Learning CV
6. **Cookies & analytics** — we use httpOnly cookies for sessions only, no third-party tracking
7. **Your rights** — view, edit, delete your account; data portability via JSON export (post-MVP)
8. **Contact** — email + link to the GitHub repo issues

At the top of the right column, show: "Last updated: 2026-05-07" + a small "Print" ghost button (small, leftIcon Printer).

## 3.7 Terms of Service — `/terms`

Same layout as Privacy. Same TOC pattern.

### Content sections

1. **Acceptance** — by using the platform you agree to these terms
2. **Service description** — what we provide and what we don't
3. **Account responsibilities** — keep credentials safe, no sharing, no impersonation
4. **Acceptable use** — no abuse of AI quota, no automated scraping, no malicious code submissions
5. **Intellectual property** — your code stays yours; we get a license to process it for your reviews
6. **AI limitations** — feedback is AI-generated, may contain mistakes, is not a substitute for professional code review or audit
7. **Availability** — best-effort during defense window, no SLA; we may pause non-critical features for cost
8. **Liability** — limited to fees paid (which is $0 during the MVP / defense period)
9. **Changes** — we may update these terms; material changes notified by email

Same "Last updated" + Print row at the top.

# 4. Page switcher (preview only)

In your `app.jsx`, render a small fixed pill (top-right corner, on top of all pages) with 7 small buttons: Landing / Login / Register / GitHub Success / 404 / Privacy / Terms. Clicking each switches the rendered page via useState. Style the switcher itself as a `.glass-frosted` rounded-full pill with small ghost buttons inside; the active button gets a primary-500 bg. This is so the walkthrough can navigate without a router.

# 5. Output format

Same as Pillar 1:
- A single runnable HTML page (`Public-and-Auth.html` or similar) that loads React + Babel + lucide from CDN OR via local relative paths to `vendor/` (you can assume vendor/ exists with the same files as Pillar 1: react.js, react-dom.js, babel.js, lucide.js, tailwind.js).
- Bundle all the JSX into a single `<script type="text/babel" src="src/bundle.jsx">` — last time the runtime broke because separate `<script type="text/babel">` blocks don't share scope under in-browser Babel.
- React 18 + functional components + Tailwind classes
- All custom CSS (.glass, .glass-card, .glass-card-neon, .glass-frosted, .glass-shimmer, .shadow-neon-*, .text-neon-*, .glow-*, brand-gradient-bg, brand-gradient-text, bg-grid, animations) defined in an inline `<style>` block, same as Pillar 1.
- Theme toggle: same wiring as Pillar 1 (`useState` + `useEffect` that toggles `dark` class on `document.documentElement`).
- Mock data: realistic. Use a fixed user "Layla Ahmed" for any context-needing UI (e.g., user menu placeholder on Landing if logged-in state shown). No Lorem ipsum, no marketing fluff.
- Inter + JetBrains Mono loaded from Google Fonts at the top of the HTML.

# 6. Anti-patterns (DO NOT do these)

- Do NOT invent user counts ("10,000+ learners") or fake testimonials. The product is pre-defense; the trust signal is the team + supervisors + Benha + the defense date.
- Do NOT add emoji in UI copy.
- Do NOT use any color outside the brand trio + semantics.
- Do NOT replace Inter / JetBrains Mono with any other font.
- Do NOT use generic stock illustrations or cartoony avatars. If a placeholder avatar is needed, render initials on a signature gradient circle.
- Do NOT make the Landing page feel like a SaaS template (Linear / Vercel / Notion / Stripe lookalikes). The brand is alive + technical + alive — accent-rich, not accent-light.
- Do NOT skip the AnimatedBackground on the Landing hero, auth pages, GitHub Success, or 404 — it's the brand signature.
- Do NOT put the brand trio EVERYWHERE on a single page — discipline matters. Use violet as the dominant, cyan + fuchsia as accents.
- Do NOT scope-creep the pages. Stay strictly within the 7 listed. If you want to add something cool (e.g., a pricing page), DON'T.

# 7. Acceptance criteria (what I'll check during walkthrough)

- All 7 pages render and the page switcher works
- Theme toggle works on every page
- AnimatedBackground visible on Landing hero + Login + Register + GitHub Success + 404
- Landing has all 6 sections (hero, features × 6, how-it-works × 4 steps, audit teaser, final CTA, footer)
- Login + Register cards look like part of the same product as the Design System Showcase from Pillar 1 (same glass-card surface, same Button variants, same Field/Input components)
- Privacy + Terms have realistic-looking legal copy (not Lorem ipsum), sectioned with a sticky TOC, the Print button visible
- Mobile viewport (320-375 px) — every page readable, nothing overflows, sections stack
- WCAG AA contrast on every text-on-bg combination, both modes
- No console errors

Deliver as a runnable HTML + bundled JSX, same architecture as Pillar 1.
```

---

## After you have the output

1. Save to `pillar-2-public-auth/`. The HTML file goes in the root of that folder; the JSX bundle in `pillar-2-public-auth/src/`; you can reuse `vendor/` from Pillar 1 by symlinking or copying — I'll handle that during preview setup.
2. (Optional) Screenshot all 7 pages in both modes → `pillar-2-public-auth/screenshots/`.
3. Tell me **"Pillar 2 output is ready"** and I'll wire up the preview server on port 5175 (so it doesn't collide with Pillar 1 still running on 5174).

## Tips for the `claude.ai/design` session

- **Reuse the same session as Pillar 1 if possible** — the tool will have the Neon & Glass identity in its working memory, output will be faster + more consistent.
- If it asks "should I add a [pricing / blog / newsletter] section to Landing?" → say **no**, those aren't in the brief.
- If Login/Register start to look like Vercel/Linear lookalikes → push back: *"Make these look like the Design System Showcase from Pillar 1 — same glass-card surface, same gradient CTA, same brand presence. Right now they feel generic."*
- Watch the **Landing hero specifically** — it's the highest-stakes screen in this pillar. The headline gradient on "five minutes" should pop. If the CTAs end up small or unfocused, ask for them to be larger and visually anchored.
- The **404 page** is a high-personality opportunity — the 144px gradient "404" should feel intentional, not generic.
