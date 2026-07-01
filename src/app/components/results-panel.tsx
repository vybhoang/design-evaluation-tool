import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle, CheckCircle2, Info, XCircle, BookOpen, Brain, Users,
  ArrowRight, Download, Filter, Accessibility, Eye, ShieldAlert,
  HelpCircle, Beaker, Flag, BookCheck, CircleDashed, MinusCircle,
  FileText, Copy, Check, ChevronDown, Award, Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { DisclosureBanner } from "./disclosure-banner";
import { InterviewRehearsal } from "./interview-rehearsal";
import { ValidationDialog } from "./validation-dialog";
import type { ValidationEvidence } from "./validation-store";
import { evidenceFor, validationStatus } from "./validation-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { HumanTestingPanel } from "./human-testing";
import type {
  AnalysisResult, Severity, ResearchFinding, CognitivePrinciple,
  AudienceLens, Confidence, Kudos,
} from "./analysis-data";

export function triageScore(f: ResearchFinding, validations: ValidationEvidence[]): number {
  const sev  = f.severity   === "critical" ? 4 : f.severity   === "warning" ? 2 : f.severity  === "info" ? 1 : 0;
  const conf = f.confidence === "high"     ? 1.0 : f.confidence === "medium" ? 0.8 : 0.5;
  const bonus = validationStatus(validations, f.id) === "unvalidated" ? 1.2 : 1.0;
  return sev * conf * bonus;
}

export const severityMeta: Record<Severity, { icon: any; label: string }> = {
  critical: { icon: XCircle, label: "Critical" },
  warning: { icon: AlertTriangle, label: "Warning" },
  info: { icon: Info, label: "Insight" },
  pass: { icon: CheckCircle2, label: "Pass" },
};

