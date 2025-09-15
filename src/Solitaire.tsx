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
  function generateInitialState(): GameState {
    const deck = generateShuffledDeck();
    const { tableau, stock } = dealTableau(deck);
    return {
      tableau,
      stock,
      waste: [],
      foundations: [[], [], [], []],
    };
  }
  const [gameState, setGameState] = useState<GameState>(generateInitialState);
  // [click-to-move selection state removed]
  const [dragState, setDragState] = useState<{ fromCol: number, fromRow: number }|null>(null);

  // Helper to render a card visually, with click for moving tableau cards
  function renderCard(card: Card, colIdx: number, rowIdx: number, isTop: boolean) {
    const isDraggable = card.faceUp && isTop;
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
          cursor: card.faceUp ? (isTop ? "pointer" : "default") : undefined,
        }}
      >
        {card.faceUp ? `${card.rank}${card.suit}` : ""}
      </div>
    );
  }

  // Move cards within tableau
  function doTableauMove(fromCol: number, fromRow: number, toCol: number) {
    const movingCards = gameState.tableau[fromCol].slice(fromRow);
    const newTableau = gameState.tableau.map((p, idx) => {
      if (idx === fromCol) {
        return p.slice(0, fromRow);
      } else if (idx === toCol) {
        return [...p, ...movingCards];
      } else {
        return p;
      }
    });
    // Flip next card if any left
    const justMovedFrom = newTableau[fromCol];
    if (justMovedFrom.length && !justMovedFrom[justMovedFrom.length-1].faceUp) {
      justMovedFrom[justMovedFrom.length-1] = {
        ...justMovedFrom[justMovedFrom.length-1], faceUp: true };
    }
    setGameState({ ...gameState, tableau: newTableau });
  }

  // Helper: can a card/group be dropped on target pile?
  function canDropCard(card: Card, destination: Card[]) {
    if (destination.length === 0) {
      return card.rank === "K"; // Only Kings on empty
    }
    const destCard = destination[destination.length - 1];
    const rankValue = (r: string) => RANKS.indexOf(r);
    // Allow stacking if card value is less than dest value (any difference), suits/colors ignored
    return rankValue(card.rank) < rankValue(destCard.rank);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2>Solitaire</h2>
        <button onClick={() => setGameState(generateInitialState())} style={{ fontSize: 16, padding: "4px 14px", borderRadius: 4, background: "#229", color: "#fff", border: "none", cursor: "pointer" }}>Restart Game</button>
      </div>
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
              cursor: (gameState.stock.length || gameState.waste.length) ? "pointer" : "not-allowed",
              userSelect: "none",
            }}
            onClick={() => {
              if (gameState.stock.length > 0) {
                // Draw from stock to waste
                const stock = [...gameState.stock];
                const cardDrawn = { ...stock.pop()!, faceUp: true };
                setGameState({
                  ...gameState,
                  stock,
                  waste: [...gameState.waste, cardDrawn]
                });
              } else if (gameState.waste.length > 0) {
                // Recycle waste to stock (face down)
                const stock = gameState.waste.map(c => ({ ...c, faceUp: false })).reverse();
                setGameState({
                  ...gameState,
                  stock,
                  waste: []
                });
              }
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
          <div
            key={`tab-${colIdx}`}
            style={{ width: 40, minHeight: 240, position: "relative" }}
            onDragOver={e => {
              if (dragState) {
                e.preventDefault();
              }
            }}
            onDrop={dragState ? (e) => {
              e.preventDefault();
              // Drop logic: move if legal
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
