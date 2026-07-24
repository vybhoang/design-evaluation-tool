import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Radio, Square, Plus, Tag, Clock, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, X, Check, Hash, ListChecks } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import type { ResearchFinding } from "./analysis-data";
import type { ValidationEvidence } from "./validation-store";
import type { Code } from "./codebook-store";
import { LikertRow } from "./likert-row";
import { useStore } from "../store";

type Props = {
  findings: ResearchFinding[];
  onAddEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => string;
  onDeleteEvidence: (id: string) => void;
  analysisId?: string;
  analysisLabel?: string;
  suggestedQuestions?: string[];
};

type Observation = {
  id: string;
  text: string;
  question: string;
  ts: number; // ms since session start
  responseId: string; // linked entry in the persistent response log
  evidenceId?: string; // linked validation evidence entry, so re-tagging can replace it
  taggedFindingId?: string;
  verdict?: "confirmed" | "refuted" | "inconclusive";
};

function TagControl({
  o, findings, onTag, onClear,
}: {
  o: Observation;
  findings: ResearchFinding[];
  onTag: (findingId: string, verdict: "confirmed" | "refuted" | "inconclusive") => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleTag = (findingId: string, verdict: "confirmed" | "refuted" | "inconclusive") => {
    onTag(findingId, verdict);
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0">
          <Tag className="size-3" /> {o.taggedFindingId ? "Edit tag" : "Tag"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="text-xs text-muted-foreground">
            {o.taggedFindingId ? "Change tag and verdict" : "Tag to a finding and set verdict"}
          </div>
          {o.taggedFindingId && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-red-600"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-auto space-y-1">
          {findings.map((f) => {
            const isCurrent = o.taggedFindingId === f.id;
            return (
              <div
                key={f.id}
                className={`rounded border p-2 ${isCurrent ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <div className="text-xs font-medium mb-1.5 line-clamp-2">{f.principle}</div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-6 px-1.5 text-[10px] gap-1 text-emerald-700 hover:bg-emerald-50 ${isCurrent && o.verdict === "confirmed" ? "bg-emerald-100" : ""}`}
                    onClick={() => handleTag(f.id, "confirmed")}
                  >
                    <CheckCircle2 className="size-3" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-6 px-1.5 text-[10px] gap-1 text-red-700 hover:bg-red-50 ${isCurrent && o.verdict === "refuted" ? "bg-red-100" : ""}`}
                    onClick={() => handleTag(f.id, "refuted")}
                  >
                    <XCircle className="size-3" /> Refute
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-6 px-1.5 text-[10px] gap-1 text-amber-700 hover:bg-amber-50 ${isCurrent && o.verdict === "inconclusive" ? "bg-amber-100" : ""}`}
                    onClick={() => handleTag(f.id, "inconclusive")}
                  >
                    <MinusCircle className="size-3" /> Mixed
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CodeChipToggle({
  appliedCodeIds, codebook, onAddCode, onToggleCode,
}: {
  appliedCodeIds: string[];
  codebook: Code[];
  onAddCode: (label: string) => string;
  onToggleCode: (codeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const createAndApply = () => {
    const label = draft.trim();
    if (!label) return;
    const id = onAddCode(label);
    onToggleCode(id);
    setDraft("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0">
          <Hash className="size-3" /> Code
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="text-xs text-muted-foreground px-2 pb-2">Apply codes to this observation</div>
        <div className="max-h-48 overflow-auto space-y-1 mb-2">
          {codebook.map((c) => {
            const active = appliedCodeIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggleCode(c.id)}
                className={`w-full text-left rounded border px-2 py-1.5 text-xs flex items-center justify-between gap-2 ${
                  active ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <span className="truncate">{c.label}</span>
                {active && <CheckCircle2 className="size-3 text-primary shrink-0" />}
              </button>
            );
          })}
          {codebook.length === 0 && (
            <div className="text-xs text-muted-foreground italic px-2 py-1">No codes yet — add one below.</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createAndApply()}
            placeholder="New code…"
            className="h-7 text-xs"
          />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={createAndApply} disabled={!draft.trim()}>
            <Plus className="size-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

type TaskToggleKey = "completed" | "hesitated" | "confused" | "askedForHelp";

const taskToggleLabels: Record<TaskToggleKey, string> = {
  completed: "Completed without assistance",
  hesitated: "Hesitated",
  confused: "Confused",
  askedForHelp: "Asked for help",
};

function TaskModePanel({
  findings, sessionId, participant, onSubmit,
}: {
  findings: ResearchFinding[];
  sessionId: string;
  participant: string;
  onSubmit: (run: {
    findingId: string;
    completed: boolean;
    hesitated: boolean;
    confused: boolean;
    askedForHelp: boolean;
    seqValue?: number;
    timeOnTaskMs?: number;
    notes: string;
  }) => void;
}) {
  const [findingId, setFindingId] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<TaskToggleKey, boolean>>({
    completed: false,
    hesitated: false,
    confused: false,
    askedForHelp: false,
  });
  const [seqValue, setSeqValue] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [taskStartedAt, setTaskStartedAt] = useState<number | null>(null);
  const [taskElapsed, setTaskElapsed] = useState(0);

  useEffect(() => {
    if (taskStartedAt === null) return;
    const id = setInterval(() => setTaskElapsed(Date.now() - taskStartedAt), 200);
    return () => clearInterval(id);
  }, [taskStartedAt]);

  const reset = () => {
    setFindingId(null);
    setToggles({ completed: false, hesitated: false, confused: false, askedForHelp: false });
    setSeqValue(null);
    setNotes("");
    setTaskStartedAt(null);
    setTaskElapsed(0);
  };

  const startTask = () => {
    setTaskStartedAt(Date.now());
    setTaskElapsed(0);
  };

  const endTask = () => {
    if (!findingId) return;
    onSubmit({
      findingId,
      completed: toggles.completed,
      hesitated: toggles.hesitated,
      confused: toggles.confused,
      askedForHelp: toggles.askedForHelp,
      seqValue: seqValue ?? undefined,
      timeOnTaskMs: taskStartedAt !== null ? taskElapsed : undefined,
      notes,
    });
    toast.success("Task run logged");
    reset();
  };

  return (
    <Card className="p-3 space-y-3 border-dashed">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ListChecks className="size-4" /> Task mode
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between w-full">
            <span className="truncate">
              {findingId ? findings.find((f) => f.id === findingId)?.principle : "Select a finding as the current task"}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="max-h-60 overflow-auto space-y-1">
            {findings.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFindingId(f.id)}
                className={`w-full text-left rounded border px-2 py-1.5 text-xs ${
                  findingId === f.id ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                {f.principle}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {findingId && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(taskToggleLabels) as TaskToggleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setToggles((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  toggles[key]
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                }`}
              >
                {taskToggleLabels[key]}
              </button>
            ))}
          </div>

          <LikertRow label="SEQ (1 = very difficult, 7 = very easy)" min={1} max={7} value={seqValue} onChange={setSeqValue} />

          <div className="flex items-center gap-2">
            {taskStartedAt === null ? (
              <Button size="sm" variant="outline" onClick={startTask} className="gap-1.5">
                <Clock className="size-3.5" /> Start task
              </Button>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" /> {fmtElapsed(taskElapsed)}
              </Badge>
            )}
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            className="text-sm resize-none h-16"
          />

          <Button size="sm" onClick={endTask} className="gap-1.5" disabled={!sessionId || !participant.trim()}>
            <Check className="size-3.5" /> End task
          </Button>
        </>
      )}
    </Card>
  );
}

export type SessionCaptureHandle = { focus: () => void };

export const SessionCapture = forwardRef<SessionCaptureHandle, Props>(function SessionCapture(
  { findings, onAddEvidence, onDeleteEvidence, analysisId, analysisLabel, suggestedQuestions }: Props,
  ref
) {
  const { addResponse, updateResponse, responses, codebook, addCode, toggleResponseCode, addTaskRun } = useStore();
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [participant, setParticipant] = useState("");
  const [questions, setQuestions] = useState<string[]>(suggestedQuestions ?? []);
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [pendingTagFindingId, setPendingTagFindingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const askQuestion = (q: string) => {
    setQuestion(q);
    inputRef.current?.focus();
  };

  const commitQuestion = () => {
    const q = question.trim();
    if (q && !questions.includes(q)) {
      setQuestions([...questions, q]);
    }
    inputRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    focus: () => {
      setExpanded(true);
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => inputRef.current?.focus(), 200);
    },
  }));

  useEffect(() => {
    if (!recording || startedAt === null) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => clearInterval(id);
  }, [recording, startedAt]);

  const start = useCallback(() => {
    setRecording(true);
    setStartedAt(Date.now());
    setElapsed(0);
    setObservations([]);
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
    toast("Session started — type observations + Enter to log");
  }, []);

  const stop = useCallback(() => {
    setRecording(false);
    const untagged = observations.filter((o) => !o.taggedFindingId).length;
    if (untagged > 0) {
      toast(`Session ended · ${observations.length} logged, ${untagged} untagged — tag them now while it's fresh`);
    } else {
      toast.success(`Session ended · ${observations.length} observation${observations.length === 1 ? "" : "s"} logged, all tagged`);
    }
  }, [observations]);

  const logObservation = () => {
    const text = draft.trim();
    if (!text) return;
    const q = question.trim();
    const responseId = addResponse({
      sessionLabel: participant.trim() || "Unnamed participant",
      analysisId,
      analysisLabel,
      question: q,
      response: text,
    });
    const obs: Observation = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      text,
      question: q,
      ts: startedAt ? Date.now() - startedAt : 0,
      responseId,
    };
    setObservations([obs, ...observations]);
    // A custom-typed question joins the tracked list so it shows up (and turns green) like a prepared one
    if (q && !questions.includes(q)) {
      setQuestions([...questions, q]);
    }
    setDraft("");
  };

  const tagObservation = useCallback(
    (obsId: string, findingId: string, verdict: "confirmed" | "refuted" | "inconclusive") => {
      const obs = observations.find((o) => o.id === obsId);
      if (!obs) return;
      if (obs.evidenceId) onDeleteEvidence(obs.evidenceId);
      const evidenceId = onAddEvidence({
        findingId,
        verdict,
        method: `Live session${participant ? ` · ${participant}` : ""}`,
        sampleSize: 1,
        note: obs.text,
        analysisId,
        analysisLabel,
      });
      setObservations(
        observations.map((o) => (o.id === obsId ? { ...o, taggedFindingId: findingId, verdict, evidenceId } : o))
      );
      const principle = findings.find((f) => f.id === findingId)?.principle;
      updateResponse(obs.responseId, { taggedFindingId: findingId, findingPrinciple: principle, verdict });
      toast.success(obs.taggedFindingId ? "Tag updated" : "Tagged & promoted to evidence");
    },
    [observations, onDeleteEvidence, onAddEvidence, participant, analysisId, analysisLabel, findings, updateResponse]
  );

  const clearTag = (obsId: string) => {
    const obs = observations.find((o) => o.id === obsId);
    if (!obs) return;
    if (obs.evidenceId) onDeleteEvidence(obs.evidenceId);
    setObservations(
      observations.map((o) =>
        o.id === obsId ? { ...o, taggedFindingId: undefined, verdict: undefined, evidenceId: undefined } : o
      )
    );
    updateResponse(obs.responseId, { taggedFindingId: undefined, findingPrinciple: undefined, verdict: undefined });
    toast("Tag cleared");
  };

  const hasStarted = recording || observations.length > 0;
  const untaggedCount = observations.filter((o) => !o.taggedFindingId).length;
  const askedSet = new Set(observations.map((o) => o.question).filter(Boolean));

  // Keyboard-first moderation: lets a facilitator keep eye contact with the participant
  // instead of reaching for the mouse. S starts/stops the session; once at least one
  // observation is logged, 1-9 picks a finding (in triage order, capped at 9 — the
  // Tag popover below remains the mouse-driven path for the 10th+ finding) for the most
  // recent observation, then C/R/I commits confirmed/refuted/inconclusive.
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        if (pendingTagFindingId) setPendingTagFindingId(null);
        return;
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (recording) stop();
        else start();
        return;
      }
      if (!observations.length) return;
      const digit = Number(e.key);
      if (digit >= 1 && digit <= 9) {
        const finding = findings[digit - 1];
        if (finding) setPendingTagFindingId(finding.id);
        return;
      }
      if (!pendingTagFindingId) return;
      const verdict =
        e.key.toLowerCase() === "c" ? "confirmed" :
        e.key.toLowerCase() === "r" ? "refuted" :
        e.key.toLowerCase() === "i" ? "inconclusive" : null;
      if (verdict) {
        e.preventDefault();
        tagObservation(observations[0].id, pendingTagFindingId, verdict);
        setPendingTagFindingId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded, recording, observations, findings, pendingTagFindingId, start, stop, tagObservation]);

  return (
    <div ref={rootRef}>
    <Card className={recording ? "border-red-300" : hasStarted ? "" : "border-dashed"}>
      <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {recording ? (
            <Badge className="bg-red-500 hover:bg-red-500 text-white gap-1 animate-pulse text-xs px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-white" /> REC
            </Badge>
          ) : hasStarted ? (
            <Badge variant="secondary">Stopped</Badge>
          ) : (
            <Radio className="size-4 text-muted-foreground shrink-0" />
          )}
          {hasStarted && (
            <div className={`text-sm font-mono flex items-center gap-1 ${recording ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <Clock className="size-3.5" /> {fmtElapsed(elapsed)}
            </div>
          )}
          {hasStarted ? (
            <Input
              value={participant}
              onChange={(e) => setParticipant(e.target.value)}
              placeholder="Participant ID"
              className="h-7 w-32 text-xs"
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              Prep your questions below, then start the session to log responses.
            </span>
          )}
          {hasStarted && (
            <>
              <Badge variant="outline" className="text-xs">
                {observations.length} obs
              </Badge>
              {untaggedCount > 0 && (
                <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                  {untaggedCount} untagged
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="size-7 p-0">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
          {recording ? (
            <Button size="sm" variant="outline" onClick={stop} className="gap-1.5" title="Shortcut: S">
              <Square className="size-3.5" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={start} className="gap-1.5" title="Shortcut: S">
              <Radio className="size-3.5" /> {hasStarted ? "Resume" : "Start session"}
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div className="px-3 pt-2 pb-1.5 border-b">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
              Interview questions
            </div>
            {questions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {questions.map((q, i) => {
                  const asked = askedSet.has(q);
                  const active = question === q;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => askQuestion(q)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                        active || asked
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                      }`}
                    >
                      {asked && <Check className="size-3" />}
                      {q}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-3 pt-2 pb-1.5">
            <div className="relative">
              {question && (
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary uppercase tracking-wide pointer-events-none">
                  Asking
                </span>
              )}
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitQuestion()}
                placeholder="Type a question, or click one above… (Enter to add to your guide)"
                className={`text-sm h-9 ${question ? "pl-[4.5rem] pr-8 font-medium border-primary/40 bg-primary/5 text-foreground" : ""}`}
              />
              {question && (
                <button
                  type="button"
                  onClick={() => setQuestion("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear current question"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="px-3 pb-2 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") logObservation();
                // Escape blurs so 1-9/C/R/I tagging shortcuts (which ignore focused
                // text fields, so typing is never hijacked) become reachable at once.
                else if (e.key === "Escape") e.currentTarget.blur();
              }}
              placeholder="Participant's response or observation…"
              className="flex-1"
              disabled={!recording}
            />
            <Button size="sm" onClick={logObservation} disabled={!recording || !draft.trim()} className="gap-1.5">
              <Plus className="size-3.5" /> Log
            </Button>
          </div>

          {observations.length > 0 && findings.length > 0 && (
            <div className="px-3 pb-2 space-y-1.5">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">
                  Tag last obs.
                </span>
                {findings.slice(0, 9).map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPendingTagFindingId(f.id)}
                    title={f.principle}
                    className={`text-xs pl-1 pr-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 max-w-[10rem] ${
                      pendingTagFindingId === f.id
                        ? "bg-primary/10 text-primary border-primary/40"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                    }`}
                  >
                    <kbd className="text-[10px] font-mono">{i + 1}</kbd>
                    <span className="truncate">{f.principle}</span>
                  </button>
                ))}
              </div>
              {pendingTagFindingId && (
                <div className="text-xs flex items-center gap-2 flex-wrap text-muted-foreground">
                  <span>
                    Tagging <span className="text-foreground font-medium">{findings.find((f) => f.id === pendingTagFindingId)?.principle}</span> —
                  </span>
                  <kbd className="text-[10px] font-mono px-1 rounded border border-border bg-muted">C</kbd> confirm
                  <kbd className="text-[10px] font-mono px-1 rounded border border-border bg-muted">R</kbd> refute
                  <kbd className="text-[10px] font-mono px-1 rounded border border-border bg-muted">I</kbd> inconclusive
                  <kbd className="text-[10px] font-mono px-1 rounded border border-border bg-muted">Esc</kbd> cancel
                </div>
              )}
            </div>
          )}

          {recording && startedAt !== null && (
            <div className="px-3 pb-2">
              <TaskModePanel
                findings={findings}
                sessionId={String(startedAt)}
                participant={participant}
                onSubmit={(run) =>
                  addTaskRun({
                    ...run,
                    participantId: participant.trim() || "Unnamed participant",
                    sessionId: String(startedAt),
                    analysisId: analysisId ?? "",
                  })
                }
              />
            </div>
          )}

          {observations.length > 0 && (
            <div className="border-t max-h-48 overflow-auto">
              {observations.map((o) => {
                const persisted = responses.find((r) => r.id === o.responseId);
                const appliedCodeIds = persisted?.codes ?? [];
                const appliedCodes = codebook.filter((c) => appliedCodeIds.includes(c.id));
                return (
                  <div key={o.id} className="px-3 py-2 border-b last:border-b-0 flex items-start gap-2 text-sm">
                    <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">
                      {fmtElapsed(o.ts)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {o.question && (
                        <div className="text-xs font-medium text-primary/80 mb-0.5">Q: {o.question}</div>
                      )}
                      <div>{o.text}</div>
                      {(o.taggedFindingId || appliedCodes.length > 0) && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                          {o.taggedFindingId && (
                            <>
                              <Tag className="size-3 shrink-0" />
                              <span>{findings.find((f) => f.id === o.taggedFindingId)?.principle}</span>
                              {o.verdict && (
                                <span
                                  className={
                                    o.verdict === "confirmed" ? "text-emerald-700" :
                                    o.verdict === "refuted" ? "text-red-700" : "text-amber-700"
                                  }
                                >
                                  · {o.verdict}
                                </span>
                              )}
                            </>
                          )}
                          {appliedCodes.map((c) => (
                            <Badge key={c.id} variant="secondary" className="gap-1">
                              <Hash className="size-3" /> {c.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <CodeChipToggle
                        appliedCodeIds={appliedCodeIds}
                        codebook={codebook}
                        onAddCode={addCode}
                        onToggleCode={(codeId) => toggleResponseCode(o.responseId, codeId)}
                      />
                      <TagControl
                        o={o}
                        findings={findings}
                        onTag={(findingId, verdict) => tagObservation(o.id, findingId, verdict)}
                        onClear={() => clearTag(o.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
    </div>
  );
});
