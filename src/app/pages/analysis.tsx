import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft, Radio, GitCompareArrows } from "lucide-react";
import { AnnotatedDesign } from "../components/annotated-design";
import { ResultsPanel } from "../components/results-panel";
import { WorkflowStepper } from "../components/workflow-stepper";
import { Button } from "../components/ui/button";
import { useStore } from "../store";

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { history, validations, addEvidence, deleteEvidence } = useStore();
  const entry = history.find((h) => h.id === id);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  if (!entry && history.length > 0) return <Navigate to="/history" replace />;
  if (!entry) return null;

  const others = history.filter((h) => h.id !== entry.id);

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="size-4" /> Back
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl tracking-tight truncate">{entry.label}</h1>
            <div className="text-xs text-muted-foreground">
              {entry.context.designType} · {entry.context.audience} · {entry.result.findings.length} findings
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {others.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(`/compare?a=${entry.id}&b=${others[0].id}`)}
            >
              <GitCompareArrows className="size-4" /> Compare
            </Button>
          )}
          <Button asChild size="sm" className="gap-1.5">
            <Link to={`/analysis/${entry.id}/session`}>
              <Radio className="size-4" /> Moderate session
            </Link>
          </Button>
        </div>
      </div>

      <WorkflowStepper
        hasImage
        hasResult
        onStepClick={(id) => {
          if (id === "test") navigate(`/analysis/${entry.id}/session`);
          if (id === "generate") navigate("/new");
        }}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6">
        <AnnotatedDesign
          imageUrl={entry.context.imageUrl!}
          result={entry.result}
          activeFindingId={activeFindingId}
          onSelectFinding={setActiveFindingId}
          onClear={() => navigate("/new")}
        />
        <ResultsPanel
          result={entry.result}
          activeFindingId={activeFindingId}
          onSelectFinding={setActiveFindingId}
          validations={validations}
          onAddEvidence={addEvidence}
          onDeleteEvidence={deleteEvidence}
        />
      </div>

    </>
  );
}
