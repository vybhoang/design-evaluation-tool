import { useMemo } from "react";
import { ArrowDown, ArrowUp, Minus, X, Trophy, AlertTriangle, XCircle, Eye, Accessibility, Plus, Equal, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import type { HistoryEntry } from "./history-store";
import { formatRelative } from "./history-store";

type Props = {
  a: HistoryEntry;
  b: HistoryEntry;
  onSwap: () => void;
  onClose: () => void;
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
  label: string; icon: any; a: number; b: number; higherIsBetter?: boolean;
}) {
  const delta = b - a;
  const adjDelta = higherIsBetter ? delta : -delta;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <div className="text-right">
        <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>{a}</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 min-w-[140px]">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground text-center">
          <Icon className="size-3" /> {label}
        </div>
        <Delta value={adjDelta} />
      </div>
      <div className="text-left">
        <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>{b}</span>
      </div>
    </div>
  );
}

export function CompareView({ a, b, onSwap, onClose }: Props) {
  const aHigh = a.result.findings.filter((f) => f.severity === "critical" || f.severity === "warning").length;
  const bHigh = b.result.findings.filter((f) => f.severity === "critical" || f.severity === "warning").length;
  const findingDelta = bHigh - aHigh;

  // Composite: lower issues + higher clarity/a11y
  const score = (e: HistoryEntry) =>
    e.result.clarityScore + e.result.accessibilityScore -
    e.result.findings.filter((f) => f.severity === "critical").length * 8 -
    e.result.findings.filter((f) => f.severity === "warning").length * 3;

  const sA = score(a);
  const sB = score(b);
  const winner = sB > sA ? "B" : sB < sA ? "A" : null;

  const sideHeader = (entry: HistoryEntry, side: "A" | "B") => (
    <div className="flex items-center gap-3">
      <Badge
        variant={winner === side ? "default" : "secondary"}
        className={`size-7 rounded-full p-0 flex items-center justify-center ${
          winner === side ? "bg-emerald-500 hover:bg-emerald-500" : ""
        }`}
      >
        {winner === side ? <Trophy className="size-3.5" /> : side}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{entry.label}</div>
        <div className="text-xs text-muted-foreground">
          {entry.context.designType} · {formatRelative(entry.createdAt)}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle>A/B Comparison</CardTitle>
          <CardDescription>
            Heuristic-level diff. Doesn't tell you which one your users will actually prefer — that's a test.
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onSwap}>Swap</Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="flex-1 overflow-auto p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {sideHeader(a, "A")}
            <div className="aspect-video rounded-md overflow-hidden bg-muted">
              <img src={a.context.imageUrl || a.thumbnail} alt="A" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="space-y-2">
            {sideHeader(b, "B")}
            <div className="aspect-video rounded-md overflow-hidden bg-muted">
              <img src={b.context.imageUrl || b.thumbnail} alt="B" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground text-center mb-2">
              Score comparison
            </div>
            <ScoreCmp label="Clarity (heuristic)" icon={Eye} a={a.result.clarityScore} b={b.result.clarityScore} />
            <ScoreCmp
              label="Accessibility (rule-based)"
              icon={Accessibility}
              a={a.result.accessibilityScore}
              b={b.result.accessibilityScore}
            />
            <ScoreCmp
              label="Critical issues"
              icon={XCircle}
              a={a.result.findings.filter((f) => f.severity === "critical").length}
              b={b.result.findings.filter((f) => f.severity === "critical").length}
              higherIsBetter={false}
            />
            <ScoreCmp
              label="Warnings"
              icon={AlertTriangle}
              a={a.result.findings.filter((f) => f.severity === "warning").length}
              b={b.result.findings.filter((f) => f.severity === "warning").length}
              higherIsBetter={false}
            />
          </CardContent>
        </Card>

        <PerFindingDiff a={a} b={b} />

        <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="size-4 text-amber-700" />
            <span className="font-medium text-amber-900">Heuristic verdict</span>
          </div>
          <p className="text-sm text-amber-900">
            {winner === null
              ? "Both variants score identically on heuristics. Look at the per-finding diff."
              : `Variant ${winner} has fewer/less-severe heuristic issues. ${
                  findingDelta !== 0
                    ? `Δ high-severity: ${findingDelta > 0 ? "+" : ""}${findingDelta} on B.`
                    : ""
                }`}
          </p>
          <p className="text-xs text-amber-800 mt-2">
            This says nothing about which variant users will actually prefer, complete faster,
            or trust more. To answer that, run both with real testers.
          </p>
        </div>
      </CardContent>
    </Card>
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
      kind: "only-a" | "only-b" | "shared" | "resolved" | "regressed";
      a?: typeof a.result.findings[number];
      b?: typeof b.result.findings[number];
    }[] = [];
    all.forEach((p) => {
      const fa = aByPrinciple.get(p);
      const fb = bByPrinciple.get(p);
      if (fa && !fb) rows.push({ principle: p, kind: "resolved", a: fa });
      else if (!fa && fb) rows.push({ principle: p, kind: "only-b", b: fb });
      else if (fa && fb) {
        const da = severityRank[fa.severity] || 0;
        const db = severityRank[fb.severity] || 0;
        if (db > da) rows.push({ principle: p, kind: "regressed", a: fa, b: fb });
        else rows.push({ principle: p, kind: "shared", a: fa, b: fb });
      }
    });
    return rows.sort((x, y) => {
      const order = { regressed: 0, "only-b": 1, shared: 2, resolved: 3, "only-a": 4 };
      return (order[x.kind] ?? 9) - (order[y.kind] ?? 9);
    });
  }, [a, b]);

  const resolved = diff.filter((d) => d.kind === "resolved").length;
  const introduced = diff.filter((d) => d.kind === "only-b").length;
  const regressed = diff.filter((d) => d.kind === "regressed").length;
  const shared = diff.filter((d) => d.kind === "shared").length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-4" />
            <span className="font-medium">Per-finding diff</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-700">
              <Minus className="size-3" /> {resolved} resolved
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <Plus className="size-3" /> {introduced} introduced
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <ArrowUp className="size-3" /> {regressed} worse
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Equal className="size-3" /> {shared} unchanged
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

function DiffRow({
  d,
}: {
  d: {
    principle: string;
    kind: "only-a" | "only-b" | "shared" | "resolved" | "regressed";
    a?: any;
    b?: any;
  };
}) {
  const meta = {
    resolved: { label: "Resolved on B", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    "only-b": { label: "New on B", color: "bg-red-50 text-red-700 border-red-200" },
    regressed: { label: "Worse on B", color: "bg-amber-50 text-amber-700 border-amber-200" },
    shared: { label: "Unchanged", color: "bg-muted text-muted-foreground border-border" },
    "only-a": { label: "Only on A", color: "bg-muted text-muted-foreground border-border" },
  }[d.kind];
  const sevA = d.a?.severity;
  const sevB = d.b?.severity;
  return (
    <li className="p-3 flex items-start gap-3 text-sm">
      <Badge variant="outline" className={`shrink-0 ${meta.color}`}>{meta.label}</Badge>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{d.principle}</div>
        <div className="text-xs text-muted-foreground truncate">
          {d.a?.source || d.b?.source}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs shrink-0">
        <span className="text-muted-foreground">A:</span>
        <span className="font-mono">{sevA || "—"}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-muted-foreground">B:</span>
        <span className="font-mono">{sevB || "—"}</span>
      </div>
    </li>
  );
}
