// Pure scoring functions only — no localStorage, no React. scales-store.ts stores
// raw items; this file derives scores from them on read, never the other way around.

export type ScaleCitation = { label: string; source?: string; note?: string };

export const SCALE_CITATIONS: Record<"SUS" | "NPS" | "SAT" | "SEQ", ScaleCitation> = {
  SUS: {
    label: "System Usability Scale (SUS)",
    source: "Brooke (1986), \"SUS: A 'quick and dirty' usability scale\"",
  },
  NPS: {
    label: "Net Promoter Score (NPS)",
    source: "Reichheld (2003), \"The One Number You Need to Grow,\" HBR",
  },
  SEQ: {
    label: "Single Ease Question (SEQ)",
    source: "Sauro & Dumas (2009), CHI '09",
  },
  SAT: {
    label: "Satisfaction rating",
    note: "Single-item, industry convention — not a peer-reviewed instrument. No published source is cited because none applies to this exact metric.",
  },
};

export function scoreSUS(items: number[]): number | null {
  if (items.length !== 10) return null;
  // Odd items (1,3,5,7,9; 0-indexed 0,2,4,6,8): score = value - 1
  // Even items (2,4,6,8,10; 0-indexed 1,3,5,7,9): score = 5 - value
  let total = 0;
  for (let i = 0; i < 10; i++) {
    total += i % 2 === 0 ? items[i] - 1 : 5 - items[i];
  }
  return total * 2.5;
}

export function scoreNPS(
  values: number[]
): { promoters: number; passives: number; detractors: number; score: number | null } {
  if (values.length === 0) {
    return { promoters: 0, passives: 0, detractors: 0, score: null };
  }
  const promoters = values.filter((v) => v >= 9).length;
  const passives = values.filter((v) => v >= 7 && v <= 8).length;
  const detractors = values.filter((v) => v <= 6).length;
  const score = Math.round(((promoters - detractors) / values.length) * 100);
  return { promoters, passives, detractors, score };
}

export function scoreSAT(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function scoreSEQ(values: number[]): { mean: number | null; n: number } {
  if (values.length === 0) return { mean: null, n: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { mean, n: values.length };
}
