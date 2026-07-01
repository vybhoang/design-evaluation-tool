import { useState, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft, Radio, GitCompareArrows, Share2, BarChart3 } from "lucide-react";
import { AnnotatedDesign } from "../components/annotated-design";
import { ResultsPanel, triageScore } from "../components/results-panel";
import { WorkflowStepper } from "../components/workflow-stepper";
import { Button } from "../components/ui/button";
import { useStore } from "../store";
import { downloadSnapshot } from "../components/snapshot-export";
import { TourAnchor } from "../components/tour-overlay";
import type { AnalysisResult } from "../components/analysis-data";

// Fills in any fields that may be missing on entries stored before a schema
// addition (e.g. kudos, principles). Never mutates; always returns a new object.
function normalizeResult(r: AnalysisResult | undefined): AnalysisResult {
  return {
    clarityScore: r?.clarityScore ?? 0,
    accessibilityScore: r?.accessibilityScore ?? 0,
    findings: Array.isArray(r?.findings) ? r!.findings : [],
    principles: Array.isArray(r?.principles) ? r!.principles : [],
    lenses: Array.isArray(r?.lenses) ? r!.lenses : [],
    heatmap: Array.isArray(r?.heatmap) ? r!.heatmap : [],
    kudos: Array.isArray(r?.kudos) ? r!.kudos : [],
  };
}

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { history, validations, addEvidence, deleteEvidence } = useStore();
  const entry = history.find((h) => h.id === id);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);

  // Stable 1-based rank for each finding, computed once per entry+validations.
  // Both the design canvas pins and the Heuristics panel use this so their
  // numbers always match, regardless of panel filter or sort state.
  const findingNumbers = useMemo(() => {
    if (!entry) return {} as Record<string, number>;
    const sorted = [...(entry.result.findings ?? [])].sort(
      (a, b) => triageScore(b, validations) - triageScore(a, validations)
    );
    return Object.fromEntries(sorted.map((f, i) => [f.id, i + 1]));
  }, [entry, validations]);

  if (!entry && history.length > 0) return <Navigate to="/history" replace />;
  if (!entry) return null;

  const others = history.filter((h) => h.id !== entry.id);
  const result = normalizeResult(entry.result);
  const safeEntry = { ...entry, result };

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
              {entry.context.designType} · {entry.context.audience} · {result.findings.length} findings
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => downloadSnapshot(safeEntry, validations)}
          >
            <Share2 className="size-4" /> Snapshot
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to={`/analysis/${entry.id}/instruments`}>
              <BarChart3 className="size-4" /> Instruments
            </Link>
          </Button>
          <TourAnchor id="moderate-session-btn">
            <Button asChild size="sm" className="gap-1.5">
              <Link to={`/analysis/${entry.id}/session`}>
                <Radio className="size-4" /> Moderate session
              </Link>
            </Button>
          </TourAnchor>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-start">
        <div className="lg:sticky lg:top-20">
          <AnnotatedDesign
            imageUrl={entry.context.imageUrl!}
            result={result}
            activeFindingId={activeFindingId}
            onSelectFinding={setActiveFindingId}
            onClear={() => navigate("/new")}
            findingNumbers={findingNumbers}
          />
        </div>
        <div data-tour="results-panel">
        <ResultsPanel
          result={result}
          activeFindingId={activeFindingId}
          onSelectFinding={setActiveFindingId}
          validations={validations}
          onAddEvidence={(e) => addEvidence({ ...e, analysisId: entry.id, analysisLabel: entry.label })}
          onDeleteEvidence={deleteEvidence}
          context={entry.context}
          label={entry.label}
          findingNumbers={findingNumbers}
        />
        </div>
      </div>

    </>
  );
}
