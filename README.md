# Heurizztik

**Screen it before you mean it.**

Heurizztik checks a design against the UX research you'd actually cite in a critique: Nielsen's heuristics, WCAG 2.2, cognitive-load literature. It doesn't matter where the design came from. Figma, a hand-coded build, a screenshot of something an AI tool spat out, it all goes through the same review. Then it hands you a script to go validate what matters with real people.

It's built for a team that can't afford to skip research but also can't run a moderated session every sprint. Think of it as a fast, free, local pre-screen that tells you which hypotheses are actually worth spending your recruiting budget on.

## What this is, and what it isn't

It's a heuristic pass backed by published UX research, and a workflow to validate what it finds with real people. It is **not** a synthetic user, and it cannot tell you whether your design "works." LLMs are yes-men. Simulating user feedback with one is theater. The job here is to catch the obvious before real users see it, help you write a sharper test plan, and keep track of what actually gets confirmed once real people try it.

Every finding in the tool carries one of three confidence tiers, and none of them are optional decoration:

| Tier | Meaning |
|---|---|
| **Deterministic** | A measurable rule fired, like contrast ratio or target size. Reproducible, not a judgment call. |
| **Heuristic** | Pattern-matched against a named, published source (Nielsen, Fitts, Hick, Sweller). |
| **Speculative** | An explicit hypothesis, flagged as something to validate with a real person, not treated as a finding. |

## How it works

1. **Drop a design.** Screenshot, Figma export, wireframe, whatever you've got. Add the audience and goal so the checks weigh accordingly.
2. **Heuristic review.** Deterministic rules plus pattern-matched heuristics, and every finding cites its source.
3. **Human validation.** Run a moderated session inside the tool, tag observations back to findings, and watch patterns emerge across runs.

## Features

- **Design review.** Upload one or more pages and get findings grouped by heuristics, cognitive load, and accessibility, each with a severity and a cited source.
- **Audience lenses.** Synthetic archetype cards generate an interview script. It's clearly marked as fiction for sharpening your questions, never as real user feedback.
- **Live session capture.** Moderate a real session inside the app, log verbatim responses, and tag them to findings.
- **Research instruments.** Scales, First-click, Task completion, Card sort, and Empathy map, each scoped to a single analysis run.
- **Evidence and validation.** Confirm, refute, or mark a finding inconclusive with real logged evidence. Nothing flips status unless a human records it.
- **History, Compare, and Patterns.** Revisit past runs, diff two designs side by side, and see which principles keep failing across iterations.
- **Markdown export.** A run exports with its findings, sources, and confidence tiers intact.

## Principles

These are load-bearing. Every feature in this repo is expected to hold up against them (see [`docs/PRD.md`](docs/PRD.md) for the full list):

- **Epistemic honesty.** Never imply AI can do what only humans can.
- **Citation over opinion.** Every finding traces to a real, specific published source.
- **Calibrated confidence.** Deterministic, Heuristic, or Speculative, and nothing blurs the three.
- **Human-in-the-loop.** AI drafts the checklist and script. Humans do the validating.
- **Local-first.** No sign-up, no telemetry, no server. Everything lives in the browser's `localStorage`.

## Tech stack

React 18, TypeScript, Vite 6, Tailwind CSS v4, shadcn/ui (Radix primitives), React Router v7, Recharts, localStorage for persistence.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
```

No environment variables or API keys are required to run the app. Everything works fully offline against local mock data. If `VITE_ANTHROPIC_API_KEY` is set, design uploads get analyzed by Claude's vision API instead of the built-in mock analyzer, and the app still works fine without it.

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

Feature work in this repo runs through four specialized roles defined in `.claude/agents/`: a **Brainstorm** agent that comes up with ideas and stress-tests them against the principles above, a **Planner** that turns approved ideas into sequenced implementation plans, an **Implementer** that writes the code, and an **Auditor** that checks the result against the same principles before it ships. Nothing merges on the strength of one opinion.

---

This is a solo-built beta project, so expect rough edges. Issues and PRs are welcome.
