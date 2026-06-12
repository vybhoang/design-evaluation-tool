import { Wand2, BookCheck, Users, ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    id: "generate",
    icon: Wand2,
    label: "Generate UI",
    sub: "v0, Cursor, Figma Make…",
  },
  {
    id: "check",
    icon: BookCheck,
    label: "Heuristic check",
    sub: "Validate against UX research",
  },
  {
    id: "test",
    icon: Users,
    label: "Test with humans",
    sub: "Real users · real evidence",
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type Props = {
  current?: StepId;
  hasImage?: boolean;
  hasResult?: boolean;
  onStepClick?: (id: StepId) => void;
};

export function WorkflowStepper({
  current,
  hasImage = false,
  hasResult = false,
  onStepClick,
}: Props) {
  const derived: StepId = current ?? (hasResult ? "test" : hasImage ? "check" : "generate");
  const currentIdx = STEPS.findIndex((s) => s.id === derived);

  return (
    <div className="rounded-lg border bg-card p-2 flex items-center gap-1 flex-wrap">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isCurrent = s.id === derived;
        const isDone = i < currentIdx;
        const clickable = !!onStepClick && (isDone || isCurrent);
        const inner = (
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${
              isCurrent
                ? "bg-primary text-primary-foreground"
                : isDone
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground/70"
            } ${clickable ? "cursor-pointer" : ""}`}
          >
            <div
              className={`size-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                isCurrent
                  ? "bg-primary-foreground/20"
                  : isDone
                  ? "bg-emerald-500 text-white"
                  : "bg-muted"
              }`}
            >
              {isDone ? <Check className="size-3" /> : i + 1}
            </div>
            <Icon className="size-3.5" />
            <div className="leading-tight">
              <div className="text-xs font-medium">{s.label}</div>
              <div className={`text-[10px] ${isCurrent ? "opacity-80" : "opacity-60"}`}>
                {s.sub}
              </div>
            </div>
          </div>
        );
        return (
          <div key={s.id} className="flex items-center gap-1">
            {clickable ? (
              <button type="button" onClick={() => onStepClick?.(s.id)}>
                {inner}
              </button>
            ) : (
              inner
            )}
            {i < STEPS.length - 1 && (
              <ArrowRight className="size-3 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}
