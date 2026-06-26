import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from "./components/history-store";
import {
  loadValidations,
  saveValidations,
  type ValidationEvidence,
} from "./components/validation-store";
import {
  loadResponses,
  saveResponses,
  makeResponseId,
  type InterviewResponse,
} from "./components/response-store";
import {
  loadCodebook,
  saveCodebook,
  makeCodeId,
  renameCode as renameCodeIn,
  mergeCodes as mergeCodesIn,
  type Code,
} from "./components/codebook-store";
import {
  loadScaleResponses,
  saveScaleResponses,
  makeScaleResponseId,
  type ScaleResponse,
} from "./components/scales-store";
import {
  loadFirstClickTasks,
  saveFirstClickTasks,
  loadFirstClickAttempts,
  saveFirstClickAttempts,
  makeFirstClickId,
  isHit,
  type FirstClickTask,
  type FirstClickAttempt,
} from "./components/first-click-store";
import {
  loadTaskRuns,
  saveTaskRuns,
  makeTaskRunId,
  type TaskRun,
} from "./components/task-run-store";
import {
  loadCardSortDecks,
  saveCardSortDecks,
  loadCardSortPlacements,
  saveCardSortPlacements,
  makeCardSortId,
  type CardSortDeck,
  type CardSortPlacement,
} from "./components/card-sort-store";

type StoreShape = {
  history: HistoryEntry[];
  validations: ValidationEvidence[];
  responses: InterviewResponse[];
  codebook: Code[];
  scaleResponses: ScaleResponse[];
  firstClickTasks: FirstClickTask[];
  firstClickAttempts: FirstClickAttempt[];
  taskRuns: TaskRun[];
  cardSortDecks: CardSortDeck[];
  cardSortPlacements: CardSortPlacement[];
  addEntry: (e: HistoryEntry) => void;
  deleteEntry: (id: string) => void;
  clearHistory: () => void;
  addEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => string;
  deleteEvidence: (id: string) => void;
  addResponse: (r: Omit<InterviewResponse, "id" | "createdAt">) => string;
  updateResponse: (id: string, patch: Partial<InterviewResponse>) => void;
  deleteResponse: (id: string) => void;
  clearResponses: () => void;
  addCode: (label: string) => string;
  renameCode: (id: string, label: string) => void;
  mergeCode: (fromId: string, intoId: string) => void;
  deleteCode: (id: string) => void;
  toggleResponseCode: (responseId: string, codeId: string) => void;
  addScaleResponse: (items: Omit<ScaleResponse, "id" | "createdAt">[]) => void;
  deleteScaleResponsesFor: (analysisId: string, participantId: string, scale: ScaleResponse["scale"]) => void;
  addFirstClickTask: (t: Omit<FirstClickTask, "id" | "createdAt">) => string;
  deleteFirstClickTask: (id: string) => void;
  addFirstClickAttempt: (a: Omit<FirstClickAttempt, "id" | "createdAt" | "hit">) => void;
  addTaskRun: (t: Omit<TaskRun, "id" | "createdAt">) => void;
  deleteTaskRun: (id: string) => void;
  addCardSortDeck: (d: Omit<CardSortDeck, "id" | "createdAt">) => string;
  updateCardSortDeck: (id: string, patch: Partial<Pick<CardSortDeck, "cards" | "categories">>) => void;
  deleteCardSortDeck: (id: string) => void;
  addCardSortPlacements: (placements: Omit<CardSortPlacement, "id" | "createdAt">[]) => void;
};

