import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, X,
  CheckCircle2, XCircle, MinusCircle,
  Activity, Users, Sparkles, AlertCircle,
  Flame, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import type { HistoryEntry } from "./history-store";
import type { ValidationEvidence } from "./validation-store";
import { formatRelative } from "./history-store";
import type { Severity } from "./analysis-data";

type Props = {
  history: HistoryEntry[];
  validations: ValidationEvidence[];
  onClose: () => void;
};

type RunPoint = { idx: number; label: string; createdAt: number; severity: Severity };

type Aggregate = {
  principle: string;
  source: string;
  totalOccurrences: number;
  confirmed: number;
  refuted: number;
  inconclusive: number;
  recentNotes: { note: string; verdict: string; runLabel: string; createdAt: number; sampleSize?: number }[];
  runIndices: number[];
  runData: RunPoint[];
  criticalOrWarningRuns: number;
  confirmedRunCount: number;
};

type Trend = "rising" | "declining" | "stable" | null;

function computeTrend(runIndices: number[], totalRuns: number): Trend {
  if (runIndices.length < 2 || totalRuns < 4) return null;
  const avg = runIndices.reduce((s, i) => s + i, 0) / runIndices.length;
  const mid = (totalRuns - 1) / 2;
  if (avg > mid * 1.3) return "rising";
  if (avg < mid * 0.7) return "declining";
  return "stable";
}

// Mini per-run severity timeline
function MiniTimeline({ runData, totalRuns }: { runData: RunPoint[]; totalRuns: number }) {
  const sevColor: Record<Severity, string> = {
    critical: "bg-red-500",
    warning:  "bg-amber-400",
    info:     "bg-blue-400",
    pass:     "bg-emerald-500",
  };
  return (
    <div className="flex items-center gap-0.5 flex-wrap" aria-label="Run timeline">
      {Array.from({ length: totalRuns }, (_, i) => {
        const d = runData.find((r) => r.idx === i);
        return (
          <div
            key={i}
            className={`size-2.5 rounded-sm transition-colors ${d ? sevColor[d.severity] : "bg-muted"}`}
            title={d ? `Run ${i + 1}: ${d.severity}` : `Run ${i + 1}: not present`}
          />
        );
      })}
    </div>
  );
}

