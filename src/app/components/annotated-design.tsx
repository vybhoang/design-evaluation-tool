import { useState } from "react";
import { Eye, EyeOff, Flame, MapPin, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Toggle } from "./ui/toggle";
import type { AnalysisResult, ResearchFinding, Severity } from "./analysis-data";

const sevColor: Record<Severity, string> = {
  critical: "bg-red-500 ring-red-500/30 text-white",
  warning: "bg-amber-500 ring-amber-500/30 text-white",
  info: "bg-blue-500 ring-blue-500/30 text-white",
  pass: "bg-emerald-500 ring-emerald-500/30 text-white",
};

type Props = {
  imageUrl: string;
  result: AnalysisResult | null;
  activeFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  onClear: () => void;
};

export function AnnotatedDesign({
  imageUrl,
  result,
  activeFindingId,
  onSelectFinding,
  onClear,
}: Props) {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const findings = result?.findings ?? [];
  const active = findings.find((f) => f.id === activeFindingId) ?? null;

  return (
    <Card className="relative flex-1 overflow-hidden bg-muted/30 p-0">
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {result && (
          <>
            <Toggle
              pressed={showAnnotations}
              onPressedChange={setShowAnnotations}
              size="sm"
              className="bg-card/90 backdrop-blur data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {showAnnotations ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              <span className="ml-1 text-xs">Issues</span>
            </Toggle>
            <Toggle
              pressed={showHeatmap}
              onPressedChange={setShowHeatmap}
              size="sm"
              className="bg-card/90 backdrop-blur data-[state=on]:bg-orange-500 data-[state=on]:text-white"
            >
              <Flame className="size-3.5" />
              <span className="ml-1 text-xs">Salience (approx.)</span>
            </Toggle>
          </>
        )}
      </div>
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-3 right-3 rounded-full z-20"
        onClick={onClear}
      >
        <X className="size-4" />
      </Button>

      <div className="relative h-full w-full flex items-center justify-center p-6 bg-[linear-gradient(45deg,transparent_48%,rgba(0,0,0,0.04)_49%,rgba(0,0,0,0.04)_51%,transparent_52%)] bg-[length:16px_16px]">
        <div className="relative max-h-full max-w-full">
          <img
            src={imageUrl}
            alt="design preview"
            className="max-h-[60vh] max-w-full rounded-md shadow-lg object-contain block"
          />

          {showHeatmap && result && (
            <div className="absolute inset-0 pointer-events-none rounded-md overflow-hidden">
              {result.heatmap.map((p, i) => (
                <div
                  key={i}
                  className="absolute rounded-full mix-blend-multiply"
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    width: `${120 + p.intensity * 100}px`,
                    height: `${120 + p.intensity * 100}px`,
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle, rgba(239,68,68,${0.55 * p.intensity}) 0%, rgba(251,146,60,${0.35 * p.intensity}) 35%, rgba(250,204,21,${0.2 * p.intensity}) 60%, transparent 75%)`,
                  }}
                />
              ))}
            </div>
          )}

          {showAnnotations && result && (
            <div className="absolute inset-0">
              {findings.map((f, i) => {
                const isActive = activeFindingId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelectFinding(isActive ? null : f.id)}
                    className={`absolute group transition-all ${
                      isActive ? "z-10" : "z-0"
                    }`}
                    style={{
                      left: `${f.region.x * 100}%`,
                      top: `${f.region.y * 100}%`,
                      width: `${f.region.w * 100}%`,
                      height: `${f.region.h * 100}%`,
                    }}
                  >
                    <div
                      className={`absolute inset-0 rounded-md border-2 transition-all ${
                        isActive
                          ? sevColorBorder(f.severity) + " bg-current/10"
                          : "border-transparent group-hover:" + sevColorBorder(f.severity)
                      }`}
                    />
                    <div
                      className={`absolute -top-2 -left-2 size-6 rounded-full ring-4 flex items-center justify-center text-xs font-semibold shadow-md ${sevColor[f.severity]} ${
                        isActive ? "scale-125" : "group-hover:scale-110"
                      } transition-transform`}
                    >
                      {i + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {active && (
          <div className="absolute bottom-4 left-4 right-4 z-20 max-w-md mx-auto">
            <Card className="p-3 shadow-xl bg-card/95 backdrop-blur">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{active.principle}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 -mr-1 -mt-1"
                      onClick={() => onSelectFinding(null)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{active.observation}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
}

function sevColorBorder(s: Severity): string {
  return {
    critical: "border-red-500",
    warning: "border-amber-500",
    info: "border-blue-500",
    pass: "border-emerald-500",
  }[s];
}
