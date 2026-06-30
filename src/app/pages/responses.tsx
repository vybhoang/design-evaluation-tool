import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search, Trash2, CheckCircle2, XCircle, MinusCircle, Tag, Hash, Plus, ListChecks, BarChart3, Quote, Download, BookCheck,
} from "lucide-react";

const verdictIcons = { confirmed: CheckCircle2, refuted: XCircle, inconclusive: MinusCircle } as const;

function VerdictLabel({ verdict }: { verdict: "confirmed" | "refuted" | "inconclusive" }) {
  const Icon = verdictIcons[verdict];
  return <span className="inline-flex items-center gap-1 font-medium"><Icon className="size-3" /> {verdict}</span>;
}
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useStore } from "../store";
import { formatRelative } from "../components/history-store";
import type { InterviewResponse } from "../components/response-store";
import type { Code } from "../components/codebook-store";
import { CodingView } from "../components/coding-view";
import { QuoteBank } from "../components/quote-bank";
import { EvidenceView } from "../components/evidence-view";
import { downloadResponsesCsv } from "../components/csv-export";

type TaggedFilter = "all" | "tagged" | "untagged";

export default function ResponsesPage() {
  const navigate = useNavigate();
  const {
    responses, deleteResponse, clearResponses, codebook, addCode, toggleResponseCode, updateResponse,
    validations, deleteEvidence, history,
  } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "log";
  const principleParam = searchParams.get("principle") ?? undefined;

  const [query, setQuery] = useState("");
  const [tagged, setTagged] = useState<TaggedFilter>("all");
  const [sessionFilter, setSessionFilter] = useState("all");

  const sessions = useMemo(
    () => [...new Set(responses.map((r) => r.sessionLabel))],
    [responses]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return responses
      .filter((r) => {
        if (tagged === "tagged" && !r.taggedFindingId) return false;
        if (tagged === "untagged" && r.taggedFindingId) return false;
        if (sessionFilter !== "all" && r.sessionLabel !== sessionFilter) return false;
        if (q) {
          const hay = `${r.question} ${r.response} ${r.sessionLabel} ${r.findingPrinciple ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [responses, query, tagged, sessionFilter]);

  const isFiltered = query !== "" || tagged !== "all" || sessionFilter !== "all";
  const resetFilters = () => { setQuery(""); setTagged("all"); setSessionFilter("all"); };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Responses</h1>
          <p className="text-sm text-muted-foreground">
            {isFiltered ? `${filtered.length} of ${responses.length}` : responses.length} logged from real interviews
          </p>
        </div>
        {responses.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearResponses} className="gap-1.5">
            <Trash2 className="size-4" /> Clear all
          </Button>
        )}
      </div>

      {responses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions, responses, participants…"
              className="pl-8 h-8 w-64 text-sm"
            />
          </div>

          <Select value={tagged} onValueChange={(v) => setTagged(v as TaggedFilter)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tagged + untagged</SelectItem>
              <SelectItem value="tagged">Tagged to a finding</SelectItem>
              <SelectItem value="untagged">Untagged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All participants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All participants</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              Reset
            </Button>
          )}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams(v === "log" ? {} : { tab: v }, { replace: true })}
        className="flex flex-col"
      >
        <TabsList className="shrink-0 grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="log" className="gap-1.5">
            <ListChecks className="size-4" /> Log
          </TabsTrigger>
          <TabsTrigger value="coding" className="gap-1.5">
            <BarChart3 className="size-4" /> Coding
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5">
            <Quote className="size-4" /> Quote bank
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1.5">
            <BookCheck className="size-4" /> Evidence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-3 space-y-2.5">
          {responses.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => downloadResponsesCsv(responses, codebook)}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
          )}
          {responses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center text-sm text-muted-foreground space-y-1">
                <p>No responses logged yet.</p>
                <p className="text-xs">
                  Start a moderated session and log what participants actually say — every response is saved here, searchable across every interview.
                </p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center text-sm text-muted-foreground space-y-2">
                <p>No responses match your filters.</p>
                <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((r) => (
                <ResponseRow
                  key={r.id}
                  r={r}
                  codebook={codebook}
                  onDelete={() => deleteResponse(r.id)}
                  onOpenAnalysis={navigate}
                  onAddCode={addCode}
                  onToggleCode={(codeId) => toggleResponseCode(r.id, codeId)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coding" className="mt-3">
          <CodingView responses={responses} codebook={codebook} />
        </TabsContent>

        <TabsContent value="quotes" className="mt-3">
          <QuoteBank
            responses={responses}
            filtered={filtered}
            codebook={codebook}
            onToggleStar={(id) => {
              const r = responses.find((x) => x.id === id);
              updateResponse(id, { starred: !r?.starred });
            }}
          />
        </TabsContent>

        <TabsContent value="evidence" className="mt-3">
          <EvidenceView
            validations={validations}
            history={history}
            onDelete={deleteEvidence}
            initialPrinciple={principleParam}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function CodeControl({
  r, codebook, onAddCode, onToggleCode,
}: {
  r: InterviewResponse;
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
        <div className="text-xs text-muted-foreground px-2 pb-2">Apply codes to this response</div>
        <div className="max-h-48 overflow-auto space-y-1 mb-2">
          {codebook.map((c) => {
            const active = r.codes?.includes(c.id);
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

function ResponseRow({
  r, codebook, onDelete, onOpenAnalysis, onAddCode, onToggleCode,
}: {
  r: InterviewResponse;
  codebook: Code[];
  onDelete: () => void;
  onOpenAnalysis: (path: string) => void;
  onAddCode: (label: string) => string;
  onToggleCode: (codeId: string) => void;
}) {
  const appliedCodes = codebook.filter((c) => r.codes?.includes(c.id));
  return (
    <Card className="group">
      <CardContent className="p-3.5 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Badge variant="secondary" className="font-normal">{r.sessionLabel}</Badge>
            {r.taggedFindingId && r.findingPrinciple && (
              <Badge variant="outline" className="gap-1">
                <Tag className="size-3" /> {r.findingPrinciple}
              </Badge>
            )}
            {r.verdict && <VerdictLabel verdict={r.verdict} />}
            {appliedCodes.map((c) => (
              <Badge key={c.id} variant="secondary" className="gap-1">
                <Hash className="size-3" /> {c.label}
              </Badge>
            ))}
            <span className="text-muted-foreground">{formatRelative(r.createdAt)}</span>
          </div>
          {r.question && (
            <div className="text-xs text-muted-foreground italic">Q: {r.question}</div>
          )}
          <div className="text-sm">{r.response}</div>
          {r.analysisId && (
            <button
              onClick={() => onOpenAnalysis(`/analysis/${r.analysisId}`)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {r.analysisLabel ?? "View analysis"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <CodeControl r={r} codebook={codebook} onAddCode={onAddCode} onToggleCode={onToggleCode} />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
