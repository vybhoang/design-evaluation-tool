import { CardSortDeckEditor } from "./card-sort-deck-editor";
import { CardSortFrequency } from "./card-sort-frequency";
import { useStore } from "../store";
import type { HistoryEntry } from "./history-store";

export function CardSortView({ entry }: { entry: HistoryEntry }) {
  const { cardSortDecks } = useStore();
  const decksForAnalysis = cardSortDecks.filter((d) => d.analysisId === entry.id);

  return (
    <div className="space-y-4">
      <CardSortDeckEditor entry={entry} />
      {decksForAnalysis.map((deck) => (
        <CardSortFrequency key={deck.id} deck={deck} />
      ))}
    </div>
  );
}
