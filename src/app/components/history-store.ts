import { toast } from "sonner";
import type { AnalysisContext } from "./design-canvas";
import type { AnalysisResult } from "./analysis-data";

export type HistoryEntry = {
  id: string;
  createdAt: number;
  label: string;
  thumbnail: string;
  context: AnalysisContext;
  result: AnalysisResult;
};

const KEY = "cognition.history.v1";
const MAX_RUNS = 30;
let warnedAboutCap = false;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  try {
    // cap to most recent 30 to avoid bloating localStorage
    const trimmed = entries.slice(0, MAX_RUNS);
    if (entries.length > MAX_RUNS && !warnedAboutCap) {
      warnedAboutCap = true;
      toast.warning(`Keeping your ${MAX_RUNS} most recent runs — older ones were removed from local storage.`);
    }
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

export async function imageToThumbnail(src: string, maxDim = 200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(c.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
