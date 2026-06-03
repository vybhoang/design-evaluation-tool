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
