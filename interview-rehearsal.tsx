import { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle2, Info, XCircle, BookOpen, Brain, Users,
  Sparkles, ArrowRight, Download, Filter, Accessibility, Eye, ShieldAlert,
  HelpCircle, Beaker, Flag, BookCheck, CircleDashed, MinusCircle,
} from "lucide-react";
import { InterviewRehearsal } from "./interview-rehearsal";
import { ValidationDialog } from "./validation-dialog";
import type { ValidationEvidence } from "./validation-store";
import { evidenceFor, validationStatus } from "./validation-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { HumanTestingPanel } from "./human-testing";
import type {
  AnalysisResult, Severity, ResearchFinding, CognitivePrinciple,
  AudienceLens, Confidence,
} from "./analysis-data";

const severityMeta: Record<Severity, { icon: any; color: string; bg: string; label: string }> = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Warning" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Insight" },
  pass: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Pass" },
};

const confidenceMeta: Record<Confidence, { label: string; color: string; explain: string }> = {
  high: {
    label: "Deterministic",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    explain: "Measurable rule (e.g. WCAG contrast, touch target size). Reliable.",
  },
  medium: {
    label: "Heuristic",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    explain: "Pattern-matching against established UX principles. Useful but not proof.",
  },
  low: {
    label: "Speculative",
    color: "bg-muted text-muted-foreground border-border",
    explain: "AI can't actually verify this. Treat as a hypothesis to test with real users.",
  },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const m = severityMeta[severity];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.color} ${m.bg}`}>
      <Icon className="size-3" /> {m.label}
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const m = confidenceMeta[confidence];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`gap-1 cursor-help ${m.color}`}>
          <Beaker className="size-3" /> {m.label}
        </Badge>
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
          <span className="flex items-center gap-1.5"><Brain className="size-3.5" /> Cognitive</span>
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
  unvalidated: { icon: CircleDashed, color: "text-muted-foreground", bg: "bg-muted/50 border-border", label: "Unvalidated" },
  confirmed: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Confirmed by users" },
  refuted: { icon: XCircle, color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Refuted by users" },
  mixed: { icon: MinusCircle, color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Mixed evidence" },
} as const;

function ValidationBadge({ status }: { status: keyof typeof statusMeta }) {
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.color} ${m.bg}`}>
      <Icon className="size-3" /> {m.label}
    </Badge>
  );
}

