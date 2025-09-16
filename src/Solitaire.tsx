// (imports of useState etc. handled below)
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
  // --- Game Move Logic ---
  // Detect if any move is possible from the current board state
  function isAnyMovePossible(state: GameState): boolean {
    for (let col = 0; col < 10; col++) {
      const pile = state.tableau[col];
      if (pile.length >= 13) {
        const last13 = pile.slice(-13);
        if (
          last13.every(card => card.suit === last13[0].suit && card.faceUp) &&
          last13.map(card => card.rank).join(",") === RANKS.slice().reverse().join(",")
        ) {
          return true;
        }
      }
    }
    for (let fromCol = 0; fromCol < 10; fromCol++) {
      const pile = state.tableau[fromCol];
      for (let fromRow = 0; fromRow < pile.length; fromRow++) {
        if (!pile[fromRow].faceUp) continue;
        const movingCards = pile.slice(fromRow);
        if (movingCards.length > 1 && !isValidSpiderRun(movingCards)) continue;
        for (let toCol = 0; toCol < 10; toCol++) {
          if (toCol === fromCol) continue;
          const dest = state.tableau[toCol];
          if (canDropCard(movingCards[0], dest)) {
            return true;
          }
        }
      }
    }
    if (state.stock.length && state.tableau.every(col => col.length > 0)) {
      return true;
    }
    return false;
  }

  function autoPlayNextMove() {
    setGameState(currentGameState => {
      // 1. Auto-clear in-suit K-A run
      for (let col = 0; col < 10; col++) {
        const pile = currentGameState.tableau[col];
        if (pile.length >= 13) {
          const last13 = pile.slice(-13);
          if (
            last13.every(card => card.suit === last13[0].suit && card.faceUp) &&
            last13.map(card => card.rank).join(",") === RANKS.slice().reverse().join(",")
          ) {
            const newTableau = currentGameState.tableau.map((p, i) => i === col ? p.slice(0, p.length - 13) : p);
            const nextState = { ...currentGameState, tableau: newTableau, completedRuns: currentGameState.completedRuns + 1, moves: currentGameState.moves + 1 };
            setHistory(prev => [...prev, currentGameState]);
            setTimeout(() => {
              if (!isAnyMovePossible(nextState)) setGameIsOver(true);
            }, 0);
            return nextState;
          }
        }
      }
      // 2. Tableau move
      for (let fromCol = 0; fromCol < 10; fromCol++) {
        const pile = currentGameState.tableau[fromCol];
        for (let fromRow = 0; fromRow < pile.length; fromRow++) {
          if (!pile[fromRow].faceUp) continue;
          const movingCards = pile.slice(fromRow);
          if (movingCards.length > 1 && !isValidSpiderRun(movingCards)) continue;
          for (let toCol = 0; toCol < 10; toCol++) {
            if (toCol === fromCol) continue;
            const dest = currentGameState.tableau[toCol];
            if (canDropCard(movingCards[0], dest)) {
              const newTableau = currentGameState.tableau.map((p, idx) => {
                if (idx === fromCol) {
                  return p.slice(0, fromRow);
                } else if (idx === toCol) {
                  return [...p, ...movingCards];
                } else {
                  return p;
                }
              });
              const justMovedFrom = newTableau[fromCol];
              if (justMovedFrom.length && !justMovedFrom[justMovedFrom.length-1].faceUp) {
                justMovedFrom[justMovedFrom.length-1] = {
                  ...justMovedFrom[justMovedFrom.length-1], faceUp: true };
              }
              let completedRuns = currentGameState.completedRuns;
              for (let col2 = 0; col2 < 10; col2++) {
                const pile2 = newTableau[col2];
                if (pile2.length >= 13) {
                  const last13 = pile2.slice(-13);
                  if (
                    last13.every(card => card.suit === last13[0].suit && card.faceUp) &&
                    last13.map(card => card.rank).join(",") === RANKS.slice().reverse().join(",")
                  ) {
                    newTableau[col2] = pile2.slice(0, pile2.length - 13);
                    completedRuns += 1;
                  }
                }
              }
              const nextState = { ...currentGameState, tableau: newTableau, completedRuns, moves: currentGameState.moves + 1 };
              setHistory(prev => [...prev, currentGameState]);
              setTimeout(() => {
                if (!isAnyMovePossible(nextState)) setGameIsOver(true);
              }, 0);
              return nextState;
            }
          }
        }
      }
      // 3. Stock deal
      if (currentGameState.stock.length && currentGameState.tableau.every(col => col.length > 0)) {
        let stock = [...currentGameState.stock];
        const tableau = currentGameState.tableau.map(col => {
          if (stock.length > 0) {
            const card = { ...stock.pop()!, faceUp: true };
            return [...col, card];
          } else {
            return col;
          }
        });
        const nextState = {
          ...currentGameState,
          tableau,
          stock,
          moves: currentGameState.moves + 1
        };
        setHistory(prev => [...prev, currentGameState]);
        setTimeout(() => {
          if (!isAnyMovePossible(nextState)) setGameIsOver(true);
        }, 0);
        return nextState;
      }
      // 4. No moves possible
      setTimeout(() => setGameIsOver(true), 0);
      return currentGameState;
    });
  }
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
  // State: gameState, history, and a game-over flag
  const [gameState, setGameState] = useState<GameState>(generateInitialState);
  const [history, setHistory] = useState<GameState[]>([]);
  const [gameIsOver, setGameIsOver] = useState<boolean>(false);
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
      // Push current state to history, then update
      setHistory(prev => [...prev, gameState]);
      const nextState = { ...gameState, tableau: newTableau, completedRuns, moves: gameState.moves + 1 };
      setGameState(nextState);
      // End detection
      if (!isAnyMovePossible(nextState)) setGameIsOver(true);
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

  // Undo handler
  function handleUndo() {
    if (history.length > 0) {
      const prevHistory = [...history];
      const lastState = prevHistory.pop()!;
      setGameState(lastState);
      setHistory(prevHistory);
      setGameIsOver(false); // just in case user brings back a playable board
    }
  }

  // On move or new game, check if game is over (board may be unplayable from the start)
  // UseEffect would be best, but we do on each relevant state update here anyway

  function handleRestart() {
    setHistory([]);
    setGameState(generateInitialState());
    setGameIsOver(false);
  }

  // Try also in autoPlay and stock logic!

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2>Solitaire</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={autoPlayNextMove} style={{ fontSize: 16, padding: "4px 14px", borderRadius: 4, background: !gameIsOver ? "#229" : "#888", color: "#fff", border: "none", cursor: !gameIsOver ? "pointer" : "not-allowed" }} disabled={gameIsOver}>Auto Play</button>
          <button onClick={handleUndo} style={{ fontSize: 16, padding: "4px 14px", borderRadius: 4, background: history.length && !gameIsOver ? "#229" : "#888", color: "#fff", border: "none", cursor: history.length && !gameIsOver ? "pointer" : "not-allowed" }} disabled={history.length === 0 || gameIsOver}>Undo</button>
          <button onClick={handleRestart} style={{ fontSize: 16, padding: "4px 14px", borderRadius: 4, background: "#229", color: "#fff", border: "none", cursor: "pointer" }}>Restart Game</button>
        </div>
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
              cursor: gameState.stock.length && !gameIsOver ? "pointer" : "not-allowed",
              userSelect: "none",
            }}
            title="Deal one card on top of each stack (if all tableau columns are non-empty)"
            // Stock deal logic will be updated in spider-deal step!
            onClick={() => {
              // Only allow spider-style deal if ALL cols non-empty
              if (gameIsOver) return;
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
              setHistory(prev => [...prev, gameState]);
              const nextState = {
                ...gameState,
                tableau,
                stock,
                moves: gameState.moves + 1
              };
              setGameState(nextState);
              if (!isAnyMovePossible(nextState)) setGameIsOver(true);
            }}
          >
            {gameState.stock.length ? (
              <span style={{ fontSize: 38, lineHeight: 1, display: "block" }}>🂠</span>
            ) : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {/* Tableau: 10 columns */}
        {gameState.tableau.map((pile, colIdx) => (
          <div
            key={`tab-${colIdx}`}
            style={{ width: 40, minHeight: 300, position: "relative", opacity: gameIsOver ? 0.6 : 1 }}
            onDragOver={e => {
              if (dragState && !gameIsOver) {
                e.preventDefault();
              }
            }}
            onDrop={dragState && !gameIsOver ? (e) => {
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
      {/* Game over overlay */}
      {gameIsOver && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1000,
          background: "rgba(80,80,80,0.48)", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: '#222', color: 'white', padding: '2em 3em', borderRadius: 8, textAlign: 'center' }}>
            <h2 style={{marginBottom: 12}}>No more moves!</h2>
            <p style={{marginBottom: 12}}>There are no further moves available. The round is over.</p>
            <button onClick={handleRestart} style={{ fontSize: 18, padding: "8px 28px", borderRadius: 5, background: "#337", color: "#fff", border: "none", cursor: "pointer" }}>Start Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Solitaire;
