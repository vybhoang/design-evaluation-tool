# Plan: Response Coding & Quant/Qual Aggregation Layer

> Produced by the Brainstorm → Planner → Auditor agent pipeline (`.claude/agents/`).
> **Audit verdict**: PASS WITH CONDITIONS. The two required fixes below are folded directly into the plan (marked **[Audit fix]**) rather than left as a separate addendum.

**Effort estimate**: L (sum of phases; roughly 7–10 hrs total)
**PRD section**: New scope — closest existing item is Roadmap Phase 3.1 "Evidence Trends Across Runs" (PRD §2.3), but that operates on `ResearchFinding`/`ValidationEvidence` (findings-level, cross-*run*). This initiative operates on `InterviewResponse` free text (response-level, human-coded, cross-*session*, much lower n per code). **This is a scope addition not currently named in `docs/ROADMAP.md` — add an entry there before/while building.**
**Principle verdict**: CAREFUL — safe in substance (no server, no new deps, confidence tiers untouched) but only if the guardrails below are enforced verbatim, including the two added by audit.

---

## Open decisions resolved up front

### Decision A — `ValidationEvidence` ↔ `InterviewResponse` link

Today the only link is transient: `session-capture.tsx`'s in-memory `Observation.evidenceId` ties an observation to the evidence row it created, but that id is never written back onto the persisted `ValidationEvidence` record, and `InterviewResponse` has no `evidenceId` either.

**Chosen approach**: persist a back-link, stored on `InterviewResponse`, not `ValidationEvidence`. Add `InterviewResponse.evidenceId?: string`, set by `session-capture.tsx` at tag time.

**[Audit fix — Check 4, required]**: Confirmed during audit (by reading `validation-dialog.tsx`) that `ValidationDialog.onAdd` — used from `results-panel.tsx`'s `FindingCard` — calls `addEvidence` directly with **no `InterviewResponse` in scope at all**. This is a second, pre-existing, independent path to creating `ValidationEvidence` that this plan does not change but must not assume away. Resolution, to ship with Decision A itself, not deferred:

- Document on the `InterviewResponse.evidenceId` field (as a code comment, see Step 1) that it is **session-capture-origin only** — it will be `undefined` for any `ValidationEvidence` logged via `ValidationDialog`'s standalone finding-card path.
- Any downstream feature that aggregates or links evidence to responses (Quote Bank in particular, and any future "linked response" UI) must treat `evidenceId` coverage as **best-effort, not guaranteed**, and must not silently undercount or imply completeness when it skips evidence rows that have no reachable response.
- This is a documentation/scope decision, not a code blocker — but it is a required fix because the gap, left unstated, was correctly identified by the audit as a latent honesty risk: an aggregate view that quietly drops evidence rows it can't map back to a response is the kind of silent gap that erodes trust the same way an unstated confidence tier would.

### Decision B — new tab vs. new route

**Chosen**: new tabs on the existing `/responses` route, not a new route. `results-panel.tsx` already establishes the in-page-tabs pattern (Heuristics / Cognitive / Humans) using the installed shadcn `Tabs` component. The top nav in `root.tsx` is already at 5 items plus single-letter keyboard shortcuts; a 6th nav item and shortcut for what is a *view* of the same response data (not a new data domain) adds crowding for no IA benefit. It also avoids any naming/route collision with `/patterns`.

Final `/responses` page shape: top-level tabs **"Log" | "Coding" | "Quote bank"**, with the existing filter bar (search / tagged / session) staying visible above the tabs.

---

## Data changes

