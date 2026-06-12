import { useRef, useState, useEffect, type ReactNode } from "react";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export type AnalysisContext = {
  imageUrl: string | null;
  designType: string;
  audience: string;
  goal: string;
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

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setContext({ ...context, imageUrl: url });
  };

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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadDemo();
              }}
              className="mt-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              or use a sample
            </button>
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

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Design type</Label>
          <Select
            value={context.designType}
            onValueChange={(v) => setContext({ ...context, designType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landing">Landing page</SelectItem>
              <SelectItem value="checkout">Checkout flow</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="mobile">Mobile app screen</SelectItem>
              <SelectItem value="form">Form / signup</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Target audience</Label>
          <Select
            value={context.audience}
            onValueChange={(v) => setContext({ ...context, audience: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General consumers</SelectItem>
              <SelectItem value="enterprise">Enterprise users</SelectItem>
              <SelectItem value="developers">Developers</SelectItem>
              <SelectItem value="seniors">Seniors / accessibility-first</SelectItem>
              <SelectItem value="genz">Gen Z / mobile-native</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Primary goal</Label>
          <Textarea
            value={context.goal}
            onChange={(e) => setContext({ ...context, goal: e.target.value })}
            placeholder="e.g. Convert visitors into trial signups"
            className="min-h-[40px] h-10 resize-none"
          />
        </div>
      </Card>

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
    </div>
  );
}
