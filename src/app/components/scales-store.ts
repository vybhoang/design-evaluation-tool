// Never store a precomputed score, raw items only — scoring.ts derives the score on read.
export type ScaleResponse = {
  id: string;
  createdAt: number;
  analysisId: string;
  participantId: string;
  scale: "SUS" | "NPS" | "SAT" | "SEQ";
  itemId: string;
  value: number;
};

const KEY = "cognition.scales.v1";

export function loadScaleResponses(): ScaleResponse[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScaleResponse[];
  } catch {
    return [];
  }
}

export function saveScaleResponses(items: ScaleResponse[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeScaleResponseId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
