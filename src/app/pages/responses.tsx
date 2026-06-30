import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search, Trash2, Tag, Hash, Plus, Download, CheckCircle2,
} from "lucide-react";

const verdictColors = {
  confirmed: "text-emerald-700",
  refuted: "text-red-600",
  inconclusive: "text-amber-600",
} as const;

function VerdictLabel({ verdict }: { verdict: "confirmed" | "refuted" | "inconclusive" }) {
  return <span className={`font-medium ${verdictColors[verdict]}`}>{verdict}</span>;
}

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useStore } from "../store";
import { formatRelative } from "../components/history-store";
import type { InterviewResponse } from "../components/response-store";
import type { Code } from "../components/codebook-store";
import { CodingView } from "../components/coding-view";
import { QuoteBank } from "../components/quote-bank";
import { EvidenceView } from "../components/evidence-view";
import { resolveEvidence } from "../components/validation-store";
import { downloadResponsesCsv } from "../components/csv-export";

type TaggedFilter = "all" | "tagged" | "untagged";
type GroupBy = "none" | "session" | "code" | "verdict";

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value !== options[0].value;
  const activeLabel = options.find((o) => o.value === value)?.label ?? label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs border transition-colors ${
            isActive
              ? "bg-foreground text-background border-foreground font-medium"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          }`}
        >
          {isActive ? activeLabel : label}
          {isActive && (
            <span
              role="button"
              aria-label={`Clear ${label} filter`}
              onClick={(e) => { e.stopPropagation(); onChange(options[0].value); }}
              className="opacity-60 hover:opacity-100 leading-none"
            >
              ×
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => { onChange(o.value); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted flex items-center justify-between gap-2 ${
              value === o.value ? "font-medium" : "text-muted-foreground"
            }`}
          >
            {o.label}
            {value === o.value && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative shrink-0">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 h-7 w-52 text-xs"
      />
    </div>
  );
}