function AggCard({ a, totalRuns, variant = "normal" }: { a: Aggregate; totalRuns: number; variant?: "failure" | "validated" | "normal" }) {
  const totalEv = a.confirmed + a.refuted + a.inconclusive;
  const trend = computeTrend(a.runIndices, totalRuns);

  const borderClass =
    variant === "failure"  ? "border-red-300 bg-red-500/5 dark:border-red-800 dark:bg-red-500/10" :
    variant === "validated" ? "border-emerald-300 bg-emerald-500/5 dark:border-emerald-800 dark:bg-emerald-500/10" :
    "";

  return (
    <Card className={borderClass}>
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{a.principle}</span>
              {variant === "failure" && (
                <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-xs gap-1">
                  <Flame className="size-3" /> Recurring failure
                </Badge>
              )}
              {variant === "validated" && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs gap-1">
                  <ShieldCheck className="size-3" /> Validated
                </Badge>
              )}
              {variant === "normal" && a.confirmed >= 2 && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs gap-1">
                  <TrendingUp className="size-3" /> Pattern
                </Badge>
              )}
              {a.totalOccurrences >= 2 && totalEv === 0 && (
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 text-xs gap-1">
                  <AlertCircle className="size-3" /> Needs attention
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {a.totalOccurrences} run{a.totalOccurrences === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{a.source}</div>
          </div>
          <div className="flex items-center gap-3">
            {trend && <TrendIndicator trend={trend} />}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> {a.confirmed}
              </span>
              <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                <XCircle className="size-3" /> {a.refuted}
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <MinusCircle className="size-3" /> {a.inconclusive}
              </span>
            </div>
          </div>
        </div>

        {/* Evidence progress bar */}
        {totalEv > 0 && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
            {a.confirmed > 0 && (
              <div className="h-full bg-emerald-500" style={{ width: `${(a.confirmed / totalEv) * 100}%` }} />
            )}
            {a.refuted > 0 && (
              <div className="h-full bg-red-500" style={{ width: `${(a.refuted / totalEv) * 100}%` }} />
            )}
            {a.inconclusive > 0 && (
              <div className="h-full bg-amber-400" style={{ width: `${(a.inconclusive / totalEv) * 100}%` }} />
            )}
          </div>
        )}

        {/* Timeline */}
        {totalRuns >= 2 && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Severity per run</div>
            <MiniTimeline runData={a.runData} totalRuns={totalRuns} />
          </div>
        )}

        {/* Recent notes */}
        {a.recentNotes.length > 0 && (
          <div className="space-y-1.5">
            {a.recentNotes.map((n, i) => (
              <div key={i} className="text-xs flex gap-2 items-start">
                <Badge
                  variant="outline"
                  className={
                    n.verdict === "confirmed"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                      : n.verdict === "refuted"
                      ? "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                      : "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                  }
                >
                  {n.verdict}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div>{n.note}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">
                    {n.runLabel}{n.sampleSize ? ` · n=${n.sampleSize}` : ""} · {formatRelative(n.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalEv === 0 && (
          <div className="text-xs text-muted-foreground italic">
            No real-user evidence yet. Still a hypothesis.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PatternsView({ history, validations, onClose }: Props) {
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => a.createdAt - b.createdAt),
    [history]
  );

  const aggregates = useMemo<Aggregate[]>(() => {
    const byPrinciple = new Map<string, Aggregate>();
    sortedHistory.forEach((h, runIdx) => {
      h.result.findings.forEach((f) => {
        const evidence = validations.filter((v) => v.findingId === f.id);
        const agg = byPrinciple.get(f.principle) ?? {
          principle: f.principle,
          source: f.source,
          totalOccurrences: 0,
          confirmed: 0,
          refuted: 0,
          inconclusive: 0,
          recentNotes: [],
          runIndices: [],
          runData: [],
          criticalOrWarningRuns: 0,
          confirmedRunCount: 0,
        };

        agg.totalOccurrences += 1;
        agg.runIndices.push(runIdx);
        agg.runData.push({ idx: runIdx, label: h.label, createdAt: h.createdAt, severity: f.severity });

        if (f.severity === "critical" || f.severity === "warning") {
          agg.criticalOrWarningRuns += 1;
        }

        const hasConfirmedHere = evidence.some((e) => e.verdict === "confirmed");
        if (hasConfirmedHere) agg.confirmedRunCount += 1;

        evidence.forEach((e) => {
          if (e.verdict === "confirmed") agg.confirmed += 1;
          else if (e.verdict === "refuted") agg.refuted += 1;
          else agg.inconclusive += 1;
          agg.recentNotes.push({
            note: e.note,
            verdict: e.verdict,
            runLabel: h.label,
            createdAt: e.createdAt,
            sampleSize: e.sampleSize,
          });
        });

        byPrinciple.set(f.principle, agg);
      });
    });
    return Array.from(byPrinciple.values())
      .map((a) => ({
        ...a,
        recentNotes: a.recentNotes.sort((x, y) => y.createdAt - x.createdAt).slice(0, 3),
      }))
      .sort((a, b) => {
        const aEv = a.confirmed + a.refuted + a.inconclusive;
        const bEv = b.confirmed + b.refuted + b.inconclusive;
        if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
        if (bEv !== aEv) return bEv - aEv;
        return b.totalOccurrences - a.totalOccurrences;
      });
  }, [sortedHistory, validations]);

  const recurringFailures = useMemo(
    () => aggregates.filter((a) => a.criticalOrWarningRuns >= 3),
    [aggregates]
  );
  const validatedAcrossRuns = useMemo(
    () => aggregates.filter((a) => a.confirmedRunCount >= 2),
    [aggregates]
  );

  const totalRuns = history.length;
  const totalEvidence = validations.length;
  const totalConfirmed = validations.filter((v) => v.verdict === "confirmed").length;
  const confirmedPatterns = aggregates.filter((a) => a.confirmed >= 2).length;
  const needAttention = aggregates.filter(
    (a) => a.totalOccurrences >= 2 && a.confirmed + a.refuted + a.inconclusive === 0
  ).length;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" /> Patterns across runs
          </CardTitle>
          <CardDescription>
            Recurring findings ranked by how often real users have confirmed them.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <Separator />

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Stat icon={Sparkles} label="Runs" value={totalRuns} />
        <Stat icon={Users} label="Evidence logs" value={totalEvidence} />
        <Stat icon={CheckCircle2} label="Confirmed" value={totalConfirmed} color="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={TrendingUp} label="Patterns" value={confirmedPatterns} color="text-primary" />
        <Stat
          icon={AlertCircle}
          label="Need attention"
          value={needAttention}
          color={needAttention > 0 ? "text-amber-600 dark:text-amber-400" : ""}
        />
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {aggregates.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No runs yet. Analyses you complete will be aggregated here.
            </div>
          )}

          {/* Recurring failures */}
          {recurringFailures.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="size-4 text-red-600" />
                <h2 className="text-sm font-semibold">Recurring failures</h2>
                <Badge variant="outline" className="text-red-700 border-red-200 text-xs">{recurringFailures.length}</Badge>
                <span className="text-xs text-muted-foreground">— critical or warning in ≥ 3 runs</span>
              </div>
              <div className="space-y-3">
                {recurringFailures.map((a) => (
                  <AggCard key={a.principle + "-failure"} a={a} totalRuns={totalRuns} variant="failure" />
                ))}
              </div>
            </section>
          )}

          {/* Validated across runs */}
          {validatedAcrossRuns.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="size-4 text-emerald-600" />
                <h2 className="text-sm font-semibold">Validated across runs</h2>
                <Badge variant="outline" className="text-emerald-700 border-emerald-200 text-xs">{validatedAcrossRuns.length}</Badge>
                <span className="text-xs text-muted-foreground">— confirmed by real users in ≥ 2 separate sessions</span>
              </div>
              <div className="space-y-3">
                {validatedAcrossRuns.map((a) => (
                  <AggCard key={a.principle + "-validated"} a={a} totalRuns={totalRuns} variant="validated" />
                ))}
              </div>
            </section>
          )}

          {/* All findings */}
          <section>
            {(recurringFailures.length > 0 || validatedAcrossRuns.length > 0) && (
              <div className="flex items-center gap-2 mb-3">
                <Activity className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">All findings</h2>
                <Badge variant="outline" className="text-xs">{aggregates.length}</Badge>
              </div>
            )}
            <div className="space-y-3">
              {aggregates.map((a) => (
                <AggCard key={a.principle} a={a} totalRuns={totalRuns} variant="normal" />
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </Card>
  );
}

function TrendIndicator({ trend }: { trend: Trend }) {
  if (trend === "rising")
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400" title="Appearing more in recent runs">
        <TrendingUp className="size-3" /> Rising
      </span>
    );
  if (trend === "declining")
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400" title="Appearing less in recent runs">
        <TrendingDown className="size-3" /> Declining
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Consistent frequency">
      <Minus className="size-3" /> Stable
    </span>
  );
}

function Stat({ icon: Icon, label, value, color = "" }: { icon: React.ElementType; label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-md bg-muted flex items-center justify-center">
        <Icon className={`size-4 ${color || "text-muted-foreground"}`} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div style={{ fontSize: "1.125rem", fontWeight: 600 }} className={color}>{value}</div>
      </div>
    </div>
  );
}
