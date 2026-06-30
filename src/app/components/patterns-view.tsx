import { useMemo } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";
import type { HistoryEntry } from "./history-store";
import type { ValidationEvidence } from "./validation-store";
import type { Severity } from "./analysis-data";

type Props = {
  history: HistoryEntry[];
  validations: ValidationEvidence[];
};

type RunPoint = {
  idx: number;
  label: string;
  createdAt: number;
  severity: Severity;
  confirmed: number;
  refuted: number;
  inconclusive: number;
};

type Aggregate = {
  principle: string;
  source: string;
  totalOccurrences: number;
  confirmed: number;
  refuted: number;
  inconclusive: number;
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
function MiniTimeline({ runData, totalRuns, runLabels }: { runData: RunPoint[]; totalRuns: number; runLabels: string[] }) {
  const sevColor: Record<Severity, string> = {
    critical: "bg-red-500",
    warning:  "bg-amber-400",
    info:     "bg-blue-400",
    pass:     "bg-emerald-500",
  };
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto" aria-label="Run timeline">
      {Array.from({ length: totalRuns }, (_, i) => {
        const d = runData.find((r) => r.idx === i);
        const label = runLabels[i] ?? `Run ${i + 1}`;
        const evidenceBits = d
          ? [
              d.confirmed ? `${d.confirmed} confirmed` : null,
              d.refuted ? `${d.refuted} refuted` : null,
              d.inconclusive ? `${d.inconclusive} inconclusive` : null,
            ].filter(Boolean).join(", ")
          : "";
        const title = d
          ? `${label}: ${d.severity}${evidenceBits ? ` · ${evidenceBits}` : ""}`
          : `${label}: not flagged this run`;
        return (
          <div
            key={i}
            className={`size-2.5 rounded-sm shrink-0 transition-colors ${d ? sevColor[d.severity] : "bg-muted"}`}
            title={title}
          />
        );
      })}
    </div>
  );
}

