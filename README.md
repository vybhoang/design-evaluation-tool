# Heurizztik

**Screen it before you mean it.**

Heurizztik checks AI-generated UI (v0, Figma Make, Cursor, Lovable, etc.) against the UX research you'd cite in a real critique — Nielsen's heuristics, WCAG 2.2, cognitive-load literature — then hands you a script to validate what actually matters with real humans.

It's built for the team that can't afford to skip research but also can't afford to run a moderated session every sprint: a fast, free, local heuristic pre-screen that tells you which hypotheses are worth spending your recruiting budget on.

## What this is, and what it isn't

It's a checklist generator backed by published UX research. It is **not** a synthetic user, and it cannot tell you whether your design "works." LLMs are yes-men — simulating user feedback with one is theater. The job here is to catch the obvious before real users see it, and to help you write a sharper test plan for when they do.

Every finding in the tool carries one of three confidence tiers, and none of them are optional decoration:

| Tier | Meaning |
|---|---|
| **Deterministic** | A measurable rule fired (contrast ratio, target size) — reproducible, not a judgment call. |
| **Heuristic** | Pattern-matched against a named, published source (Nielsen, Fitts, Hick, Sweller). |
| **Speculative** | An explicit hypothesis — flagged as something to validate with a real person, not a finding. |

## How it works

1. **Drop a design** — screenshot, Figma export, or wireframe. Add the audience and goal so checks weigh accordingly.
2. **Heuristic review** — deterministic rules plus pattern-matched heuristics, every finding citing its source.
3. **Human validation** — run a moderated session inside the tool, tag observations back to findings, and watch patterns emerge across runs.

## Features

- **Design review** — upload one or more pages, get findings grouped by heuristics, cognitive load, and accessibility, each with a severity and a cited source.
- **Audience lenses** — synthetic archetype cards that generate an interview script, clearly caveated as fiction for sharpening questions, never as user feedback.
- **Live session capture** — moderate a real session inside the app, log verbatim responses, tag them to findings.
- **Research instruments** — Scales, First-click, Task completion, Card sort, and Empathy map, each scoped to a single analysis run.
- **Evidence & validation** — confirm, refute, or mark a finding inconclusive with real logged evidence — nothing flips status without a human recording it.
- **History, Compare, and Patterns** — revisit past runs, diff two designs side by side, and surface which principles keep failing across iterations.
- **Markdown export** — a run exports with its findings, sources, and confidence tiers intact.

## Principles

These are load-bearing — every feature in this repo is expected to hold up against them (see [`docs/PRD.md`](docs/PRD.md) for the full list):

- **Epistemic honesty** — never imply AI can do what only humans can.
- **Citation over opinion** — every finding traces to a real, specific published source.
- **Calibrated confidence** — Deterministic / Heuristic / Speculative, and nothing blurs the three.
- **Human-in-the-loop** — AI drafts the checklist and script; humans do the validating.
- **Local-first** — no sign-up, no telemetry, no server. Everything lives in the browser's `localStorage`.

## Tech stack

React 18 · TypeScript · Vite 6 · Tailwind CSS v4 · shadcn/ui (Radix primitives) · React Router v7 · Recharts · localStorage persistence

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
```

No environment variables or API keys are required to run the app — everything works fully offline against local mock data. If `VITE_ANTHROPIC_API_KEY` is set, design uploads are analyzed by Claude's vision API instead of the built-in mock analyzer; the app degrades gracefully without it.

## Project structure

```
src/
  main.tsx                 → React entry point
  app/
    routes.tsx              → route definitions
    store.tsx                → app state + localStorage persistence
    pages/                   → landing, new run, analysis, session, instruments, history, patterns, compare, responses
    components/
      analysis-data.ts        → core types + the (mock) analysis engine
      results-panel.tsx        → the main findings UI
      session-capture.tsx      → live moderation / observation logging
      empathy-map-view.tsx      → empathy map instrument
      ui/                      → shadcn/ui components
docs/
  PRD.md                     → product requirements and non-negotiable principles
  ROADMAP.md                 → what's been built, what's next
```

## Development workflow

Feature work in this repo runs through four specialized roles defined in `.claude/agents/`: a **Brainstorm** agent that ideates and stress-tests ideas against the principles above, a **Planner** that turns approved ideas into sequenced implementation plans, an **Implementer** that writes the code, and an **Auditor** that checks the result against the same principles before it ships. Nothing merges on the strength of one opinion.

---

This is a solo-built beta project — expect rough edges. Issues and PRs welcome.
