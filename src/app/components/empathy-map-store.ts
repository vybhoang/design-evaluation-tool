export type EmpathyQuadrant = "says" | "thinks" | "does" | "feels";

export type EmpathyMap = {
  id: string;
  analysisId: string;
  subject: string;
  createdAt: number;
};

export type EmpathyMapEntryBase = {
  id: string;
  mapId: string;
  quadrant: EmpathyQuadrant;
  quoteText: string;
  createdAt: number;
};

export type EmpathyMapQuoteEntry = EmpathyMapEntryBase & {
  entryType: "quote";
  participantId: string;
  sourceResponseId: string;
};

export type EmpathyMapNoteEntry = EmpathyMapEntryBase & {
  entryType: "note";
  authorName: string;
  rationale: string;
};

export type EmpathyMapEntry = EmpathyMapQuoteEntry | EmpathyMapNoteEntry;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

const MAPS_KEY = "cognition.empathyMaps.v1";
const ENTRIES_KEY = "cognition.empathyMapEntries.v2";

export function loadEmpathyMaps(): EmpathyMap[] {
  try {
    const raw = localStorage.getItem(MAPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EmpathyMap[];
  } catch {
    return [];
  }
}

export function saveEmpathyMaps(items: EmpathyMap[]) {
  try {
    localStorage.setItem(MAPS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function loadEmpathyMapEntries(): EmpathyMapEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EmpathyMapEntry[];
  } catch {
    return [];
  }
}

export function saveEmpathyMapEntries(items: EmpathyMapEntry[]) {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeEmpathyMapId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
