import { useState } from "react";
import { LayoutGrid, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useStore } from "../store";
import type { CardSortDeck } from "./card-sort-store";

export function CardSortSession({ deck }: { deck: CardSortDeck }) {
  const { addCardSortPlacements } = useStore();
  const [participantId, setParticipantId] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const assignedCount = Object.keys(assignments).length;
  const canSubmit = participantId.trim().length > 0 && assignedCount === deck.cards.length;

  const submit = () => {
    if (!canSubmit) return;
    addCardSortPlacements(
      deck.cards.map((card) => ({
        deckId: deck.id,
        participantId: participantId.trim(),
        cardLabel: card,
        categoryLabel: assignments[card],
      }))
    );
    setSubmitted(true);
  };

  const reset = () => {
    setParticipantId("");
    setAssignments({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Check className="size-6 text-emerald-600 mx-auto" />
          <p className="text-sm text-muted-foreground">
            All {deck.cards.length} cards placed for {participantId || "this participant"}.
          </p>
          <Button size="sm" variant="outline" onClick={reset}>
            Run next participant
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LayoutGrid className="size-4" /> Card sort
        </div>
        <Input
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
          placeholder="Participant ID"
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Assign each card to the category it best belongs in. ({assignedCount}/{deck.cards.length} placed)
        </p>
        <div className="space-y-3">
          {deck.cards.map((card) => (
            <div key={card} className="rounded-md border p-2.5 space-y-2">
              <div className="text-sm font-medium">{card}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {deck.categories.map((category) => {
                  const active = assignments[card] === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setAssignments((prev) => ({ ...prev, [card]: category }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{assignedCount}/{deck.cards.length} assigned</Badge>
          <Button size="sm" onClick={submit} disabled={!canSubmit} className="gap-1.5">
            <Check className="size-3.5" /> Submit sort
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
