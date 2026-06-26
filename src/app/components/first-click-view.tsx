import { useMemo, useState } from "react";
import { Crosshair, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AnnotatedDesign } from "./annotated-design";
import { useStore } from "../store";
import type { HistoryEntry } from "./history-store";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function FirstClickView({ entry }: { entry: HistoryEntry }) {
  const { firstClickTasks, firstClickAttempts, addFirstClickTask, deleteFirstClickTask } = useStore();
  const [taskLabel, setTaskLabel] = useState("");
  const [definingForTaskId, setDefiningForTaskId] = useState<string | null>(null);

  const tasksForAnalysis = useMemo(
    () => firstClickTasks.filter((t) => t.analysisId === entry.id),
    [firstClickTasks, entry.id]
  );

  const definingTask = tasksForAnalysis.find((t) => t.id === definingForTaskId) ?? null;

  const createTask = () => {
    const label = taskLabel.trim();
    if (!label) return;
    const id = addFirstClickTask({
      analysisId: entry.id,
      taskLabel: label,
      targetRegion: { x: 0.4, y: 0.4, w: 0.2, h: 0.1 },
    });
    setTaskLabel("");
    setDefiningForTaskId(id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">New first-click task</div>
          <div className="flex items-center gap-2">
            <Input
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              placeholder="e.g. Find the pricing link"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && createTask()}
            />
            <Button size="sm" onClick={createTask} disabled={!taskLabel.trim()}>
              Add task
            </Button>
          </div>
        </CardContent>
      </Card>

      {definingTask && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                Define target region — <span className="text-muted-foreground">{definingTask.taskLabel}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setDefiningForTaskId(null)}>
                Done
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag on the design below to mark where a correct first click should land.
            </p>
            <AnnotatedDesign
              imageUrl={entry.context.imageUrl!}
              result={entry.result}
              activeFindingId={null}
              onSelectFinding={() => {}}
              onClear={() => {}}
              firstClickEnabled
              definingRegion
              targetRegion={definingTask.targetRegion}
              heightClassName="h-[50vh]"
              onDefineRegion={(region) => {
                // Stored as a brand-new rect on the task — never a live reference
                // to any ResearchFinding.region, even if visually similar.
                deleteFirstClickTask(definingTask.id);
                addFirstClickTask({
                  analysisId: entry.id,
                  taskLabel: definingTask.taskLabel,
                  targetRegion: region,
                });
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tasksForAnalysis.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No first-click tasks yet. Add one above, then run it during a live session.
            </CardContent>
          </Card>
        )}
        {tasksForAnalysis.map((task) => {
          const attempts = firstClickAttempts.filter((a) => a.taskId === task.id);
          const hits = attempts.filter((a) => a.hit).length;
          const med = median(attempts.map((a) => a.t));
          return (
            <Card key={task.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{task.taskLabel}</div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDefiningForTaskId(task.id)}>
                      <Crosshair className="size-3.5" /> Redefine region
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-8 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() => deleteFirstClickTask(task.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm">
                  {attempts.length === 0 ? (
                    <span className="text-muted-foreground">No attempts yet.</span>
                  ) : (
                    <span>
                      <span className="font-semibold">
                        {hits}/{attempts.length}
                      </span>{" "}
                      hit target, median {((med ?? 0) / 1000).toFixed(1)}s
                    </span>
                  )}
                  <Badge variant="outline" className="ml-2 text-xs">
                    n={attempts.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
