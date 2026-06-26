// AI-suggested categories may pre-fill the deck-authoring input, but only the
// human-edited final list is stored — no AI-provenance flag is kept here.
// A "regenerate suggestions" feature that re-clusters based on participant data
// would cross into deferred open-card-sort/AI-clustering territory and requires
// Auditor review before adding.
export type CardSortDeck = {
  id: string;
  analysisId: string;
  cards: string[];
  categories: string[];
  createdAt: number;
};

export type CardSortPlacement = {
  id: string;
  deckId: string;
  participantId: string;
  cardLabel: string;
  categoryLabel: string;
  createdAt: number;
};

const DECKS_KEY = "cognition.cardSortDecks.v1";
const PLACEMENTS_KEY = "cognition.cardSortPlacements.v1";

export function loadCardSortDecks(): CardSortDeck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CardSortDeck[];
  } catch {
    return [];
  }
}

export function saveCardSortDecks(items: CardSortDeck[]) {
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function loadCardSortPlacements(): CardSortPlacement[] {
  try {
    const raw = localStorage.getItem(PLACEMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CardSortPlacement[];
  } catch {
    return [];
  }
}

export function saveCardSortPlacements(items: CardSortPlacement[]) {
  try {
    localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function makeCardSortId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
