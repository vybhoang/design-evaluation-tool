# Heurizztik — Figma Design System: Component Coverage Map

Source of truth: `quant-qual-ui-ux` codebase (React 18 + Vite + Tailwind v4 + Radix/shadcn + react-router 7). All paths below verified to exist via direct file reads on 2026-07-14. Figma target: `Heurizztik Tool` (fileKey `QLfwAmITT6zJzc3TOXLZBS`) — currently a blank file (`Page 1`, empty canvas), confirmed live via the Figma desktop MCP connection.

Legend: **C** = Compose (reuse as-is) · **A** = Adapt (rework needed) · **N** = Net-new (no code precedent)

---

## 1. App shell

| Component | Path | Class | Notes |
|---|---|---|---|
| Root layout (header/nav/footer/theme toggle) | `src/app/layouts/root.tsx` | A | Sticky header w/ NavLink pills, serif wordmark, footer with external links + disclaimers trigger. No dedicated logomark — wordmark only. |
| Router / route table | `src/app/routes.tsx` | — | Not a visual component; defines the 10 screens below. |
| Global shortcuts overlay | `src/app/components/keyboard-shortcuts-dialog.tsx` | C | Plain Dialog + kbd list. |
| Disclosures dialog | `src/app/components/disclosures-dialog.tsx` | C | Plain Dialog + static list. |
| Disclosure banner (dismissible) | `src/app/components/disclosure-banner.tsx` | C | Simple inline banner w/ icon + dismiss. |
| Onboarding tour overlay | `src/app/components/tour-overlay.tsx` | A | Spotlight/backdrop-cutout + positioned card, portal-rendered. Fully coded (positioning math, steps) but is a system-level interaction overlay, not a static screen — needs bespoke Figma prototyping (e.g. component with spotlight variants) rather than a straight visual port. |
| Tour step content | `src/app/components/tour-config.ts` | — | Data only, no UI. |

## 2. Screens (routes)

| Route | File | Class | Notes |
|---|---|---|---|
| `/` Landing | `src/app/pages/landing.tsx` | A | Marketing-style page: hero, 3-step explainer, sample finding card, testimonial, stats/CTA. Unique layout, not reused elsewhere. |
| `/new` New analysis | `src/app/pages/home.tsx` | A | Upload canvas + context form + recent-runs rail; assembles DesignCanvas + WorkflowStepper. |
| `/analysis/:id` Analysis results | `src/app/pages/analysis.tsx` | A | Two-column: AnnotatedDesign + ResultsPanel, page pager, action bar. |
| `/analysis/:id/session` Moderate session | `src/app/pages/session.tsx` | A | SessionCapture + AnnotatedDesign (first-click mode) + findings checklist. |
| `/analysis/:id/instruments` Instruments | `src/app/pages/instruments.tsx` | A | 5-tab shell (Scales / First-click / Task completion / Card sort / Empathy map) — Tabs primitive is Compose, the assembly is Adapt. |
| `/history` Runs | `src/app/pages/history.tsx` | A | Filter/sort toolbar + card grid, hover actions. |
| `/patterns` | `src/app/pages/patterns.tsx` | A | Stat rail + stacked bar chart (recharts) + aggregate cards grouped in 3 sections. |
| `/compare` | `src/app/pages/compare.tsx` | A | Run pickers + CompareView. |
| `/responses` | `src/app/pages/responses.tsx` | A | 4-tab shell (Log / Coding / Quotes / Evidence) with filter pills, grouping, per-row code/tag popovers. Densest screen in the app. |
| `*` Not found | `src/app/pages/not-found.tsx` | N | Currently just "404" text + a button — no illustration/art exists in code. A real 404 state is a legitimate net-new design opportunity. |

## 3. Feature components (non-`ui/`)

