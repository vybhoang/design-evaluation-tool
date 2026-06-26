import { useRef, useState, useEffect, type ReactNode } from "react";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { isLiveAnalysisEnabled, suggestGoalsFromImage } from "./claude-vision-analysis";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
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

type Props = {
  context: AnalysisContext;
  setContext: (c: AnalysisContext) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analyzingStage: string;
  // when result exists, parent supplies the annotated viewer to render in place of the dropzone
  viewerSlot?: ReactNode;
};

export function DesignCanvas({
  context,
  setContext,
  onAnalyze,
  isAnalyzing,
  analyzingStage,
  viewerSlot,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [aiGoals, setAiGoals] = useState<string[] | null>(null);
  const [loadingGoals, setLoadingGoals] = useState(false);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setContext({ ...context, imageUrl: url });
  };

  // Auto-generate goal suggestions from the uploaded design
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
      .catch((err) => {
        console.error("Goal suggestion failed:", err);
        if (!cancelled) setAiGoals(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingGoals(false);
      });
    return () => {
      cancelled = true;
    };
    // Only regenerate on a new image upload, not on every context edit
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
    setContext({ ...context, imageUrl: "/sample-design.png" });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {viewerSlot ? (
        viewerSlot
      ) : (
        <Card className="relative flex-1 overflow-hidden border-dashed bg-muted/30 min-h-[420px]">
          <button
            type="button"
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
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                loadDemo();
              }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); loadDemo(); } }}
              className="mt-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground cursor-pointer"
            >
              or use a sample
            </span>
          </button>
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

      <Card className="p-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Analysis context</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tailors the heuristic checks to your design type and audience
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Design type</Label>
            <Combobox
              value={context.designType}
              onChange={(v) => {
                const isSuggested = Object.values(GOAL_SUGGESTIONS).flat().includes(context.goal);
                setContext({
                  ...context,
                  designType: v,
                  goal: isSuggested ? (GOAL_SUGGESTIONS[v]?.[0] ?? context.goal) : context.goal,
                });
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
              onChange={(v) => setContext({ ...context, audience: v })}
              groups={[{ options: AUDIENCE_OPTIONS }]}
              placeholder="Select or type an audience…"
              searchPlaceholder="Search or type a custom audience…"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Primary goal</Label>
            <Combobox
              value={context.goal}
              onChange={(v) => setContext({ ...context, goal: v })}
              loading={loadingGoals}
              groups={[
                {
                  heading: "Suggested from your design",
                  icon: Sparkles,
                  options: (aiGoals ?? []).map((g) => ({ value: g, label: g })),
                },
                {
                  heading: "Common goals",
                  options: (GOAL_SUGGESTIONS[context.designType] ?? []).map((g) => ({ value: g, label: g })),
                },
              ]}
              placeholder="What should users do or feel after using this design?"
              searchPlaceholder="Search or type a custom goal…"
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="gap-2"
          onClick={onAnalyze}
          disabled={isAnalyzing || !context.imageUrl}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {analyzingStage || "Analyzing against UX research…"}
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Run analysis
            </>
          )}
        </Button>
        {!context.imageUrl && !isAnalyzing && (
          <p className="text-xs text-center text-muted-foreground">
            Upload a design above to get started
          </p>
        )}
      </div>
    </div>
  );
}
