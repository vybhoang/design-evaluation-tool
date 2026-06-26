# Plan: Native Quantitative UX Research Instrumentation

> Produced by the Brainstorm → Planner → Auditor agent pipeline (`.claude/agents/`).
> **Audit verdict**: PASS WITH CONDITIONS. All three required fixes are folded directly into the plan below (marked **[Audit fix]**), not left as a separate addendum.
> **Context**: the user has confirmed real human participants will be recruited once Cognition is deployed — this instrumentation captures real data, not synthetic. Cognition remains one-moderated-participant-at-a-time, local-first, no server, no accounts.

**Effort estimate**: XL (>1 day total — phased; each phase individually S–L, each phase independently shippable)
**PRD section**: New scope — not covered by any existing PRD §. Closest analogues are §2.1 (Structured Test Plan Export, already shipped) and the Phase 3.4 Qualitative Coding precedent for store/view conventions.
**Principle verdict**: CAREFUL — safe in substance, contingent on the three audit fixes below being enforced verbatim, not just noted.

---

## Resolution of the four open questions (binding for this plan)

**1. IA placement.** An **"Instruments" button next to "Moderate session" on `analysis.tsx`**, routed at `/analysis/:id/instruments` — not a new global nav item. `/analysis/:id/session` already has no nav entry; Instruments follows that precedent (a per-analysis tool, not a new top-level data domain like Patterns/Responses).

**2. SEQ relabel.** Cheap, immediate, ships in Phase A step 1, independent of everything else. `results-panel.tsx`'s existing blank `- **Difficulty (1 = effortless, 5 = gave up)**: ___` becomes `- **SEQ — Single Ease Question (1 = very difficult, 7 = very easy; Sauro & Dumas, 2009)**: ___`. This also corrects the scale range from the old non-standard 1–5 to the real SEQ's 1–7 — framed as a citation fix (the field was never actually cited as SEQ before), not a methodology change.

**3. `human-testing.tsx` vendor stubs.** **Relabel, don't cut.** "Copy script" and "invite via email" stay untouched (they're real, if manual, workflows). The four vendor buttons (Maze/Lyssna/UserTesting/Fable) get an explicit architecture disclosure: caption changes from *"Stubs for now — connect your account to enable real handoff"* to *"Cognition has no server — these open your own account on each platform. Nothing is sent automatically."* Ships in Phase A so the honesty gap doesn't sit next to newly-real instrumentation for the duration of Phases B–D.

**4. `AudienceLens.testMethod` deep-link.** **Deferred, not in this plan.** Wiring free-text method names (`"First-click test"`, etc.) to actually open the matching instrument requires either fragile string-matching or a typed-union restructure of `testMethod` that ripples into `generateTestPlan()` and `human-testing.tsx`. Revisit once all four instruments exist and ship.

---

## Data changes

Four new localStorage-backed stores, all following the existing `KEY = "cognition.<name>.v1"` + try/catch load/save pattern (`codebook-store.ts` precedent):

