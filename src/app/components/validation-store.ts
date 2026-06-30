import type { HistoryEntry } from "./history-store";

export type ValidationEvidence = {
  id: string;
  findingId: string;
  createdAt: number;
  // verdict from real-user evidence
  verdict: "confirmed" | "refuted" | "inconclusive";
  // how the evidence was gathered
  method: string;
  // n=? sample size if applicable
  sampleSize?: number;
  note: string;
  // Which run this evidence belongs to. Optional because finding ids are not
  // guaranteed unique across runs (the mock analysis generator reuses ids) —
  // without this, cross-run aggregation can't tell which design a piece of
  // evidence actually came from. Absent on evidence logged before this field
  // existed; resolveEvidence() falls back to a best-effort scan for those.
  analysisId?: string;
  analysisLabel?: string;
};

const KEY = "cognition.validations.v1";

export function loadValidations(): ValidationEvidence[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ValidationEvidence[];
  } catch {
    return [];
  }
}

export function saveValidations(items: ValidationEvidence[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function evidenceFor(items: ValidationEvidence[], findingId: string) {
  return items.filter((v) => v.findingId === findingId).sort((a, b) => b.createdAt - a.createdAt);
}

export function validationStatus(items: ValidationEvidence[], findingId: string):
  | "unvalidated"
  | "confirmed"
  | "refuted"
  | "mixed" {
  const ev = evidenceFor(items, findingId);
  if (ev.length === 0) return "unvalidated";
  const verdicts = new Set(ev.map((e) => e.verdict));
  if (verdicts.size > 1) return "mixed";
  const only = ev[0].verdict;
  if (only === "confirmed") return "confirmed";
  if (only === "refuted") return "refuted";
  return "mixed";
}

export type ResolvedEvidence = {
  principle: string;
  source: string;
  severity: string;
  runId: string;
  runLabel: string;
  designType: string;
  approximateRun: boolean;
};

// Pairs a piece of evidence with the run/finding it actually came from.
// Prefers the stable analysisId; falls back to a best-effort id scan for
// evidence logged before that field existed (flagged via approximateRun).
export function resolveEvidence(
  e: ValidationEvidence,
  history: HistoryEntry[]
): ResolvedEvidence | null {
  const exact = e.analysisId ? history.find((h) => h.id === e.analysisId) : undefined;
  const entry = exact ?? history.find((h) => h.result.findings.some((f) => f.id === e.findingId));
  if (!entry) return null;
  const finding = entry.result.findings.find((f) => f.id === e.findingId);
  if (!finding) return null;
  return {
    principle: finding.principle,
    source: finding.source,
    severity: finding.severity,
    runId: entry.id,
    runLabel: entry.label,
    designType: entry.context.designType,
    approximateRun: !exact,
  };
}
