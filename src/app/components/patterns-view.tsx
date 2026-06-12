import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, X,
  CheckCircle2, XCircle, MinusCircle,
  Activity, Users, Sparkles, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import type { HistoryEntry } from "./history-store";
import type { ValidationEvidence } from "./validation-store";
import { formatRelative } from "./history-store";

type Props = {
  history: HistoryEntry[];
  validations: ValidationEvidence[];
  onClose: () => void;
};

type Aggregate = {
  principle: string;
  source: string;
  totalOccurrences: number;
  confirmed: number;
  refuted: number;
  inconclusive: number;
  recentNotes: { note: string; verdict: string; runLabel: string; createdAt: number; sampleSize?: number }[];
  runIndices: number[]; // chronological position (0 = oldest run) of each occurrence
};

type Trend = "rising" | "declining" | "stable" | null;

// Rising = biased toward newer runs (problem not improving).
// Declining = biased toward older runs (may have been addressed).
function computeTrend(runIndices: number[], totalRuns: number): Trend {
  if (runIndices.length < 2 || totalRuns < 4) return null;
  const avg = runIndices.reduce((s, i) => s + i, 0) / runIndices.length;
  const mid = (totalRuns - 1) / 2;
  if (avg > mid * 1.3) return "rising";
  if (avg < mid * 0.7) return "declining";
  return "stable";
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
        };
        agg.totalOccurrences += 1;
        agg.runIndices.push(runIdx);
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
      .map((a) => ({ ...a, recentNotes: a.recentNotes.sort((x, y) => y.createdAt - x.createdAt).slice(0, 3) }))
      .sort((a, b) => {
        const aEv = a.confirmed + a.refuted + a.inconclusive;
        const bEv = b.confirmed + b.refuted + b.inconclusive;
        if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
        if (bEv !== aEv) return bEv - aEv;
        return b.totalOccurrences - a.totalOccurrences;
      });
  }, [sortedHistory, validations]);

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
            Pull patterns out of multiple sessions faster.
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
        <div className="p-4 space-y-3">
          {aggregates.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              No runs yet. Analyses you complete will be aggregated here.
            </div>
          )}
          {aggregates.map((a) => {
            const totalEv = a.confirmed + a.refuted + a.inconclusive;
            const isPattern = a.confirmed >= 2;
            const isUnresolved = a.totalOccurrences >= 2 && totalEv === 0;
            const trend = computeTrend(a.runIndices, totalRuns);
            return (
              <Card
                key={a.principle}
                className={
                  isPattern
                    ? "border-emerald-300 bg-emerald-500/5 dark:border-emerald-800 dark:bg-emerald-500/10"
                    : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{a.principle}</span>
                        {isPattern && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-xs gap-1">
                            <TrendingUp className="size-3" /> Pattern
                          </Badge>
                        )}
                        {isUnresolved && (
                          <Badge
                            variant="outline"
                            className="text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 text-xs gap-1"
                          >
                            <AlertCircle className="size-3" /> Needs attention
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Seen in {a.totalOccurrences} run{a.totalOccurrences === 1 ? "" : "s"}
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

                  {totalEv > 0 && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden flex">
                      {a.confirmed > 0 && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(a.confirmed / totalEv) * 100}%` }}
                        />
                      )}
                      {a.refuted > 0 && (
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(a.refuted / totalEv) * 100}%` }}
                        />
                      )}
                      {a.inconclusive > 0 && (
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${(a.inconclusive / totalEv) * 100}%` }}
                        />
                      )}
                    </div>
                  )}

                  {a.recentNotes.length > 0 && (
                    <div className="mt-3 space-y-1.5">
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
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      No real-user evidence yet. Still a hypothesis.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}

function TrendIndicator({ trend }: { trend: Trend }) {
  if (trend === "rising")
    return (
      <span
        className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400"
        title="Appearing more in recent runs — unresolved"
      >
        <TrendingUp className="size-3" /> Rising
      </span>
    );
  if (trend === "declining")
    return (
      <span
        className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400"
        title="Appearing less in recent runs — may be improving"
      >
        <TrendingDown className="size-3" /> Declining
      </span>
    );
  return (
    <span
      className="flex items-center gap-0.5 text-xs text-muted-foreground"
      title="Consistent frequency across runs"
    >
      <Minus className="size-3" /> Stable
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color = "",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
}) {
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
