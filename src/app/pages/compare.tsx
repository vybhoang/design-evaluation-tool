import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { CompareView } from "../components/compare-view";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStore } from "../store";

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { history } = useStore();

  const aId = params.get("a");
  const bId = params.get("b");

  // Auto-pick first two runs if not specified
  useEffect(() => {
    if (history.length >= 2 && (!aId || !bId)) {
      setParams(
        { a: aId || history[0].id, b: bId || history.find((h) => h.id !== (aId || history[0].id))?.id || history[1].id },
        { replace: true }
      );
    }
  }, [history, aId, bId, setParams]);

  const a = useMemo(() => history.find((h) => h.id === aId), [history, aId]);
  const b = useMemo(() => history.find((h) => h.id === bId), [history, bId]);

  if (history.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="border-dashed max-w-md">
          <CardContent className="p-10 text-center space-y-3">
            <ArrowLeftRight className="size-8 text-muted-foreground mx-auto" />
            <h2 className="font-serif text-xl tracking-tight">Need two runs to compare</h2>
            <p className="text-sm text-muted-foreground">
              {history.length === 0
                ? "You don't have any runs yet."
                : "You have one run. Analyze a variant and come back."}
            </p>
            <Button onClick={() => navigate("/new")}>Start a new run</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div>
            <h1 className="font-serif text-2xl tracking-tight">Compare</h1>
            <p className="text-sm text-muted-foreground">
              Heuristic-level diff between two runs. <Link to="/history" className="underline underline-offset-2">See all runs</Link>.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Run A</Label>
            <Select value={aId || ""} onValueChange={(v) => setParams({ a: v, b: bId || "" })}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Pick a run" /></SelectTrigger>
              <SelectContent>
                {history.map((h) => (
                  <SelectItem key={h.id} value={h.id} disabled={h.id === bId}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setParams({ a: bId || "", b: aId || "" })}
            title="Swap"
          >
            <ArrowLeftRight className="size-4" />
          </Button>
          <div className="space-y-1">
            <Label className="text-xs">Run B</Label>
            <Select value={bId || ""} onValueChange={(v) => setParams({ a: aId || "", b: v })}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Pick a run" /></SelectTrigger>
              <SelectContent>
                {history.map((h) => (
                  <SelectItem key={h.id} value={h.id} disabled={h.id === aId}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {a && b ? (
        <CompareView a={a} b={b} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Pick a run for both sides.
          </CardContent>
        </Card>
      )}
    </>
  );
}