const confidenceMeta: Record<Confidence, { label: string; explain: string }> = {
  high: {
    label: "Deterministic",
    explain: "Measurable rule (e.g. WCAG contrast, touch target size). Reliable.",
  },
  medium: {
    label: "Heuristic",
    explain: "Pattern-matching against established UX principles. Useful but not proof.",
  },
  low: {
    label: "Speculative",
    explain: "AI can't actually verify this. Treat as a hypothesis to test with real users.",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = severityMeta[severity];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <Icon className="size-3" /> {m.label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const m = confidenceMeta[confidence];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
          <Beaker className="size-3" /> {m.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{m.explain}</TooltipContent>
    </Tooltip>
  );
}

export function EmptyResults({ hasImage = false }: { hasImage?: boolean }) {
  const steps = [
    { n: 1, label: "Drop a design", done: hasImage, hint: "PNG, JPG, or sample on the left" },
    { n: 2, label: "Set context", done: hasImage, hint: "Type, audience, goal" },
    { n: 3, label: "Run analysis", done: false, hint: "Heuristic + cognitive checks" },
  ];
  return (
    <Card className="h-full flex items-center justify-center border-dashed min-h-[420px]">
      <CardContent className="max-w-sm py-12">
        <h2 className="font-serif text-2xl tracking-tight mb-2">
          A second pair of eyes — before the real ones.
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {hasImage
            ? "Ready when you are. Press Run analysis to see what to fix and what to ask users."
            : "Drop a screen on the left. We check it against Nielsen, WCAG, and cognitive-load research, then hand you a script for the real test."}
        </p>
        <ol className="space-y-3 border-l pl-4">
          {steps.map((s) => (
            <li key={s.n} className="flex items-start gap-3 text-sm relative">
              <span
                className={`absolute -left-[1.4rem] size-2 rounded-full mt-1.5 ${
                  s.done ? "bg-foreground" : "bg-border ring-4 ring-background"
                }`}
              />
              <div>
                <div className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.hint}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-xs text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1.5"><BookOpen className="size-3.5" /> Heuristics</span>
          <span className="flex items-center gap-1.5"><Brain className="size-3.5" /> Principles</span>
          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> Real users</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniScore({ icon: Icon, label, value, tip }: { icon: any; label: string; value: number; tip?: string }) {
  const color = value >= 80 ? "text-emerald-600" : value >= 60 ? "text-amber-600" : "text-red-600";
  const bar = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className="size-3" /> {label}
          {tip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{tip}</TooltipContent>
            </Tooltip>
          )}
        </span>
        <span className={color}>{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
        <div className={`h-full ${bar} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const statusMeta = {
  unvalidated: { icon: CircleDashed, label: "Unvalidated" },
  confirmed: { icon: CheckCircle2, label: "Confirmed by users" },
  refuted: { icon: XCircle, label: "Refuted by users" },
  mixed: { icon: MinusCircle, label: "Mixed evidence" },
} as const;

function ValidationBadge({ status }: { status: keyof typeof statusMeta }) {
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3" /> {m.label}
    </span>
  );
}

function FindingCard({
  f, displayNumber, active, onSelect, validations, onAddEvidence, onDeleteEvidence,
  openEvidence, onCloseEvidence,
}: {
  f: ResearchFinding;
  displayNumber: number;
  active: boolean;
  onSelect: () => void;
  validations: ValidationEvidence[];
  onAddEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
  onDeleteEvidence: (id: string) => void;
  openEvidence?: true;
  onCloseEvidence?: () => void;
}) {
  const status = validationStatus(validations, f.id);
  const ev = evidenceFor(validations, f.id);
  return (
    <div
      className={`rounded-lg border bg-card transition-all ${
        active ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
      }`}
    >
      {/* Collapsed header — always visible */}
      <button onClick={onSelect} className="w-full text-left p-3 flex items-center gap-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="size-5 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 text-[10px] font-semibold cursor-help"
            >
              {displayNumber}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            Triage #{displayNumber} — Severity × Confidence tier, unvalidated findings prioritised.
          </TooltipContent>
        </Tooltip>
        <span className="font-medium flex-1 min-w-0 text-sm leading-snug line-clamp-2">{f.principle}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <SeverityBadge severity={f.severity} />
          {status !== "unvalidated" && <ValidationBadge status={status} />}
          <ChevronDown
            className={`size-3.5 text-muted-foreground/60 transition-transform duration-200 ${active ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded details — only when active */}
      {active && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-current/10 pt-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceBadge confidence={f.confidence} />
            <span className="text-xs text-muted-foreground">{f.source}</span>
          </div>
          <p className="text-sm">{f.observation}</p>
          {f.rule && (
            <div className="rounded-md border bg-muted/50 p-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Check</div>
                <div className="font-mono">{f.rule.check}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Observed</div>
                <div className={`font-mono ${f.rule.passes ? "text-emerald-700" : "text-red-700"}`}>
                  {f.rule.observed}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-wide">Threshold</div>
                <div className="font-mono text-muted-foreground">{f.rule.threshold}</div>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm">
            <ArrowRight className="size-4 mt-0.5 text-primary shrink-0" />
            <span><span className="text-muted-foreground">Recommend:</span> {f.recommendation}</span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-current/10">
            <div className="flex items-center gap-2">
              <ValidationBadge status={status} />
              {ev.length > 0 && (
                <span className="text-xs text-muted-foreground">{ev.length} log{ev.length === 1 ? "" : "s"}</span>
              )}
            </div>
            <ValidationDialog
              finding={f}
              validations={validations}
              onAdd={onAddEvidence}
              onDelete={onDeleteEvidence}
              open={openEvidence}
              onOpenChange={(v) => { if (!v) onCloseEvidence?.(); }}
              trigger={
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
                  <BookCheck className="size-3.5" />
                  {ev.length === 0 ? "Add real-user evidence" : "Log more evidence"}
                </Button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function KudosSection({ kudos }: { kudos: Kudos[] }) {
  if (kudos.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
        <Award className="size-3.5" /> Kudos — what's working well
      </div>
      <div className="space-y-2.5">
        {kudos.map((k) => (
          <div key={k.id} className="flex items-start gap-2 text-sm">
            <Sparkles className="size-3.5 mt-0.5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium">{k.title}</span>
              <p className="text-muted-foreground text-xs mt-0.5">{k.observation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrincipleRow({ p }: { p: CognitivePrinciple }) {
  const m = severityMeta[p.status];
  const Icon = m.icon;
  return (
    <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
      <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="size-4 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{p.name}</span>
          <Badge variant="secondary" className="text-xs">{p.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
        <p className="text-xs text-muted-foreground/80 mt-1 italic">{p.impact}</p>
      </div>
    </div>
  );
}

function LensCard({ l }: { l: AudienceLens }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0">
            {l.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle>{l.archetype}</CardTitle>
            <CardDescription>{l.context}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <HelpCircle className="size-3" /> Questions to ask real users
          </div>
          <ul className="space-y-1.5">
            {l.questionsToAsk.map((q, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Flag className="size-3" /> Risks to validate
          </div>
          <div className="space-y-2">
            {l.risksToValidate.map((r, i) => (
              <div key={i} className="rounded-md border bg-muted/30 p-2.5">
                <div className="text-sm">{r.risk}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Beaker className="size-3" /> {r.testMethod}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <InterviewRehearsal lens={l} />
        </div>
      </CardContent>
    </Card>
  );
}

type TestContext = { designType: string; audience: string; goal: string };

type Props = {
  result: AnalysisResult;
  activeFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  validations: ValidationEvidence[];
  onAddEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
  onDeleteEvidence: (id: string) => void;
  context?: TestContext;
  label?: string;
  /** Stable 1-based display numbers keyed by finding ID, used to align pin labels with design canvas. */
  findingNumbers?: Record<string, number>;
};

const DT_LABELS: Record<string, string> = {
  landing: "landing page", checkout: "checkout flow", dashboard: "dashboard",
  onboarding: "onboarding flow", mobile: "mobile app screen", form: "form / signup",
};
const AUD_LABELS: Record<string, string> = {
  general: "general consumer", enterprise: "enterprise user", developers: "developer",
  seniors: "senior / accessibility-first user", genz: "Gen Z / mobile-native user",
};
const AUD_SCREENING: Record<string, string> = {
  general: "- Adults 18–65 who make online purchases at least once a month",
  enterprise: "- Decision-makers or power users at companies with 50+ employees",
  developers: "- Software engineers or technical users with at least 2 years of professional experience",
  seniors: "- Adults 60+ who use digital products weekly; aim for at least 1 participant who uses assistive technology",
  genz: "- Adults 18–26 who primarily access the internet via a mobile device",
};

function findingTask(f: ResearchFinding, ctx: TestContext) {
  const p = f.principle.toLowerCase();
  const dt = DT_LABELS[ctx.designType] ?? ctx.designType;
  const aud = AUD_LABELS[ctx.audience] ?? "user";

  if (p.includes("hick") || p.includes("miller"))
    return {
      scenario: `You've just arrived at this ${dt} for the first time as a ${aud}.`,
      prompt: `Without clicking anything, scan the page and tell me out loud: what would you do first, and why?`,
      observe: ["How long before they commit to a direction?", "Do they mention feeling overwhelmed by choices?", "Do they identify the path that leads to the intended goal?"],
    };
  if (p.includes("fitts") || p.includes("touch") || p.includes("target"))
    return {
      scenario: `You've decided you want to take the main action on this ${dt}.`,
      prompt: `Go ahead and do that — think out loud as you find it and complete it.`,
      observe: ["How quickly do they locate the primary CTA?", "Any hesitation, misdirects, or corrected clicks?", "Do they express uncertainty about what the action will do?"],
    };
  if (p.includes("jakob") || p.includes("convention") || p.includes("mental model"))
    return {
      scenario: `You're using this ${dt} for the first time.`,
      prompt: `Where would you expect to find the main navigation or account area? Point to where you'd look first.`,
      observe: ["Does their expectation match the actual placement?", "Do they express surprise at any layout decision?", "How long to locate the element?"],
    };
  if (p.includes("contrast") || p.includes("wcag") || p.includes("color") || p.includes("accessibility"))
    return {
      scenario: `Take a look at this ${dt}.`,
      prompt: `Read any text you notice as you scan the page. Let me know if anything is difficult to read.`,
      observe: ["Do they skip over any low-contrast areas?", "Do they lean in or squint at any section?", "Do they explicitly mention anything as hard to read?"],
    };
  if (p.includes("peak") || p.includes("end") || p.includes("confirmation"))
    return {
      scenario: `You've just completed the main action on this ${dt}.`,
      prompt: `What are you feeling right now? What would you expect to see or happen next?`,
      observe: ["Do they express confidence the action was completed?", "Is their emotional state positive, neutral, or anxious?", "Do they know what to do next?"],
    };
  if (p.includes("restorff") || p.includes("attention") || p.includes("salience"))
    return {
      scenario: `I'll show you this ${dt} for 5 seconds, then take it away.`,
      prompt: `[Show for 5 seconds, then hide] — What do you remember? What stood out most?`,
      observe: ["Which elements do they recall? (Reveals prioritized salience)", "Did they notice the intended focal element?", "How does recall compare to the design's intended hierarchy?"],
    };
  if (p.includes("error") || p.includes("prevention"))
    return {
      scenario: `You've accidentally done something on this ${dt} and need to undo it.`,
      prompt: `How would you undo that? Walk me through what you'd do.`,
      observe: ["Do they find the undo / cancel path?", "Do they express anxiety about losing data?", "Is the confirmation step noticed or bypassed?"],
    };
  if (p.includes("aesthetic"))
    return {
      scenario: `Take a moment to look at this ${dt}.`,
      prompt: `What's your first impression? Would you trust this product based on how it looks? Tell me why.`,
      observe: ["Is the first impression positive, neutral, or negative?", "Do they connect visual quality to trust?", "Does the aesthetic match their expectations for this category?"],
    };
  return {
    scenario: `You're a ${aud} who wants to ${ctx.goal || "complete the main action"}.`,
    prompt: `Take a look at this ${dt} and walk me through what you'd do. Think aloud as you go.`,
    observe: [`Does the participant understand what this ${dt} is for?`, "Do they take the path the design intends?", "Where do they hesitate or express confusion?"],
  };
}

function generateTestPlan(result: AnalysisResult, ctx: TestContext, label: string): string {
  const eligible = result.findings.filter((f) => f.severity === "critical" || f.severity === "warning");
  const testFindings = eligible.slice(0, 5);
  const capped = eligible.length > 5;
  const dt = DT_LABELS[ctx.designType] ?? ctx.designType;
  const screening = AUD_SCREENING[ctx.audience] ?? "- Relevant users for this design";
  const sessionLen = testFindings.length <= 3 ? "30–45" : "45–60";
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const warmupPrompt =
    ctx.designType === "checkout" ? "making an online purchase"
    : ctx.designType === "dashboard" ? "using a dashboard or analytics tool"
    : ctx.designType === "onboarding" ? "signing up for a new app"
    : `using this type of product`;

  const lines: string[] = [];
  lines.push(`# Usability Test Plan`);
  lines.push(`## ${label}`);
  lines.push(`**Design type**: ${dt.charAt(0).toUpperCase() + dt.slice(1)}`);
  lines.push(`**Target audience**: ${(AUD_LABELS[ctx.audience] ?? ctx.audience).replace(/^\w/, (c) => c.toUpperCase())}`);
  lines.push(`**Research goal**: ${ctx.goal || "Understand how users interact with this design"}`);
  lines.push(`**Prepared**: ${date}`);
  lines.push(`**Recommended participants**: 5 (qualitative usability threshold — Nielsen, 1994)`);
  lines.push(`**Session length**: ~${sessionLen} min · **Format**: Moderated think-aloud`);
  lines.push(``);
  lines.push(`> **Research framing**: This plan was generated from a heuristic pre-screen. Each task tests a hypothesis derived from established UX research — not a confirmed issue. The goal of these sessions is to find out which hypotheses are real problems for *your* users.`);
  if (capped) {
    lines.push(``);
    lines.push(`> **Scope note**: Showing top 5 of ${eligible.length} critical/warning findings — capped to keep the session under ${sessionLen} min. The remaining ${eligible.length - 5} appear in the full heuristic export.`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Participant screening`);
  lines.push(screening);
  lines.push(`- Comfortable with think-aloud protocol (no prior experience required)`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Session structure`);
  lines.push(``);
  lines.push(`### Opening (5 min)`);
  lines.push(`> "Today I'll show you a ${dt}. There are no right or wrong answers — I want to understand how you think, not test your skills. Please think out loud as you go through the tasks."`);
  lines.push(``);
  lines.push(`- Start screen recording`);
  lines.push(`- Confirm participant is comfortable with think-aloud`);
  lines.push(``);
  lines.push(`### Warm-up (5 min)`);
  lines.push(`> "Walk me through how you typically approach ${warmupPrompt}."`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Tasks (${testFindings.length})`);
  lines.push(``);

  testFindings.forEach((f, i) => {
    const task = findingTask(f, ctx);
    const tier = f.confidence === "high" ? "Deterministic" : f.confidence === "medium" ? "Heuristic" : "Speculative";
    lines.push(`### Task ${i + 1} of ${testFindings.length}: ${f.principle}`);
    lines.push(``);
    lines.push(`**Research hypothesis**: ${f.observation}`);
    lines.push(`**Source**: ${f.source} · ${tier} confidence · ${f.severity.charAt(0).toUpperCase() + f.severity.slice(1)}`);
    lines.push(``);
    if (f.confidence === "low") {
      lines.push(`> ⚠️ **Speculative finding** — the AI flagged this as a pattern it cannot verify from the screenshot alone. Treat this task as exploratory: you are checking *whether* a problem exists here, not confirming one that does. Weight participant responses accordingly.`);
      lines.push(``);
    }
    lines.push(`**Scenario** *(set the scene, do not show the design yet)*:`);
    lines.push(`> ${task.scenario}`);
    lines.push(``);
    lines.push(`**Task prompt** *(read aloud, do not paraphrase)*:`);
    lines.push(`> ${task.prompt}`);
    lines.push(``);
    lines.push(`**What to watch for**:`);
    task.observe.forEach((o) => lines.push(`- ${o}`));
    lines.push(``);
    lines.push(`**Note-taking**:`);
    lines.push(`- [ ] Completed without assistance`);
    lines.push(`- [ ] Hesitated before acting`);
    lines.push(`- [ ] Expressed confusion or frustration`);
    lines.push(`- [ ] Asked a question or requested help`);
    lines.push(`- **SEQ — Single Ease Question (1 = very difficult, 7 = very easy; Sauro & Dumas, 2009)**: ___`);
    lines.push(`- **Time on task**: ___`);
    lines.push(`- **Observer notes**: ___________`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  });

  lines.push(`## Debrief (10 min)`);
  lines.push(``);
  lines.push(`1. "What stood out most — positively or negatively?"`);
  lines.push(`2. "What, if anything, would stop you from: ${ctx.goal}?"`);
  lines.push(`3. "On a scale of 1–10, how confident are you that you could complete the main action again without help?"`);

  if (result.lenses.length > 0 && result.lenses[0].questionsToAsk.length > 0) {
    lines.push(``);
    lines.push(`**Additional questions (${result.lenses[0].archetype} archetype)**:`);
    result.lenses[0].questionsToAsk.forEach((q, i) => lines.push(`${i + 4}. "${q}"`));
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## After each session`);
  lines.push(``);
  lines.push(`1. Note immediately: which hypotheses did this session confirm or refute?`);
  lines.push(`2. Open Heurizztik → this analysis → click **"Log real-user evidence"** on each finding`);
  lines.push(`3. Record: verdict (confirmed / refuted / inconclusive), method, sample size, and note`);
  lines.push(``);
  lines.push(`After 5 sessions, check the **Patterns** tab to see which findings held across participants.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Generated by Heurizztik · ${date} · Heuristic pre-screen only, not a substitute for professional UX research*`);

  return lines.join("\n");
}

function TestPlanDialog({ result, context, label }: { result: AnalysisResult; context: TestContext; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const plan = useMemo(() => generateTestPlan(result, context, label), [result, context, label]);
  const eligibleCount = result.findings.filter((f) => f.severity === "critical" || f.severity === "warning").length;
  const testCount = Math.min(eligibleCount, 5);

  const download = () => {
    const blob = new Blob([plan], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-plan-${label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => {
    navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
      >
        <FileText className="size-3.5" /> Test plan
      </button>
      <DialogContent className="max-w-2xl flex flex-col gap-0 p-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Usability Test Plan</DialogTitle>
          <DialogDescription>
            {eligibleCount > 5
              ? `Top ${testCount} of ${eligibleCount} eligible findings — capped for session length. Copy into Notion, Confluence, or download as Markdown.`
              : `${testCount} task${testCount === 1 ? "" : "s"} — ready to run with 5 participants. Copy into Notion, Confluence, or download as Markdown.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto border-y bg-muted/30 px-6 py-4">
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">{plan}</pre>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 shrink-0">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-primary/90 transition-colors"
          >
            <Download className="size-3.5" /> Download .md
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResultsPanel({
  result, activeFindingId, onSelectFinding,
  validations, onAddEvidence, onDeleteEvidence,
  context, label, findingNumbers,
}: Props) {
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(
    new Set(["critical", "warning", "info", "pass"])
  );
  const [openEvidenceForId, setOpenEvidenceForId] = useState<string | null>(null);

  const counts = useMemo(
    () =>
      result.findings.reduce(
        (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }),
        {} as Record<Severity, number>
      ),
    [result]
  );

  // Sorted by triage score: severity × confidence × unvalidated-bonus
  const visibleFindings = useMemo(
    () =>
      result.findings
        .filter((f) => severityFilter.has(f.severity))
        .map((f) => ({ f, score: triageScore(f, validations) }))
        .sort((a, b) => b.score - a.score)
        .map(({ f }) => f),
    [result, severityFilter, validations]
  );

  // Keyboard navigation for findings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) return;
      if (e.metaKey || e.altKey) return;
      if (!visibleFindings.length) return;

      const currentIdx = activeFindingId
        ? visibleFindings.findIndex((f) => f.id === activeFindingId)
        : -1;

      if (e.ctrlKey) {
        if (e.key.toLowerCase() === "e" && activeFindingId) {
          e.preventDefault();
          setOpenEvidenceForId(activeFindingId);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        onSelectFinding(visibleFindings[(currentIdx + 1) % visibleFindings.length].id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (currentIdx <= 0 ? visibleFindings.length : currentIdx) - 1;
        onSelectFinding(visibleFindings[prev].id);
      } else if ((e.key === "Enter" || e.key === " ") && activeFindingId) {
        e.preventDefault();
        onSelectFinding(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFindingId, visibleFindings, onSelectFinding]);

  const validatedCount = useMemo(
    () => result.findings.filter((f) => validationStatus(validations, f.id) !== "unvalidated").length,
    [result, validations]
  );

  const toggleSev = (s: Severity) => {
    const next = new Set(severityFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSeverityFilter(next);
  };

  const exportReport = () => {
    const lines: string[] = [];
    lines.push(`# UX Heuristic Evaluation`);
    lines.push(`> This report is a first-pass AI heuristic eval. It is not a substitute for testing with real users.\n`);
    lines.push(`Clarity (heuristic): ${result.clarityScore}/100`);
    lines.push(`Accessibility (rule-based): ${result.accessibilityScore}/100\n`);
    if (result.kudos.length > 0) {
      lines.push(`## Kudos — what's working well`);
      result.kudos.forEach((k) => {
        lines.push(`- **${k.title}**: ${k.observation}`);
      });
      lines.push(``);
    }
    lines.push(`## Findings (${result.findings.length})`);
    result.findings.forEach((f, i) => {
      const status = validationStatus(validations, f.id);
      lines.push(`\n### ${i + 1}. ${f.principle} [${f.severity.toUpperCase()}, ${f.confidence} confidence, ${status}]`);
      lines.push(`Source: ${f.source}`);
      lines.push(`Observation: ${f.observation}`);
      lines.push(`Recommendation: ${f.recommendation}`);
      const ev = evidenceFor(validations, f.id);
      if (ev.length > 0) {
        lines.push(`Real-user evidence:`);
        ev.forEach((e) => {
          lines.push(`  - [${e.verdict}] ${e.method}${e.sampleSize ? ` (n=${e.sampleSize})` : ""}: ${e.note}`);
        });
      }
    });
    lines.push(`\n## Cognitive principles checklist`);
    result.principles.forEach((p) => {
      lines.push(`- [${p.status.toUpperCase()}] ${p.name} (${p.category}): ${p.description}`);
    });
    lines.push(`\n## Audience lenses (validate with real humans)`);
    result.lenses.forEach((l) => {
      lines.push(`\n### ${l.archetype}`);
      lines.push(`Context: ${l.context}`);
      lines.push(`Questions to ask:`);
      l.questionsToAsk.forEach((q) => lines.push(`  - ${q}`));
      lines.push(`Risks to validate:`);
      l.risksToValidate.forEach((r) => lines.push(`  - ${r.risk} (${r.testMethod})`));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ux-heuristic-eval.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <DisclosureBanner id="heuristic-first-pass" icon={ShieldAlert} />

      <Card className="shrink-0">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2.5">
              <MiniScore
                icon={Eye}
                label="Clarity (heuristic)"
                value={result.clarityScore}
                tip="Visual hierarchy & salience signals derived from rule-based checks. Approximate."
              />
              <MiniScore
                icon={Accessibility}
                label="Accessibility (rule-based)"
                value={result.accessibilityScore}
                tip="Deterministic checks like contrast and touch targets. Reasonably reliable."
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {context && label && (
                <TestPlanDialog result={result} context={context} label={label} />
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportReport}>
                <Download className="size-3.5" /> Export
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-1.5">
              <XCircle className="size-3.5 text-muted-foreground" /> {counts.critical || 0} critical
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-muted-foreground" /> {counts.warning || 0} warnings
            </div>
            {result.kudos.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <Award className="size-3.5" /> {result.kudos.length} kudos
              </div>
            )}
            <div className="flex-1 min-w-[160px] flex items-center gap-2">
              <BookCheck className="size-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">Validated by users</span>
                  <span className={validatedCount === 0 ? "text-muted-foreground" : "text-emerald-600"}>
                    {validatedCount}/{result.findings.length}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(validatedCount / Math.max(1, result.findings.length)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="research" className="flex flex-col">
        <TabsList className="shrink-0 grid grid-cols-3 w-full">
          <TabsTrigger value="research" className="gap-1.5">
            <BookOpen className="size-4" /> Heuristics
          </TabsTrigger>
          <TabsTrigger value="cognitive" className="gap-1.5">
            <Brain className="size-4" /> Principles
          </TabsTrigger>
          <TabsTrigger value="humans" className="gap-1.5">
            <Users className="size-4" /> Humans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="research" className="mt-3 flex flex-col gap-2">
          <KudosSection kudos={result.kudos} />
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Filter className="size-3.5 text-muted-foreground" />
            {(["critical", "warning", "info", "pass"] as Severity[]).map((s) => {
              const m = severityMeta[s];
              const on = severityFilter.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSev(s)}
                  className={`px-2 py-1 rounded-full border transition-all ${
                    on ? "bg-foreground text-background border-transparent" : "bg-muted/50 text-muted-foreground border-transparent opacity-60"
                  }`}
                >
                  {m.label} · {counts[s] || 0}
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            {visibleFindings.map((f, idx) => (
              <FindingCard
                key={f.id}
                f={f}
                displayNumber={findingNumbers?.[f.id] ?? idx + 1}
                active={activeFindingId === f.id}
                onSelect={() => onSelectFinding(activeFindingId === f.id ? null : f.id)}
                validations={validations}
                onAddEvidence={onAddEvidence}
                onDeleteEvidence={onDeleteEvidence}
                openEvidence={openEvidenceForId === f.id ? true : undefined}
                onCloseEvidence={() => setOpenEvidenceForId(null)}
              />
            ))}
            {visibleFindings.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">
                No findings match the current filter.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cognitive" className="mt-3">
          <Card>
            <CardContent className="p-2 divide-y">
              {result.principles.map((p) => <PrincipleRow key={p.id} p={p} />)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="humans" className="mt-3">
          <div className="space-y-3">
            {result.lenses.map((l) => <LensCard key={l.id} l={l} />)}
            <HumanTestingPanel result={result} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
