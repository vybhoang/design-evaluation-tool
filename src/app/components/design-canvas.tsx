import { useRef, useState, useEffect, type ReactNode } from "react";
import { Upload, Sparkles, Loader2, Clock } from "lucide-react";
import { isLiveAnalysisEnabled, suggestGoalsFromImage } from "./claude-vision-analysis";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Combobox, type ComboboxOption } from "./ui/combobox";

const DESIGN_TYPE_OPTIONS: ComboboxOption[] = [
  { value: "landing", label: "Landing page" },
  { value: "checkout", label: "Checkout flow" },
  { value: "dashboard", label: "Dashboard" },
  { value: "onboarding", label: "Onboarding" },
  { value: "mobile", label: "Mobile app screen" },
  { value: "form", label: "Form / signup" },
];

const AUDIENCE_OPTIONS: ComboboxOption[] = [
  { value: "general", label: "General consumers" },
  { value: "enterprise", label: "Enterprise users" },
  { value: "developers", label: "Developers" },
  { value: "seniors", label: "Seniors / accessibility-first" },
  { value: "genz", label: "Gen Z / mobile-native" },
];

export type AnalysisContext = {
  imageUrl: string | null;
  designType: string;
  audience: string;
  goal: string;
};

const GOAL_SUGGESTIONS: Record<string, string[]> = {
  landing: [
    "Convert visitors into trial signups",
    "Generate qualified leads via the CTA",
    "Drive free trial activations",
    "Build an email waitlist for launch",
    "Communicate the value proposition in 5 seconds",
    "Increase demo booking rate",
    "Reduce bounce rate on first scroll",
  ],
  checkout: [
    "Reduce cart abandonment rate",
    "Increase purchase completion rate",
    "Minimise friction at the payment step",
    "Drive upsell conversions before confirmation",
    "Build trust at the payment step",
    "Reduce guest-checkout drop-off",
    "Increase average order value",
  ],
  dashboard: [
    "Help users understand their data at a glance",
    "Reduce time to a key insight",
    "Surface the most actionable metrics first",
    "Drive daily return visits through habit loops",
    "Reduce cognitive load from dense data",
    "Improve discoverability of advanced features",
    "Speed up time-to-first-insight for new users",
  ],
  onboarding: [
    "Activate new users within their first session",
    "Drive discovery of the core feature",
    "Shorten time to first value",
    "Improve day-1 retention",
    "Reduce setup abandonment",
    "Personalize the experience early",
    "Build early trust through transparency",
  ],
  mobile: [
    "Increase session depth and return rate",
    "Reduce drop-off at key steps",
    "Drive the primary in-app action",
    "Improve task completion rate",
    "Reduce one-handed usability friction",
    "Increase notification opt-in rate",
    "Improve perceived app performance",
  ],
  form: [
    "Maximise form completion rate",
    "Reduce field-level abandonment",
    "Improve submission quality",
    "Drive account creation",
    "Reduce time-to-complete",
    "Minimise validation-error frustration",
    "Build confidence in data privacy",
  ],
};

// Live calls round-trip a screenshot through Claude Vision — variable but usually
// in this range. The mock stage simulation is fixed-length, so its estimate is exact.
const LIVE_ESTIMATE = "1–1.5 min";
const MOCK_ESTIMATE = "~3s";

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

type Props = {
  context: AnalysisContext;
  setContext: (c: AnalysisContext) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analyzingStage: string;
  onCancel?: () => void;
  viewerSlot?: ReactNode;
};