- `InterviewResponse` (`src/app/components/response-store.ts`): add `codes?: string[]` — the multi-code tagging layer. Optional/undefined-safe so existing persisted rows deserialize cleanly.
- `InterviewResponse`: add `evidenceId?: string` — persists the response→evidence back-link (Decision A). **[Audit fix]** Comment on the field itself: *"Set only by session-capture's tag flow. May be absent for ValidationEvidence created via the standalone finding-card dialog (validation-dialog.tsx) — do not assume every evidence row has a reachable response."*
- `InterviewResponse`: add `starred?: boolean` — backs the Quote Bank's human-curated pin. A boolean on the response, not a separate store — one bit of state doesn't need a fourth localStorage key.
- New type `Code` (new file `src/app/components/codebook-store.ts`): `{ id: string; label: string; createdAt: number; color?: string }`. **Recommended (non-blocking)**: a one-line comment on this type stating codes must never gain a `source`, `confidence`, or AI-attribution field — this type is deliberately outside the `ResearchFinding`/`Confidence` system (see Step 4 principle note) and future maintainers should not pattern-match it against `ResearchFinding`'s shape.
- New localStorage key `cognition.codebook.v1`, following the existing `cognition.<noun>.v1` convention.

---

## Implementation steps

### Phase 1 — Coding layer foundation

