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

type StoreShape = {
  history: HistoryEntry[];
  validations: ValidationEvidence[];
  addEntry: (e: HistoryEntry) => void;
  deleteEntry: (id: string) => void;
  clearHistory: () => void;
  addEvidence: (e: Omit<ValidationEvidence, "id" | "createdAt">) => void;
  deleteEvidence: (id: string) => void;
};

const Ctx = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [validations, setValidations] = useState<ValidationEvidence[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    setValidations(loadValidations());
  }, []);

  const persistHistory = (next: HistoryEntry[]) => {
    setHistory(next);
    saveHistory(next);
  };
  const persistValidations = (next: ValidationEvidence[]) => {
    setValidations(next);
    saveValidations(next);
  };

  const value: StoreShape = {
    history,
    validations,
    addEntry: (e) => persistHistory([e, ...history]),
    deleteEntry: (id) => persistHistory(history.filter((h) => h.id !== id)),
    clearHistory: () => persistHistory([]),
    addEvidence: (e) =>
      persistValidations([
        { ...e, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), createdAt: Date.now() },
        ...validations,
      ]),
    deleteEvidence: (id) => persistValidations(validations.filter((v) => v.id !== id)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}
