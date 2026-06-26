// Raw per-participant task-completion observations, additive to (never a replacement
// for) the free-text Observation log in session-capture.tsx.
export type TaskRun = {
  id: string;
  findingId: string;
  participantId: string;
  sessionId: string;
  analysisId: string;
  completed: boolean;
  hesitated: boolean;
  confused: boolean;
  askedForHelp: boolean;
  seqValue?: number;
  timeOnTaskMs?: number;
  notes: string;
  createdAt: number;
};

const KEY = "cognition.taskRuns.v1";

export function loadTaskRuns(): TaskRun[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TaskRun[];
  } catch {
    return [];
  }
}

export function saveTaskRuns(items: TaskRun[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeTaskRunId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
