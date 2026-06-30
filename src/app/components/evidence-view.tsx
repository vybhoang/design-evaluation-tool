import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Search, Trash2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { formatRelative, type HistoryEntry } from "./history-store";
import { resolveEvidence, type ValidationEvidence } from "./validation-store";

type Verdict = ValidationEvidence["verdict"];
type VerdictFilter = "all" | Verdict;

const verdictIcon: Record<Verdict, React.ComponentType<{ className?: string }>> = {
  confirmed: CheckCircle2,
  refuted: XCircle,
  inconclusive: MinusCircle,
};

type Props = {
  validations: ValidationEvidence[];
  history: HistoryEntry[];
  onDelete: (id: string) => void;
  initialPrinciple?: string;
};

export function EvidenceView({ validations, history, onDelete, initialPrinciple }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [principleFilter, setPrincipleFilter] = useState(initialPrinciple ?? "all");

  const rows = useMemo(
    () =>
      validations
        .map((e) => ({ e, ctx: resolveEvidence(e, history) }))
        .sort((a, b) => b.e.createdAt - a.e.createdAt),
    [validations, history]
  );

  const principles = useMemo(
    () => [...new Set(rows.map((r) => r.ctx?.principle).filter((p): p is string => !!p))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ e, ctx }) => {
      if (verdictFilter !== "all" && e.verdict !== verdictFilter) return false;
      if (principleFilter !== "all" && ctx?.principle !== principleFilter) return false;
      if (q) {
        const hay = `${ctx?.principle ?? ""} ${ctx?.runLabel ?? ""} ${e.note} ${e.method}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, verdictFilter, principleFilter]);

  const isFiltered = query !== "" || verdictFilter !== "all" || principleFilter !== "all";
  const resetFilters = () => { setQuery(""); setVerdictFilter("all"); setPrincipleFilter("all"); };

  return (
    <div className="space-y-2.5">
      {validations.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, findings, runs…"
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>

          <Select value={verdictFilter} onValueChange={(v) => setVerdictFilter(v as VerdictFilter)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verdicts</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="refuted">Refuted</SelectItem>
              <SelectItem value="inconclusive">Inconclusive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={principleFilter} onValueChange={setPrincipleFilter}>
            <SelectTrigger className="h-8 w-52 text-sm">
              <SelectValue placeholder="All findings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All findings</SelectItem>
              {principles.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              Reset
            </Button>
          )}
        </div>
      )}

      {validations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground space-y-1">
            <p>No evidence logged yet.</p>
            <p className="text-xs">
              Log what real users actually did against any finding — from the Analysis page or a live session —
              and it shows up here, grouped across every run.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground space-y-2">
            <p>No evidence matches your filters.</p>
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(({ e, ctx }) => {
            const Icon = verdictIcon[e.verdict];
            return (
              <Card key={e.id} className="group">
                <CardContent className="p-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Icon className="size-3" /> {e.verdict}
                      </span>
                      <span>{ctx?.principle ?? "Unknown finding"}</span>
                      <span>·</span>
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
                      {e.sampleSize ? <span>· n={e.sampleSize}</span> : null}
                      <span>· {formatRelative(e.createdAt)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground italic">{e.method}</div>
                    <div className="text-sm">{e.note}</div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
