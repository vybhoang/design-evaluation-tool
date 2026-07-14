import { useMemo } from "react";
import { ArrowDown, ArrowUp, ArrowRight, Minus, Trophy, AlertTriangle, XCircle, Eye, Accessibility, Plus, Equal, ArrowLeftRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { severityMeta } from "./results-panel";
import type { HistoryEntry } from "./history-store";
import type { ResearchFinding, Severity } from "./analysis-data";
import { formatRelative } from "./history-store";

type Props = {
  a: HistoryEntry;
  b: HistoryEntry;
};

function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0{suffix}
      </span>
    );
  }
  const pos = value > 0;
  const Icon = pos ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs ${
        pos ? "text-emerald-600" : "text-red-600"
      }`}
    >
      <Icon className="size-3" />
      {pos ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function ScoreCmp({
  label, icon: Icon, a, b, higherIsBetter = true,
}: {
  label: string; icon: LucideIcon; a: number; b: number; higherIsBetter?: boolean;
}) {
  const delta = b - a;
  const adjDelta = higherIsBetter ? delta : -delta;
  const aBetter = adjDelta < 0;
  const bBetter = adjDelta > 0;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5">
      <div className="text-right">
        <span className={`text-lg font-semibold ${aBetter ? "text-foreground" : "text-muted-foreground"}`}>
          {a}
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5 min-w-[140px]">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground text-center">
          <Icon className="size-3" /> {label}
        </div>
        <Delta value={adjDelta} />
      </div>
      <div className="text-left">
        <span className={`text-lg font-semibold ${bBetter ? "text-foreground" : "text-muted-foreground"}`}>
          {b}
        </span>
      </div>
    </div>
  );
}

export function CompareView({ a, b }: Props) {
  const aHigh = a.result.findings.filter((f) => f.severity === "critical" || f.severity === "warning").length;
  const bHigh = b.result.findings.filter((f) => f.severity === "critical" || f.severity === "warning").length;
  // Composite: lower issues + higher clarity/a11y
  const score = (e: HistoryEntry) =>
    e.result.clarityScore + e.result.accessibilityScore -
    e.result.findings.filter((f) => f.severity === "critical").length * 8 -
    e.result.findings.filter((f) => f.severity === "warning").length * 3;

  const sA = score(a);
  const sB = score(b);
  const winner = sB > sA ? "B" : sB < sA ? "A" : null;

  const verdict = (() => {
    if (winner === null) {
      return {
        headline: "Too close to call.",
        body: "Both variants land on the same heuristic footing — the per-finding diff below is the more useful read here.",
      };
    }
    const loser = winner === "A" ? "B" : "A";
    const winnerHigh = winner === "A" ? aHigh : bHigh;
    const loserHigh = winner === "A" ? bHigh : aHigh;
    const gap = loserHigh - winnerHigh;
    const margin =
      gap > 0
        ? `${gap} fewer critical/warning finding${gap === 1 ? "" : "s"} than Variant ${loser}`
        : gap < 0
        ? `more critical/warning findings than Variant ${loser}, but enough of a lead on clarity and accessibility to outweigh it`
        : `the same number of critical/warning findings as Variant ${loser}, but a stronger clarity and accessibility baseline`;
    return {
      headline: `Variant ${winner} is the stronger heuristic baseline.`,
      body: `It carries ${margin}.`,
    };
  })();

  const side = (entry: HistoryEntry, label: "A" | "B") => {
    const isWinner = winner === label;
    return (
      <div
        className={`rounded-lg border p-3 space-y-2 ${
          isWinner ? "border-emerald-300 bg-emerald-50/40" : "border-border"
        }`}
      >
        <div className="flex items-center gap-3">
          <Badge
            variant={isWinner ? "default" : "secondary"}
            className={`size-7 rounded-full p-0 flex items-center justify-center shrink-0 ${
              isWinner ? "bg-emerald-500 hover:bg-emerald-500" : ""
            }`}
          >
            {isWinner ? <Trophy className="size-3.5" /> : label}
          </Badge>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium truncate">{entry.label}</div>
              <span className="text-[11px] text-muted-foreground/60 shrink-0">{formatRelative(entry.createdAt)}</span>
            </div>
            <div className="text-xs text-muted-foreground">{entry.context.designType}</div>
          </div>
        </div>
        <div className="aspect-video rounded-md overflow-hidden bg-muted">
          <img
            src={entry.context.imageUrl || entry.thumbnail}
            alt={`Variant ${label}`}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {side(a, "A")}
        {side(b, "B")}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground text-center mb-1">
            Score comparison
          </div>
          <div className="divide-y divide-border/60">
            <ScoreCmp label="Clarity (heuristic)" icon={Eye} a={a.result.clarityScore} b={b.result.clarityScore} />
            <ScoreCmp
              label="Accessibility (rule-based)"
              icon={Accessibility}
              a={a.result.accessibilityScore}
              b={b.result.accessibilityScore}
            />
            <ScoreCmp
              label="Critical findings"
              icon={XCircle}
              a={a.result.findings.filter((f) => f.severity === "critical").length}
              b={b.result.findings.filter((f) => f.severity === "critical").length}
              higherIsBetter={false}
            />
            <ScoreCmp
              label="Warning findings"
              icon={AlertTriangle}
              a={a.result.findings.filter((f) => f.severity === "warning").length}
              b={b.result.findings.filter((f) => f.severity === "warning").length}
              higherIsBetter={false}
            />
          </div>
        </CardContent>
      </Card>

      <PerFindingDiff a={a} b={b} />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="size-4 text-muted-foreground" />
            <span className="font-medium">Heuristic verdict</span>
          </div>
          <p className="text-sm">
            <span className="font-medium">{verdict.headline}</span> {verdict.body}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            That's a read of the screenshots, not your users — treat it as a shortlist to test, not a decision.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const severityRank: Record<string, number> = { critical: 3, warning: 2, info: 1, pass: 0 };

function PerFindingDiff({ a, b }: { a: HistoryEntry; b: HistoryEntry }) {
  const diff = useMemo(() => {
    const aByPrinciple = new Map(a.result.findings.map((f) => [f.principle, f]));
    const bByPrinciple = new Map(b.result.findings.map((f) => [f.principle, f]));
    const all = new Set([...aByPrinciple.keys(), ...bByPrinciple.keys()]);
    const rows: {
      principle: string;
      kind: "introduced" | "unchanged" | "resolved" | "regressed" | "improved";
      a?: ResearchFinding;
      b?: ResearchFinding;
    }[] = [];
    all.forEach((p) => {
      const fa = aByPrinciple.get(p);
      const fb = bByPrinciple.get(p);
      if (fa && !fb) rows.push({ principle: p, kind: "resolved", a: fa });
      else if (!fa && fb) rows.push({ principle: p, kind: "introduced", b: fb });
      else if (fa && fb) {
        const da = severityRank[fa.severity] || 0;
        const db = severityRank[fb.severity] || 0;
        const kind = db > da ? "regressed" : db < da ? "improved" : "unchanged";
        rows.push({ principle: p, kind, a: fa, b: fb });
      }
    });
    return rows.sort((x, y) => {
      const order = { regressed: 0, introduced: 1, improved: 2, resolved: 3, unchanged: 4 };
      return (order[x.kind] ?? 9) - (order[y.kind] ?? 9);
    });
  }, [a, b]);

  const resolved = diff.filter((d) => d.kind === "resolved").length;
  const introduced = diff.filter((d) => d.kind === "introduced").length;
  const improved = diff.filter((d) => d.kind === "improved").length;
  const regressed = diff.filter((d) => d.kind === "regressed").length;
  const unchanged = diff.filter((d) => d.kind === "unchanged").length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-4" />
            <span className="font-medium">Per-finding diff</span>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap text-muted-foreground">
            <span className="flex items-center gap-1">
              <Minus className="size-3" /> {resolved} resolved
            </span>
            <span className="flex items-center gap-1">
              <ArrowDown className="size-3" /> {improved} improved
            </span>
            <span className="flex items-center gap-1">
              <Plus className="size-3" /> {introduced} introduced
            </span>
            <span className="flex items-center gap-1">
              <ArrowUp className="size-3" /> {regressed} worse
            </span>
            <span className="flex items-center gap-1">
              <Equal className="size-3" /> {unchanged} unchanged
            </span>
          </div>
        </div>
        {diff.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No findings on either side.
          </div>
        ) : (
          <ul className="divide-y border rounded-md">
            {diff.map((d) => (
              <DiffRow key={d.principle} d={d} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const kindLabel: Record<"introduced" | "unchanged" | "resolved" | "regressed" | "improved", string> = {
  resolved: "Resolved on B",
  improved: "Improved on B",
  introduced: "Introduced on B",
  regressed: "Worse on B",
  unchanged: "Unchanged",
};

function SeverityLabel({ severity }: { severity?: Severity }) {
  if (!severity) return <span>—</span>;
  const m = severityMeta[severity];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3" /> {m.label}
    </span>
  );
}

function DiffRow({
  d,
}: {
  d: {
    principle: string;
    kind: "introduced" | "unchanged" | "resolved" | "regressed" | "improved";
    a?: ResearchFinding;
    b?: ResearchFinding;
  };
}) {
  return (
    <li className="p-3 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{d.principle}</div>
        <div className="text-xs text-muted-foreground truncate">
          {d.a?.source || d.b?.source}
        </div>
      </div>
      {/* Severity transition and its verdict label stay together — the label describes this pair, not the row */}
      <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
        <SeverityLabel severity={d.a?.severity} />
        <ArrowRight className="size-3" />
        <SeverityLabel severity={d.b?.severity} />
        <span className="ml-2 font-medium text-foreground">{kindLabel[d.kind]}</span>
      </div>
    </li>
  );
}
