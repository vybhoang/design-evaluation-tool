export type InterviewResponse = {
  id: string;
  createdAt: number;
  // participant ID for the session this response came from
  sessionLabel: string;
  analysisId?: string;
  analysisLabel?: string;
  question: string;
  response: string;
  taggedFindingId?: string;
  findingPrinciple?: string;
  verdict?: "confirmed" | "refuted" | "inconclusive";
  // multi-code tagging layer — ids into the codebook (codebook-store.ts)
  codes?: string[];
  // Set only by session-capture's tag flow. May be absent for ValidationEvidence
  // created via the standalone finding-card dialog (validation-dialog.tsx) — do not
  // assume every evidence row has a reachable response.
  evidenceId?: string;
  // human-curated Quote Bank pin — never set by anything automatic
  starred?: boolean;
};

const KEY = "cognition.responses.v1";

export function loadResponses(): InterviewResponse[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterviewResponse[];
  } catch {
    return [];
  }
}

export function saveResponses(items: InterviewResponse[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeResponseId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
