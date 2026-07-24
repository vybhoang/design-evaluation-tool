import { useState, useMemo, useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Radio, GitCompareArrows, Share2, BarChart3, ChevronLeft, ChevronRight, TriangleAlert, RotateCw } from "lucide-react";
import { AnnotatedDesign } from "../components/annotated-design";
import { ResultsPanel, triageScore } from "../components/results-panel";
import { WorkflowStepper } from "../components/workflow-stepper";
import { Button } from "../components/ui/button";
import { useStore } from "../store";
import { downloadSnapshot } from "../components/snapshot-export";
import { TourAnchor } from "../components/tour-overlay";
import { generateAnalysis, type AnalysisResult } from "../components/analysis-data";
import { analyzeWithClaude, isLiveAnalysisEnabled } from "../components/claude-vision-analysis";

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
    ...(r?.mock && { mock: r.mock }),
  };
}

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { history, validations, addEvidence, deleteEvidence, updatePageResult } = useStore();
  const entry = history.find((h) => h.id === id);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [isRerunning, setIsRerunning] = useState(false);

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

  // Re-run just the currently viewed page against Claude Vision, replacing only
  // that page's result via updatePageResult — works the same whether this entry
  // has one screenshot or many, since it always targets clampedPage/currentPage,
  // never the whole run. Mirrors home.tsx's runPageAnalysis fallback behavior so
  // a re-run that still can't reach live analysis is tagged mock again rather
  // than silently looking successful. Available both from the persistent mock
  // banner and always-on in the results header, regardless of mock status, so
  // users can force a fresh analysis on any page, old or new.
  const handleRerun = async () => {
    if (!currentPage.imageUrl) return;
    setIsRerunning(true);
    try {
      const ctxWithImage = { ...pageContext, imageUrl: currentPage.imageUrl };
      let next: AnalysisResult;
      if (isLiveAnalysisEnabled()) {
        try {
          next = await analyzeWithClaude(ctxWithImage, (s) => toast(s));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const reason = msg.includes("401")
            ? "Invalid Claude API key — check the Anthropic API key configured for this deployment."
            : `The live analysis request failed (${msg}) — showing sample heuristic data instead.`;
          toast.error("Rerun failed — falling back to heuristic mock for this page", { duration: 10000 });
          next = { ...generateAnalysis(ctxWithImage.designType, ctxWithImage.audience), mock: { reason } };
        }
      } else {
        toast.error(
          "Live analysis is disabled (VITE_ENABLE_LIVE_ANALYSIS is not \"true\") — rerun still produced sample data.",
          { duration: 10000 }
        );
        next = {
          ...generateAnalysis(ctxWithImage.designType, ctxWithImage.audience),
          mock: { reason: "Live analysis is disabled in this environment — this is sample heuristic data, not a real analysis of your screenshot." },
        };
      }
      updatePageResult(entry.id, clampedPage, next);
      if (!next.mock) {
        toast.success("Rerun complete — this page now reflects a real analysis.");
        setActiveFindingId(null);
      }
    } finally {
      setIsRerunning(false);
    }
  };

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

      {/* Persistent (not a toast) — this must stay visible on every visit to this
          page for as long as the underlying data is fake, including when someone
          navigates back in from History days later, long after any run-time toast
          has disappeared. */}
      {result.mock && (
        <div className="shrink-0 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 flex items-start gap-2.5">
          <TriangleAlert className="size-4 text-red-600 dark:text-red-500 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300 leading-relaxed flex-1">
            <span className="font-semibold">Sample data, not a real analysis.</span>{" "}
            {result.mock.reason}
            {allPages.length > 1 && " Other pages in this run may still be real — check each page individually."}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 border-red-300 dark:border-red-900 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50"
            onClick={handleRerun}
            disabled={isRerunning}
          >
            <RotateCw className={`size-3.5 ${isRerunning ? "animate-spin" : ""}`} />
            {isRerunning ? "Rerunning…" : "Rerun this page"}
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
          analysisId={entry.id}
          onRerun={handleRerun}
          isRerunning={isRerunning}
        />
        </div>
      </div>

    </>
  );
}
