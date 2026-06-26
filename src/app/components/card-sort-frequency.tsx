import { useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { useStore } from "../store";
import type { CardSortDeck } from "./card-sort-store";

export function CardSortFrequency({ deck }: { deck: CardSortDeck }) {
  const { cardSortPlacements } = useStore();

  const placementsForDeck = useMemo(
    () => cardSortPlacements.filter((p) => p.deckId === deck.id),
    [cardSortPlacements, deck.id]
  );

  const participants = useMemo(
    () => [...new Set(placementsForDeck.map((p) => p.participantId))],
    [placementsForDeck]
  );

  const counts = useMemo(() => {
    return deck.cards.map((card) => ({
      card,
      perCategory: deck.categories.map((category) => ({
        category,
        count: placementsForDeck.filter((p) => p.cardLabel === card && p.categoryLabel === category).length,
      })),
    }));
  }, [deck, placementsForDeck]);

  if (participants.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No participant runs yet for this deck.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-medium">
          Card × category frequency — descriptive tabulation only, no statistical method (unlike SUS/NPS/SEQ above)
        </div>
        <div className="text-xs text-muted-foreground">{participants.length} participant{participants.length === 1 ? "" : "s"}</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left py-1 pr-3 font-normal">Card</th>
                {deck.categories.map((c) => (
                  <th key={c} className="text-left py-1 pr-3 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {counts.map(({ card, perCategory }) => (
                <tr key={card} className="border-t">
                  <td className="py-1.5 pr-3">{card}</td>
                  {perCategory.map(({ category, count }) => (
                    <td key={category} className="py-1.5 pr-3">
                      <span className={count === 0 ? "text-muted-foreground/60" : "font-medium"}>
                        {count}/{participants.length}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
