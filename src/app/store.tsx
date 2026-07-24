import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
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
import {
  loadEmpathyMaps,
  saveEmpathyMaps,
  loadEmpathyMapEntries,
  saveEmpathyMapEntries,
  makeEmpathyMapId,
  type EmpathyMap,
  type EmpathyMapEntry,
  type DistributiveOmit,
} from "./components/empathy-map-store";

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
  empathyMaps: EmpathyMap[];
  empathyMapEntries: EmpathyMapEntry[];
  addEntry: (e: HistoryEntry) => void;
  deleteEntry: (id: string) => void;
  clearHistory: () => void;
  /**
   * Replace just one page's result within an existing entry, in place — used
   * by the "Rerun analysis" action so a re-run only touches the page it was
   * run for. entry.pages holds ALL pages (including the first) when the
   * entry has more than one screenshot, so pageIndex indexes directly into
   * it with no offset; entry.result mirrors pages[0] and is kept in sync
   * when pageIndex === 0.
   */
  updatePageResult: (entryId: string, pageIndex: number, result: HistoryEntry["result"]) => void;
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
  addEmpathyMap: (m: Omit<EmpathyMap, "id" | "createdAt">) => string;
  deleteEmpathyMap: (id: string) => void;
  addEmpathyMapEntry: (e: DistributiveOmit<EmpathyMapEntry, "id" | "createdAt">) => string;
  deleteEmpathyMapEntry: (id: string) => void;
};

// Most of the "add" actions below share one shape: generate an id, stamp
// createdAt, and either prepend (newest-first lists) or append (stable-order
// lists) to a state array. Pulling that into one helper removes ~8 repeats of
// the same three lines. Actions with extra behavior (cascading deletes,
// cross-referencing other state, batching, union-typed items) are left
// inline rather than forced through this — the shared shape only covers the
// plain cases.
function addWithId<T extends { id: string; createdAt: number }>(
  setItems: Dispatch<SetStateAction<T[]>>,
  item: Omit<T, "id" | "createdAt">,
  makeId: () => string,
  position: "prepend" | "append"
): string {
  const id = makeId();
  const full = { ...item, id, createdAt: Date.now() } as T;
  setItems((prev) => (position === "prepend" ? [full, ...prev] : [...prev, full]));
  return id;
}

// Counterpart for the plain "remove by id" actions.
function removeById<T extends { id: string }>(setItems: Dispatch<SetStateAction<T[]>>, id: string) {
  setItems((prev) => prev.filter((item) => item.id !== id));
}

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
  const [empathyMaps, setEmpathyMaps] = useState<EmpathyMap[]>([]);
  const [empathyMapEntries, setEmpathyMapEntries] = useState<EmpathyMapEntry[]>([]);
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
    setEmpathyMaps(loadEmpathyMaps());
    setEmpathyMapEntries(loadEmpathyMapEntries());
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
  useEffect(() => { if (hydrated) saveEmpathyMaps(empathyMaps); }, [empathyMaps, hydrated]);
  useEffect(() => { if (hydrated) saveEmpathyMapEntries(empathyMapEntries); }, [empathyMapEntries, hydrated]);

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
    empathyMaps,
    empathyMapEntries,
    addEntry: (e) => setHistory((prev) => [e, ...prev]),
    deleteEntry: (id) => removeById(setHistory, id),
    clearHistory: () => setHistory([]),
    updatePageResult: (entryId, pageIndex, result) =>
      setHistory((prev) =>
        prev.map((h) => {
          if (h.id !== entryId) return h;
          if (!h.pages?.length) {
            // Single-page entry — pageIndex is always 0 here.
            return { ...h, result };
          }
          // entry.pages holds ALL pages (including the first) when an entry has
          // more than one; entry.result just mirrors pages[0] for single-page
          // code paths, so keep both in sync when pageIndex === 0.
          return {
            ...h,
            ...(pageIndex === 0 && { result }),
            pages: h.pages.map((p, i) => (i === pageIndex ? { ...p, result } : p)),
          };
        })
      ),
    addEvidence: (e) =>
      addWithId(setValidations, e, () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7), "prepend"),
    deleteEvidence: (id) => removeById(setValidations, id),
    addResponse: (r) => addWithId(setResponses, r, makeResponseId, "prepend"),
    updateResponse: (id, patch) =>
      setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    deleteResponse: (id) => removeById(setResponses, id),
    clearResponses: () => setResponses([]),
    addCode: (label) => addWithId(setCodebook, { label }, makeCodeId, "append"),
    renameCode: (id, label) => setCodebook((prev) => renameCodeIn(prev, id, label)),
    mergeCode: (fromId, intoId) => {
      setCodebook((prev) => mergeCodesIn(prev, fromId));
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
    addFirstClickTask: (t) => addWithId(setFirstClickTasks, t, makeFirstClickId, "append"),
    deleteFirstClickTask: (id) => {
      removeById(setFirstClickTasks, id);
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
    addTaskRun: (t) => addWithId(setTaskRuns, t, makeTaskRunId, "prepend"),
    deleteTaskRun: (id) => removeById(setTaskRuns, id),
    addCardSortDeck: (d) => addWithId(setCardSortDecks, d, makeCardSortId, "append"),
    updateCardSortDeck: (id, patch) =>
      setCardSortDecks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    deleteCardSortDeck: (id) => {
      removeById(setCardSortDecks, id);
      setCardSortPlacements((prev) => prev.filter((p) => p.deckId !== id));
    },
    addCardSortPlacements: (placements) => {
      const now = Date.now();
      const rows = placements.map((p) => ({ ...p, id: makeCardSortId(), createdAt: now }));
      setCardSortPlacements((prev) => [...rows, ...prev]);
    },
    addEmpathyMap: (m) => {
      const id = makeEmpathyMapId();
      setEmpathyMaps((prev) => [...prev, { ...m, id, createdAt: Date.now() }]);
      return id;
    },
    deleteEmpathyMap: (id) => {
      removeById(setEmpathyMaps, id);
      setEmpathyMapEntries((prev) => prev.filter((e) => e.mapId !== id));
    },
    addEmpathyMapEntry: (e) => {
      const id = makeEmpathyMapId();
      setEmpathyMapEntries((prev) => [...prev, { ...e, id, createdAt: Date.now() }]);
      return id;
    },
    deleteEmpathyMapEntry: (id) => removeById(setEmpathyMapEntries, id),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
