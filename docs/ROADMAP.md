# Cognition — Product Roadmap

> Last updated: 2026-06-25
> Cross-referenced against: [PRD.md](./PRD.md)

---

## What Cognition Is

A heuristic first-pass review tool that checks AI-generated UI against published UX research, then hands teams a script to validate what matters with real humans. Every phase of this roadmap is measured against the six core principles in the PRD — epistemic honesty, citation over opinion, calibrated confidence, human-in-the-loop, local-first, knows its limits.

---

## Phase 0 — Foundation ✅ Shipped

The initial build established the full product loop.

| Area | What was built |
|---|---|
| **Upload + context** | Drag-drop / click / clipboard paste image input; design type, audience, and goal fields |
| **Analysis engine** | Mock heuristic generator producing findings tied to design type and audience; severity (critical / warning / info / pass) + confidence tiers (Deterministic / Heuristic / Speculative) with source citations |
| **Annotated design viewer** | Numbered region overlays on the uploaded image; heatmap toggle; active-finding highlight |
| **Results panel** | Findings list with evidence status; Cognitive principles tab; Audience lenses tab |
| **Evidence logging** | Per-finding validation dialog (confirmed / refuted / inconclusive, method, n=, notes) |
| **Test plan generation** | Structured usability test document compiled from findings; copy + Markdown download |
| **Interview rehearsal** | Archetype-based script iteration modal with self-critique checklist |
| **Session capture** | Live moderation recorder with observation tagging to findings |
| **Run history** | localStorage persistence; thumbnail grid; relative timestamps |
| **A/B comparison** | Side-by-side heuristic diff between two runs |
| **Patterns view** | Cross-run aggregation of repeated findings |
| **Export** | Full heuristic evaluation as Markdown |
| **Theme** | Light / dark mode via `next-themes` |

---

## Phase 1 — UX Polish ✅ Shipped (this session)

Addressed cognitive load and workflow friction before adding new features.

| Change | Problem solved |
|---|---|
| **Stepper relabelled** — "Upload design / PNG, JPG or screenshot" instead of "Generate UI / v0, Cursor…" | Step 1 shown as active when no image uploaded implied users needed to go generate a UI elsewhere |
| **Page heading on /new** | Users landed with no orientation — no title, no description of what would happen |
| **Context form restructured** — 2-column grid (type + audience), full-width goal textarea | 3 equal columns squished "Primary goal" to a single line (h-10) |
| **Goal suggestion chips** — 4 contextual goals per design type, auto-swap on type change | Blank textarea caused blank-page anxiety; users didn't know what to write |
| **Run analysis hint** | Disabled button gave no explanation; added "Upload a design above to get started" |
| **Accordion findings** — collapsed by default, expand on click with chevron | 10+ fully-expanded cards (~200px each) created a wall of content |
| **Sticky design viewer** | Design card grew to match the results panel height, leaving 200–400px of empty background |
| **Natural page scroll** | Fixed-height inner ScrollArea made the results panel feel cramped and hard to read |
| **Footer overlap fix** | `size-full` + `height: 100%` on root div collapsed `<main>` to 0px when combined with `mt-auto` on footer |
| **Equal column layout** | Results panel was narrower than the design viewer (1.05fr vs 1fr) |
| **Dismissible honesty banner** | Amber warning occupied 80px of permanent chrome on every analysis |
| **Recent runs sidebar** — subtitle "Pick up a past analysis", better empty state | "Recent runs" header alone didn't explain the sidebar's purpose |

---

## Phase 2 — Signal & Findability ✅ Shipped

The highest-impact items from PRD Tier 1 that don't require backend changes.

### 2.1 History Search + Filter `[SAFE]` — PRD §1.5 ✅ Shipped

**What was built**: Client-side full-text search by label/type/goal, plus sort and result-count chip, in [history.tsx](../src/app/pages/history.tsx). A user with 20 runs can find a specific checkout run by typing "checkout" — matches the original acceptance criterion.

---

### 2.2 Finding Priority / Triage Order `[CAREFUL]` — PRD §2.2 ✅ Shipped

**What was built**: `triageScore()` in [results-panel.tsx](../src/app/components/results-panel.tsx) — severity weight × confidence multiplier × unvalidated bonus — shown as a "Triage #N" badge per finding, findings list defaults to highest-score-first.

**Guardrail honored**: badge copy reads "Severity × Confidence tier, unvalidated findings prioritised. Not a prediction of user impact" verbatim — no business-impact claim.

---

### 2.3 Keyboard Shortcuts `[SAFE]` — PRD §2.4 ✅ Shipped

