import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { DesignCanvas, type AnalysisContext } from "../components/design-canvas";
import { generateAnalysis } from "../components/analysis-data";
import { analyzeWithClaude, isLiveAnalysisEnabled } from "../components/claude-vision-analysis";
import { imageToThumbnail, type HistoryEntry, formatRelative } from "../components/history-store";
import { useStore } from "../store";
import { WorkflowStepper } from "../components/workflow-stepper";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { X } from "lucide-react";

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
    goal: "Convert visitors into trial signups",
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState("");

  const handleAnalyze = async () => {
    if (!context.imageUrl) return;
    setIsAnalyzing(true);
    setStage("Starting…");
    try {
      let r;
      if (isLiveAnalysisEnabled()) {
        r = await analyzeWithClaude(context, (s) => {
          setStage(s);
          toast(s);
        });
      } else {
        // Mock path: simulate staged progress with delays
        await new Promise<void>((resolve) => {
          MOCK_STAGES.forEach((s, i) =>
            setTimeout(() => {
              setStage(s);
              if (i < MOCK_STAGES.length - 1) toast(s);
              if (i === MOCK_STAGES.length - 1) resolve();
            }, i * 600 + 200)
          );
        });
        r = generateAnalysis(context.designType, context.audience);
      }

      const thumb = await imageToThumbnail(context.imageUrl!, 200);
      const fullDataUrl = await imageToThumbnail(context.imageUrl!, 1400);
      const entry: HistoryEntry = {
        id: makeId(),
        createdAt: Date.now(),
        label: defaultLabel(context),
        thumbnail: thumb,
        context: { ...context, imageUrl: fullDataUrl },
        result: r,
      };
      addEntry(entry);
      toast.success("Analysis complete");
      navigate(`/analysis/${entry.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401")) {
        toast.error("Invalid API key — check the ANTHROPIC_API_KEY configured for this deployment");
      } else if (msg.includes("503")) {
        toast.error("Live analysis isn't configured on this deployment — falling back to heuristic mock");
      } else {
        toast.error("Analysis failed — falling back to heuristic mock");
        // Fallback: save a mock result so the user isn't left stranded
        try {
          const r = generateAnalysis(context.designType, context.audience);
          const thumb = await imageToThumbnail(context.imageUrl!, 200);
          const fullDataUrl = await imageToThumbnail(context.imageUrl!, 1400);
          addEntry({ id: makeId(), createdAt: Date.now(), label: defaultLabel(context), thumbnail: thumb, context: { ...context, imageUrl: fullDataUrl }, result: r });
          navigate(`/analysis/${history[0]?.id ?? ""}`);
        } catch { /* ignore */ }
      }
    } finally {
      setIsAnalyzing(false);
      setStage("");
    }
  };

  const recent = history.slice(0, 4);

  return (
    <>
      <div>
        <h1 className="font-serif text-2xl tracking-tight">New analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a design, set context, and get AI-powered UX findings with a ready-to-run test plan.
        </p>
      </div>
      <div data-tour="workflow-stepper">
        <WorkflowStepper hasImage={!!context.imageUrl} hasResult={false} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 flex-1 min-h-0">
        <DesignCanvas
          context={context}
          setContext={setContext}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          analyzingStage={stage}
          viewerSlot={
            context.imageUrl ? (
              <Card className="relative flex-1 overflow-hidden bg-muted/30 flex items-center justify-center min-h-[420px]">
                <img src={context.imageUrl} alt="" className="max-h-[60vh] max-w-full object-contain" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-3 right-3"
                  onClick={() => setContext({ ...context, imageUrl: null })}
                >
                  <X className="size-4" />
                </Button>
              </Card>
            ) : null
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
