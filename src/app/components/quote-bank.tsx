import { useMemo } from "react";
import { Star, Download } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
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
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground/80">{r.sessionLabel}</span>
            {appliedCodes.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>{appliedCodes.map((c) => c.label).join(", ")}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground/60">{formatRelative(r.createdAt)}</span>
            <Button
              variant="ghost"
              size="icon"
              className={`size-7 shrink-0 ${r.starred ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
              onClick={onToggleStar}
              aria-label={r.starred ? "Unstar quote" : "Star quote"}
            >
              <Star className={`size-4 ${r.starred ? "fill-amber-400" : ""}`} />
            </Button>
          </div>
        </div>
        {r.question && (
          <div className="text-xs text-muted-foreground/70 mb-1.5">{r.question}</div>
        )}
        <div className="text-sm leading-relaxed">{r.response}</div>
      </CardContent>
    </Card>
  );
}

export function QuoteBank({ responses, filtered, codebook, onToggleStar }: Props) {
  const allStarred = useMemo(() => responses.filter((r) => r.starred), [responses]);

  const frequency = useMemo(() =>
    codebook
      .map((c) => ({ code: c, count: responses.filter((r) => r.codes?.includes(c.id)).length }))
      .sort((a, b) => b.count - a.count),
    [codebook, responses]
  );

  const sections = useMemo(() => {
    const result: { id: string; label: string; items: InterviewResponse[] }[] = [];
    for (const code of codebook) {
      const items = filtered
        .filter((r) => r.codes?.includes(code.id))
        .sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt);
      if (items.length > 0) result.push({ id: code.id, label: code.label, items });
    }
    const uncoded = filtered
      .filter((r) => !r.codes?.length)
      .sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt);
    if (uncoded.length > 0) result.push({ id: "__uncoded", label: "Uncoded", items: uncoded });
    return result;
  }, [codebook, filtered]);

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

  if (filtered.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No responses match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {filtered.length} response{filtered.length === 1 ? "" : "s"}
          {sections.filter((s) => s.id !== "__uncoded").length > 0
            ? ` · ${sections.filter((s) => s.id !== "__uncoded").length} code${sections.filter((s) => s.id !== "__uncoded").length === 1 ? "" : "s"}`
            : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={exportReport}
          disabled={allStarred.length === 0}
        >
          <Download className="size-3.5" /> Export report
        </Button>
      </div>
      <div className="space-y-6">
        {sections.map(({ id, label, items }) => (
          <div key={id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2 pl-3 border-l border-border">
              {items.map((r) => (
                <QuoteCard key={r.id} r={r} codebook={codebook} onToggleStar={() => onToggleStar(r.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
