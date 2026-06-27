export type Disclosure = { id: string; title: string; body: string };

export const DISCLOSURES: Disclosure[] = [
  {
    id: "heuristic-first-pass",
    title: "Heuristic first pass — not user research.",
    body: "Pattern-matched against UX principles. Validate with real users before treating anything as truth.",
  },
  {
    id: "synthetic-interview",
    title: "Not validation.",
    body: "A general LLM isn't fine-tuned on your user base and doesn't think like a person. Use this to spot leading or vague questions, then run the script with real testers.",
  },
];

const KEY = "cognition.disclosures.v1";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function save(seen: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // ignore quota errors
  }
}

export function isDismissed(id: string): boolean {
  return load().has(id);
}

export function dismiss(id: string) {
  const seen = load();
  seen.add(id);
  save(seen);
}