export default function ResponsesPage() {
  const navigate = useNavigate();
  const {
    responses, deleteResponse, clearResponses, codebook, addCode, toggleResponseCode, updateResponse,
    validations, deleteEvidence, history, renameCode, deleteCode,
  } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "log";
  const principleParam = searchParams.get("principle") ?? undefined;

  const [query, setQuery] = useState("");
  const [tagged, setTagged] = useState<TaggedFilter>("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [codeFilter, setCodeFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [evidenceVerdict, setEvidenceVerdict] = useState<"all" | "confirmed" | "refuted" | "inconclusive">("all");
  const [evidencePrinciple, setEvidencePrinciple] = useState(principleParam ?? "all");

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
        if (codeFilter !== "all" && !r.codes?.includes(codeFilter)) return false;
        if (q) {
          const hay = `${r.question} ${r.response} ${r.sessionLabel} ${r.findingPrinciple ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [responses, query, tagged, sessionFilter, codeFilter]);

  const isFiltered = query !== "" || tagged !== "all" || sessionFilter !== "all" || codeFilter !== "all";
  const resetFilters = () => { setQuery(""); setTagged("all"); setSessionFilter("all"); setCodeFilter("all"); };

  const grouped = useMemo((): { key: string; label: string; items: InterviewResponse[] }[] | null => {
    if (groupBy === "none") return null;

    if (groupBy === "code") {
      const result: { key: string; label: string; items: InterviewResponse[] }[] = [];
      for (const code of codebook) {
        const items = filtered.filter((r) => r.codes?.includes(code.id));
        if (items.length > 0) result.push({ key: code.id, label: code.label, items });
      }
      const uncoded = filtered.filter((r) => !r.codes?.length);
      if (uncoded.length > 0) result.push({ key: "__uncoded", label: "Uncoded", items: uncoded });
      return result.length > 0 ? result : null;
    }

    if (groupBy === "verdict") {
      const order = [
        { key: "confirmed", label: "Confirmed" },
        { key: "refuted", label: "Refuted" },
        { key: "inconclusive", label: "Inconclusive" },
      ];
      const result: { key: string; label: string; items: InterviewResponse[] }[] = [];
      for (const { key, label } of order) {
        const items = filtered.filter((r) => r.verdict === key);
        if (items.length > 0) result.push({ key, label, items });
      }
      const noVerdict = filtered.filter((r) => !r.verdict);
      if (noVerdict.length > 0) result.push({ key: "__none", label: "No verdict", items: noVerdict });
      return result.length > 0 ? result : null;
    }

    // session
    const map = new Map<string, InterviewResponse[]>();
    for (const r of filtered) {
      if (!map.has(r.sessionLabel)) map.set(r.sessionLabel, []);
      map.get(r.sessionLabel)!.push(r);
    }
    return [...map.entries()].map(([label, items]) => ({ key: label, label, items }));
  }, [filtered, groupBy, codebook]);

  const evidenceRows = useMemo(
    () => validations
      .map((e) => ({ e, ctx: resolveEvidence(e, history) }))
      .sort((a, b) => b.e.createdAt - a.e.createdAt),
    [validations, history]
  );

  const evidencePrinciples = useMemo(
    () => [...new Set(evidenceRows.map((r) => r.ctx?.principle).filter((p): p is string => !!p))].sort(),
    [evidenceRows]
  );

  const filteredValidations = useMemo(() => {
    const q = evidenceQuery.trim().toLowerCase();
    return evidenceRows
      .filter(({ e, ctx }) => {
        if (evidenceVerdict !== "all" && e.verdict !== evidenceVerdict) return false;
        if (evidencePrinciple !== "all" && ctx?.principle !== evidencePrinciple) return false;
        if (q) {
          const hay = `${ctx?.principle ?? ""} ${ctx?.runLabel ?? ""} ${e.note} ${e.method}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .map(({ e }) => e);
  }, [evidenceRows, evidenceQuery, evidenceVerdict, evidencePrinciple]);

  const isEvidenceFiltered = evidenceQuery !== "" || evidenceVerdict !== "all" || evidencePrinciple !== "all";
  const resetEvidenceFilters = () => { setEvidenceQuery(""); setEvidenceVerdict("all"); setEvidencePrinciple("all"); };

  const arrangeOptions = [
    { value: "none", label: "Newest first" },
    { value: "session", label: "By participant" },
    { value: "code", label: "By code" },
    { value: "verdict", label: "By verdict" },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Responses</h1>
          <p className="text-sm text-muted-foreground">
            {responses.length} logged from real interviews
          </p>
        </div>
        {responses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearResponses}
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" /> Clear all
          </Button>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams(v === "log" ? {} : { tab: v }, { replace: true })}
        className="flex flex-col"
      >
        <TabsList className="shrink-0 grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="log">Log</TabsTrigger>
          <TabsTrigger value="coding">Coding</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        {/* ── Log ── */}
        <TabsContent value="log" className="mt-3 space-y-3">
          {responses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search responses…"
              />
              <FilterPill
                label="Participant"
                value={sessionFilter}
                options={[
                  { value: "all", label: "All participants" },
                  ...sessions.map((s) => ({ value: s, label: s })),
                ]}
                onChange={setSessionFilter}
              />
              <FilterPill
                label="Tagging"
                value={tagged}
                options={[
                  { value: "all", label: "All responses" },
                  { value: "tagged", label: "Tagged to a finding" },
                  { value: "untagged", label: "Untagged" },
                ]}
                onChange={(v) => setTagged(v as TaggedFilter)}
              />
              <FilterPill
                label="Code"
                value={codeFilter}
                options={[
                  { value: "all", label: "All codes" },
                  ...codebook.map((c) => ({ value: c.id, label: c.label })),
                ]}
                onChange={setCodeFilter}
              />
              <div className="w-px h-4 bg-border mx-0.5 shrink-0" aria-hidden />
              <FilterPill
                label="Arrange"
                value={groupBy}
                options={arrangeOptions}
                onChange={(v) => setGroupBy(v as GroupBy)}
              />
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => downloadResponsesCsv(responses, codebook)}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
          )}

          {responses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No responses logged yet.
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-sm text-muted-foreground space-y-3">
                <p>No responses match your filters.</p>
                <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
              </CardContent>
            </Card>
          ) : grouped ? (
            <div className="space-y-8">
              {grouped.map(({ key, label, items }) => (
                <div key={key}>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {items.length} {items.length === 1 ? "response" : "responses"}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {items.map((r) => (
                      <ResponseRow
                        key={`${key}-${r.id}`}
                        r={r}
                        codebook={codebook}
                        onDelete={() => deleteResponse(r.id)}
                        onOpenAnalysis={navigate}
                        onAddCode={addCode}
                        onToggleCode={(codeId) => toggleResponseCode(r.id, codeId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

        {/* ── Coding ── */}
        <TabsContent value="coding" className="mt-3">
          <CodingView
            responses={responses}
            codebook={codebook}
            onRenameCode={renameCode}
            onDeleteCode={deleteCode}
          />
        </TabsContent>

        {/* ── Quotes ── */}
        <TabsContent value="quotes" className="mt-3 space-y-3">
          {responses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search quotes…"
              />
              <FilterPill
                label="Participant"
                value={sessionFilter}
                options={[
                  { value: "all", label: "All participants" },
                  ...sessions.map((s) => ({ value: s, label: s })),
                ]}
                onChange={setSessionFilter}
              />
              <FilterPill
                label="Tagging"
                value={tagged}
                options={[
                  { value: "all", label: "All responses" },
                  { value: "tagged", label: "Tagged to a finding" },
                  { value: "untagged", label: "Untagged" },
                ]}
                onChange={(v) => setTagged(v as TaggedFilter)}
              />
              <FilterPill
                label="Code"
                value={codeFilter}
                options={[
                  { value: "all", label: "All codes" },
                  ...codebook.map((c) => ({ value: c.id, label: c.label })),
                ]}
                onChange={setCodeFilter}
              />
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
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

        {/* ── Evidence ── */}
        <TabsContent value="evidence" className="mt-3 space-y-3">
          {validations.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <SearchBar
                value={evidenceQuery}
                onChange={setEvidenceQuery}
                placeholder="Search evidence…"
              />
              <FilterPill
                label="Verdict"
                value={evidenceVerdict}
                options={[
                  { value: "all", label: "All verdicts" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "refuted", label: "Refuted" },
                  { value: "inconclusive", label: "Inconclusive" },
                ]}
                onChange={(v) => setEvidenceVerdict(v as typeof evidenceVerdict)}
              />
              <FilterPill
                label="Finding"
                value={evidencePrinciple}
                options={[
                  { value: "all", label: "All findings" },
                  ...evidencePrinciples.map((p) => ({ value: p, label: p })),
                ]}
                onChange={setEvidencePrinciple}
              />
              {isEvidenceFiltered && (
                <button
                  type="button"
                  onClick={resetEvidenceFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          <EvidenceView
            validations={filteredValidations}
            totalCount={validations.length}
            history={history}
            onDelete={deleteEvidence}
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
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
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
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/80">{r.sessionLabel}</span>
            {r.verdict && (
              <>
                <span aria-hidden>·</span>
                <VerdictLabel verdict={r.verdict} />
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground/60">{formatRelative(r.createdAt)}</span>
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
        </div>
        {r.taggedFindingId && r.findingPrinciple && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
            <Tag className="size-3 shrink-0" />
            <span>{r.findingPrinciple}</span>
          </div>
        )}
        {r.question && (
          <div className="text-xs text-muted-foreground/70 mb-1.5">{r.question}</div>
        )}
        <div className="text-sm leading-relaxed">{r.response}</div>
        {appliedCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {appliedCodes.map((c) => (
              <Badge key={c.id} variant="secondary" className="gap-1 text-[11px] h-5 py-0">
                <Hash className="size-2.5" />{c.label}
              </Badge>
            ))}
          </div>
        )}
        {r.analysisId && (
          <button
            onClick={() => onOpenAnalysis(`/analysis/${r.analysisId}`)}
            className="mt-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {r.analysisLabel ?? "View analysis"}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
