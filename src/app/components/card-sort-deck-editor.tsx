import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useStore } from "../store";
import type { HistoryEntry } from "./history-store";

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function CardSortDeckEditor({ entry }: { entry: HistoryEntry }) {
  const { cardSortDecks, addCardSortDeck, updateCardSortDeck, deleteCardSortDeck } = useStore();
  const decksForAnalysis = cardSortDecks.filter((d) => d.analysisId === entry.id);

  const [cardsDraft, setCardsDraft] = useState("");
  // Category names default-suggest from existing finding principles as a starting
  // point — only the human-edited final list below is ever stored.
  const [categoriesDraft, setCategoriesDraft] = useState(
    entry.result.findings.slice(0, 5).map((f) => f.principle).join("\n")
  );

  const createDeck = () => {
    const cards = linesToList(cardsDraft);
    const categories = linesToList(categoriesDraft);
    if (cards.length === 0 || categories.length === 0) return;
    addCardSortDeck({ analysisId: entry.id, cards, categories });
    setCardsDraft("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-sm font-medium">New card sort deck</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Cards (one per line)</div>
              <Textarea
                value={cardsDraft}
                onChange={(e) => setCardsDraft(e.target.value)}
                placeholder={"Pricing\nAccount settings\nSupport"}
                className="h-32 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Categories (one per line, edit before saving)</div>
              <Textarea
                value={categoriesDraft}
                onChange={(e) => setCategoriesDraft(e.target.value)}
                className="h-32 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={createDeck} disabled={!cardsDraft.trim() || !categoriesDraft.trim()}>
            Save deck
          </Button>
        </CardContent>
      </Card>

      {decksForAnalysis.map((deck) => (
        <Card key={deck.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">{deck.cards.length} cards · {deck.categories.length} categories</Badge>
              <Button
                size="sm"
                variant="ghost"
                className="size-8 p-0 text-muted-foreground hover:text-red-600"
                onClick={() => deleteCardSortDeck(deck.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Cards</div>
                <Textarea
                  defaultValue={deck.cards.join("\n")}
                  onBlur={(e) => updateCardSortDeck(deck.id, { cards: linesToList(e.target.value) })}
                  className="h-24 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Categories</div>
                <Textarea
                  defaultValue={deck.categories.join("\n")}
                  onBlur={(e) => updateCardSortDeck(deck.id, { categories: linesToList(e.target.value) })}
                  className="h-24 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