| Component | Path | Class | Notes |
|---|---|---|---|
| DesignCanvas (upload dropzone + context form) | `src/app/components/design-canvas.tsx` | A | Drag/drop/paste zone, AI-suggested goal chips, analyzing-state button. |
| WorkflowStepper | `src/app/components/workflow-stepper.tsx` | A | 3-step numbered/icon progress control, no shadcn precedent. |
| AnnotatedDesign (image canvas w/ pins, heatmap, first-click) | `src/app/components/annotated-design.tsx` | A | Most complex custom instrument — numbered severity pins, radial-gradient heatmap, crosshair region-draw mode, Toggle group overlay. High rework effort to reproduce as static Figma states. |
| ResultsPanel | `src/app/components/results-panel.tsx` | A | Score bars, severity filter chips, finding cards (collapsible), 3 tabs (Heuristics/Principles/Humans), test-plan generator dialog. |
| SessionCapture | `src/app/components/session-capture.tsx` | A | Live recording state, question chips, tag/code popovers, embedded Task-mode sub-panel. |
| CodingView | `src/app/components/coding-view.tsx` | A | Stat cards + 2 custom data tables (code×verdict, code×session). |
| ValidationDialog | `src/app/components/validation-dialog.tsx` | C | Standard form dialog (RadioGroup + Input + Textarea). |
| CompareView | `src/app/components/compare-view.tsx` | A | Score-delta rows, per-finding diff list with kind badges. |
| InterviewRehearsal | `src/app/components/interview-rehearsal.tsx` | A | Dialog with editable question list + synthetic Q&A transcript. |
| EmpathyMapView | `src/app/components/empathy-map-view.tsx` | A | 4-quadrant (Says/Thinks/Does/Feels) matrix — NN/g format, bespoke grid. |
| HumanTestingPanel | `src/app/components/human-testing.tsx` | A | Script textarea + vendor handoff buttons + email invite form. |
| PatternsView charts/cards | `src/app/components/patterns-view.tsx` | A | recharts stacked bar + trend-indicator cards, mini per-run timelines. |
| EvidenceView | `src/app/components/evidence-view.tsx` | C | Simple card list. |
| QuoteBank | `src/app/components/quote-bank.tsx` | C | Card list grouped by code, star toggle. |
| CardSortView (wrapper) | `src/app/components/card-sort-view.tsx` | C | Composition only. |
| CardSortSession | `src/app/components/card-sort-session.tsx` | A | Card→category chip-assignment interaction. |
| CardSortFrequency | `src/app/components/card-sort-frequency.tsx` | A | Custom card×category frequency table. |
| CardSortDeckEditor | `src/app/components/card-sort-deck-editor.tsx` | C | Textarea-based form. |
| TaskCompletionView | `src/app/components/task-completion-view.tsx` | A | Metric grid per finding (completion/hesitation/SEQ/time). |
| FirstClickView | `src/app/components/first-click-view.tsx` | A | Task list + region-definition flow on top of AnnotatedDesign. |
| ScalesView | `src/app/components/scales-view.tsx` | A | SUS/NPS/SAT/SEQ composite form using LikertRow, each with its own scored summary card. |
| LikertRow | `src/app/components/likert-row.tsx` | C | Small reusable numbered radio-row control. |
| HistoryDrawer | `src/app/components/history-drawer.tsx` | C | Sheet + list, standard pattern (currently appears unused by any page but fully coded). |
| ImageWithFallback | `src/app/components/figma/ImageWithFallback.tsx` | C | Thin `<img>` wrapper with error fallback. |

### Non-visual (excluded from the component map — state/logic only, no rendered UI of their own)
`store.tsx`, `history-store.ts`, `empathy-map-store.ts`, `claude-vision-analysis.ts`, `codebook-store.ts`, `validation-store.ts`, `disclosure-store.ts`, `card-sort-store.ts`, `task-run-store.ts`, `first-click-store.ts`, `scales-store.ts`, `scoring.ts`, `csv-export.ts`, `qual-report-export.ts`, `snapshot-export.ts`, `response-store.ts`, `analysis-data.ts`, and the three `*.test.ts` files.

## 4. UI primitives (`src/app/components/ui/*`) — all Compose

