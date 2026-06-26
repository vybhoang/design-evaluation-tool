import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, CircleDashed, ChevronDown, Clock } from "lucide-react";
import { SessionCapture } from "../components/session-capture";
import { AnnotatedDesign } from "../components/annotated-design";
import { CardSortSession } from "../components/card-sort-session";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStore } from "../store";
import { WorkflowStepper } from "../components/workflow-stepper";
import { validationStatus } from "../components/validation-store";
import type { ResearchFinding, Severity } from "../components/analysis-data";
import type { ValidationEvidence } from "../components/validation-store";

const statusMeta = {
  unvalidated: { icon: CircleDashed, color: "text-muted-foreground" },
  confirmed: { icon: CheckCircle2, color: "text-emerald-600" },
  refuted: { icon: XCircle, color: "text-red-600" },
  mixed: { icon: MinusCircle, color: "text-amber-600" },
} as const;

const severityBorder: Record<Severity, string> = {
  critical: "border-l-red-400",
  warning: "border-l-amber-400",
  info: "border-l-blue-400",
  pass: "border-l-emerald-400",
};

function ChecklistItem({ f, validations }: { f: ResearchFinding; validations: ValidationEvidence[] }) {
  const [open, setOpen] = useState(false);
  const status = validationStatus(validations, f.id);
  const m = statusMeta[status];
  const Icon = m.icon;

  return (
    <div className={`rounded-md border border-l-[3px] ${severityBorder[f.severity]} bg-card`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left p-2.5 flex items-start gap-2"
      >
        <Icon className={`size-4 mt-0.5 shrink-0 ${m.color}`} />
        <span className="flex-1 text-sm font-medium leading-snug">{f.principle}</span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground/60 shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pl-9 text-xs text-muted-foreground leading-relaxed">
          {f.observation}
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    history, validations, addEvidence, deleteEvidence,
    firstClickTasks, firstClickAttempts, addFirstClickAttempt,
    cardSortDecks,
  } = useStore();
  const entry = history.find((h) => h.id === id);
  const [showValidated, setShowValidated] = useState(false);
  const [firstClickTaskId, setFirstClickTaskId] = useState<string | null>(null);
  const [cardSortDeckId, setCardSortDeckId] = useState<string | null>(null);
  const [firstClickParticipant, setFirstClickParticipant] = useState("");
  const [clickStartedAt, setClickStartedAt] = useState<number | null>(null);
  const [clickElapsed, setClickElapsed] = useState(0);

  useEffect(() => {
    if (clickStartedAt === null) return;
    const i = setInterval(() => setClickElapsed(Date.now() - clickStartedAt), 200);
    return () => clearInterval(i);
  }, [clickStartedAt]);

  if (!entry && history.length > 0) return <Navigate to="/history" replace />;
  if (!entry) return null;

  const decksForAnalysis = cardSortDecks.filter((d) => d.analysisId === entry.id);
  const activeDeck = decksForAnalysis.find((d) => d.id === cardSortDeckId) ?? decksForAnalysis[0] ?? null;

  const tasksForAnalysis = firstClickTasks.filter((t) => t.analysisId === entry.id);
  const activeFirstClickTask = tasksForAnalysis.find((t) => t.id === firstClickTaskId) ?? null;
  const capturedPoints = activeFirstClickTask
    ? firstClickAttempts
        .filter((a) => a.taskId === activeFirstClickTask.id)
        .map((a) => ({ x: a.x, y: a.y, t: a.t, hit: a.hit }))
    : [];

  const startFirstClickTimer = () => {
    setClickStartedAt(Date.now());
    setClickElapsed(0);
  };

  const captureFirstClick = (point: { x: number; y: number; t: number }) => {
    if (!activeFirstClickTask) return;
    const startedAt = clickStartedAt ?? point.t;
    addFirstClickAttempt({
      taskId: activeFirstClickTask.id,
      participantId: firstClickParticipant.trim() || "Unnamed participant",
      x: point.x,
      y: point.y,
      t: point.t - startedAt,
    });
    setClickStartedAt(null);
  };

  const suggestedQuestions = [...new Set(entry.result.lenses.flatMap((l) => l.questionsToAsk))];

  const toProbe = entry.result.findings.filter(
    (f) => validationStatus(validations, f.id) === "unvalidated"
  );
  const touched = entry.result.findings.filter(
    (f) => validationStatus(validations, f.id) !== "unvalidated"
  );

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/analysis/${entry.id}`)} className="gap-1.5">
            <ArrowLeft className="size-4" /> Back to analysis
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl tracking-tight truncate">Moderate session</h1>
            <div className="text-xs text-muted-foreground truncate">
              For: <Link to={`/analysis/${entry.id}`} className="underline underline-offset-2">{entry.label}</Link>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-1">
        Ask, log, tag — each response saves as evidence instantly.
      </p>

      <WorkflowStepper current="test" onStepClick={(s) => {
        if (s === "check") navigate(`/analysis/${entry.id}`);
        if (s === "generate") navigate("/new");
      }} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:items-start">
        <div className="space-y-4">
          <SessionCapture
            findings={entry.result.findings}
            onAddEvidence={addEvidence}
            onDeleteEvidence={deleteEvidence}
            analysisId={entry.id}
            analysisLabel={entry.label}
            suggestedQuestions={suggestedQuestions}
          />
          {decksForAnalysis.length > 0 && (
            <>
              {decksForAnalysis.length > 1 && (
                <Select value={activeDeck?.id} onValueChange={setCardSortDeckId}>
                  <SelectTrigger size="sm" className="w-full max-w-xs">
                    <SelectValue placeholder="Choose a card sort deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {decksForAnalysis.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.cards.length} cards · {d.categories.length} categories</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {activeDeck && <CardSortSession key={activeDeck.id} deck={activeDeck} />}
            </>
          )}
        </div>
        <aside className="space-y-4 min-w-0 lg:sticky lg:top-20">
          {tasksForAnalysis.length > 0 && (
            <Card>
              <CardContent className="p-3 space-y-2.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  First-click task
                </div>
                <Select
                  value={firstClickTaskId ?? "none"}
                  onValueChange={(v) => {
                    setFirstClickTaskId(v === "none" ? null : v);
                    setClickStartedAt(null);
                  }}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="No active task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No active task</SelectItem>
                    {tasksForAnalysis.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.taskLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeFirstClickTask && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={firstClickParticipant}
                      onChange={(e) => setFirstClickParticipant(e.target.value)}
                      placeholder="Participant ID"
                      className="h-8 text-xs flex-1"
                    />
                    {clickStartedAt === null ? (
                      <Button size="sm" className="h-8" onClick={startFirstClickTimer}>
                        Start click
                      </Button>
                    ) : (
                      <Badge variant="outline" className="gap-1 h-8 px-2.5">
                        <Clock className="size-3" /> {(clickElapsed / 1000).toFixed(1)}s
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <AnnotatedDesign
            imageUrl={entry.context.imageUrl!}
            result={entry.result}
            activeFindingId={null}
            onSelectFinding={() => {}}
            onClear={() => {}}
            firstClickEnabled={tasksForAnalysis.length > 0}
            targetRegion={activeFirstClickTask?.targetRegion ?? null}
            capturedPoints={capturedPoints}
            onCapturePoint={captureFirstClick}
            heightClassName="h-[40vh]"
          />
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-base tracking-tight">Findings to probe</h3>
                <Badge variant="outline" className="text-xs shrink-0">
                  {touched.length}/{entry.result.findings.length}
                </Badge>
              </div>

              {toProbe.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Every finding has at least one tagged response. Nice work.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[40vh] overflow-auto">
                  {toProbe.map((f) => (
                    <ChecklistItem key={f.id} f={f} validations={validations} />
                  ))}
                </div>
              )}

              {touched.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowValidated(!showValidated)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ChevronDown className={`size-3 transition-transform ${showValidated ? "rotate-180" : ""}`} />
                    {showValidated ? "Hide" : "Show"} already tagged ({touched.length})
                  </button>
                  {showValidated && (
                    <div className="space-y-1.5 mt-1.5 max-h-[30vh] overflow-auto">
                      {touched.map((f) => (
                        <ChecklistItem key={f.id} f={f} validations={validations} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