function AggCard({ a, totalRuns, runLabels, variant = "normal" }: { a: Aggregate; totalRuns: number; runLabels: string[]; variant?: "failure" | "validated" | "normal" }) {
  const navigate = useNavigate();
  const totalEv = a.confirmed + a.refuted + a.inconclusive;
  const trend = computeTrend(a.runIndices, totalRuns);

  return (
    <Card>
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="font-medium leading-snug">{a.principle}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              {a.source && <span>{a.source}</span>}
              {a.source && <span aria-hidden>·</span>}
              <span>{a.totalOccurrences} run{a.totalOccurrences === 1 ? "" : "s"}</span>
              {variant === "failure" && (
                <><span aria-hidden>·</span><span className="text-red-600 font-medium">recurring failure</span></>
              )}
              {variant === "validated" && (
                <><span aria-hidden>·</span><span className="text-emerald-600 font-medium">validated ×{a.confirmedRunCount}</span></>
              )}
              {variant === "normal" && a.confirmed >= 2 && (
                <><span aria-hidden>·</span><span>confirmed ×{a.confirmed}</span></>
              )}
              {a.totalOccurrences >= 2 && totalEv === 0 && (
                <><span aria-hidden>·</span><span className="text-amber-600 font-medium">needs attention</span></>
              )}
            </div>
            {totalEv > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                {a.confirmed > 0 && <span className="text-emerald-700">{a.confirmed} confirmed</span>}
                {a.confirmed > 0 && (a.refuted > 0 || a.inconclusive > 0) && <span className="text-muted-foreground" aria-hidden>·</span>}
                {a.refuted > 0 && <span className="text-red-600">{a.refuted} refuted</span>}
                {a.refuted > 0 && a.inconclusive > 0 && <span className="text-muted-foreground" aria-hidden>·</span>}
                {a.inconclusive > 0 && <span className="text-amber-600">{a.inconclusive} inconclusive</span>}
              </div>
            )}
          </div>
          {trend && <TrendIndicator trend={trend} />}
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
            <MiniTimeline runData={a.runData} totalRuns={totalRuns} runLabels={runLabels} />
          </div>
        )}

        {totalEv > 0 ? (
          <button
            onClick={() => navigate(`/responses?tab=evidence&principle=${encodeURIComponent(a.principle)}`)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View {totalEv} evidence log{totalEv === 1 ? "" : "s"} →
          </button>
        ) : (
          <div className="text-xs text-muted-foreground border border-dashed rounded-md px-2 py-1.5">
            No real-user evidence yet. Still a hypothesis.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBlock({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xl font-bold leading-none ${color ?? "text-foreground"}`}>{value}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="hidden sm:block w-px bg-border" />;
}

export function PatternsView({ history, validations }: Props) {
  const navigate = useNavigate();

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => a.createdAt - b.createdAt),
    [history]
  );

  const runLabels = useMemo(() => sortedHistory.map((h) => h.label), [sortedHistory]);

  const aggregates = useMemo<Aggregate[]>(() => {
    const byPrinciple = new Map<string, Aggregate>();
    sortedHistory.forEach((h, runIdx) => {
      h.result.findings.forEach((f) => {
        // Scope evidence to this exact run when we know it (analysisId); fall back to the
        // looser id-only match for evidence logged before that field existed.
        const evidence = validations.filter((v) =>
          v.findingId === f.id && (v.analysisId ? v.analysisId === h.id : true)
        );
        const agg = byPrinciple.get(f.principle) ?? {
          principle: f.principle,
          source: f.source,
          totalOccurrences: 0,
          confirmed: 0,
          refuted: 0,
          inconclusive: 0,
          runIndices: [],
          runData: [],
          criticalOrWarningRuns: 0,
          confirmedRunCount: 0,
        };

        agg.totalOccurrences += 1;
        agg.runIndices.push(runIdx);
        agg.runData.push({
          idx: runIdx,
          label: h.label,
          createdAt: h.createdAt,
          severity: f.severity,
          confirmed: evidence.filter((e) => e.verdict === "confirmed").length,
          refuted: evidence.filter((e) => e.verdict === "refuted").length,
          inconclusive: evidence.filter((e) => e.verdict === "inconclusive").length,
        });

        if (f.severity === "critical" || f.severity === "warning") {
          agg.criticalOrWarningRuns += 1;
        }

        const hasConfirmedHere = evidence.some((e) => e.verdict === "confirmed");
        if (hasConfirmedHere) agg.confirmedRunCount += 1;

        evidence.forEach((e) => {
          if (e.verdict === "confirmed") agg.confirmed += 1;
          else if (e.verdict === "refuted") agg.refuted += 1;
          else agg.inconclusive += 1;
        });

        byPrinciple.set(f.principle, agg);
      });
    });
    return Array.from(byPrinciple.values())
      .sort((a, b) => {
        const aEv = a.confirmed + a.refuted + a.inconclusive;
        const bEv = b.confirmed + b.refuted + b.inconclusive;
        if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
        if (bEv !== aEv) return bEv - aEv;
        return b.totalOccurrences - a.totalOccurrences;
      });
  }, [sortedHistory, validations]);

  const chartData = useMemo(
    () =>
      sortedHistory.map((h, i) => ({
        run: `Run ${i + 1}`,
        label: h.label,
        critical: h.result.findings.filter((f) => f.severity === "critical").length,
        warning: h.result.findings.filter((f) => f.severity === "warning").length,
        info: h.result.findings.filter((f) => f.severity === "info").length,
        pass: h.result.findings.filter((f) => f.severity === "pass").length,
      })),
    [sortedHistory]
  );

  const chartConfig: ChartConfig = {
    critical: { label: "Critical", color: "#ef4444" },
    warning: { label: "Warning", color: "#fbbf24" },
    info: { label: "Info", color: "#60a5fa" },
    pass: { label: "Pass", color: "#10b981" },
  };

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
  const needAttention = aggregates.filter(
    (a) => a.totalOccurrences >= 2 && a.confirmed + a.refuted + a.inconclusive === 0
  ).length;

  return (
    <>
      <div>
        <h1 className="font-serif text-2xl tracking-tight">Patterns</h1>
        <div className="flex flex-wrap items-stretch gap-4 mt-3">
          <StatBlock value={totalRuns} label={`run${totalRuns === 1 ? "" : "s"}`} />
          <Divider />
          <StatBlock value={totalEvidence} label={`evidence log${totalEvidence === 1 ? "" : "s"}`} />
          <Divider />
          <StatBlock value={totalConfirmed} label="confirmed" color="text-emerald-600 dark:text-emerald-400" />
          <Divider />
          <StatBlock value={validatedAcrossRuns.length} label="validated across runs" color="text-emerald-600 dark:text-emerald-400" />
          {needAttention > 0 && (
            <>
              <Divider />
              <StatBlock value={needAttention} label="need attention" color="text-amber-600 dark:text-amber-400" />
            </>
          )}
        </div>
      </div>

      {sortedHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">Findings per run</h2>
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${Math.max(chartData.length * 56, 100)}px` }}>
              <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="run" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
                      />
                    }
                  />
                  <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" />
                  <Bar dataKey="warning" stackId="a" fill="var(--color-warning)" />
                  <Bar dataKey="info" stackId="a" fill="var(--color-info)" />
                  <Bar dataKey="pass" stackId="a" fill="var(--color-pass)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {aggregates.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              No runs yet.{" "}
              <button onClick={() => navigate("/new")} className="underline">
                Start a new one
              </button>
              .
            </CardContent>
          </Card>
        )}

        {/* Recurring failures */}
        {recurringFailures.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold font-serif">
                Recurring failures <span className="text-muted-foreground font-normal">({recurringFailures.length})</span>
              </h2>
              <span className="text-xs text-muted-foreground">Critical or warning in 3+ runs</span>
            </div>
            <div className="space-y-3">
              {recurringFailures.map((a) => (
                <AggCard key={a.principle + "-failure"} a={a} totalRuns={totalRuns} runLabels={runLabels} variant="failure" />
              ))}
            </div>
          </section>
        )}

        {/* Validated across runs */}
        {validatedAcrossRuns.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold font-serif">
                Validated across runs <span className="text-muted-foreground font-normal">({validatedAcrossRuns.length})</span>
              </h2>
              <span className="text-xs text-muted-foreground">Confirmed in 2+ separate sessions</span>
            </div>
            <div className="space-y-3">
              {validatedAcrossRuns.map((a) => (
                <AggCard key={a.principle + "-validated"} a={a} totalRuns={totalRuns} runLabels={runLabels} variant="validated" />
              ))}
            </div>
          </section>
        )}

        {/* All findings */}
        <section>
          {(recurringFailures.length > 0 || validatedAcrossRuns.length > 0) && (
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold font-serif">
                All findings <span className="text-muted-foreground font-normal">({aggregates.length})</span>
              </h2>
            </div>
          )}
          <div className="space-y-3">
            {aggregates.map((a) => (
              <AggCard key={a.principle} a={a} totalRuns={totalRuns} runLabels={runLabels} variant="normal" />
            ))}
          </div>
        </section>
      </div>
    </>
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