export function DesignCanvas({
  context,
  setContext,
  onAnalyze,
  isAnalyzing,
  analyzingStage,
  onCancel,
  viewerSlot,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [aiGoals, setAiGoals] = useState<string[] | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [imageReplaced, setImageReplaced] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setElapsed(0);
      return;
    }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    if (context.imageUrl) setImageReplaced(true);
    setContext({ ...context, imageUrl: url });
  };

  useEffect(() => {
    if (!context.imageUrl || !isLiveAnalysisEnabled()) {
      setAiGoals(null);
      return;
    }
    let cancelled = false;
    setLoadingGoals(true);
    setAiGoals(null);
    suggestGoalsFromImage(context)
      .then((goals) => {
        if (!cancelled) setAiGoals(goals);
      })
      .catch(() => {
        if (!cancelled) setAiGoals(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingGoals(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.imageUrl]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      if (context.imageUrl) {
        toast("To replace the design, clear it first");
        return;
      }
      const file = item.getAsFile();
      if (file) handleFile(file);
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [context]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const loadDemo = () => {
    if (context.imageUrl) setImageReplaced(true);
    setContext({ ...context, imageUrl: "/sample-design.png" });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {viewerSlot ? (
        viewerSlot
      ) : (
        <Card data-tour="upload-area" className="relative flex-1 overflow-hidden border-dashed bg-muted/30 min-h-[420px]">
          <button
            type="button"
            aria-label="Upload design — drop, click, or paste"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`h-full w-full flex flex-col items-center justify-center gap-3 p-10 transition-colors ${
              dragOver ? "bg-primary/5" : ""
            }`}
          >
            <Upload className="size-5 text-muted-foreground" strokeWidth={1.5} />
            <div className="text-center">
              <p className="font-serif text-lg tracking-tight">Drop a design</p>
              <p className="text-muted-foreground text-sm mt-1">
                PNG, JPG · drop, click, or paste with Ctrl/Cmd+V
              </p>
            </div>
          </button>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              loadDemo();
            }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); loadDemo(); } }}
            className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground cursor-pointer"
          >
            or use a sample
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </Card>
      )}

      {imageReplaced && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <span>⚠</span> Image changed — review your context before analysing.
        </p>
      )}

      <Card data-tour="context-fields" className="p-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Analysis context</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tailors the heuristic checks to your design type and audience
          </p>
        </div>
        <fieldset disabled={!context.imageUrl} className="contents">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Design type</Label>
              <Combobox
                value={context.designType}
                onChange={(v) => {
                  setImageReplaced(false);
                  setContext({ ...context, designType: v, goal: "" });
                }}
                groups={[{ options: DESIGN_TYPE_OPTIONS }]}
                placeholder="Select or type a design type…"
                searchPlaceholder="Search or type a custom design type…"
              />
            </div>
            <div className="space-y-2">
              <Label>Target audience</Label>
              <Combobox
                value={context.audience}
                onChange={(v) => { setImageReplaced(false); setContext({ ...context, audience: v }); }}
                groups={[{ options: AUDIENCE_OPTIONS }]}
                placeholder="Select or type an audience…"
                searchPlaceholder="Search or type a custom audience…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Primary goal</Label>
              <Input
                value={context.goal}
                onChange={(e) => { setImageReplaced(false); setContext({ ...context, goal: e.target.value }); }}
                placeholder="What should users do or feel after using this design?"
                disabled={!context.imageUrl}
              />
              {context.imageUrl && (
                <div className="space-y-2">
                  {(GOAL_SUGGESTIONS[context.designType] ?? []).slice(0, 4).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground w-full">Common goals</span>
                      {(GOAL_SUGGESTIONS[context.designType] ?? []).slice(0, 4).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => { setImageReplaced(false); setContext({ ...context, goal: g }); }}
                          className="text-xs px-2 py-1 rounded-full border border-input bg-muted/50 hover:bg-muted transition-colors text-left"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                  {loadingGoals && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="size-3 animate-pulse text-primary" /> AI suggestion — edit before use
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {[60, 45, 75].map((w) => (
                          <div key={w} className="h-6 rounded-full bg-muted animate-pulse" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {!loadingGoals && aiGoals && aiGoals.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="size-3 text-primary" /> AI suggestion — edit before use
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiGoals.slice(0, 4).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => { setImageReplaced(false); setContext({ ...context, goal: g }); }}
                            className="text-xs px-2 py-1 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </fieldset>
      </Card>

      <div data-tour="analyze-btn" className="flex flex-col gap-2">
        {isAnalyzing ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button size="lg" className="gap-2 flex-1" disabled>
                <Loader2 className="size-4 animate-spin" />
                {analyzingStage || "Analyzing against UX research…"}
              </Button>
              <Button size="lg" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <Clock className="size-3" />
              {formatElapsed(elapsed)} elapsed · usually takes {isLiveAnalysisEnabled() ? LIVE_ESTIMATE : MOCK_ESTIMATE} per page
            </p>
          </div>
        ) : (
          <Button
            size="lg"
            className="gap-2"
            onClick={() => { setImageReplaced(false); onAnalyze(); }}
            disabled={!context.imageUrl}
          >
            <Sparkles className="size-4" /> Run analysis
          </Button>
        )}

      </div>
    </div>
  );
}