- **`scales-store.ts`** — `ScaleResponse = { id, createdAt, analysisId, participantId, scale: "SUS"|"NPS"|"SAT"|"SEQ", itemId: string, value: number }`. Raw Likert items only — **comment on the type: "never store a precomputed score, raw items only — scoring.ts derives the score on read."** One row per item per participant per scale per analysis.

  **[Audit fix #1 — Check 2, required]**: the fourth scale is named **`"SAT"` (Satisfaction rating), not `"CSAT"`.** The audit found that citing Fornell et al. (1996) next to a single-item satisfaction question is citation-adjacent, not citation-accurate — Fornell describes the ACSI *composite-index* methodology, not the single-item "how satisfied were you" question this instrument actually asks. Renaming away from "CSAT" (which implies a standardized, peer-reviewed instrument on par with SUS/NPS/SEQ) removes the false equivalence. UI and store both use "Satisfaction rating (single-item, industry convention)" — no citation is attached implying peer-reviewed status. This is reflected in `scoring.ts` below and in Step A7.

- **`scoring.ts`** — pure functions, no localStorage I/O: `scoreSUS(items: number[]): number | null`, `scoreNPS(values: number[]): { promoters, passives, detractors, score }`, `scoreSAT(values: number[]): number | null`, `scoreSEQ(values: number[]): { mean, n }`. Each exports a co-located `SCALE_CITATIONS` entry:
  - SUS = Brooke (1986), *"SUS: A 'quick and dirty' usability scale"* — **established**.
  - NPS = Reichheld (2003), *"The One Number You Need to Grow,"* HBR — **established**.
  - SEQ = Sauro & Dumas (2009), CHI '09 — **established**.
  - **[Audit fix #1, continued]** Satisfaction rating = **no citation field at all** — `SCALE_CITATIONS.SAT` is explicitly `{ label: "Satisfaction rating", note: "Single-item, industry convention — not a peer-reviewed instrument. No published source is cited because none applies to this exact metric." }`. This is a stronger fix than the original "weaker citation, shown inline" plan — the audit's point was that a hedged citation still borrows credibility it isn't owed, so this fix removes the citation rather than softening it.
  - Returns `null` / zero-n sentinel for empty input, never a fabricated zero. `scoreSUS` requires exactly 10 items or returns `null` (no partial-set averaging).

- **`first-click-store.ts`** — `FirstClickTask = { id, analysisId, taskLabel, targetRegion: {x,y,w,h}, createdAt }` (human-confirmed, stored completely separately from `ResearchFinding.region`, never merged) + `FirstClickAttempt = { id, taskId, participantId, x, y, t, hit, createdAt }`. `hit` computed via a pure exported `isHit(point, region): boolean` point-in-rect helper, reusable by aggregation views.

- **`task-run-store.ts`** — `TaskRun = { id, findingId, participantId, sessionId, analysisId, completed: boolean, hesitated: boolean, confused: boolean, askedForHelp: boolean, seqValue?: number, timeOnTaskMs?: number, notes: string, createdAt }`. `seqValue` is 1–7, matching the corrected SEQ range from fix #2 above (not the old 1–5).

- **`card-sort-store.ts`** — `CardSortDeck = { id, analysisId, cards: string[], categories: string[], createdAt }` (human-authored; AI-suggested categories may pre-fill the input but only the human-edited final list is stored — no provenance link kept) + `CardSortPlacement = { id, deckId, participantId, cardLabel, categoryLabel, createdAt }`.

  **[Recommended, non-blocking]**: add a one-line code comment near the category-suggestion logic — *"A 'regenerate suggestions' feature that re-clusters based on participant data would cross into deferred open-card-sort/AI-clustering territory. Requires Auditor review before adding."* — mirroring the existing `codebook-store.ts` precedent of warning future implementers off scope creep.

Modified files:
- **`store.tsx`** — four new `load*/save*` pairs + state slices + CRUD actions, mirroring the existing `codebook`/`responses` pattern exactly.
- **`results-panel.tsx`** — `generateTestPlan()`'s checklist block rewritten per fix #2; no structural change to `ResearchFinding`/`AnalysisResult`.
- **`session-capture.tsx`** — new shared `LikertRow` primitive (Phase A) and a task-completion control cluster (Phase C); both additive.
- **`annotated-design.tsx`** — first-click mode + capture layer (Phase B); see fix #3 below for the exclusivity mechanism.
- **`human-testing.tsx`** — vendor button copy/disclosure change (Phase A, fix from open question #3).
- **`routes.tsx`** — new `/analysis/:id/instruments` route.
- **`session.tsx`** — **[Audit fix #2, required, see Phase B]** must mount an `AnnotatedDesign`-equivalent capture surface before Phase B can be considered shippable.
- **`analysis-data.ts`** — no field changes. `ResearchFinding.region` stays untouched; `first-click-store.ts`'s `targetRegion` is a sibling, never a merge.

---

## Why these scores stay outside the Confidence tier system (confirmed by audit, not a gap)

SUS/NPS/SAT/SEQ scores and `TaskRun`/`FirstClickAttempt`/`CardSortPlacement` records are **not AI-derived output** — they're arithmetic transforms or raw tallies of human-entered/human-observed data. The `Confidence` type (`analysis-data.ts`) is structurally scoped to `ResearchFinding.confidence` only, and exists to grade "did the AI verify this or guess it" — a question that doesn't apply here. Forcing a Deterministic/Heuristic/Speculative badge onto a SUS score would be a category error: it conflates "this arithmetic is exact" with "this AI rule-check is reliable." This plan deliberately does **not** render any Confidence badge on scale/instrument results, matching the precedent already set for the qualitative `Code` type. The substitute rigor axis is sample-size/completeness honesty (raw n always shown, `null`-not-zero sentinels, exact-item-count-or-null for SUS) — a different, correctly-targeted axis than AI-verification.

---

## Implementation steps

### Phase A — SEQ relabel, vendor disclosure, standardized scales (ships first, no architecture blockers)

#### Step A1: SEQ relabel in existing test-plan export — XS
**Files**: `src/app/components/results-panel.tsx`
**What**: Replace `- **Difficulty (1 = effortless, 5 = gave up)**: ___` with `- **SEQ — Single Ease Question (1 = very difficult, 7 = very easy; Sauro & Dumas, 2009)**: ___`. No other checklist line changes.
**Acceptance criteria**: Generated test plan markdown shows the corrected SEQ line. `npm run build` passes.

#### Step A2: `human-testing.tsx` vendor stub disclosure — XS
**Files**: `src/app/components/human-testing.tsx`
**What**: Replace the caption per open question #3 above. `handoff()`'s toast behavior is unchanged — only surrounding copy changes.
**Acceptance criteria**: No reading of the panel could conclude the vendor buttons are an unfinished native feature vs. an inherent architectural boundary. Build passes.

#### Step A3: `scoring.ts` — pure scoring functions — S
**Files**: new `src/app/components/scoring.ts`
**What**: Implement `scoreSUS`, `scoreNPS`, `scoreSAT` (renamed per fix #1), `scoreSEQ` per the Data changes section above, including the no-citation treatment for `scoreSAT`.
**Acceptance criteria**: Pure, unit-testable, no localStorage/React. `scoreNPS([9,9,2,6,10])` returns correct promoter/passive/detractor buckets and a -100..100 score. `scoreSUS` with <10 items returns `null`. `SCALE_CITATIONS.SAT` has no published-source field, only the convention-only note. Build passes (file inert until imported).

#### Step A4: `scales-store.ts` + store.tsx wiring — S
**Files**: new `src/app/components/scales-store.ts`; modified `src/app/store.tsx`
**What**: Raw `ScaleResponse` store (scale type `"SAT"` not `"CSAT"`). Wire into `store.tsx`: state slice, hydrate-once load, decoupled persist effect, `addScaleResponse(items: Omit<ScaleResponse,"id"|"createdAt">[]) => void` (batch insert), `deleteScaleResponsesFor(analysisId, participantId, scale)`.
**Acceptance criteria**: `useStore()` exposes `scaleResponses` + the two actions. Reload-persistence round-trips. Build passes; no UI consumes it yet.

#### Step A5: `LikertRow` shared capture primitive — S
**Files**: new `src/app/components/likert-row.tsx`
**What**: Presentational `LikertRow({ label, min, max, value, onChange })` — row of selectable number buttons, style-matched to existing `Badge`/`Button` primitives. No store access.
**Acceptance criteria**: Renders min..max as clickable targets, highlights `value`, calls `onChange(n)`, keyboard-navigable.

#### Step A6: `/instruments` page shell — S
**Files**: new `src/app/pages/instruments.tsx`; modified `src/app/routes.tsx`
**What**: New route `/analysis/:id/instruments`, reached via an "Instruments" button next to "Moderate session" on `analysis.tsx` (no global nav entry — see open question #1). Page shell: 4 tabs (Scales, First-click, Task completion, Card sort). **Phase A ships only the Scales tab functional** — the other three render a "coming in this build" placeholder card.

**[Audit fix #2 — Check 4/7, required]**: this placeholder convention is not cosmetic — it is the explicit ship-gate mechanism for Phase B. The First-click tab **must remain on the placeholder** (not "coming in this build" but functionally inert) until Step B3's `session.tsx` mount is complete. A first-click tab that is reachable and "looks done" while only usable from `analysis.tsx` (where no live participant is present) would present as capturing real participant data while structurally unable to — an epistemic-honesty problem, not just a sequencing inconvenience. Treat this gate as binding, not advisory.

**Acceptance criteria**: Visiting `/analysis/:id/instruments` from a valid analysis renders the shell. Invalid `:id` redirects to `/history` (matching `analysis.tsx`/`session.tsx` guard pattern). Build passes.

#### Step A7: Scales capture UI + results surface — M
**Files**: modified `src/app/pages/instruments.tsx` (or extracted `scales-view.tsx` if it exceeds ~150 lines, matching the `coding-view.tsx` extraction precedent)
**What**: Capture form using `LikertRow` (SUS = 10 rows, NPS/SAT/SEQ = 1 row each), participant ID field (reuse `session-capture.tsx`'s `participant` input pattern), submit writes via `addScaleResponse`. Results area: raw n, computed score via `scoring.ts`, citation on hover via `Tooltip` (matching `ConfidenceBadge`'s hover pattern) for SUS/NPS/SEQ. No "average/passed/failed" framing anywhere — label as "SUS score" / "NPS score" / "SEQ score," not "grade."

**[Audit fix #1, continued]**: the Satisfaction rating result card shows its "single-item, industry convention — not a peer-reviewed instrument" note **inline, always visible**, not hover-only and not visually de-emphasized relative to the other three cards' citations. This is a stronger placement than a hover tooltip because the absence of a real citation is itself information the researcher needs at a glance, not on discovery.

**Acceptance criteria**: Submitting a 10-item SUS response for participant "P1" persists 10 `ScaleResponse` rows; results card shows `SUS score: <n> (n=1 participant)` — n shown even at n=1. Satisfaction-rating card shows the inline no-citation note. Reload preserves data. Build passes — **Phase A shippable end-to-end**.

---

### Phase B — First-click testing

#### Step B1: `first-click-store.ts` + store.tsx wiring — S
**Files**: new `src/app/components/first-click-store.ts`; modified `src/app/store.tsx`
**What**: `FirstClickTask`/`FirstClickAttempt` stores per Data changes. `addFirstClickTask`, `addFirstClickAttempt` (computes `hit` via `isHit()` at write time), `deleteFirstClickTask`.
**Acceptance criteria**: Store round-trips. `isHit(point, region)` is a pure exported helper, reused by aggregation.

#### Step B2: First-click mode toggle + capture layer on `annotated-design.tsx` — M
**Files**: modified `src/app/components/annotated-design.tsx`
**What**: A third toggle, "First-click mode."

**[Audit fix #3 — Check 1, required]**: the mutual exclusivity with the existing "Salience (approx.)" heatmap toggle must be enforced **structurally, not by default state**. `annotated-design.tsx` currently has two independent `useState` toggles (`showAnnotations`, `showHeatmap`); nothing today prevents both being true simultaneously, and a third independent boolean for first-click mode would have the same problem. Implement instead as a single `viewMode: "annotations" | "heatmap" | "first-click"` (or `| "none"`) state, so showing first-click dots and the AI-speculative heatmap at the same time is unrepresentable, not merely discouraged. Captured click points render as discrete dots with an explicit "Real participant clicks" label, visually distinct from the heatmap's soft gradient (different idiom, not just a different color).

While `viewMode === "first-click"`, clicking the image captures normalized `{x,y}` + elapsed `t` instead of calling `onSelectFinding`. Researcher pre-defines `targetRegion` via on-image drag (or click-two-corners — implementer's call on exact interaction), optionally pre-filled from an existing `ResearchFinding.region` as a suggestion, but the result is copied into a new, separately-stored, human-editable rect — never a live reference to the finding's region.

**Acceptance criteria**: `viewMode` is a single enum, not multiple independent booleans — verify in code, not just in the rendered UI, that simultaneous heatmap+first-click is structurally impossible. Defining a target region produces a rect visually distinguishable (e.g. dashed outline) from `ResearchFinding` boxes. Build passes; `analysis.tsx`'s existing usage of `AnnotatedDesign` is unaffected when `viewMode` defaults to `"annotations"`.

#### Step B3: First-click task setup + aggregation, and the `session.tsx` mount — M
**Files**: modified `src/app/pages/instruments.tsx` (First-click tab), `src/app/pages/session.tsx`
**What**: First-click tab: task label input, "define target region" entry point, task list, per-task aggregate "N/M hit target, median Xs" (raw counts, never percentage-only).

**[Audit fix #2, continued — this step is the actual gate, not just Step A6's placeholder]**: `session.tsx` currently renders the design as a plain `<img>` (confirmed by reading the file) — there is no live first-click-capable surface during an actual moderated session. This step must replace that `<img>` with `AnnotatedDesign` (mounted in `viewMode="first-click"` when a first-click task is active for the session), or an equivalent minimal capture surface wired to the same `first-click-store.ts`. **The First-click tab in Instruments may only leave its "coming in this build" placeholder state once this mount exists and is verified working end-to-end with a real elapsed-clock/participant-ID context from a live session** — not merely once the capture UI exists on `analysis.tsx` alone, where no participant or live clock is present.

**Acceptance criteria**: A researcher defines a target region for "find the pricing link," then during a live session in `session.tsx` (not `analysis.tsx`), clicks are captured against that task with a real participant ID and session-clock timestamp. The Instruments page shows "3/5 hit target, median 4.2s" immediately after data exists. Median computed correctly for even/odd n. Build passes — **Phase B shippable only once this step's acceptance criteria are met in full** (per fix #2 — this is a hard gate, not a nice-to-have).

---

### Phase C — Task completion metrics

#### Step C1: `task-run-store.ts` + store.tsx wiring — S
**Files**: new `src/app/components/task-run-store.ts`; modified `src/app/store.tsx`
**What**: `TaskRun` rows per Data changes. CRUD actions mirroring existing pattern.
**Acceptance criteria**: Store round-trips. `seqValue` accepts 1–7 (matches fix #2's corrected SEQ range).

#### Step C2: Live task-completion control cluster in `session-capture.tsx` — M
**Files**: modified `src/app/components/session-capture.tsx`
**What**: "Task mode" toggle to select one finding as the current task, then: 4 boolean toggle chips (Completed without assistance / Hesitated / Confused / Asked for help), a `LikertRow` (1–7) for SEQ, Start/End buttons reusing the existing `startedAt`/`elapsed` clock convention to derive `timeOnTaskMs`, notes field. "End task" writes one `TaskRun` row.
**Acceptance criteria**: Selecting a finding as the active task, toggling 2 of 4 booleans, setting SEQ=5, running the clock ~10s, ending the task produces one `TaskRun` row with correct `timeOnTaskMs` and `seqValue=5`. Existing free-text observation logging (`Observation`/`TagControl`/`CodeChipToggle`) is unaffected — additive sibling control, not a replacement.

#### Step C3: Task-run aggregation in `/instruments` — S
**Files**: modified `src/app/pages/instruments.tsx` (Task completion tab)
**What**: Per finding, raw counts: "3/5 completed without assistance," "2/5 hesitated," mean/median SEQ — **n always shown plainly, no de-emphasis threshold** (unlike `coding-view.tsx`'s `MIN_TREND_N` pattern — here there's no n<3 muting, just permanent visibility). A **persistent, non-dismissible** note citing Nielsen (1994/2000): "5–8 participants is normal for qualitative usability testing — this is descriptive, not statistically significant." Non-dismissible = no close button, no localStorage dismissal flag (contrast with the existing dismissible honesty banner in `results-panel.tsx`).
**Acceptance criteria**: The Nielsen note has no dismiss control anywhere in the DOM/state. Aggregation updates live as `TaskRun` rows are added. Build passes — **Phase C shippable**.

---

### Phase D — Closed card sort (open card sort and full tree-testing-with-directness explicitly deferred)

#### Step D1: `card-sort-store.ts` + store.tsx wiring — S
**Files**: new `src/app/components/card-sort-store.ts`; modified `src/app/store.tsx`
**What**: `CardSortDeck`/`CardSortPlacement` per Data changes, including the recommended scope-creep warning comment.
**Acceptance criteria**: Store round-trips.

#### Step D2: Researcher deck-authoring UI — S
**Files**: modified `src/app/pages/instruments.tsx` (Card sort tab)
**What**: Form for `cards: string[]` / `categories: string[]` (textarea-per-line or chip-input). Category names may default-suggest from existing finding/IA hints but must be human-edited/confirmed before saving — only the final edited list is stored, no AI-provenance flag.
**Acceptance criteria**: Researcher can author and save a deck for the current analysis; deck is editable before first participant run.

#### Step D3: Participant-facing closed card-sort screen — M
**Files**: new `src/app/components/card-sort-session.tsx`, mounted from `session.tsx` (single-laptop hand-off model)
**What**: Click-to-assign UI (drag is a nice-to-have, click is acceptance-critical) — each card assigned to one of the deck's fixed categories. No "add category" control exposed to the participant (closed sort only). On completion, writes one `CardSortPlacement` row per card.
**Acceptance criteria**: A participant assigns all N cards to one of M categories via click. Submission writes exactly N placement rows. A second participant's run does not overwrite the first's rows (keyed by `participantId`).

#### Step D4: Card-sort frequency aggregation in `/instruments` — S
**Files**: modified `src/app/pages/instruments.tsx` (Card sort tab)
**What**: Per-card frequency table: "4/5 placed 'Pricing' under 'Account'" — raw counts per card×category cell, same idiom as `coding-view.tsx`'s cross-tab. UI copy explicitly states this is descriptive tabulation, not a cited methodology: "Frequency count — descriptive only, no statistical method (unlike SUS/NPS/SEQ above)." No citation-style attribution anywhere near this table.
**Acceptance criteria**: Table renders card×category counts correctly across ≥2 participants. No citation styling near the table. Build passes — **Phase D shippable, full initiative complete**.

---

## Risks and assumptions

- **SEQ range correction (A1) is a silent behavior change to an already-shipped export.** Framed as a citation/bug fix, not a methodology change — the old field was never actually cited as SEQ.
- **The `session.tsx`/`AnnotatedDesign` mounting gap (Phase B) is the single biggest structural risk in this plan**, and is now a binding ship-gate per audit fix #2, not an optional cleanup. Phase B is not "real participant" capture until Step B3 is fully met.
- **Card sort's AI-suggested categories (Phase D) is adjacent to the explicitly-deferred AI-clustering feature.** If an Implementer later adds a "regenerate suggestions" button that re-clusters based on participant data, that crosses into deferred territory and needs Auditor review at that time — see the recommended code comment in Data changes.
- **First-click target-region authoring interaction (B2)** — drag-rectangle vs. two-click-corners is left to Implementer judgment; a UI-detail risk, not a principle risk, but could affect the S/M estimate for B2.
- **No new external dependency anywhere in this plan** — Likert rows, dot overlays, drag capture, and frequency tables are all buildable with existing Tailwind/shadcn primitives and native DOM events.
- **Renaming CSAT to "Satisfaction rating" / `"SAT"` (audit fix #1) is a naming decision that may surprise anyone who expected industry-standard "CSAT" terminology.** Accepted tradeoff: accuracy over familiarity, per the audit's explicit instruction not to borrow credibility from a citation that doesn't describe the metric.

## What to hand to the Implementer

- This plan, phased A → B → C → D, each phase independently shippable, app buildable/runnable after every step.
- **Do not** build open card sort, AI-category-clustering, or full tree-test/"directness" features — explicitly out of scope, flagged for separate future principle review if proposed later.
- **Binding ship-gate**: Phase B's First-click tab stays on its placeholder until `session.tsx` mounts a real capture surface (Step B3) — do not mark Phase B done based on `analysis.tsx`-only functionality.
- **Binding naming**: the fourth scale is `"SAT"` / "Satisfaction rating," never "CSAT," and ships with no citation field, not a hedged one.
- **Binding architecture**: first-click mode and the Salience heatmap toggle must share one `viewMode` enum, not independent booleans.
- Add a roadmap entry (see below) to `docs/ROADMAP.md`.
- Each new store file should carry a one-line guardrail comment stating what it must never become, matching the `codebook-store.ts` precedent (e.g. `scales-store.ts`: "never store a precomputed score, raw items only").

## Roadmap entry (new scope — add to `docs/ROADMAP.md`)

**Phase 3.5 — Native Quantitative Instrumentation `[CAREFUL]`** — new scope, distinct from 3.1 (finding-level evidence trends across runs) and 3.4 (qualitative response coding, free-text/human-coded). This is the app's first deterministic-scoring-from-raw-human-input layer (SUS/NPS/SEQ formulas, satisfaction rating without a borrowed citation) plus three new session-level capture modalities (first-click, task completion, closed card sort) — a structurally new data shape (per-participant, per-instrument, per-analysis quantitative rows).

Sub-items: 3.5.1 Standardized scales (SUS/NPS/SAT/SEQ), 3.5.2 First-click testing, 3.5.3 Task completion metrics, 3.5.4 Closed card sort. Explicit "what we are deferring" line: open card sort (emergent category naming), AI category clustering, full tree testing with a true directness metric.
