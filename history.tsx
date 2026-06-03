import { useMemo } from "react";
import { TrendingUp, X, CheckCircle2, XCircle, MinusCircle, Activity, Users, Sparkles } from "lucide-react";
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
  totalOccurrences: number; // how many runs this finding appeared in
  confirmed: number;
  refuted: number;
  inconclusive: number;
  recentNotes: { note: string; verdict: string; runLabel: string; createdAt: number; sampleSize?: number }[];
};

export function PatternsView({ history, validations, onClose }: Props) {
  const aggregates = useMemo<Aggregate[]>(() => {
    const byPrinciple = new Map<string, Aggregate>();
    history.forEach((h) => {
      h.result.findings.forEach((f) => {
        const evidence = validations.filter((v) => v.findingId === f.id);
        const agg = byPrinciple.get(f.principle) || {
          principle: f.principle,
          source: f.source,
          totalOccurrences: 0,
          confirmed: 0,
          refuted: 0,
          inconclusive: 0,
          recentNotes: [],
        };
        agg.totalOccurrences += 1;
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
        // sort: most confirmed pain points first, then by total evidence, then occurrence
        const aEv = a.confirmed + a.refuted + a.inconclusive;
        const bEv = b.confirmed + b.refuted + b.inconclusive;
        if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
        if (bEv !== aEv) return bEv - aEv;
        return b.totalOccurrences - a.totalOccurrences;
      });
  }, [history, validations]);

  const totalRuns = history.length;
  const totalEvidence = validations.length;
  const totalConfirmed = validations.filter((v) => v.verdict === "confirmed").length;
  const confirmedPatterns = aggregates.filter((a) => a.confirmed >= 2).length;

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

      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Sparkles} label="Runs" value={totalRuns} />
        <Stat icon={Users} label="Evidence logs" value={totalEvidence} />
        <Stat icon={CheckCircle2} label="Confirmed" value={totalConfirmed} color="text-emerald-600" />
        <Stat icon={TrendingUp} label="Confirmed patterns" value={confirmedPatterns} color="text-primary" />
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
            return (
              <Card
                key={a.principle}
                className={isPattern ? "border-emerald-300 bg-emerald-50/50" : ""}
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
                        <Badge variant="outline" className="text-xs">
                          Seen in {a.totalOccurrences} run{a.totalOccurrences === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.source}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="size-3" /> {a.confirmed}
                      </span>
                      <span className="flex items-center gap-1 text-red-700">
                        <XCircle className="size-3" /> {a.refuted}
                      </span>
                      <span className="flex items-center gap-1 text-amber-700">
                        <MinusCircle className="size-3" /> {a.inconclusive}
                      </span>
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
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : n.verdict === "refuted"
                                ? "text-red-700 bg-red-50 border-red-200"
                                : "text-amber-700 bg-amber-50 border-amber-200"
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

function Stat({ icon: Icon, label, value, color = "" }: { icon: any; label: string; value: number; color?: string }) {
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
