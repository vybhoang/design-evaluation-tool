import { useState } from "react";
import { Link } from "react-router";
import { Plus, Trash2, ExternalLink, Quote, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";
import { useStore } from "../store";
import type { HistoryEntry } from "./history-store";
import type { InterviewResponse } from "./response-store";
import type {
  EmpathyMap,
  EmpathyQuadrant,
  EmpathyMapEntry,
  EmpathyMapQuoteEntry,
  EmpathyMapNoteEntry,
} from "./empathy-map-store";

const QUADRANTS: { key: EmpathyQuadrant; label: string }[] = [
  { key: "says", label: "Says" },
  { key: "thinks", label: "Thinks" },
  { key: "does", label: "Does" },
  { key: "feels", label: "Feels" },
];

const FORMAT_CITATION_TOOLTIP =
  "Other empathy-map formats exist, e.g. the 6-pane Gray/Gamestorming variant with Pain/Gain quadrants. This tool uses the 4-quadrant NN/g format, which is why there's no Pain/Gain pane.";

function isNoteEntry(e: EmpathyMapEntry): e is EmpathyMapNoteEntry {
  return e.entryType === "note";
}

function isQuoteEntry(e: EmpathyMapEntry): e is EmpathyMapQuoteEntry {
  return !isNoteEntry(e);
}

function quadrantStatus(quoteCount: number, noteCount: number) {
  if (quoteCount === 0 && noteCount === 0) return "No quotes tagged";
  const parts: string[] = [];
  if (quoteCount > 0) parts.push(`${quoteCount} quote${quoteCount === 1 ? "" : "s"}`);
  if (noteCount > 0) parts.push(`${noteCount} note${noteCount === 1 ? "" : "s"}`);
  return `${parts.join(" · ")} tagged`;
}

function AddQuoteControl({
  responses,
  onAdd,
}: {
  responses: InterviewResponse[];
  onAdd: (response: InterviewResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const disabled = responses.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" disabled={disabled}>
          <Plus className="size-3" /> Add quote
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="text-xs text-muted-foreground px-2 pb-2">
          Tag a logged response into this quadrant
        </div>
        <div className="max-h-60 overflow-auto space-y-1">
          {responses.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onAdd(r);
                setOpen(false);
              }}
              className="w-full text-left rounded border px-2 py-1.5 text-xs hover:bg-muted/50 space-y-0.5"
            >
              <div className="font-medium text-foreground/80">{r.sessionLabel}</div>
              <div className="line-clamp-2 text-muted-foreground">{r.response}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddNoteControl({
  onAdd,
}: {
  onAdd: (note: { quoteText: string; authorName: string; rationale: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [rationale, setRationale] = useState("");
  const canSubmit = noteText.trim() && authorName.trim() && rationale.trim();

  const submit = () => {
    if (!canSubmit) return;
    onAdd({ quoteText: noteText.trim(), authorName: authorName.trim(), rationale: rationale.trim() });
    setNoteText("");
    setAuthorName("");
    setRationale("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <Lightbulb className="size-3" /> Add note
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="size-3.5 text-amber-600" />
          <span className="text-sm font-medium">Add a note</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          No source quote required — this is your team's own read on the evidence.
        </p>
        <Separator className="mb-3" />
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">What did you observe or infer?</Label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="She seems anxious about losing her cart progress."
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Your name</Label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Jordan"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Why do you think so?</Label>
              <Input
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Hesitated on the button twice"
                className="text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={submit} disabled={!canSubmit} className="w-full gap-1.5">
            <Plus className="size-3.5" /> Add note
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmpathyMapCard({
  map,
  responsesForAnalysis,
}: {
  map: EmpathyMap;
  entry: HistoryEntry;
  responsesForAnalysis: InterviewResponse[];
}) {
  const { empathyMapEntries, addEmpathyMapEntry, deleteEmpathyMapEntry, deleteEmpathyMap } = useStore();
  const entriesForMap = empathyMapEntries.filter((e) => e.mapId === map.id);
  const quoteEntries = entriesForMap.filter(isQuoteEntry);
  const noteEntries = entriesForMap.filter(isNoteEntry);
  const participantCount = new Set(quoteEntries.map((e) => e.participantId)).size;

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{map.subject}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {quoteEntries.length} quote{quoteEntries.length === 1 ? "" : "s"} · {participantCount} participant
              {participantCount === 1 ? "" : "s"}
              {noteEntries.length > 0 ? ` · ${noteEntries.length} note${noteEntries.length === 1 ? "" : "s"}` : ""}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-muted-foreground hover:text-red-600 shrink-0"
            onClick={() => deleteEmpathyMap(map.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUADRANTS.map(({ key, label }) => {
            const quotesInQuadrant = quoteEntries.filter((e) => e.quadrant === key);
            const notesInQuadrant = noteEntries.filter((e) => e.quadrant === key);
            return (
              <Card key={key}>
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{label}</div>
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {quadrantStatus(quotesInQuadrant.length, notesInQuadrant.length)}
                    </Badge>
                  </div>

                  {quotesInQuadrant.length === 0 && notesInQuadrant.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No evidence yet</p>
                  )}

                  {quotesInQuadrant.length > 0 && (
                    <div className="space-y-1.5">
                      {quotesInQuadrant.map((e) => (
                        <div key={e.id} className="group rounded-md bg-muted/40 p-2">
                          <div className="flex items-start gap-1.5">
                            <Quote className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed flex-1">{e.quoteText}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1 pl-[18px]">
                            <span className="text-[11px] text-muted-foreground">{e.participantId}</span>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                to="/responses"
                                title={`View source response in the response log · ${e.participantId}`}
                                className="inline-flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                <ExternalLink className="size-3" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => deleteEmpathyMapEntry(e.id)}
                                className="inline-flex items-center justify-center size-6 rounded text-muted-foreground hover:text-red-600 hover:bg-muted"
                                aria-label="Untag quote"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {notesInQuadrant.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Notes
                      </div>
                      {notesInQuadrant.map((e) => (
                        <div key={e.id} className="group rounded-md border-l-2 border-amber-400 bg-muted/40 py-1.5 pl-2 pr-2">
                          <div className="flex items-start gap-1.5">
                            <Lightbulb className="size-3 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed flex-1">{e.quoteText}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1 pl-[18px]">
                            <span className="text-[11px] text-muted-foreground italic">
                              — {e.authorName}: {e.rationale}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteEmpathyMapEntry(e.id)}
                              className="inline-flex items-center justify-center size-6 rounded text-muted-foreground hover:text-red-600 hover:bg-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Delete note"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-0.5">
                    <AddQuoteControl
                      responses={responsesForAnalysis}
                      onAdd={(r) =>
                        addEmpathyMapEntry({
                          mapId: map.id,
                          quadrant: key,
                          quoteText: r.response,
                          entryType: "quote",
                          participantId: r.sessionLabel,
                          sourceResponseId: r.id,
                        })
                      }
                    />
                    <AddNoteControl
                      onAdd={(note) =>
                        addEmpathyMapEntry({
                          mapId: map.id,
                          quadrant: key,
                          quoteText: note.quoteText,
                          entryType: "note",
                          authorName: note.authorName,
                          rationale: note.rationale,
                        })
                      }
                    />
                  </div>
                  {responsesForAnalysis.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Log responses in Live session capture on the analysis page to tag quotes here.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmpathyMapView({ entry }: { entry: HistoryEntry }) {
  const { empathyMaps, responses, addEmpathyMap } = useStore();
  const mapsForAnalysis = empathyMaps.filter((m) => m.analysisId === entry.id);
  const responsesForAnalysis = responses.filter((r) => r.analysisId === entry.id);
  const [subjectDraft, setSubjectDraft] = useState("");

  const createMap = () => {
    const subject = subjectDraft.trim();
    if (!subject) return;
    addEmpathyMap({ analysisId: entry.id, subject });
    setSubjectDraft("");
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        <span title={FORMAT_CITATION_TOOLTIP}>
          4-quadrant format (Says / Thinks / Does / Feels) — Gibbons, NN/g, ~2018
        </span>
      </p>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">New empathy map</div>
          <div className="flex items-center gap-2">
            <Input
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createMap()}
              placeholder="Persona or segment label, e.g. First-time mobile visitor"
              className="text-sm"
            />
            <Button size="sm" onClick={createMap} disabled={!subjectDraft.trim()} className="shrink-0">
              Create empathy map
            </Button>
          </div>
        </CardContent>
      </Card>

      {mapsForAnalysis.map((map) => (
        <EmpathyMapCard key={map.id} map={map} entry={entry} responsesForAnalysis={responsesForAnalysis} />
      ))}
    </div>
  );
}
