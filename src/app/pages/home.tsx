import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { DesignCanvas, type AnalysisContext } from "../components/design-canvas";
import { generateAnalysis, type AnalysisResult } from "../components/analysis-data";
import { analyzeWithClaude, isLiveAnalysisEnabled } from "../components/claude-vision-analysis";
import { imageToThumbnail, type HistoryEntry, formatRelative } from "../components/history-store";
import { useStore } from "../store";
import { WorkflowStepper } from "../components/workflow-stepper";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { X, Plus } from "lucide-react";

const MAX_PAGES = 10;

const MOCK_STAGES = [
  "Extracting visual hierarchy…",
  "Checking WCAG rules (contrast, target size)…",
  "Cross-referencing NN/g & cognitive-load research…",
  "Drafting hypotheses to test with real users…",
  "Computing salience heatmap…",
];

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultLabel(c: AnalysisContext) {
  const t = c.designType.charAt(0).toUpperCase() + c.designType.slice(1);
  return `${t} · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

export default function Home() {
  const navigate = useNavigate();
  const { history, addEntry } = useStore();
  const [context, setContext] = useState<AnalysisContext>({
    imageUrl: null,
    designType: "landing",
    audience: "general",
    goal: "",
  });
  // Pages beyond the first each carry their own analysis context, defaulting to
  // a copy of the first image's context at the moment they're added.
  const [additionalPages, setAdditionalPages] = useState<
    Array<{ imageUrl: string; context: AnalysisContext }>
  >([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const addPageRef = useRef<HTMLInputElement>(null);

  const allImageUrls = context.imageUrl ? [context.imageUrl, ...additionalPages.map((p) => p.imageUrl)] : [];
  const pageContexts = [context, ...additionalPages.map((p) => p.context)];
  const activeContext = pageContexts[previewPage] ?? context;

  const setActiveContext = (c: AnalysisContext) => {
    if (previewPage === 0) {
      if (!c.imageUrl) {
        setAdditionalPages([]);
        setPreviewPage(0);
      }
      setContext(c);
    } else {
      setAdditionalPages((prev) =>
        prev.map((p, i) => (i === previewPage - 1 ? { ...p, context: c } : p))
      );
    }
  };

  const removeAdditionalPage = (idx: number) => {
    const next = additionalPages.filter((_, i) => i !== idx);
    setAdditionalPages(next);
    setPreviewPage((p) => Math.min(p, next.length)); // next.length = new total - 1
  };

  useEffect(() => {
    if (!isAnalyzing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") abortRef.current?.abort();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAnalyzing]);

  const runPageAnalysis = async (
    pageCtx: AnalysisContext,
    pageNum: number,
    total: number,
    signal: AbortSignal
  ): Promise<AnalysisResult> => {
    if (isLiveAnalysisEnabled()) {
      return analyzeWithClaude(
        pageCtx,
        (s) => {
          const prefix = total > 1 ? `Page ${pageNum}/${total}: ` : "";
          setStage(prefix + s);
          toast(prefix + s);
        },
        signal
      );
    }
    if (total > 1) toast(`Analyzing page ${pageNum} of ${total}…`);
    return new Promise<AnalysisResult>((resolve, reject) => {
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const onAbort = () => {
        timeouts.forEach(clearTimeout);
        reject(new DOMException("Analysis cancelled", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      MOCK_STAGES.forEach((s, i) => {
        timeouts.push(
          setTimeout(() => {
            const prefix = total > 1 ? `Page ${pageNum}/${total}: ` : "";
            setStage(prefix + s);
            if (total === 1 && i < MOCK_STAGES.length - 1) toast(s);
            if (i === MOCK_STAGES.length - 1) {
              signal.removeEventListener("abort", onAbort);
              resolve(generateAnalysis(pageCtx.designType, pageCtx.audience));
            }
          }, i * 600 + 200)
        );
      });
    });
  };

  const handleAnalyze = async () => {
    if (!context.imageUrl) return;
    const allUrls = [context.imageUrl, ...additionalPages.map((p) => p.imageUrl)];
    const allContexts = [context, ...additionalPages.map((p) => p.context)];
    const controller = new AbortController();
    abortRef.current = controller;
    setIsAnalyzing(true);
    setStage("Starting…");

    try {
      const pageResults: Array<{ imageUrl: string; result: AnalysisResult; context: AnalysisContext }> = [];

      for (let i = 0; i < allUrls.length; i++) {
        const pageCtx = { ...allContexts[i], imageUrl: allUrls[i] };
        const result = await runPageAnalysis(pageCtx, i + 1, allUrls.length, controller.signal);
        const fullDataUrl = await imageToThumbnail(allUrls[i], 1400);
        pageResults.push({ imageUrl: fullDataUrl, result, context: pageCtx });
      }

      const thumb = await imageToThumbnail(context.imageUrl, 200);
      const entry: HistoryEntry = {
        id: makeId(),
        createdAt: Date.now(),
        label: defaultLabel(context),
        thumbnail: thumb,
        context: { ...context, imageUrl: pageResults[0].imageUrl },
        result: pageResults[0].result,
        pages: pageResults.length > 1 ? pageResults : undefined,
      };
      addEntry(entry);
      toast.success(
        pageResults.length > 1
          ? `Analysis complete — ${pageResults.length} pages`
          : "Analysis complete"
      );
      navigate(`/analysis/${entry.id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401")) {
        toast.error("Invalid API key — check the ANTHROPIC_API_KEY configured for this deployment");
      } else if (msg.includes("503")) {
        toast.error("Live analysis isn't configured on this deployment — falling back to heuristic mock");
      } else {
        toast.error("Analysis failed — falling back to heuristic mock");
        try {
          const r = generateAnalysis(context.designType, context.audience);
          const thumb = await imageToThumbnail(context.imageUrl!, 200);
          const fullDataUrl = await imageToThumbnail(context.imageUrl!, 1400);
          const fallbackEntry: HistoryEntry = {
            id: makeId(),
            createdAt: Date.now(),
            label: defaultLabel(context),
            thumbnail: thumb,
            context: { ...context, imageUrl: fullDataUrl },
            result: r,
          };
          addEntry(fallbackEntry);
          navigate(`/analysis/${fallbackEntry.id}`);
        } catch { /* ignore */ }
      }
    } finally {
      setIsAnalyzing(false);
      setStage("");
      abortRef.current = null;
    }
  };

  const recent = history.slice(0, 4);

  const viewerSlot = context.imageUrl ? (
    <Card className="relative flex-1 overflow-hidden bg-muted/30 flex flex-col min-h-[420px]">
      {/* Current page preview */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <img
          src={allImageUrls[previewPage] ?? context.imageUrl}
          alt={`Page ${previewPage + 1} design preview`}
          className="max-h-[50vh] max-w-full object-contain rounded-md shadow-sm"
        />
      </div>

      {/* Page strip */}
      <div className="border-t bg-muted/20 px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
        {allImageUrls.map((url, i) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`Preview page ${i + 1}`}
            onClick={() => setPreviewPage(i)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPreviewPage(i); }}
            className={`relative shrink-0 rounded cursor-pointer transition-all ring-2 ${
              previewPage === i ? "ring-primary" : "ring-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img src={url} alt={`Page ${i + 1}`} className="size-10 object-cover rounded" />
            {i > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeAdditionalPage(i - 1); }}
                className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Remove page ${i + 1}`}
              >
                <X className="size-2.5" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] text-white bg-black/50 rounded-b leading-tight py-0.5 pointer-events-none">
              {i + 1}
            </div>
          </div>
        ))}

        {allImageUrls.length < MAX_PAGES && (
          <>
            <button
              onClick={() => addPageRef.current?.click()}
              className="size-10 shrink-0 rounded border-2 border-dashed border-border hover:border-foreground/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Add another page"
              title={`Add another page (max ${MAX_PAGES})`}
            >
              <Plus className="size-3.5" />
            </button>
            <input
              ref={addPageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = URL.createObjectURL(f);
                  setAdditionalPages((prev) => [...prev, { imageUrl: url, context: { ...context, imageUrl: url } }]);
                  setPreviewPage(allImageUrls.length);
                }
                e.target.value = "";
              }}
            />
          </>
        )}

        {allImageUrls.length > 1 && (
          <span className="text-xs text-muted-foreground ml-1 shrink-0">
            {allImageUrls.length}/{MAX_PAGES} pages
          </span>
        )}
      </div>

      <Button
        variant="secondary"
        size="icon"
        aria-label="Remove all images"
        className="absolute top-3 right-3"
        onClick={() => {
          setContext({ ...context, imageUrl: null });
          setAdditionalPages([]);
          setPreviewPage(0);
        }}
      >
        <X className="size-4" />
      </Button>
    </Card>
  ) : null;

  return (
    <>
      <div>
        <h1 className="font-serif text-2xl tracking-tight">New analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a design, set context, and get AI-powered UX findings with a draft test plan to run with real users.
        </p>
      </div>
      <div data-tour="workflow-stepper">
        <WorkflowStepper hasImage={!!context.imageUrl} hasResult={false} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 flex-1 min-h-0">
        <DesignCanvas
          context={activeContext}
          setContext={setActiveContext}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          analyzingStage={stage}
          onCancel={() => abortRef.current?.abort()}
          viewerSlot={viewerSlot}
          pageIndicator={
            allImageUrls.length > 1
              ? {
                  index: previewPage,
                  total: allImageUrls.length,
                  onCopyFromFirst: () => setActiveContext({ ...context, imageUrl: allImageUrls[previewPage] }),
                }
              : undefined
          }
        />
        <aside className="space-y-3 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-serif text-lg tracking-tight">Recent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pick up a past analysis</p>
            </div>
            {history.length > 4 && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                See all
              </Button>
            )}
          </div>
          {recent.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-sm text-muted-foreground text-center">
                No analyses yet — run your first one and it will appear here.
              </CardContent>
            </Card>
          ) : (
            recent.map((h) => (
              <button
                key={h.id}
                onClick={() => navigate(`/analysis/${h.id}`)}
                className="w-full text-left rounded-lg border bg-card overflow-hidden hover:border-foreground/30 transition-colors flex"
              >
                <img src={h.thumbnail} alt="" className="size-16 object-cover bg-muted shrink-0" />
                <div className="p-3 min-w-0 flex-1">
                  <div className="text-sm truncate">{h.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {h.result.findings.length} findings · {formatRelative(h.createdAt)}
                  </div>
                </div>
              </button>
            ))
          )}
        </aside>
      </div>
    </>
  );
}
