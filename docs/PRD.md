# Cognition — Product Requirements Document

> **What this tool is**: A heuristic first-pass review tool that checks AI-generated UI against published UX research, then hands teams a script to validate what matters with real humans.
> **What it is not**: A synthetic user, a user-research replacement, or a prediction engine.

---

## 1. Core Principles (Non-Negotiable)

These are load-bearing. Every proposed improvement must be measured against them.

| Principle | What it means in practice |
|---|---|
| **Epistemic honesty** | Never imply AI can do what only humans can. Label every finding with its confidence tier. |
| **Citation over opinion** | Every finding must cite a real source: Nielsen's 10, WCAG 2.2, Hick, Fitts, Kahneman, etc. |
| **Calibrated confidence** | Three tiers only: Deterministic (measurable rule), Heuristic (pattern match), Speculative (explicit hypothesis). |
| **Human-in-the-loop** | AI generates the checklist and test script. Humans do the validating. The tool records their evidence. |
| **Local-first** | No sign-up. No telemetry. Runs stay on the user's machine (localStorage). |
| **Knows its limits** | The UI must actively warn users about what the tool cannot do — not just omit the caveat. |

### Hard Out-of-Scope (Principle Violations)

- Synthetic user responses presented as real feedback
- Confidence scores without traceable rules or published sources
- Predictive conversion or business-metric claims
- Any "AI said users will..." framing
- Cloud storage or account features (breaks local-first)

---

## 2. Current State Assessment

### What Works Well
- Strong honesty banner in the results panel
- Confidence tiers (Deterministic / Heuristic / Speculative) are visually distinct and well-explained
- Interview rehearsal tool is appropriately caveated as "fiction for script iteration"
- Session capture for live moderation is a genuine differentiator
- A/B comparison and patterns view create longitudinal value
- Markdown export preserves the cited sources

### Current Gaps

| Area | Gap | Risk if unchanged |
|---|---|---|
| **Analysis engine** | `generateAnalysis()` returns hardcoded mock data; the uploaded image is never actually read | Tool produces identical findings for every design, destroying trust |
| **Image input** | Only supports file upload; no clipboard paste, no URL | Friction slows the primary workflow |
| **Design context** | Three design types (landing, checkout, dashboard), three audience options | Doesn't reflect the full range of AI-generated UI being shipped |
| **Finding detail** | Recommendations are generic; no priority signal beyond severity | Users don't know where to start |
| **Test planning** | Interview questions are listed but not structured into a usable test plan | Extra step for the practitioner |
| **Evidence aggregation** | Evidence is per-finding but patterns across runs aren't surfaced prominently | Longitudinal value is hidden |
| **Theming** | `next-themes` is installed but dark mode is not wired up | Accessibility gap in low-light environments |
| **Responsiveness** | Layout assumes a wide viewport; narrow screens break the two-column design | Mobile UX researchers can't use it in the field |
| **History UX** | Runs are listed but not searchable or filterable | Unusable after ~10 runs |
| **Keyboard access** | No keyboard shortcuts for core actions | Power users and accessibility-dependent users are underserved |

---

## 3. Improvement Proposals

Each is tagged with: **[SAFE]** (fully within principles) or **[CAREFUL]** (needs deliberate framing to stay honest).

### Tier 1 — High Impact, Low Risk

#### 1.1 Real Image Analysis via Claude Vision API `[CAREFUL]`
**What**: Wire the uploaded design screenshot to the Claude API (vision) to generate real, image-specific findings instead of the current hardcoded mock data.

**Why it's safe**: The confidence tier system already handles this — Claude's output maps to Heuristic or Speculative confidence. Deterministic rules (WCAG contrast, touch target px) remain programmatic, not AI-inferred.

**Guardrails**:
- Claude's output must be post-processed into `ResearchFinding` objects that cite real sources
- Speculative findings must be explicitly labeled
- The honesty banner stays prominent regardless
- No claim that Claude "sees what users see"

**Success metric**: Findings differ meaningfully between a minimal wireframe and a polished dashboard upload.

---

#### 1.2 Clipboard Paste Support `[SAFE]`
**What**: Allow `Ctrl/Cmd+V` to paste a screenshot directly into the design canvas.

**Why**: Every workflow for AI-generated UI involves a screenshot. The paste step removes the save→open loop.

**Implementation**: `paste` event on the canvas drop zone, `ClipboardItem` → `File` → existing image handler.

---

#### 1.3 Dark Mode `[SAFE]`
**What**: Wire the `next-themes` provider already installed in `package.json` to the root layout. Add a toggle in the nav.