Standard shadcn/Radix primitives (cva-driven variants), 1:1 mappable to well-known Figma component patterns. 46 files confirmed present. **Actively used** in the app today: `button`, `card`, `badge`, `dialog`, `input`, `label`, `textarea`, `select`, `tabs`, `popover`, `separator`, `tooltip`, `toggle`, `radio-group`, `sheet`, `scroll-area`, `command` (via combobox), `chart` (recharts wrapper, used in `patterns-view`). **Present but not currently wired into any page** (still worth building for system completeness, lower priority): `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `breadcrumb`, `calendar`, `carousel`, `checkbox`, `collapsible`, `context-menu`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `progress`, `resizable`, `sidebar`, `switch`, `table`, `toggle-group`. Plus two non-visual helpers: `utils.ts` (`cn()`), `use-mobile.ts` (hook).

One custom composite worth flagging separately: **Combobox** (`src/app/components/ui/combobox.tsx`) — not stock shadcn, a bespoke free-text + searchable-list control built from Popover+Command, styled to match SelectTrigger exactly (per its own code comment). Class: **A**.

## 5. Net-new (no code precedent — needs full design)

- **Logomark / app icon** — only a `font-serif` text wordmark ("Heurizztik") exists anywhere in the code or repo; no favicon, no icon asset, no `public/` image directory found at all.
- **404 illustration** — current state is plain text; no art asset exists to port.
- **Empty-state illustrations** — every empty state in the app (`No analyses yet`, `No runs yet`, `No responses logged yet`, etc.) is muted text only, no illustration.
- **Dedicated mobile layouts** — Tailwind responsive utility classes (`sm:`, `lg:`) exist throughout, but there are no distinct mobile-first mockups to reference; mobile breakpoints would need to be designed from the utility hints, not ported from a visual source.

---

## 6. Visual language — extracted tokens (with source files)

### Color
Source: `src/styles/theme.css` (CSS custom properties, light + `.dark` block), consumed via `@theme inline` into Tailwind color utilities.

- Core: `--background` `#ffffff`, `--foreground` `oklch(0.145 0 0)`, `--primary` `#030213` (near-black indigo), `--primary-foreground` white, `--secondary` `oklch(0.95 0.0058 264.53)`, `--muted` `#ececf0`, `--muted-foreground` `#717182`, `--accent` `#e9ebef`, `--destructive` `#d4183d`, `--border` `rgba(0,0,0,0.1)`, `--input-background` `#f3f3f5`, `--ring` `oklch(0.708 0 0)`.
- Chart palette: `--chart-1`…`--chart-5` (5 distinct oklch hues), used by `patterns-view.tsx`'s stacked bar chart.
- Sidebar sub-palette: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` (sidebar component is present but currently unused on any page).
- Full parallel dark-mode palette in `.dark {}`, with layering comments (background deepest → card → popover, each step lighter).
- **Not tokenized in code, but should become semantic color variables in Figma**: severity/verdict colors are hardcoded Tailwind palette utilities scattered across components rather than CSS variables — critical/destructive = `red-400/500/600/700` (e.g. `annotated-design.tsx`, `results-panel.tsx`), warning = `amber-400/500/600/700/900`, info = `blue-400/500`, pass/success/confirmed = `emerald-500/600/700`, first-click mode accent = `violet-400/500/600`, heatmap gradient stops = red→orange→yellow radial (`annotated-design.tsx` lines ~183–187). Recommend formalizing these as a `semantic/*` variable collection even though the code itself never centralized them.

### Typography
Source: `src/styles/fonts.css`, `src/styles/theme.css` (`@layer base` element defaults).

- Body/UI font: **Inter** (400, 500, 600), loaded via Google Fonts `@import`.
- Display/serif accent font: **Fraunces** (optical-size axis 9..144, weights 400/500/600), applied via `.font-serif` utility — used for all headings/wordmark/quotes, often mixed with italic for emphasis (see `landing.tsx`).
- Only two font-weight CSS vars are defined: `--font-weight-medium: 500`, `--font-weight-normal: 400` (applied to h1–h4, label, button, input by default in `@layer base`). Components separately reach for Tailwind's `font-semibold`/`font-bold` utilities directly in a few spots (e.g. `coding-view.tsx` `Stat`, `compare-view.tsx` `ScoreCmp`) — these bypass the two CSS vars, so treat "semibold/bold" as an additional in-use weight even though it isn't formally tokenized.
- Base font size `--font-size: 16px` on `html`; heading sizes reference Tailwind's default type scale (`text-xs` through `text-6xl`) rather than custom values.

### Spacing & radius
Source: `src/styles/theme.css` (`@theme inline` block).

- `--radius: 0.625rem` (10px) base, derived scale: `--radius-sm` = radius−4px (6px), `--radius-md` = radius−2px (8px), `--radius-lg` = radius (10px), `--radius-xl` = radius+4px (14px).
- Spacing otherwise uses stock Tailwind 4px-increment scale (`gap-1`…`gap-8`, `p-2`…`p-12`) — no custom spacing tokens defined.

### Icons
Source: `lucide-react@0.487.0`, used exclusively across every component (no other icon set present).

- Sized via Tailwind `size-*` utilities, almost always `size-3` through `size-6` (12–24px); a couple of larger one-offs (`size-8`) for empty-state icons.
- Stroke width is the Lucide default (2) everywhere except one explicit override: `Upload` icon in `design-canvas.tsx` uses `strokeWidth={1.5}`.

---

## 7. Proposed Figma build order (per your spec)

1. **Variable collections** — `color/primitive` (the raw oklch/hex values above) + `color/semantic` (background/foreground/primary/…/destructive + the untokenized severity/verdict colors formalized) + light/dark modes; `radius` and `spacing` sizing collections.
2. **Text styles** — Inter body scale (xs→2xl) × weights (400/500/600 normal, 600/700 semibold/bold where actually used) + Fraunces display scale (xl→6xl, incl. italic variant).
3. **Effect styles** — shadow tokens implied by `shadow-sm`/`shadow-md`/`shadow-lg`/`shadow-xl`/`shadow-2xl` utility usage (dialogs, tour card, sticky finding popover), plus the heatmap radial-gradient fill as a reusable style.
4. **Component sets** — one per Net-new item first (logomark, 404 art, empty-state illustrations, mobile layouts), then the Adapt list in section 3, then the full Compose primitive library.
5. **Full-screen prototypes** — all 10 routes in section 2, plus the two dialog-heavy overlay states (tour, keyboard shortcuts) as separate frames since they're system-level, not page-level.

---

*All paths above were confirmed to exist via direct file reads against the connected repo folder on 2026-07-14. No files were assumed from memory.*