**What was built**: Global handler in [root.tsx](../src/app/layouts/root.tsx) (`N`/`H`/`P`/`C` page nav, plus an added `R` → `/responses`; `?` opens [keyboard-shortcuts-dialog.tsx](../src/app/components/keyboard-shortcuts-dialog.tsx)) and a findings-list handler in [results-panel.tsx](../src/app/components/results-panel.tsx) (`↑`/`↓` navigate, `Enter`/`Space` collapse, `E` opens the evidence dialog on the active finding).

---

## Phase 3 — Depth & Trust ✅ Shipped

Items from PRD Tier 2 that compound the tool's long-term value.

### 3.1 Evidence Trends on Patterns Page `[SAFE]` — PRD §2.3 ✅ Shipped

**What was built**: "Recurring failures" (principles flagged critical/warning across ≥ 3 runs) and "Validated across runs" sections in [patterns-view.tsx](../src/app/components/patterns-view.tsx), ranked by how often real users confirmed them.

**Deferred from original scope**: the per-principle severity timeline view was not built — recurring/validated aggregation shipped without it. Worth revisiting if teams start asking "is this getting worse over time," not before.

---

### 3.2 Real Image Analysis via Claude Vision `[CAREFUL]` — PRD §1.1 ✅ Shipped — architecture revised 2026-06-25