const Ctx = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [validations, setValidations] = useState<ValidationEvidence[]>([]);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [codebook, setCodebook] = useState<Code[]>([]);
  const [scaleResponses, setScaleResponses] = useState<ScaleResponse[]>([]);
  const [firstClickTasks, setFirstClickTasks] = useState<FirstClickTask[]>([]);
  const [firstClickAttempts, setFirstClickAttempts] = useState<FirstClickAttempt[]>([]);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [cardSortDecks, setCardSortDecks] = useState<CardSortDeck[]>([]);
  const [cardSortPlacements, setCardSortPlacements] = useState<CardSortPlacement[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount
  useEffect(() => {
    setHistory(loadHistory());
    setValidations(loadValidations());
    setResponses(loadResponses());
    setCodebook(loadCodebook());
    setScaleResponses(loadScaleResponses());
    setFirstClickTasks(loadFirstClickTasks());
    setFirstClickAttempts(loadFirstClickAttempts());
    setTaskRuns(loadTaskRuns());
    setCardSortDecks(loadCardSortDecks());
    setCardSortPlacements(loadCardSortPlacements());
    setHydrated(true);
  }, []);

  // Persist whenever state changes — decoupled from the call site so chained
  // updates (e.g. delete-then-add in the same handler) never race a stale snapshot.
  useEffect(() => { if (hydrated) saveHistory(history); }, [history, hydrated]);
  useEffect(() => { if (hydrated) saveValidations(validations); }, [validations, hydrated]);
  useEffect(() => { if (hydrated) saveResponses(responses); }, [responses, hydrated]);
  useEffect(() => { if (hydrated) saveCodebook(codebook); }, [codebook, hydrated]);
  useEffect(() => { if (hydrated) saveScaleResponses(scaleResponses); }, [scaleResponses, hydrated]);
  useEffect(() => { if (hydrated) saveFirstClickTasks(firstClickTasks); }, [firstClickTasks, hydrated]);
  useEffect(() => { if (hydrated) saveFirstClickAttempts(firstClickAttempts); }, [firstClickAttempts, hydrated]);
  useEffect(() => { if (hydrated) saveTaskRuns(taskRuns); }, [taskRuns, hydrated]);
  useEffect(() => { if (hydrated) saveCardSortDecks(cardSortDecks); }, [cardSortDecks, hydrated]);
  useEffect(() => { if (hydrated) saveCardSortPlacements(cardSortPlacements); }, [cardSortPlacements, hydrated]);

  const value: StoreShape = {
    history,
    validations,
    responses,
    codebook,
    scaleResponses,
    firstClickTasks,
    firstClickAttempts,
    taskRuns,
    cardSortDecks,
    cardSortPlacements,
    addEntry: (e) => setHistory((prev) => [e, ...prev]),
    deleteEntry: (id) => setHistory((prev) => prev.filter((h) => h.id !== id)),
    clearHistory: () => setHistory([]),
    addEvidence: (e) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      setValidations((prev) => [{ ...e, id, createdAt: Date.now() }, ...prev]);
      return id;
    },
    deleteEvidence: (id) => setValidations((prev) => prev.filter((v) => v.id !== id)),
    addResponse: (r) => {
      const id = makeResponseId();
      setResponses((prev) => [{ ...r, id, createdAt: Date.now() }, ...prev]);
      return id;
    },
    updateResponse: (id, patch) =>
      setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    deleteResponse: (id) => setResponses((prev) => prev.filter((r) => r.id !== id)),
    clearResponses: () => setResponses([]),
    addCode: (label) => {
      const id = makeCodeId();
      setCodebook((prev) => [...prev, { id, label, createdAt: Date.now() }]);
      return id;
    },
    renameCode: (id, label) => setCodebook((prev) => renameCodeIn(prev, id, label)),
    mergeCode: (fromId, intoId) => {
      setCodebook((prev) => mergeCodesIn(prev, fromId, intoId));
      setResponses((prev) =>
        prev.map((r) => {
          if (!r.codes || !r.codes.includes(fromId)) return r;
          const next = new Set(r.codes.filter((c) => c !== fromId));
          next.add(intoId);
          return { ...r, codes: Array.from(next) };
        })
      );
    },
    deleteCode: (id) => {
      setCodebook((prev) => prev.filter((c) => c.id !== id));
      setResponses((prev) =>
        prev.map((r) => (r.codes?.includes(id) ? { ...r, codes: r.codes.filter((c) => c !== id) } : r))
      );
    },
    toggleResponseCode: (responseId, codeId) =>
      setResponses((prev) =>
        prev.map((r) => {
          if (r.id !== responseId) return r;
          const has = r.codes?.includes(codeId);
          const codes = has
            ? (r.codes ?? []).filter((c) => c !== codeId)
            : [...(r.codes ?? []), codeId];
          return { ...r, codes };
        })
      ),
    addScaleResponse: (items) => {
      const now = Date.now();
      const rows = items.map((it) => ({ ...it, id: makeScaleResponseId(), createdAt: now }));
      setScaleResponses((prev) => [...rows, ...prev]);
    },
    deleteScaleResponsesFor: (analysisId, participantId, scale) =>
      setScaleResponses((prev) =>
        prev.filter(
          (r) => !(r.analysisId === analysisId && r.participantId === participantId && r.scale === scale)
        )
      ),
    addFirstClickTask: (t) => {
      const id = makeFirstClickId();
      setFirstClickTasks((prev) => [...prev, { ...t, id, createdAt: Date.now() }]);
      return id;
    },
    deleteFirstClickTask: (id) => {
      setFirstClickTasks((prev) => prev.filter((t) => t.id !== id));
      setFirstClickAttempts((prev) => prev.filter((a) => a.taskId !== id));
    },
    addFirstClickAttempt: (a) => {
      const task = firstClickTasks.find((t) => t.id === a.taskId);
      const hit = task ? isHit({ x: a.x, y: a.y }, task.targetRegion) : false;
      setFirstClickAttempts((prev) => [
        ...prev,
        { ...a, id: makeFirstClickId(), createdAt: Date.now(), hit },
      ]);
    },
    addTaskRun: (t) =>
      setTaskRuns((prev) => [{ ...t, id: makeTaskRunId(), createdAt: Date.now() }, ...prev]),
    deleteTaskRun: (id) => setTaskRuns((prev) => prev.filter((t) => t.id !== id)),
    addCardSortDeck: (d) => {
      const id = makeCardSortId();
      setCardSortDecks((prev) => [...prev, { ...d, id, createdAt: Date.now() }]);
      return id;
    },
    updateCardSortDeck: (id, patch) =>
      setCardSortDecks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    deleteCardSortDeck: (id) => {
      setCardSortDecks((prev) => prev.filter((d) => d.id !== id));
      setCardSortPlacements((prev) => prev.filter((p) => p.deckId !== id));
    },
    addCardSortPlacements: (placements) => {
      const now = Date.now();
      const rows = placements.map((p) => ({ ...p, id: makeCardSortId(), createdAt: now }));
      setCardSortPlacements((prev) => [...rows, ...prev]);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
