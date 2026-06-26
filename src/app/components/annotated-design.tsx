import { useRef, useState } from "react";
import { Eye, EyeOff, Flame, MapPin, MousePointerClick, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Toggle } from "./ui/toggle";
import type { AnalysisResult, Severity } from "./analysis-data";

const sevColor: Record<Severity, string> = {
  critical: "bg-red-500 ring-red-500/30 text-white",
  warning: "bg-amber-500 ring-amber-500/30 text-white",
  info: "bg-blue-500 ring-blue-500/30 text-white",
  pass: "bg-emerald-500 ring-emerald-500/30 text-white",
};

export type ViewMode = "annotations" | "heatmap" | "first-click" | "none";

export type FirstClickPoint = { x: number; y: number; t: number; hit?: boolean };

type Props = {
  imageUrl: string;
  result: AnalysisResult | null;
  activeFindingId: string | null;
  onSelectFinding: (id: string | null) => void;
  onClear: () => void;
  // First-click testing — all optional, inert unless a caller passes them in.
  firstClickEnabled?: boolean;
  targetRegion?: { x: number; y: number; w: number; h: number } | null;
  onDefineRegion?: (region: { x: number; y: number; w: number; h: number }) => void;
  capturedPoints?: FirstClickPoint[];
  onCapturePoint?: (point: { x: number; y: number; t: number }) => void;
  definingRegion?: boolean;
  heightClassName?: string;
};

export function AnnotatedDesign({
  imageUrl,
  result,
  activeFindingId,
  onSelectFinding,
  onClear,
  firstClickEnabled = false,
  targetRegion = null,
  onDefineRegion,
  capturedPoints = [],
  onCapturePoint,
  definingRegion = false,
  heightClassName = "h-[calc(100vh-5.5rem)]",
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("annotations");
  const imageRef = useRef<HTMLImageElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const findings = result?.findings ?? [];
  const active = findings.find((f) => f.id === activeFindingId) ?? null;

  const toggleAnnotations = (on: boolean) => setViewMode(on ? "annotations" : "none");
  const toggleHeatmap = (on: boolean) => setViewMode(on ? "heatmap" : "none");
  const toggleFirstClick = (on: boolean) => setViewMode(on ? "first-click" : "none");

  const relativePoint = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imageRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const handleImageAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== "first-click" || definingRegion) return;
    const point = relativePoint(e);
    if (!point) return;
    onCapturePoint?.({ x: point.x, y: point.y, t: Date.now() });
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!definingRegion) return;
    const point = relativePoint(e);
    if (!point) return;
    setDragStart(point);
    setDragCurrent(point);
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!definingRegion || !dragStart) return;
    const point = relativePoint(e);
    if (!point) return;
    setDragCurrent(point);
  };

  const handleDragEnd = () => {
    if (!definingRegion || !dragStart || !dragCurrent) return;
    const x = Math.min(dragStart.x, dragCurrent.x);
    const y = Math.min(dragStart.y, dragCurrent.y);
    const w = Math.abs(dragCurrent.x - dragStart.x);
    const h = Math.abs(dragCurrent.y - dragStart.y);
    setDragStart(null);
    setDragCurrent(null);
    if (w < 0.01 || h < 0.01) return;
    onDefineRegion?.({ x, y, w, h });
  };

  const draftRegion =
    dragStart && dragCurrent
      ? {
          x: Math.min(dragStart.x, dragCurrent.x),
          y: Math.min(dragStart.y, dragCurrent.y),
          w: Math.abs(dragCurrent.x - dragStart.x),
          h: Math.abs(dragCurrent.y - dragStart.y),
        }
      : null;

  return (
    <Card className={`relative overflow-hidden bg-muted/30 p-0 ${heightClassName}`}>
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {result && (
          <>
            <Toggle
              pressed={viewMode === "annotations"}
              onPressedChange={toggleAnnotations}
              size="sm"
              className="bg-card/90 backdrop-blur data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {viewMode === "annotations" ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              <span className="ml-1 text-xs">Issues</span>
            </Toggle>
            <Toggle
              pressed={viewMode === "heatmap"}
              onPressedChange={toggleHeatmap}
              size="sm"
              className="bg-card/90 backdrop-blur data-[state=on]:bg-orange-500 data-[state=on]:text-white"
            >
              <Flame className="size-3.5" />
              <span className="ml-1 text-xs">Salience (approx.)</span>
            </Toggle>
            {firstClickEnabled && (
              <Toggle
                pressed={viewMode === "first-click"}
                onPressedChange={toggleFirstClick}
                size="sm"
                className="bg-card/90 backdrop-blur data-[state=on]:bg-violet-600 data-[state=on]:text-white"
              >
                <MousePointerClick className="size-3.5" />
                <span className="ml-1 text-xs">First-click mode</span>
              </Toggle>
            )}
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
            ref={imageRef}
            src={imageUrl}
            alt="design preview"
            className="max-h-[60vh] max-w-full rounded-md shadow-lg object-contain block"
          />

          {viewMode === "heatmap" && result && (
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

          {viewMode === "annotations" && result && (
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

          {viewMode === "first-click" && (
            <div
              className={`absolute inset-0 ${definingRegion ? "cursor-crosshair" : "cursor-pointer"}`}
              onClick={handleImageAreaClick}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
            >
              {targetRegion && (
                <div
                  className="absolute border-2 border-dashed border-violet-500 bg-violet-500/10 rounded-sm pointer-events-none"
                  style={{
                    left: `${targetRegion.x * 100}%`,
                    top: `${targetRegion.y * 100}%`,
                    width: `${targetRegion.w * 100}%`,
                    height: `${targetRegion.h * 100}%`,
                  }}
                />
              )}
              {draftRegion && (
                <div
                  className="absolute border-2 border-dashed border-violet-400 bg-violet-400/10 rounded-sm pointer-events-none"
                  style={{
                    left: `${draftRegion.x * 100}%`,
                    top: `${draftRegion.y * 100}%`,
                    width: `${draftRegion.w * 100}%`,
                    height: `${draftRegion.h * 100}%`,
                  }}
                />
              )}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
                <span className="rounded-full bg-violet-600 text-white text-[10px] font-medium px-2 py-0.5 shadow">
                  Real participant clicks
                </span>
              </div>
              {capturedPoints.map((p, i) => (
                <div
                  key={i}
                  className={`absolute size-3 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-2 ring-white shadow ${
                    p.hit === false ? "bg-red-500" : "bg-violet-600"
                  }`}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>

        {active && viewMode === "annotations" && (
          <div className="absolute bottom-4 left-4 right-4 z-20 max-w-xl mx-auto">
            <Card className="p-3.5 shadow-xl bg-card/95 backdrop-blur max-h-[40vh] overflow-y-auto">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{active.principle}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 -mr-1 -mt-1 shrink-0"
                      onClick={() => onSelectFinding(null)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{active.observation}</p>
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
