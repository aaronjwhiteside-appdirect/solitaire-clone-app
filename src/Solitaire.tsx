import { useState } from "react";

// Card suits and ranks helper
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
];

type Card = {
  suit: string;
  rank: string;
  faceUp: boolean;
  id: string;
};

// Generate the Spider Solitaire deck: 104 cards, 2 suits by default, two full decks
function generateShuffledSpiderDeck(numSuits: number = 2): Card[] {
  const suits = SUITS.slice(0, numSuits);
  const deck: Card[] = [];
  for (let d = 0; d < 2; d++) {
    suits.forEach(suit => {
      RANKS.forEach(rank => {
        deck.push({
          suit,
          rank,
          faceUp: false,
          id: `${suit}${rank}-${d}-${Math.random().toString(36).substr(2,5)}` // ensure unique
        });
      });
    });
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}


// Initial Spider Solitaire board setup (10 columns)
function dealSpiderTableau(deck: Card[]): {
  tableau: Card[][];
  stock: Card[];
} {
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);
  let idx = 0;
  // First 4 columns get 6 cards, last 6 get 5 each (per classic Spider rules)
  for (let col = 0; col < 10; col++) {
    const numCards = col < 4 ? 6 : 5;
    for (let row = 0; row < numCards; row++, idx++) {
      tableau[col].push({ ...deck[idx], faceUp: false });
    }
    // Top card face up
    if (tableau[col].length > 0)
      tableau[col][tableau[col].length - 1].faceUp = true;
  }
  const stock = deck.slice(idx);
  return { tableau, stock };
}


