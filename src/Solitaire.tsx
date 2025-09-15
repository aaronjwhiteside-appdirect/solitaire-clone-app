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

// Generate a full solitaire deck
function generateShuffledDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        suit,
        rank,
        faceUp: false,
        id: `${suit}${rank}`,
      });
    });
  });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Initial Solitaire board setup
function dealTableau(deck: Card[]): {
  tableau: Card[][];
  stock: Card[];
} {
  const tableau: Card[][] = [];
  let idx = 0;

  for (let col = 0; col < 7; col++) {
    tableau[col] = [];
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx], faceUp: row === col };
      tableau[col].push(card);
      idx++;
    }
  }
  const stock = deck.slice(idx);
  return { tableau, stock };
}


function Solitaire() {
  type GameState = {
    tableau: Card[][];
    stock: Card[];
    waste: Card[];
    foundations: Card[][];
  };
  const [gameState, setGameState] = useState<GameState>(() => {
    const deck = generateShuffledDeck();
    const { tableau, stock } = dealTableau(deck);
    return {
      tableau,
      stock,
      waste: [],
      foundations: [[], [], [], []],
    };
  });
  const [selected, setSelected] = useState<{
    colIdx: number;
    rowIdx: number;
  } | null>(null);

  // Helper to render a card visually, with click for moving tableau cards
  function renderCard(card: Card, colIdx: number, rowIdx: number, isTop: boolean) {
    const isSelected = selected?.colIdx === colIdx && selected?.rowIdx === rowIdx;
    return (
      <div
        key={card.id}
        onClick={() => {
          if (!card.faceUp) return;
          if (selected === null && isTop) {
            // select this card as moving-from
            setSelected({ colIdx, rowIdx });
          } else if (selected && (colIdx !== selected.colIdx || rowIdx !== selected.rowIdx)) {
            // move selected to here if move is legal
            // basic check: only move onto empty pile or alternating color, descending value
            const movingCards = gameState.tableau[selected.colIdx].slice(selected.rowIdx);
            const destPile = gameState.tableau[colIdx];
            const canDrop = canDropCard(movingCards[0], destPile);
            if (canDrop) {
              const newTableau = gameState.tableau.map((p, idx) => {
                if (idx === selected.colIdx) {
                  return p.slice(0, selected.rowIdx);
                } else if (idx === colIdx) {
                  return [...p, ...movingCards];
                } else {
                  return p;
                }
              });
              // Flip next card if any left in from-pile
              const justMovedFrom = newTableau[selected.colIdx];
              if (justMovedFrom.length && !justMovedFrom[justMovedFrom.length-1].faceUp) {
                justMovedFrom[justMovedFrom.length-1] = {
                  ...justMovedFrom[justMovedFrom.length-1],
                  faceUp: true,
                };
              }
              setGameState({ ...gameState, tableau: newTableau });
              setSelected(null);
              return;
            }
            setSelected(null); // invalid drop, just unselect
          } else {
            setSelected(null);
          }
        }}
        style={{
          width: 40,
          height: 60,
          borderRadius: 4,
          border: isSelected ? "3px solid orange" : "1px solid #333",
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
          outline: isSelected ? "2px solid orange" : undefined,
          cursor: card.faceUp ? (isTop ? "pointer" : "default") : undefined,
        }}
      >
        {card.faceUp ? `${card.rank}${card.suit}` : ""}
      </div>
    );
  }

  // Helper: can a card/group be dropped on target pile?
  function canDropCard(card: Card, destination: Card[]) {
    if (destination.length === 0) {
      return card.rank === "K"; // Only Kings on empty
    }
    const destCard = destination[destination.length - 1];
    // Alternating color
    const red = (suit: string) => suit === "♥" || suit === "♦";
    const isOpposite = red(card.suit) !== red(destCard.suit);
    // Descending
    const rankValue = (r: string) => RANKS.indexOf(r);
    return isOpposite && rankValue(card.rank) === rankValue(destCard.rank) - 1;
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Solitaire</h2>
      <div style={{ display: "flex", gap: 24, marginBottom: 32 }}>
        {/* Foundations */}
        <div style={{ display: "flex", gap: 12 }}>
          {gameState.foundations.map((pile, i) => (
            <div
              key={`foundation-${i}`}
              style={{
                width: 40,
                height: 60,
                border: "2px dashed #229",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f9f9f9",
              }}
            >
              {pile.length > 0 && (
                <div>{pile[pile.length - 1].rank}{pile[pile.length - 1].suit}</div>
              )}
            </div>
          ))}
        </div>
        {/* Stock & Waste */}
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
            }}
          >
            {gameState.stock.length ? "🂠" : ""}
          </div>
          {/* Waste */}
          <div style={{ width: 40, height: 60 }}>
            {gameState.waste.length > 0 && (
              <div>{gameState.waste[gameState.waste.length - 1].rank}{gameState.waste[gameState.waste.length - 1].suit}</div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Tableau */}
        {gameState.tableau.map((pile, colIdx) => (
          <div key={`tab-${colIdx}`} style={{ width: 40, minHeight: 240, position: "relative" }}>
            {pile.map((card, rowIdx) =>
              renderCard(card, colIdx, rowIdx, rowIdx === pile.length - 1 && card.faceUp)
            )}
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 12, color: "orange" }}>
          Selected card: {gameState.tableau[selected.colIdx][selected.rowIdx].rank}{gameState.tableau[selected.colIdx][selected.rowIdx].suit}
        </div>
      )}
    </div>
  );
}

export default Solitaire;
