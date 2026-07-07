import { useState, useMemo, useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft, Radio, GitCompareArrows, Share2, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [activePage, setActivePage] = useState(0);

  // Reset page and active finding when navigating to a different entry
  useEffect(() => {
    setActivePage(0);
    setActiveFindingId(null);
  }, [id]);

  // Stable 1-based rank for each finding on the active page
  const findingNumbers = useMemo(() => {
    if (!entry) return {} as Record<string, number>;
    const pages = entry.pages?.length
      ? entry.pages
      : [{ imageUrl: entry.context.imageUrl!, result: entry.result }];
    const pr = pages[Math.min(activePage, pages.length - 1)]?.result ?? entry.result;
    const sorted = [...(pr.findings ?? [])].sort(
      (a, b) => triageScore(b, validations) - triageScore(a, validations)
    );
    return Object.fromEntries(sorted.map((f, i) => [f.id, i + 1]));
  }, [entry, activePage, validations]);

  if (!entry && history.length > 0) return <Navigate to="/history" replace />;
  if (!entry) return null;

  const allPages = entry.pages?.length
    ? entry.pages
    : [{ imageUrl: entry.context.imageUrl!, result: entry.result }];
  const clampedPage = Math.min(activePage, allPages.length - 1);
  const currentPage = allPages[clampedPage];

  const handlePageChange = (idx: number) => {
    setActivePage(idx);
    setActiveFindingId(null);
  };

  const others = history.filter((h) => h.id !== entry.id);
  const result = normalizeResult(currentPage.result);
  const pageContext = "context" in currentPage && currentPage.context ? currentPage.context : entry.context;
  const safeEntry = { ...entry, result, context: { ...pageContext, imageUrl: currentPage.imageUrl } };

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
              {pageContext.designType} · {pageContext.audience} · {result.findings.length} findings
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

      {allPages.length > 1 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={clampedPage === 0}
            onClick={() => handlePageChange(clampedPage - 1)}
          >
            <ChevronLeft className="size-3.5" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {clampedPage + 1} of {allPages.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={clampedPage === allPages.length - 1}
            onClick={() => handlePageChange(clampedPage + 1)}
          >
            Next <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

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
            imageUrl={currentPage.imageUrl}
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
          context={pageContext}
          label={entry.label}
          findingNumbers={findingNumbers}
        />
        </div>
      </div>

    </>
  );
}
