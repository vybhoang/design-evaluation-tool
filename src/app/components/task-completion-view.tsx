import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useStore } from "../store";
import type { HistoryEntry } from "./history-store";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function TaskCompletionView({ entry }: { entry: HistoryEntry }) {
  const { taskRuns } = useStore();

  const runsForAnalysis = useMemo(
    () => taskRuns.filter((r) => r.analysisId === entry.id),
    [taskRuns, entry.id]
  );

  const byFinding = useMemo(() => {
    return entry.result.findings
      .map((f) => {
        const runs = runsForAnalysis.filter((r) => r.findingId === f.id);
        const seqValues = runs.map((r) => r.seqValue).filter((v): v is number => v !== undefined);
        const timeValues = runs.map((r) => r.timeOnTaskMs).filter((v): v is number => v !== undefined);
        return {
          finding: f,
          runs,
          completed: runs.filter((r) => r.completed).length,
          hesitated: runs.filter((r) => r.hesitated).length,
          confused: runs.filter((r) => r.confused).length,
          askedForHelp: runs.filter((r) => r.askedForHelp).length,
          seqMean: mean(seqValues),
          seqMedian: median(seqValues),
          medianTimeMs: median(timeValues),
        };
      })
      .filter((row) => row.runs.length > 0);
  }, [entry.result.findings, runsForAnalysis]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 flex items-start gap-2.5">
        <ShieldAlert className="size-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed flex-1">
          <span className="font-medium">5–8 participants is normal for qualitative usability testing</span>{" "}
          (Nielsen, 1994/2000) — this is descriptive, not statistically significant.
        </div>
      </div>

      {byFinding.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No task runs yet. Use Task mode in a live session to log one.
          </CardContent>
        </Card>
      ) : (
        byFinding.map(({ finding, runs, completed, hesitated, confused, askedForHelp, seqMean, medianTimeMs }) => (
          <Card key={finding.id}>
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{finding.principle}</div>
                <Badge variant="outline" className="text-xs">n={runs.length}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Completed unassisted</div>
                  <div className="font-semibold">{completed}/{runs.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Hesitated</div>
                  <div className="font-semibold">{hesitated}/{runs.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Confused</div>
                  <div className="font-semibold">{confused}/{runs.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Asked for help</div>
                  <div className="font-semibold">{askedForHelp}/{runs.length}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {seqMean !== null && <span>Mean SEQ: <span className="font-medium text-foreground">{seqMean.toFixed(1)}</span></span>}
                {medianTimeMs !== null && <span>Median time on task: <span className="font-medium text-foreground">{(medianTimeMs / 1000).toFixed(1)}s</span></span>}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
