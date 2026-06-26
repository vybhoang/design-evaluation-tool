// targetRegion is a human-confirmed, separately-stored rect — never a live
// reference to a ResearchFinding.region, even when pre-filled from one as a suggestion.
export type FirstClickTask = {
  id: string;
  analysisId: string;
  taskLabel: string;
  targetRegion: { x: number; y: number; w: number; h: number };
  createdAt: number;
};

export type FirstClickAttempt = {
  id: string;
  taskId: string;
  participantId: string;
  x: number;
  y: number;
  t: number;
  hit: boolean;
  createdAt: number;
};

const TASKS_KEY = "cognition.firstClickTasks.v1";
const ATTEMPTS_KEY = "cognition.firstClickAttempts.v1";

export function loadFirstClickTasks(): FirstClickTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FirstClickTask[];
  } catch {
    return [];
  }
}

export function saveFirstClickTasks(items: FirstClickTask[]) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function loadFirstClickAttempts(): FirstClickAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FirstClickAttempt[];
  } catch {
    return [];
  }
}

export function saveFirstClickAttempts(items: FirstClickAttempt[]) {
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeFirstClickId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function isHit(point: { x: number; y: number }, region: { x: number; y: number; w: number; h: number }): boolean {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.w &&
    point.y >= region.y &&
    point.y <= region.y + region.h
  );
}