function FindingCard({
  f, index, active, onSelect, validations, onAddEvidence, onDeleteEvidence,
}: {
  f: ResearchFinding;
  index: number;
  active: boolean;
  onSelect: () => void;
  validations: ValidationEvidence[];
  onAddEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
  onDeleteEvidence: (id: string) => void;
}) {
  const m = severityMeta[f.severity];
  const status = validationStatus(validations, f.id);
  const ev = evidenceFor(validations, f.id);
  return (
    <div
      className={`w-full text-left rounded-lg border p-4 transition-all ${m.bg} ${
        active ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"
      }`}
    >
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className={`size-6 rounded-full ${m.color.replace("text-", "bg-").replace("-600", "-500")} text-white flex items-center justify-center shrink-0 text-xs font-semibold`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{f.principle}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ConfidenceBadge confidence={f.confidence} />
                <SeverityBadge severity={f.severity} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{f.source}</p>
            <p className="mt-2 text-sm">{f.observation}</p>
            {f.rule && (
              <div className="mt-2 rounded-md border bg-white/60 p-2 grid grid-cols-3 gap-2 text-xs">
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
            <div className="mt-3 flex items-start gap-2 text-sm">
              <ArrowRight className="size-4 mt-0.5 text-primary shrink-0" />
              <span><span className="text-muted-foreground">Recommend:</span> {f.recommendation}</span>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-3 pt-3 border-t border-current/10 flex items-center justify-between gap-2 flex-wrap">
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
          trigger={
            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
              <BookCheck className="size-3.5" />
              {ev.length === 0 ? "Add real-user evidence" : "Log more evidence"}
            </Button>
          }
        />
      </div>
    </div>
  );
}

function PrincipleRow({ p }: { p: CognitivePrinciple }) {
  const m = severityMeta[p.status];
  const Icon = m.icon;
  return (
    <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
      <div className={`size-8 rounded-md ${m.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`size-4 ${m.color}`} />
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

type Props = {
  result: AnalysisResult;
  activeFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  validations: ValidationEvidence[];
  onAddEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
  onDeleteEvidence: (id: string) => void;
};

export function ResultsPanel({
  result, activeFindingId, onSelectFinding,
  validations, onAddEvidence, onDeleteEvidence,
}: Props) {
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(
    new Set(["critical", "warning", "info", "pass"])
  );

  const counts = useMemo(
    () =>
      result.findings.reduce(
        (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }),
        {} as Record<Severity, number>
      ),
    [result]
  );

  const visibleFindings = useMemo(
    () => result.findings.filter((f) => severityFilter.has(f.severity)),
    [result, severityFilter]
  );

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
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Honesty banner */}
      <div className="shrink-0 rounded-lg border bg-amber-50 border-amber-200 p-3 flex items-start gap-2.5">
        <ShieldAlert className="size-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-medium">This is a heuristic first pass, not user research.</span>{" "}
          An LLM can pattern-match against established UX principles, but it doesn't experience
          your design the way a person does. Use the findings as a checklist, then validate
          with real humans before treating anything as truth.
        </div>
      </div>

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
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={exportReport}>
              <Download className="size-3.5" /> Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-1.5">
              <XCircle className="size-3.5 text-red-500" /> {counts.critical || 0} critical
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-500" /> {counts.warning || 0} warnings
            </div>
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

      <Tabs defaultValue="research" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 grid grid-cols-3 w-full">
          <TabsTrigger value="research" className="gap-1.5">
            <BookOpen className="size-4" /> Heuristics
          </TabsTrigger>
          <TabsTrigger value="cognitive" className="gap-1.5">
            <Brain className="size-4" /> Cognitive
          </TabsTrigger>
          <TabsTrigger value="humans" className="gap-1.5">
            <Users className="size-4" /> Humans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="research" className="flex-1 min-h-0 mt-3 flex flex-col gap-2">
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
                    on ? `${m.bg} ${m.color}` : "bg-muted/50 text-muted-foreground border-transparent opacity-60"
                  }`}
                >
                  {m.label} · {counts[s] || 0}
                </button>
              );
            })}
          </div>
          <ScrollArea className="flex-1 min-h-0 pr-3">
            <div className="space-y-3">
              {visibleFindings.map((f) => (
                <FindingCard
                  key={f.id}
                  f={f}
                  index={result.findings.indexOf(f)}
                  active={activeFindingId === f.id}
                  onSelect={() => onSelectFinding(activeFindingId === f.id ? null : f.id)}
                  validations={validations}
                  onAddEvidence={onAddEvidence}
                  onDeleteEvidence={onDeleteEvidence}
                />
              ))}
              {visibleFindings.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">
                  No findings match the current filter.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="cognitive" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="flex-1 min-h-0 pr-3">
            <Card>
              <CardContent className="p-2 divide-y">
                {result.principles.map((p) => <PrincipleRow key={p.id} p={p} />)}
              </CardContent>
            </Card>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="humans" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="flex-1 min-h-0 pr-3">
            <div className="space-y-3">
              <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Synthetic users for iteration, not validation.</span>{" "}
                You can rehearse interview scripts against an archetype to spot leading questions or
                gaps — useful prep work. But a general LLM isn't fine-tuned on your user base, so
                the responses are fiction. <span className="font-medium text-foreground">No real users, no UX.</span>
              </div>
              {result.lenses.map((l) => <LensCard key={l.id} l={l} />)}
              <HumanTestingPanel result={result} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
