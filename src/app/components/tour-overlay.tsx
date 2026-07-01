import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import { X, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";
import { TOUR_STEPS, type TourStep } from "./tour-config";
import { useStore } from "../store";

const STORAGE_KEY = "cognition-tour-seen";
const PAD = 10;
const CARD_W = 360;
const DIM = "rgba(0,0,0,0.55)";

// ── Context ───────────────────────────────────────────────────────────────────

type TourCtx = {
  active: boolean;
  start: () => void;
  /** Register a DOM element as a named anchor; pass null on unmount. */
  registerAnchor: (id: string, el: HTMLElement | null) => void;
};

const TourContext = createContext<TourCtx>({
  active: false,
  start: () => {},
  registerAnchor: () => {},
});
export const useTour = () => useContext(TourContext);

// ── TourAnchor — wraps any element and registers it with the tour context ─────
// Use this instead of data-tour attributes when querySelector is unreliable
// (e.g. inside Button asChild / Radix Slot chains).

export function TourAnchor({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { registerAnchor } = useTour();
  const ref = useCallback(
    (el: HTMLDivElement | null) => registerAnchor(id, el),
    [id, registerAnchor]
  );
  // `flex` prevents inline-element strut artifacts; children fill naturally
  return (
    <div ref={ref} className={className ?? "flex"}>
      {children}
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { history } = useStore();
  const analysisId = history[0]?.id ?? null;

  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  // Anchor map: id → HTMLElement, populated by TourAnchor components via ref
  const anchors = useRef<Record<string, HTMLElement>>({});
  const registerAnchor = useCallback((id: string, el: HTMLElement | null) => {
    if (el) anchors.current[id] = el;
    else delete anchors.current[id];
  }, []);

  const start = useCallback(() => {
    navigate("/new");
    setStepIdx(0);
    setTimeout(() => setActive(true), 200);
  }, [navigate]);

  const finish = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const navigateForStep = useCallback(
    (idx: number) => {
      const step = TOUR_STEPS[idx];
      if (step.tourRoute === "analysis" && analysisId) {
        navigate(`/analysis/${analysisId}`);
      } else if (step.tourRoute === "session" && analysisId) {
        navigate(`/analysis/${analysisId}/session`);
      } else if (step.tourRoute === "new") {
        navigate("/new");
      }
    },
    [analysisId, navigate]
  );

  const handleNext = useCallback(() => {
    const nextIdx = stepIdx + 1;
    if (nextIdx >= TOUR_STEPS.length) { finish(); return; }
    navigateForStep(nextIdx);
    setStepIdx(nextIdx);
  }, [stepIdx, finish, navigateForStep]);

  const handlePrev = useCallback(() => {
    const prevIdx = stepIdx - 1;
    if (prevIdx < 0) return;
    navigateForStep(prevIdx);
    setStepIdx(prevIdx);
  }, [stepIdx, navigateForStep]);

  // Auto-launch once for new visitors, but only when they reach /new (not on landing)
  useEffect(() => {
    if (location.pathname !== "/new") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => { setStepIdx(0); setActive(true); }, 900);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <TourContext.Provider value={{ active, start, registerAnchor }}>
      {children}
      {active && (
        <TourOverlay
          stepIdx={stepIdx}
          hasAnalysis={!!analysisId}
          anchors={anchors}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
}

// ── Help / restart button ─────────────────────────────────────────────────────

export function TourHelpButton() {
  const { start } = useTour();
  return (
    <button
      onClick={start}
      title="Take a tour"
      className="px-2 py-1 text-xs text-muted-foreground rounded border border-dashed border-border hover:text-foreground hover:border-foreground/40 transition-colors flex items-center gap-1"
    >
      <GraduationCap className="size-3" />
      Tour
    </button>
  );
}

// ── Card positioning ──────────────────────────────────────────────────────────

function cardStyle(rect: DOMRect | null, placement: TourStep["placement"]): CSSProperties {
  const margin = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampL = (x: number) => Math.min(Math.max(x, margin), vw - CARD_W - margin);
  const clampT = (y: number) => Math.min(Math.max(y, margin), vh - 260 - margin);

  if (!rect || !placement || placement === "center") {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: CARD_W, zIndex: 10001 };
  }
  switch (placement) {
    case "bottom": return { position: "fixed", top: rect.bottom + PAD + margin, left: clampL(rect.left), width: CARD_W, zIndex: 10001 };
    case "top":    return { position: "fixed", bottom: vh - rect.top + PAD + margin, left: clampL(rect.left), width: CARD_W, zIndex: 10001 };
    case "right":  return { position: "fixed", top: clampT(rect.top), left: rect.right + PAD + margin, width: CARD_W, zIndex: 10001 };
    case "left":   return { position: "fixed", top: clampT(rect.top), right: vw - rect.left + PAD + margin, width: CARD_W, zIndex: 10001 };
    default:       return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: CARD_W, zIndex: 10001 };
  }
}

// ── Overlay ───────────────────────────────────────────────────────────────────

type Props = {
  stepIdx: number;
  hasAnalysis: boolean;
  anchors: { current: Record<string, HTMLElement> };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
};

function TourOverlay({ stepIdx, hasAnalysis, anchors, onNext, onPrev, onSkip }: Props) {
  const step = TOUR_STEPS[stepIdx];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const attempts = useRef(0);
  const innerTimer = useRef<ReturnType<typeof setTimeout>>();

  // Lock body scroll for the lifetime of this overlay
  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (sw > 0) document.body.style.paddingRight = `${sw}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, []);

  // Skip targeting analysis/session elements when no analysis exists
  const effectiveTarget =
    step.target && (step.tourRoute === "analysis" || step.tourRoute === "session") && !hasAnalysis
      ? undefined
      : step.target;

  // Find the target element and measure it.
  // Priority: (1) registered TourAnchor ref, (2) querySelector scoped to <main>,
  // (3) querySelector on document (for nav-* steps that live in the header).
  useEffect(() => {
    setRect(null);
    clearTimeout(innerTimer.current);
    attempts.current = 0;
    if (!effectiveTarget) return;

    // Extract the data-tour id from a "[data-tour='x']" selector, if present
    const anchorId = effectiveTarget.match(/\[data-tour='([^']+)'\]/)?.[1] ?? null;
    const isNavTarget = anchorId?.startsWith("nav-") ?? false;

    const find = () => {
      // 1. Try the registered anchor ref first (bypasses querySelector entirely)
      const anchorEl = anchorId ? anchors.current[anchorId] : null;

      // 2. Fall back to scoped querySelector
      const root = isNavTarget ? document : (document.querySelector("main") ?? document);
      const el: Element | null = anchorEl ?? root.querySelector(effectiveTarget);

      if (el) {
        el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "nearest" });
        innerTimer.current = setTimeout(() => setRect(el.getBoundingClientRect()), 50);
      } else if (attempts.current < 12) {
        attempts.current++;
        setTimeout(find, 100);
      }
    };

    const t = setTimeout(find, 100);
    return () => {
      clearTimeout(t);
      clearTimeout(innerTimer.current);
    };
  }, [stepIdx, effectiveTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on resize
  useEffect(() => {
    if (!rect || !effectiveTarget) return;
    const anchorId = effectiveTarget.match(/\[data-tour='([^']+)'\]/)?.[1] ?? null;
    const update = () => {
      const anchorEl = anchorId ? anchors.current[anchorId] : null;
      const root = anchorId?.startsWith("nav-") ? document : (document.querySelector("main") ?? document);
      const el: Element | null = anchorEl ?? root.querySelector(effectiveTarget);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [rect, effectiveTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const s = rect;

  // Don't render the card until we know where it goes. For targeted steps, wait
  // until the element rect is resolved; center steps (no target) show immediately.
  const cardReady = !effectiveTarget || rect !== null;

  const top    = s ? Math.max(0, s.top - PAD) : 0;
  const bottom = s ? Math.min(window.innerHeight, s.bottom + PAD) : 0;
  const left   = s ? Math.max(0, s.left - PAD) : 0;
  const right  = s ? Math.min(window.innerWidth, s.right + PAD) : 0;

  return createPortal(
    <>
      {/* ── Spotlight backdrop ── */}
      {s ? (
        <>
          <div style={{ position:"fixed", top:0, left:0, right:0, height:top, background:DIM, zIndex:9999, pointerEvents:"auto" }} />
          <div style={{ position:"fixed", top:bottom, left:0, right:0, bottom:0, background:DIM, zIndex:9999, pointerEvents:"auto" }} />
          <div style={{ position:"fixed", top, left:0, width:left, height:bottom-top, background:DIM, zIndex:9999, pointerEvents:"auto" }} />
          <div style={{ position:"fixed", top, left:right, right:0, height:bottom-top, background:DIM, zIndex:9999, pointerEvents:"auto" }} />
          <div style={{ position:"fixed", top, left, width:right-left, height:bottom-top, zIndex:9999, pointerEvents:"auto" }} />
          <div style={{ position:"fixed", top, left, width:right-left, height:bottom-top, borderRadius:10, border:"2px solid hsl(var(--primary)/0.75)", boxShadow:"0 0 0 4px hsl(var(--primary)/0.12)", zIndex:10000, pointerEvents:"none", transition:"all 0.2s ease" }} />
        </>
      ) : (
        <div style={{ position:"fixed", inset:0, background:DIM, zIndex:9999, pointerEvents:"auto" }} />
      )}

      {/* ── Tour card ── */}
      {cardReady && <div
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={cardStyle(rect, step.placement)}
        className="rounded-xl border bg-background shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {stepIdx + 1} / {TOUR_STEPS.length}
          </span>
          <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close tour">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-4">
          <div className="h-0.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((stepIdx + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="px-4 pt-3 pb-2 space-y-1.5">
          <h3 className="font-serif text-base tracking-tight">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
        </div>

        <div className="px-4 pb-1 flex items-center gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === stepIdx ? "w-4 h-1.5 bg-primary" :
                i < stepIdx   ? "w-1.5 h-1.5 bg-primary/40" :
                                "w-1.5 h-1.5 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>

        <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLast ? " " : "Skip tour"}
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={onPrev} className="gap-1">
                <ChevronLeft className="size-3.5" /> Back
              </Button>
            )}
            <Button size="sm" onClick={onNext} className="gap-1">
              {isLast ? "Done" : "Next"}
              {!isLast && <ChevronRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>}
    </>,
    document.body
  );
}
