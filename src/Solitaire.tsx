import React, { useState } from "react";

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
  const [gameState, setGameState] = useState(() => {
    const deck = generateShuffledDeck();
    const { tableau, stock } = dealTableau(deck);
    return {
      tableau,
      stock,
      waste: [],
      foundations: [[], [], [], []] as Card[][],
    };
  });

  // Helper to render a card visually
  function renderCard(card: Card) {
    return (
      <div
        key={card.id}
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
        }}
      >
        {card.faceUp ? `${card.rank}${card.suit}` : ""}
      </div>
    );
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
              {pile.length > 0 && renderCard(pile[pile.length - 1])}
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
            {gameState.waste.length > 0 &&
              renderCard(gameState.waste[gameState.waste.length - 1])}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Tableau */}
        {gameState.tableau.map((pile, colIdx) => (
          <div key={`tab-${colIdx}`} style={{ width: 40, minHeight: 240, position: "relative" }}>
            {pile.map((card, rowIdx) => renderCard(card))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Solitaire;
