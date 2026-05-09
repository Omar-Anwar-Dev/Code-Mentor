# UI/UX Refiner Backup — 2026-04-27

This folder contains pre-edit copies of every file modified during the UI/UX polish pass.

## How to roll back

**One file:**
```bash
cp .ui-refiner-backup-2026-04-27/<relative-path> <relative-path>
```

**Everything (PowerShell, from frontend/ directory):**
```powershell
Get-ChildItem -Path .ui-refiner-backup-2026-04-27 -Recurse -File |
  Where-Object { $_.Name -ne 'MANIFEST.md' } |
  ForEach-Object {
    $rel = $_.FullName.Substring((Resolve-Path .ui-refiner-backup-2026-04-27).Path.Length + 1)
    Copy-Item $_.FullName -Destination $rel -Force
    Write-Host "Restored: $rel"
  }
```

**Everything (bash):**
```bash
cd .ui-refiner-backup-2026-04-27 && find . -type f ! -name MANIFEST.md -exec sh -c 'cp "$1" "../$1"' _ {} \;
```

**Git alternative** — if you prefer to revert to last commit instead of pre-pass state:
```bash
git restore <file>
```

## Modified files

(Updated as the pass progresses.)

| File | Change | Notes |
|---|---|---|
| `index.html` | Replaced Inter + JetBrains Mono with Geist + Geist Mono (variable axis, Google Fonts CDN). Updated title + meta description. | Foundation |
| `tailwind.config.js` | Full rewrite. Dropped `primary`/`secondary`/`accent`/`dark.*` ladders. Added 24 semantic CSS-var-backed tokens, Geist font stack, fontSize semantic scale, tight radii (4/6/8/12/16), shadow vars, motion tokens, restricted animations to fade-in + slide-up. | Foundation |
| `src/shared/styles/globals.css` | Full rewrite. ~590 lines → ~210. Removed all glassmorphism variants (`.glass-card`, `.glass-card-neon`, etc.), all neon utilities, all gradient classes, all keyframes (shimmer/neon-pulse/neon-flicker/neon-border-rotate/glow-pulse/float). Kept only single restricted `.glass` for header/sidebar/modal, `.scrollbar-thin`, `text-balance/pretty` utilities. Added CSS var blocks for `:root` and `.dark`, focus-visible style, `prefers-reduced-motion` handler. | Foundation |
| `src/shared/components/ui/Button.tsx` | Rewritten. 5 modern variants (primary/secondary/outline/ghost/danger). Legacy variants (gradient/neon/glass) silently fall back to primary. Tighter `rounded-sm` (6px), `transition-colors duration-fast`, semantic tokens. | UI primitives |
| `src/shared/components/ui/Input.tsx` | Rewritten. Semantic tokens, ARIA invalid + describedby wiring, password toggle button has aria-label. | UI primitives |
| `src/shared/components/ui/Card.tsx` | Rewritten. 3 variants (default/bordered/elevated). Glass/neon variants fall back to default. `rounded-md`, `shadow-sm`. Keyboard activatable when `onClick`. | UI primitives |
| `src/shared/components/ui/Badge.tsx` | Rewritten. New `special` variant for fuchsia (gamification). All variants use semantic-soft tokens. | UI primitives |
| `src/shared/components/ui/LoadingSpinner.tsx` | Rewritten. Token-driven, role/aria-live status, simpler PageLoader. | UI primitives |
| `src/shared/components/ui/Modal.tsx` | Rewritten. Glass backdrop (per design system allowance), `rounded-lg`, `shadow-lg`, ease-spring entry. | UI primitives |
| `src/shared/components/ui/ProgressBar.tsx` | Rewritten. Token-driven fill, slimmer (h-1/1.5/2 vs h-1.5/2.5/4). Tabular-nums for percentage. | UI primitives |
| `src/shared/components/ui/Tabs.tsx` | Rewritten. Bordered tab list, semantic tokens, smaller height (h-8). | UI primitives |
| `src/shared/components/ui/Toast.tsx` | Rewritten. Solid bg-elevated with semantic-color border, role+aria-live, dark-mode parity, dismiss button accessible. | UI primitives |
| `src/components/ui/index.ts` | Converted to compat shim — re-exports from `@/shared/components/ui`. Allows 29 pages importing from old path to receive new components without import-path refactor. | Compat shim |
| `src/components/common/index.ts` | Converted to compat shim — re-exports from `@/shared/components/common`. | Compat shim |
| `src/shared/components/layout/AppLayout.tsx` | Rewritten. `bg-bg` (auto-flips dark/light), max-width container on `<main>`, semantic spacing. | Global shell |
| `src/shared/components/layout/Header.tsx` | Rewritten. Replaces dicebear avatar with initials-on-tinted-surface. Drops gradient logo (now solid accent square with "C"). Drops gradient sign-in button. Page title from prefix-match table. Semantic tokens, glass utility (allowed here). | Global shell |
| `src/shared/components/layout/Sidebar.tsx` | Rewritten. Solid surface on desktop (`bg-bg-subtle`), glass on mobile overlay only. Drops gradient logo. Active nav uses `bg-accent-soft text-accent-soft-fg`. Theme toggle is plain ghost button (no gradient). `rounded-sm` instead of `rounded-xl`. | Global shell |
| `src/shared/components/layout/AuthLayout.tsx` | Rewritten. Drops the 4-stat gradient hero (heavy 2020 SaaS trope) — replaced with editorial 5/7 split: left has logo + tagline + 3 bullet points + Benha University credit (Stripe-letterhead voice); right is the auth form on `bg-bg`. | Global shell |
| `src/app/router/index.tsx` | Inline 404 div replaced by `<NotFoundPage />` mounted inside `AppLayout` so the global shell stays. NotFoundPage import added. | Global shell |
| `src/features/errors/NotFoundPage.tsx` | Token migration. Imports from `@/shared/components/ui` (was `@/components/ui`). Drops `text-primary-500` for `text-fg-subtle` on icon, semantic typography tokens, Card.Body wrapping. | Global shell |
| `src/features/auth/pages/LoginPage.tsx` | Rewritten. Drops "Demo Learner/Admin" toggle (sprint-3 demo helper that should not ship to defense). Drops gradient mobile logo (now in AuthLayout). Replaces `variant="gradient"` button with `variant="primary"`. Replaces `variant="glass"` GitHub button with `variant="secondary"`. ARIA roles on alert + separator. Adds autoComplete attributes. | Tier 1 |
| `src/features/auth/pages/RegisterPage.tsx` | Rewritten. Same patterns as LoginPage — drops gradient logo + gradient title + gradient/glass buttons. Adds password helperText, autoComplete, semantic alert role on terms validation error. | Tier 1 |
| `src/features/dashboard/DashboardPage.tsx` | Rewritten. Drops gradient text on user name + 👋 emoji in welcome. Drops 4 rainbow-gradient stat cards (replaced with clean `accent-soft` icon tile). Drops `Card variant="glass"` × 7 sites. Drops gradient "NEXT UP" banner (replaced with `bg-accent-soft border-accent/20`). Drops gradient quick-action cards (clean accent-soft tile that fills on hover). Token migration throughout. Replaces `text-danger-600` (broken — no `danger` palette in old config) with proper `text-error`. | Tier 1 |
| `src/features/landing/LandingPage.tsx` | Wholesale rewrite — 671 → 270 LoC. Removed: `AnimatedBackground` (gradient orbs + grid + floating particles), Pricing section (conflicted with PRD §2.3 — pricing is explicitly post-MVP), fake "10,000+ learners" social proof and 5 gradient avatar dots, gradient CTA section with full-bleed gradient + grid pattern bg, bloated 4-column footer. Kept: Navigation, simple Hero with code preview, clean Features grid, 4-step Journey, simple CTA, single-line footer with Benha credit. | Tier 1 |
| `src/features/submissions/SubmissionDetailPage.tsx` | Rewritten. Status banner uses semantic-soft tokens with bordered surface. Timeline uses smaller dots + tabular-nums timestamps. Token migration throughout. | Tier 1 |
| `src/features/submissions/FeedbackPanel.tsx` | Targeted edits (file is 657 LoC; legacy aliases handle most token mapping). Radar chart fill switched from hardcoded `#6366f1` violet to `rgb(var(--score-good))` emerald with `--chart-grid` and `--chart-axis` tokens. Repeated-mistake notice's `⚠` emoji replaced with AlertTriangle icon. SeverityIcon component switched from `text-primary-500` to `text-info` for info severity. | Tier 1 (hero surface) |
| `src/features/learning-cv/LearningCVPage.tsx` | Targeted edit — radar chart fill switched from hardcoded `#3b82f6` blue to `rgb(var(--score-good))` emerald with chart-grid/chart-axis tokens. | Tier 1 |
| `src/features/learning-cv/PublicCVPage.tsx` | Targeted edits — radar fill token-driven; "Verified Projects" stat tile icon switched from `text-purple-500` to `text-accent`. | Tier 1 |