#### Step 1: Data model — codes, evidence back-link, codebook store — S
**Files**: `src/app/components/response-store.ts`, `src/app/components/codebook-store.ts` (new), `src/app/store.tsx`
**What**:
- In `response-store.ts`: add `codes?: string[]`, `evidenceId?: string` (with the **[Audit fix]** scope comment above) to `InterviewResponse`.
- New `codebook-store.ts`: `Code` type (with the non-blocking attribution-boundary comment), `loadCodebook()`/`saveCodebook()` mirroring `validation-store.ts`'s load/save shape, plus pure helpers `renameCode(codes, id, label)` and `mergeCodes(codes, fromId, intoId)`.
- In `store.tsx`: add `codebook` state (load/save-on-change effect, identical pattern to `validations`/`responses`), and expose `addCode`, `renameCode`, `mergeCode` (cascades the rename/merge across every response's `codes` array — no orphaned ids), `deleteCode` (strips the id from every response's `codes` array rather than blocking deletion, matching the app's existing lean-permissive UX, e.g. `clearTag`), and `toggleResponseCode(responseId, codeId)`.
**Acceptance criteria**: `npm run dev` builds with no type errors; existing Responses page and session capture still work unchanged (codes are optional and unused so far — pure plumbing, no UI yet).

#### Step 2: Coding UI on Responses page rows — S
**Files**: `src/app/pages/responses.tsx`
**What**: Inline code-chip control on `ResponseRow` — popover (reuse the `Popover`/`PopoverTrigger`/`PopoverContent` pattern from `session-capture.tsx`'s `TagControl`) listing codebook entries as toggleable chips plus a "+ new code" input. Applied codes render as `Badge variant="secondary"` chips, visually distinct from the existing finding-tag `Badge variant="outline"`.
**Acceptance criteria**: From `/responses`, create a code, apply it to a response, see it persist across a page reload, remove it. No finding-tag behavior altered.

#### Step 3: Coding UI in session-capture (live tagging) — S
**Files**: `src/app/components/session-capture.tsx`
**What**: Extend the per-observation row (next to the existing `TagControl`) with a compact code-chip toggle against the same codebook, writing via `toggleResponseCode(obs.responseId, codeId)`. No new local observation state — codes live on the persisted `InterviewResponse`.
**Acceptance criteria**: During a live session, logging an observation and applying a code shows the chip immediately, both in the session list and on `/responses` after navigating away — without needing to tag to a finding first.

#### Step 4: Code frequency + cross-tab aggregation view ("Coding" tab) — M
**Files**: `src/app/pages/responses.tsx`, new `src/app/components/coding-view.tsx`
**What**: New `CodingView` component, deliberately not named anything with "Patterns," rendered as the second tab. Visual language borrowed from `patterns-view.tsx` (stat-card row, badges) but built fresh in this file — `patterns-view.tsx`'s props/types are findings-shaped, not response-shaped.

Contents:
- Stat row: total responses, total codes in codebook, total coded responses (n ≥ 1 code), sessions represented — raw counts only, no percentages.
- Persistent, **non-dismissible** caveat banner (unlike the dismissible honesty banner elsewhere, since the risk it guards against recurs every time the underlying data changes): *"Codes from N responses across M sessions — not a statistical sample. Counts reflect what was said and tagged, not how many users would say it."* Styled consistently with the existing amber honesty-banner markup in `results-panel.tsx`.
- Code frequency table: code label, raw n (bold/prominent), small inline bar.
- Cross-tab: codes × verdict and codes × session, computed client-side by grouping `responses`. Cells with n < 3 render visually de-emphasized (muted, no bar fill) — never suppressed entirely.

**[Audit fix — Check 6, required]**: The plan's specified copy (banner, export disclaimers) passed audit, but the *visual mechanics* of the frequency table and cross-tab were underspecified — and the nearest copy-paste source, `patterns-view.tsx`'s evidence bar (`style={{ width: `${(a.confirmed / totalEv) * 100}%` }}`), computes a literal percentage-of-total for its width. Reusing that pattern here would quietly reintroduce the false-precision problem this whole feature exists to avoid. This plan now specifies explicitly:
- Frequency table bar width is computed as `count / maxCountInTable`, never `count / totalResponses` or `count / totalSessions` — i.e., relative to the largest count *in the same table*, not a share of the whole corpus.
- Banned vocabulary, enforced in every column header, axis label, tooltip, and empty-state string in the Coding tab and both exports (Steps 6–8): no `%`, "percent", "rate", or "share of" anywhere.

**Acceptance criteria**: With ≥2 codes applied across ≥2 responses, the Coding tab shows a frequency table with correct raw counts and bars sized relative to the max count in the table (not total responses/sessions), a codes×verdict cross-tab where any cell with n<3 is visually muted, the caveat banner is present and not dismissible, and no string anywhere in the view matches `%`, "percent", "rate", or "share of". Renaming or merging a code immediately reflects in this view.

### Phase 2 — Quote Bank + Qual Export (depends on Phase 1)

#### Step 5: Quote Bank tab — filter, star, curate — M
**Files**: `src/app/pages/responses.tsx`, new `src/app/components/quote-bank.tsx`
**What**: Third tab, "Quote bank." Reuses the existing filter primitives in `responses.tsx` (search/tagged/session — lift filter state to the page level so all three tabs share it), plus a filter by code. Each visible response gets a star/pin toggle (`starred` field) — purely human-curated, **no AI ranking or "best quote" scoring of any kind**. Starred quotes surface in a pinned section at the top.
**Acceptance criteria**: Filter by code or finding, star 3+ responses across 2+ sessions, unstar one, confirm the starred set persists across reload. No automatic sorting/scoring of "quality" anywhere in this view.

#### Step 6: Qual report Markdown export — S
**Files**: new `src/app/components/qual-report-export.ts`, `src/app/components/quote-bank.tsx`
**What**: `generateQualReport(starred, codeFrequency, codebook)` building a markdown string with the same `lines.push(...)`-then-`join("\n")` convention used in `results-panel.tsx`. Opens with: *"This is a curated selection of real participant quotes, manually selected by the researcher. It is not a random or representative sample — codes are human-applied, not statistically validated."* Followed by starred quotes grouped by code, then the code-frequency summary table (raw n first — **[Audit fix]** same banned-vocabulary rule from Step 4 applies here: no `%`/"percent"/"rate"/"share of" in the exported summary). Export via the existing Blob/createObjectURL/`a.click()` pattern.
**Acceptance criteria**: "Export report" downloads a `.md` file containing the disclosure banner, all starred quotes grouped by code, and the frequency table with raw counts only.

### Phase 3 — CSV / research-standard export (v0 independent of Phase 1; v1 depends on it)

#### Step 7 (v0): CSV export without code columns — XS
**Files**: new `src/app/components/csv-export.ts`, `src/app/pages/responses.tsx`
**What**: One row per `InterviewResponse`: `id, createdAt (ISO), sessionLabel, analysisLabel, question, response, verdict, findingPrinciple`. Local `csvEscape()` helper, no library. Downloaded via the same Blob pattern (`type: "text/csv"`). "Export CSV" button on the "Log" tab. No dependency on Phase 1 — may be pulled forward in the backlog.
**Acceptance criteria**: "Export CSV" downloads a valid CSV with one row per response and the 8 metadata columns, correctly escaped.

#### Step 8 (v1): Add one boolean column per code — XS
**Files**: `src/app/components/csv-export.ts`
**What**: Once Step 1's `codes` field exists, append one `0`/`1` column per codebook entry (header = code label, sanitized for CSV safety), reading `response.codes?.includes(code.id)`. Additive to Step 7's columns.
**Acceptance criteria**: With ≥2 codes in the codebook, "Export CSV" produces one additional column per code with correct 0/1 values; Step 7's columns unchanged in content and order.

---

## Sequencing summary (compile-safe at every step)

```
Step 1 (data model)        → app compiles, no visible UI change
Step 7 v0 (CSV, no codes)  → no dependency — pull forward if desired
Step 2 (coding UI: log)    → depends on Step 1
Step 3 (coding UI: session)→ depends on Step 1
Step 4 (Coding tab)        → depends on Step 1 (and benefits from Steps 2-3 having data)
Step 5 (Quote bank tab)    → depends on Step 1 (codes filter) — works without Step 4, richer with it
Step 6 (Qual export)       → depends on Step 5
Step 8 v1 (CSV + codes)    → depends on Step 1
```

Every step lands the app in a buildable, runnable state.

---

## Guardrails (verify before merge)

1. Raw n always shown, never percentage-only headline numbers, anywhere in the Coding tab or exports.
2. Persistent, non-dismissible caveat banner on the Coding tab.
3. Cross-tab cells with n < 3 visually de-emphasized, never silently suppressed.
4. No view/component named anything with "Patterns" for response-level coding.
5. Quote Bank has zero AI-driven ranking/scoring of quotes — star/pin is 100% human-applied.
6. Both new exports ship via the existing Blob-download convention; no new dependency; no server call.
7. **[Audit fix]** Frequency-table and cross-tab bars are sized relative to the max count *within the same table*, never percentage-of-total. No `%`, "percent", "rate", or "share of" in any column header, axis label, tooltip, or default copy in the Coding tab or either export.

## Risks and assumptions

- **Assumption**: shadcn `Tabs` (already used in `results-panel.tsx`) is acceptable and already installed — confirmed at `src/app/components/ui/tabs.tsx`, no new dependency.
- **Assumption**: localStorage capacity is sufficient for the codebook and added per-response fields. `history-store.ts` already caps at 30 entries for the heavier `HistoryEntry`; `responses`/`codebook` have no cap today and this plan doesn't add one — pre-existing gap, not newly introduced.
- **Risk**: `deleteCode` cascading through every response is O(responses × codes) — non-issue at realistic localStorage-scale data volumes.
- **Risk**: the merge UX (Step 1) is data-model-ready but this plan doesn't specify the merge *dialog* UI beyond a two-select picker. If more is needed, flag back to Planner rather than absorbing silently.
- **Risk**: the n<3 de-emphasis threshold (Step 4) is a guardrail, not a tuned constant — implement as `MIN_TREND_N = 3` in `coding-view.tsx`, a named constant, not a magic number.
- **Resolved by audit**: Decision A's `evidenceId` coverage gap (`validation-dialog.tsx`'s response-less evidence path) — see Decision A above. Documented, not blocking.

## What to hand to the Implementer

- **Roadmap note to add first**: a new entry in `docs/ROADMAP.md` ("Qualitative Coding & Export"), explicitly distinguished from Phase 3.1 "Evidence Trends Across Runs."
- **Files to touch, in order**: `src/app/components/response-store.ts` → `src/app/components/codebook-store.ts` (new) → `src/app/store.tsx` → `src/app/pages/responses.tsx` → `src/app/components/session-capture.tsx` → `src/app/components/coding-view.tsx` (new) → `src/app/components/quote-bank.tsx` (new) → `src/app/components/qual-report-export.ts` (new) → `src/app/components/csv-export.ts` (new).
- **Data types to add**: `InterviewResponse.codes?: string[]`, `InterviewResponse.evidenceId?: string` (with audit-fix scope comment), `InterviewResponse.starred?: boolean`, new `Code = { id, label, createdAt, color? }` in `codebook-store.ts`.
- **Acceptance criteria**: as stated per step above.
- **Guardrails to verify before merge**: all 7 listed above, including the two folded in from audit (#7, plus the `evidenceId` scope comment from Decision A).
