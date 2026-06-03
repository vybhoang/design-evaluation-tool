import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Radio, Square, Plus, Tag, Clock, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import type { ResearchFinding } from "./analysis-data";
import type { ValidationEvidence } from "./validation-store";

type Props = {
  findings: ResearchFinding[];
  onAddEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
};

type Observation = {
  id: string;
  text: string;
  ts: number; // ms since session start
  taggedFindingId?: string;
  verdict?: "confirmed" | "refuted" | "inconclusive";
};

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export type SessionCaptureHandle = { focus: () => void };

export const SessionCapture = forwardRef<SessionCaptureHandle, Props>(function SessionCapture(
  { findings, onAddEvidence }: Props,
  ref
) {
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [participant, setParticipant] = useState("");
  const [draft, setDraft] = useState("");
  const [observations, setObservations] = useState<Observation[]>([]);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const start = () => {
    setRecording(true);
    setStartedAt(Date.now());
    setElapsed(0);
    setObservations([]);
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
    toast("Session started — type observations + Enter to log");
  };

  const stop = () => {
    setRecording(false);
    toast(`Session ended · ${observations.length} observation${observations.length === 1 ? "" : "s"} logged`);
  };

  const logObservation = () => {
    const text = draft.trim();
    if (!text) return;
    const obs: Observation = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      text,
      ts: startedAt ? Date.now() - startedAt : 0,
    };
    setObservations([obs, ...observations]);
    setDraft("");
  };

  const tagObservation = (
    obsId: string,
    findingId: string,
    verdict: "confirmed" | "refuted" | "inconclusive"
  ) => {
    const obs = observations.find((o) => o.id === obsId);
    if (!obs) return;
    setObservations(observations.map((o) => (o.id === obsId ? { ...o, taggedFindingId: findingId, verdict } : o)));
    onAddEvidence({
      findingId,
      verdict,
      method: `Live session${participant ? ` · ${participant}` : ""}`,
      sampleSize: 1,
      note: obs.text,
    });
    toast.success("Tagged & promoted to evidence");
  };

  if (!recording && observations.length === 0) {
    return (
      <div ref={rootRef}>
      <Card className="border-dashed">
        <div className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Radio className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Moderating a session? Capture observations and tag them to findings in one click.
            </span>
          </div>
          <Button size="sm" onClick={start} className="gap-1.5 shrink-0">
            <Radio className="size-3.5" /> Start session
          </Button>
        </div>
      </Card>
      </div>
    );
  }

  return (
    <div ref={rootRef}>
    <Card className={recording ? "border-red-300" : ""}>
      <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {recording ? (
            <Badge className="bg-red-500 hover:bg-red-500 text-white gap-1 animate-pulse">
              <span className="size-1.5 rounded-full bg-white" /> REC
            </Badge>
          ) : (
            <Badge variant="secondary">Stopped</Badge>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" /> {fmtElapsed(elapsed)}
          </div>
          <Input
            value={participant}
            onChange={(e) => setParticipant(e.target.value)}
            placeholder="Participant ID"
            className="h-7 w-32 text-xs"
          />
          <Badge variant="outline" className="text-xs">
            {observations.length} obs
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="size-7 p-0">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
          {recording ? (
            <Button size="sm" variant="outline" onClick={stop} className="gap-1.5">
              <Square className="size-3.5" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={start} className="gap-1.5">
              <Radio className="size-3.5" /> Resume
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <div className="px-3 pb-2 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logObservation()}
              placeholder="e.g. 'P3 hesitated on the CTA for ~6s, scrolled past it'"
              className="flex-1"
              disabled={!recording}
            />
            <Button size="sm" onClick={logObservation} disabled={!recording || !draft.trim()} className="gap-1.5">
              <Plus className="size-3.5" /> Log
            </Button>
          </div>

          {observations.length > 0 && (
            <div className="border-t max-h-48 overflow-auto">
              {observations.map((o) => (
                <div key={o.id} className="px-3 py-2 border-b last:border-b-0 flex items-start gap-2 text-sm">
                  <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">
                    {fmtElapsed(o.ts)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div>{o.text}</div>
                    {o.taggedFindingId && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Tag className="size-3" />
                        {findings.find((f) => f.id === o.taggedFindingId)?.principle}
                        {o.verdict && <span> · {o.verdict}</span>}
                      </div>
                    )}
                  </div>
                  {!o.taggedFindingId && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0">
                          <Tag className="size-3" /> Tag
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="end">
                        <div className="text-xs text-muted-foreground px-2 pb-2">
                          Tag to a finding and set verdict
                        </div>
                        <div className="max-h-60 overflow-auto space-y-1">
                          {findings.map((f) => (
                            <div key={f.id} className="rounded border p-2">
                              <div className="text-xs font-medium mb-1.5 line-clamp-2">{f.principle}</div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] gap-1 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => tagObservation(o.id, f.id, "confirmed")}
                                >
                                  <CheckCircle2 className="size-3" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] gap-1 text-red-700 hover:bg-red-50"
                                  onClick={() => tagObservation(o.id, f.id, "refuted")}
                                >
                                  <XCircle className="size-3" /> Refute
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] gap-1 text-amber-700 hover:bg-amber-50"
                                  onClick={() => tagObservation(o.id, f.id, "inconclusive")}
                                >
                                  <MinusCircle className="size-3" /> Mixed
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
    </div>
  );
});
