import { useMemo, useState } from "react";
import { Star, Hash, Download } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { formatRelative } from "./history-store";
import type { InterviewResponse } from "./response-store";
import type { Code } from "./codebook-store";
import { generateQualReport } from "./qual-report-export";

type Props = {
  responses: InterviewResponse[];
  filtered: InterviewResponse[];
  codebook: Code[];
  onToggleStar: (responseId: string) => void;
};

function QuoteCard({ r, codebook, onToggleStar }: { r: InterviewResponse; codebook: Code[]; onToggleStar: () => void }) {
  const appliedCodes = codebook.filter((c) => r.codes?.includes(c.id));
  return (
    <Card className={r.starred ? "border-amber-300 bg-amber-500/5" : ""}>
      <CardContent className="p-3.5 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Badge variant="secondary" className="font-normal">{r.sessionLabel}</Badge>
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
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`size-7 shrink-0 ${r.starred ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
          onClick={onToggleStar}
          aria-label={r.starred ? "Unstar quote" : "Star quote"}
        >
          <Star className={`size-4 ${r.starred ? "fill-amber-400" : ""}`} />
        </Button>
      </CardContent>
    </Card>
  );
}

export function QuoteBank({ responses, filtered, codebook, onToggleStar }: Props) {
  const [codeFilter, setCodeFilter] = useState("all");

  const codeFiltered = useMemo(
    () => (codeFilter === "all" ? filtered : filtered.filter((r) => r.codes?.includes(codeFilter))),
    [filtered, codeFilter]
  );

  const starred = useMemo(
    () => codeFiltered.filter((r) => r.starred).sort((a, b) => b.createdAt - a.createdAt),
    [codeFiltered]
  );
  const unstarred = useMemo(
    () => codeFiltered.filter((r) => !r.starred).sort((a, b) => b.createdAt - a.createdAt),
    [codeFiltered]
  );

  const allStarred = useMemo(() => responses.filter((r) => r.starred), [responses]);

  const frequency = useMemo(() => {
    return codebook
      .map((c) => ({ code: c, count: responses.filter((r) => r.codes?.includes(c.id)).length }))
      .sort((a, b) => b.count - a.count);
  }, [codebook, responses]);

  const exportReport = () => {
    const md = generateQualReport(allStarred, frequency, codebook);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qual-report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Select value={codeFilter} onValueChange={setCodeFilter}>
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue placeholder="All codes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All codes</SelectItem>
            {codebook.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportReport} disabled={allStarred.length === 0}>
          <Download className="size-3.5" /> Export report
        </Button>
      </div>

      {starred.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Star className="size-3 fill-amber-400 text-amber-500" /> Pinned ({starred.length})
          </div>
          <div className="space-y-2.5">
            {starred.map((r) => (
              <QuoteCard key={r.id} r={r} codebook={codebook} onToggleStar={() => onToggleStar(r.id)} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {starred.length > 0 && (
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All responses</div>
        )}
        {codeFiltered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              No responses match the current filters.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {unstarred.map((r) => (
              <QuoteCard key={r.id} r={r} codebook={codebook} onToggleStar={() => onToggleStar(r.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
