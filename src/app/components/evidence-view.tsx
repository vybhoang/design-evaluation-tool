import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { formatRelative, type HistoryEntry } from "./history-store";
import { resolveEvidence, type ValidationEvidence } from "./validation-store";

type Verdict = ValidationEvidence["verdict"];

const verdictColor: Record<Verdict, string> = {
  confirmed: "text-emerald-700",
  refuted: "text-red-600",
  inconclusive: "text-amber-600",
};

type Props = {
  validations: ValidationEvidence[];
  totalCount: number;
  history: HistoryEntry[];
  onDelete: (id: string) => void;
};

export function EvidenceView({ validations, totalCount, history, onDelete }: Props) {
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      validations
        .map((e) => ({ e, ctx: resolveEvidence(e, history) }))
        .sort((a, b) => b.e.createdAt - a.e.createdAt),
    [validations, history]
  );

  if (totalCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No evidence logged yet.
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No evidence matches your filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map(({ e, ctx }) => (
        <Card key={e.id} className="group">
          <CardContent className="p-3.5 flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className={`font-medium ${verdictColor[e.verdict]}`}>{e.verdict}</span>
                  <span className="text-foreground/80">{ctx?.principle ?? "Unknown finding"}</span>
                </div>
                <span className="text-[11px] text-muted-foreground/60 shrink-0 tabular-nums">{formatRelative(e.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {ctx ? (
                  <button
                    onClick={() => navigate(`/analysis/${ctx.runId}`)}
                    className="hover:text-foreground underline underline-offset-2"
                  >
                    {ctx.runLabel}
                  </button>
                ) : (
                  <span>Unknown run</span>
                )}
                {e.sampleSize != null && e.sampleSize > 1 && <span>· n={e.sampleSize}</span>}
              </div>
              {e.method && <div className="text-xs text-muted-foreground italic">{e.method}</div>}
              <div className="text-sm leading-relaxed mt-0.5">{e.note}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0"
              onClick={() => onDelete(e.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
