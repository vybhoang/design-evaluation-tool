// Deliberately outside the ResearchFinding/Confidence system — codes are human-applied
// tags on raw response text, not AI-attributed findings. Must never gain a `source`,
// `confidence`, or AI-attribution field; don't pattern-match this type against ResearchFinding.
export type Code = {
  id: string;
  label: string;
  createdAt: number;
  color?: string;
};

const KEY = "cognition.codebook.v1";

export function loadCodebook(): Code[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Code[];
  } catch {
    return [];
  }
}

export function saveCodebook(items: Code[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeCodeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function renameCode(codes: Code[], id: string, label: string): Code[] {
  return codes.map((c) => (c.id === id ? { ...c, label } : c));
}

export function mergeCodes(codes: Code[], fromId: string, intoId: string): Code[] {
  return codes.filter((c) => c.id !== fromId);
}