**Why**: The app is used during design critiques and late-night prototyping sessions. The irony of a UX tool lacking a basic accessibility feature is significant.

---

#### 1.4 More Design Types and Audiences `[SAFE]`
**What**: Expand `designType` options to include: `onboarding`, `settings`, `form`, `email`, `mobile-nav`, `modal/dialog`. Expand `audience` to include: `enterprise-buyer`, `developer`, `seniors-65+`, `non-native-language`.

**Why**: AI tools generate all of these. The heuristics and audience lenses that matter differ significantly between them.

---

#### 1.5 History Search and Filter `[SAFE]`
**What**: Add a search field and filter controls (by design type, severity count, date range) to the Runs page.

**Why**: After 10+ runs the current list becomes unusable. No principle is affected.

---

### Tier 2 — Medium Impact, Requires Care

#### 2.1 Structured Test Plan Export `[CAREFUL]`
**What**: A "Generate test plan" action that compiles findings into a structured usability test document: scenario, tasks, success criteria, questions per finding.

**Guardrails**:
- The output must be framed as a *starting point to adapt*, not a script to run verbatim
- Include explicit note: "This is a hypothesis checklist, not a validated protocol"
- Export as Markdown or PDF; no implied validity beyond that

---

#### 2.2 Finding Priority Score `[CAREFUL]`
**What**: A composite priority signal per finding: severity × confidence tier × validation status. Show as a rank order in the results panel.

**Guardrails**:
- Must be transparent about the formula (visible to users on hover)
- Cannot claim this predicts user impact
- Label as "Suggested triage order" not "Impact score"

---

#### 2.3 Evidence Trends Across Runs `[SAFE]`
**What**: The Patterns page already aggregates runs. Extend it to surface: which principles are repeatedly failing across runs, which findings have been validated by real users across multiple iterations.

**Why**: Teams reviewing multiple design iterations of the same product gain compound value. This is pure aggregation of data the tool already has.

---

#### 2.4 Keyboard Shortcuts `[SAFE]`
**What**: `N` → new run, `H` → history, `P` → patterns, `C` → compare. Arrow keys to navigate findings. `E` to open evidence dialog.

---

### Tier 3 — Exploratory

#### 3.1 Annotation Layer on Design Canvas `[SAFE]`
**What**: When a finding is selected in the results panel, highlight the corresponding `region` bbox on the uploaded image. Currently `annotated-design.tsx` handles this but the interaction could be richer.

---

#### 3.2 Sharable Read-Only Report `[CAREFUL]`
**What**: Serialize a run into a self-contained HTML file (like a snapshot) that can be shared without the app.

**Guardrails**:
- The exported HTML must include the honesty banner and confidence tier explanations
- Must not look like a "validated UX report" — it's a heuristic first-pass snapshot

---

#### 3.3 Custom Heuristic Rules `[CAREFUL]`
**What**: Let teams define their own Deterministic rules (e.g., "brand button color must be #005FCC") to add alongside the standard library.

**Guardrails**:
- Custom rules are clearly labeled as "Team rule" not published research
- Cannot override the confidence tier system

---

## 4. Success Metrics

| Metric | Proxy | Target |
|---|---|---|
| Finding specificity | % of findings that differ between two distinct design uploads | >80% (requires Tier 1.1) |
| Validation rate | % of findings that receive real-user evidence within 7 days of a run | Baseline → track trend |
| Workflow completion | % of runs that result in at least one session-capture log | Baseline → track trend |
| Return rate | % of users who create a second run within 30 days | Baseline → track trend |

---

## 5. What We Are Not Building

| Rejected idea | Why |
|---|---|
| "Predicted user behavior" | Would require a fine-tuned model on real behavioral data we don't have |
| Conversion rate predictions | No causal link from heuristics to conversions without real testing |
| Automated A/B test analysis | Requires real traffic data; out of scope |
| Team collaboration / cloud sync | Breaks local-first principle; adds auth complexity |
| Plugin integrations (Figma, Storybook) | Scope creep; first validate the core loop |

---

## 6. Agent Roles

Four specialized agents work in sequence (or in parallel within their lane):

| Agent | File | Role |
|---|---|---|
| **Brainstorm** | `.claude/agents/brainstorm.md` | Generates ideas, challenges assumptions, identifies user needs |
| **Planner** | `.claude/agents/planner.md` | Sequences work, estimates effort, defines acceptance criteria |
| **Implementer** | `.claude/agents/implementer.md` | Writes the code, knows the stack, produces working diffs |
| **Auditor** | `.claude/agents/auditor.md` | Checks that changes don't violate the app's principles |