**What was built**: [claude-vision-analysis.ts](../src/app/components/claude-vision-analysis.ts) sends the uploaded image (base64) to Claude with a prompt that requires citing a real source per finding, capped to "medium"/"low" confidence (never "high" — Vision can't do deterministic measurement). Deterministic rules stay separate and programmatic. A distinct "live analysis" staged loading sequence replaces the mock delay when enabled.

**Security fix (2026-06-25)**: the original implementation read the Anthropic key from `VITE_ANTHROPIC_API_KEY`, which Vite inlines into the client bundle — anyone opening devtools on a deployed build could extract it. Fixed by moving the key fully server-side:
- [api/anthropic/[...path].ts](../api/anthropic/[...path].ts) — a Vercel Edge Function that holds `ANTHROPIC_API_KEY` (no `VITE_` prefix, never bundled) and proxies `/api/anthropic/*` to `api.anthropic.com`, attaching the key itself. Stateless pass-through — it doesn't persist or log request bodies, so this does not reintroduce cloud sync of user data (see "What We Are Not Building" below).
- [vite.config.ts](../vite.config.ts)'s dev-server proxy does the same thing locally via `loadEnv`, so `npm run dev` still works with zero extra setup.
- The client now carries only a non-secret feature flag, `VITE_ENABLE_LIVE_ANALYSIS`, checked via `isLiveAnalysisEnabled()` — it decides *whether to attempt* the call, never *how to authenticate* it.
- [vercel.json](../vercel.json) adds the SPA rewrite a static deploy needs for client-side routing.

**Guardrails** (unchanged):
- All AI-generated findings: Heuristic or Speculative confidence only
- Honesty banner stays regardless
- No framing that implies Claude "sees what users see"

**Success metric** (from PRD §4, not yet measured): >80% of findings differ meaningfully between a wireframe and a polished dashboard upload.

---

### 3.3 Sharable Read-Only Snapshot `[CAREFUL]` — PRD §3.2 ✅ Shipped

**What was built**: [snapshot-export.ts](../src/app/components/snapshot-export.ts) serializes a run into a self-contained `.html` file — inline CSS, all findings with sources, evidence log, confidence-tier key. Footer reads "Heuristic pre-screen only · Runs stay on your device — no cloud, no account," matching the guardrail verbatim.

---

### 3.4 Qualitative Coding & Export `[CAREFUL]` — new scope, distinct from 3.1 ✅ Shipped

**Problem**: `InterviewResponse` free text logged from real sessions has no way to be coded, aggregated, or exported. This is distinct from 3.1 "Evidence Trends Across Runs," which operates on `ResearchFinding`/`ValidationEvidence` (findings-level, cross-*run*) — this operates on response-level free text, human-coded, cross-*session*, with much lower n per code.

**What was built**:
- Multi-code tagging layer on `InterviewResponse` (`codes?: string[]`) in [response-store.ts](../src/app/components/response-store.ts), applied inline on `/responses` and during live session capture
- "Coding" tab ([coding-view.tsx](../src/app/components/coding-view.tsx)): raw-count frequency table, codes × verdict / codes × session cross-tabs
- "Quote bank" tab ([quote-bank.tsx](../src/app/components/quote-bank.tsx)): human-curated starring/pinning of responses, filterable by code
- Qualitative Markdown report export ([qual-report-export.ts](../src/app/components/qual-report-export.ts)) and CSV export ([csv-export.ts](../src/app/components/csv-export.ts), one boolean column per code)

**Guardrails honored**:
- Raw n always shown; `MIN_TREND_N = 3` in `coding-view.tsx` de-emphasizes (never suppresses) low-n cross-tab cells
- Frequency bars sized relative to the max count in the same table (`maxCountInTable`), never a share of the whole corpus
- Quote Bank star/pin is 100% human-applied — no automatic "best quote" scoring

---

### 3.5 Native Quantitative Instrumentation `[CAREFUL]` — new scope, distinct from 3.1 and 3.4 ✅ Shipped

**Problem**: 3.1 covers finding-level evidence trends across runs; 3.4 covers qualitative free-text response coding. Neither gives researchers a way to capture standardized quantitative measures (SUS/NPS/SEQ/satisfaction), first-click accuracy, task completion rates, or card-sort placements — Cognition's first deterministic-scoring-from-raw-human-input layer, structurally new (per-participant, per-instrument, per-analysis quantitative rows).

**What was built**:
- **3.5.1 Standardized scales** — `scales-store.ts` raw `ScaleResponse` rows (SUS/NPS/SAT/SEQ), `scoring.ts` pure scoring functions, captured via `LikertRow` in `/analysis/:id/instruments`'s Scales tab. SUS requires exactly 10 items or scores `null`. NPS/SEQ/SAT return raw-n sentinels, never fabricated zeroes.
- **3.5.2 First-click testing** — `first-click-store.ts` (`FirstClickTask`/`FirstClickAttempt`, pure `isHit()` helper); `annotated-design.tsx`'s new `viewMode: "annotations" | "heatmap" | "first-click" | "none"` enum (structurally exclusive with the Salience heatmap); live capture mounted in `session.tsx` with real participant ID + elapsed clock; aggregation ("N/M hit target, median Xs") in Instruments.
- **3.5.3 Task completion metrics** — `task-run-store.ts` (`TaskRun`); "Task mode" control cluster in `session-capture.tsx` (4 boolean toggles, SEQ 1–7, start/end clock, notes) as an additive sibling to free-text observation logging; raw-count aggregation per finding in Instruments with a persistent non-dismissible Nielsen (1994/2000) sample-size note.
- **3.5.4 Closed card sort** — `card-sort-store.ts` (`CardSortDeck`/`CardSortPlacement`); researcher deck authoring in Instruments; participant-facing click-to-assign sort screen mounted from `session.tsx`; card×category frequency table, explicitly labeled descriptive-only (no citation styling).

**Guardrails honored**:
- The fourth scale is `"SAT"` ("Satisfaction rating"), never "CSAT" — ships with no citation field, only a plain-language industry-convention note shown inline (not hover-only). SUS/NPS/SEQ each carry a real, specific citation (Brooke 1986; Reichheld 2003; Sauro & Dumas 2009).
- `session.tsx`'s plain `<img>` was replaced with a working `AnnotatedDesign` first-click capture surface before First-click testing was considered shippable — never gated on `analysis.tsx`-only functionality.
- No Confidence badge anywhere on scale/instrument results — this data is human-entered/human-observed, not AI-derived; the `Confidence` type stays scoped to `ResearchFinding`.
- SEQ relabeled correctly to the real 1–7 range (was previously an uncited 1–5 "Difficulty" field in the test-plan export) — `task-run-store.ts`'s `seqValue` matches.
- `human-testing.tsx` vendor buttons (Maze/Lyssna/UserTesting/Fable) now disclose the no-server architecture explicitly rather than reading as unfinished native features.

**Explicitly deferred** (would require Auditor review before adding): open card sort (emergent category naming), AI category clustering / "regenerate suggestions," full tree testing with a true directness metric, `AudienceLens.testMethod` deep-linking to instruments.

---

## Phase 4 — Platform (Exploratory)

Items from PRD Tier 3. Validate phases 2–3 first before committing.

| Item | Description |
|---|---|
| **Custom team heuristics** | Let teams define their own Deterministic rules (e.g. brand colour checks). Labeled "Team rule", not published research. |
| **Richer annotation layer** | When a finding is active, pulse the region bbox; allow users to manually draw a region and attach a note |
| **Mobile-responsive layout** | 🟢 Largely resolved — see Beta Readiness Pass below. Chrome (header nav) and the worst non-stacking grids (Compare, Instruments tabs) no longer break under ~640px. **Corrected 2026-07-14**: this line previously said card-sort had "no touch/pointer fallback" — re-checked against [card-sort-session.tsx](../src/app/components/card-sort-session.tsx) and that was stale; the shipped card sort is click-to-assign (no drag-and-drop was ever built), which already works on touch. `session.tsx`'s layout (`grid-cols-1 lg:grid-cols-[...]`) and `session-capture.tsx`'s control clusters (`flex-wrap` throughout) also already stack/wrap correctly below `lg`/narrow widths on code-level review. Not independently verified on a physical narrow device — flag if real usage surfaces a layout break. |
| **Keyboard-first moderation** | Session capture is currently mouse-only. Keyboard shortcuts for start/stop/tag would help facilitated sessions. |

---

## Beta Readiness Pass — 2026-06-25

Pre-beta audit surfaced one security blocker and a few honesty/UX gaps, scoped separately from the Phase 3.5 instrument tools. All four fixed same day:

| Item | Fix |
|---|---|
| **API key exposed to the browser** `[blocker]` | Live Vision analysis sent the Anthropic key client-side via `VITE_ANTHROPIC_API_KEY` — Vite inlines `VITE_*` vars into the production bundle, so anyone opening devtools on a deployed build could extract it. Moved the key fully server-side; see 3.2 above for the architecture. |
| **Non-functional "send to research platform" / "invite testers" buttons** | Both were demo stubs (`toast` only, no real action) in [human-testing.tsx](../src/app/components/human-testing.tsx). Vendor buttons now copy the script and open the real vendor site (`window.open`); invite now opens a `mailto:` compose window bcc'ing the entered addresses. Neither needed a backend — both were always achievable client-side. |
| **Header nav had no mobile fallback** | [root.tsx](../src/app/layouts/root.tsx)'s nav row (5 links + 2 icon buttons) had no wrap or scroll behavior and could overflow the page on narrow viewports. Parent row now wraps; nav itself scrolls horizontally as a fallback rather than breaking page layout. |
| **Non-responsive two-column grids** | `compare-view.tsx`'s side-by-side run images and `instruments.tsx`'s 4-wide tab list didn't collapse on narrow screens. Both now stack/wrap below `sm`. |

---

## What We Are Not Building

From PRD §5 — these are principle violations, not deferred items.

| Rejected | Why |
|---|---|
| Predicted user behaviour | Would require fine-tuned behavioural data we don't have |
| Conversion rate predictions | No causal link from heuristics to conversion without real testing |
| Team collaboration / cloud sync | Breaks local-first; adds auth complexity |
| Figma / Storybook plugins | Scope creep; validate the core loop first |
| "AI said users will…" framing | Violates epistemic honesty regardless of implementation |

**Note on the 3.2 Vercel proxy**: holding `ANTHROPIC_API_KEY` server-side is not "cloud sync" in the rejected sense above — the function is a stateless pass-through (no request bodies persisted or logged server-side); run data still lives only in the browser's `localStorage`. It exists to stop key theft, not to centralize user data.

---

## Summary View

```
Phase 0  Foundation            ████████████████████  ✅ Done
Phase 1  UX Polish             ████████████████████  ✅ Done
Phase 2  Signal & Findability  ████████████████████  ✅ Done
Phase 3  Depth & Trust         ████████████████████  ✅ Done
Phase 4  Platform              ████░░░░░░░░░░░░░░░░  💡 Exploratory (mobile largely resolved)
```

**Next action**: Phase 3.1's deferred severity-timeline view, keyboard-first moderation, or the `AudienceLens.testMethod` deep-link — whichever real beta-tester feedback asks for first. The mobile pass is no longer the blocker it was recorded as (see corrected row above). Everything else in Tiers 1–2 is shipped; don't commit further roadmap scope until usage signal comes back.

**2026-07-14 engineering-hygiene pass** (not a roadmap-scope item, but tracked here since it changes what "shippable" verifies): the project had zero `tsconfig.json`, no ESLint, and no test runner — `vite build` (esbuild) stripped types without ever checking them. Added `tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json` (strict), fixed the ~10 resulting type errors (including missing `@types/react`/`@types/react-dom`, which weren't installed at all), added ESLint (flat config, typescript-eslint + react-hooks) and fixed all resulting errors (unsafe `any` at JSON/prop boundaries, a no-op try/catch, a stale unmemoized effect dependency), and added Vitest with unit tests for the pure scoring/hit-testing/codebook helpers. `npm run typecheck` / `lint` / `test` / `build` all now exist and pass clean.