function Solitaire() {
type GameState = {
  tableau: Card[][];
  stock: Card[];
  completedRuns: number;
  moves: number;
};
  function generateInitialState(): GameState {
    const deck = generateShuffledSpiderDeck(4); // 4-suit Spider
    const { tableau, stock } = dealSpiderTableau(deck);
    return {
      tableau,
      stock,
      completedRuns: 0,
      moves: 0
    };
  }
  const [gameState, setGameState] = useState<GameState>(generateInitialState);
  // [click-to-move selection state removed]
  const [dragState, setDragState] = useState<{ fromCol: number, fromRow: number }|null>(null);

  // Helper to render a card visually, with click for moving tableau cards
  function renderCard(card: Card, colIdx: number, rowIdx: number, isTop: boolean) {
    // Can drag any face-up card (regardless of face status of parents)
    const isDraggable = card.faceUp;
    return (
      <div
        key={card.id}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => {
          setDragState({ fromCol: colIdx, fromRow: rowIdx });
          e.dataTransfer.effectAllowed = "move";
        } : undefined}
        onDragEnd={() => setDragState(null)}
        style={{
          width: 40,
          height: 60,
          borderRadius: 4,
          border: "1px solid #333",
          background: card.faceUp ? "#fff" : "#bbb",
          color: card.suit === "♥" || card.suit === "♦" ? "red" : "black",
          marginTop: -48,
          boxShadow: card.faceUp ? "2px 2px 4px rgba(0,0,0,0.2)" : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "1.2rem",
          position: "relative",
          cursor: card.faceUp && isDraggable ? "grab" : "default",
          opacity: dragState && dragState.fromCol === colIdx && dragState.fromRow === rowIdx ? 0.5 : 1,
        }}
        // Allow focusing with keyboard for accessibility (optional)
        tabIndex={isDraggable ? 0 : undefined}
        title={isDraggable ? "Drag this card and all below it as a group" : undefined}
      >
        {card.faceUp ? `${card.rank}${card.suit}` : ""}
      </div>
    );
  }

  // Helper: is group of cards a valid contiguous, same-suit descending Spider run (all face up)?
  function isValidSpiderRun(cards: Card[]): boolean {
    if (cards.length < 2) return true;
    for (let i = 0; i < cards.length - 1; i++) {
      if (!cards[i].faceUp || !cards[i+1].faceUp) return false;
      if (cards[i].suit !== cards[i+1].suit) return false;
      if (RANKS.indexOf(cards[i].rank) !== RANKS.indexOf(cards[i+1].rank) + 1) return false;
    }
    return true;
  }

  // Move cards within tableau (Spider: run drag only if valid run or single card; auto-clear K-A)
  function doTableauMove(fromCol: number, fromRow: number, toCol: number) {
    const movingCards = gameState.tableau[fromCol].slice(fromRow);
    // Only allow move if single card or valid in-suit descending run
    if (movingCards.length === 1 || isValidSpiderRun(movingCards)) {
      let newTableau = gameState.tableau.map((p, idx) => {
        if (idx === fromCol) {
          return p.slice(0, fromRow);
        } else if (idx === toCol) {
          return [...p, ...movingCards];
        } else {
          return p;
        }
      });
      // Flip next card if any left in original column
      const justMovedFrom = newTableau[fromCol];
      if (justMovedFrom.length && !justMovedFrom[justMovedFrom.length-1].faceUp) {
        justMovedFrom[justMovedFrom.length-1] = {
          ...justMovedFrom[justMovedFrom.length-1], faceUp: true };
      }
      // Auto-clear K-A in-suit and all face-up runs after every move
      let completedRuns = gameState.completedRuns;
      for (let col = 0; col < 10; col++) {
        const pile = newTableau[col];
        if (pile.length >= 13) {
          const last13 = pile.slice(-13);
          if (
            last13.every(card => card.suit === last13[0].suit && card.faceUp) &&
            last13.map(card => card.rank).join(",") === RANKS.slice().reverse().join(",")
          ) {
            // Remove the sequence
            newTableau[col] = pile.slice(0, pile.length - 13);
            completedRuns += 1;
          }
        }
      }
      setGameState({ ...gameState, tableau: newTableau, completedRuns, moves: gameState.moves + 1 });
    }
  }

  // Helper: can a card/group be dropped on target pile (Spider)
  function canDropCard(card: Card, destination: Card[]) {
    if (destination.length === 0) {
      return true; // Allow any group/card to empty spot
    }
    const destCard = destination[destination.length - 1];
    const rankValue = (r: string) => RANKS.indexOf(r);
    // Spider: Only allow drop if card is one lower in rank and same suit as destination
    return rankValue(card.rank) === rankValue(destCard.rank) - 1 && card.suit === destCard.suit;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2>Solitaire</h2>
        <button onClick={() => setGameState(generateInitialState())} style={{ fontSize: 16, padding: "4px 14px", borderRadius: 4, background: "#229", color: "#fff", border: "none", cursor: "pointer" }}>Restart Game</button>
      </div>
      <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>
          Completed Stacks: {gameState.completedRuns} &nbsp; Moves: {gameState.moves}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Stock */}
          <div
            style={{
              width: 40,
              height: 60,
              border: "2px solid #333",
              borderRadius: 4,
              background: gameState.stock.length ? "#229" : "#bbb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: gameState.stock.length ? "pointer" : "not-allowed",
              userSelect: "none",
            }}
            title="Deal one card on top of each stack (if all tableau columns are non-empty)"
            // Stock deal logic will be updated in spider-deal step!
            onClick={() => {
              // Only allow spider-style deal if ALL cols non-empty
              if (!gameState.stock.length) return;
              if (gameState.tableau.some(col => col.length === 0)) return;
              let stock = [...gameState.stock];
              const tableau = gameState.tableau.map(col => {
                if (stock.length > 0) {
                  const card = { ...stock.pop()!, faceUp: true };
                  return [...col, card];
                } else {
                  return col;
                }
              });
              setGameState({
                ...gameState,
                tableau,
                stock,
                moves: gameState.moves + 1
              });
            }}
          >
            gameState.stock.length ? (
  <span style={{ fontSize: 38, lineHeight: 1, display: "block" }}>🂠</span>
) : ""
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {/* Tableau: 10 columns */}
        {gameState.tableau.map((pile, colIdx) => (
          <div
            key={`tab-${colIdx}`}
            style={{ width: 40, minHeight: 300, position: "relative" }}
            onDragOver={e => {
              if (dragState) {
                e.preventDefault();
              }
            }}
            onDrop={dragState ? (e) => {
              e.preventDefault();
              // Drop logic: move if legal (Rules to be handled in next todos)
              const movingCards = gameState.tableau[dragState.fromCol].slice(dragState.fromRow);
              const destPile = gameState.tableau[colIdx];
              if (canDropCard(movingCards[0], destPile)) {
                doTableauMove(dragState.fromCol, dragState.fromRow, colIdx);
                setDragState(null);
              }
            } : undefined}
          >
            {pile.map((card, rowIdx) =>
              renderCard(card, colIdx, rowIdx, rowIdx === pile.length - 1 && card.faceUp)
            )}
          </div>
        ))}
      </div>
      {/* Selection banner removed for drag-and-drop-only play */}
    </div>
  );
}

export default Solitaire;
