import { Navigate, useNavigate, useParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { SessionCapture } from "../components/session-capture";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useStore } from "../store";
import { WorkflowStepper } from "../components/workflow-stepper";

export default function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { history, addEvidence } = useStore();
  const entry = history.find((h) => h.id === id);

  if (!entry && history.length > 0) return <Navigate to="/history" replace />;
  if (!entry) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/analysis/${entry.id}`)} className="gap-1.5">
            <ArrowLeft className="size-4" /> Back to analysis
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl tracking-tight truncate">Moderate session</h1>
            <div className="text-xs text-muted-foreground truncate">
              For: <Link to={`/analysis/${entry.id}`} className="underline underline-offset-2">{entry.label}</Link>
            </div>
          </div>
        </div>
      </div>

      <WorkflowStepper current="test" onStepClick={(s) => {
        if (s === "check") navigate(`/analysis/${entry.id}`);
        if (s === "generate") navigate("/new");
      }} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 flex-1 min-h-0">
        <div className="space-y-4">
          <SessionCapture findings={entry.result.findings} onAddEvidence={addEvidence} />
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-serif text-lg tracking-tight">Findings to probe</h3>
              <p className="text-xs text-muted-foreground">
                These are the hypotheses from the heuristic check. Tag observations to them as you watch.
              </p>
              <ul className="space-y-1.5 mt-2">
                {entry.result.findings.map((f, i) => (
                  <li key={f.id} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground text-xs mt-0.5 shrink-0">{i + 1}.</span>
                    <div>
                      <div>{f.principle}</div>
                      <div className="text-xs text-muted-foreground">{f.observation}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-3 min-w-0">
          <h3 className="font-serif text-lg tracking-tight">Design under test</h3>
          <Card className="overflow-hidden">
            <img src={entry.context.imageUrl!} alt="" className="w-full object-contain bg-muted" />
          </Card>
        </aside>
      </div>
    </>
  );
}
