// Game Engine - Pure functions for Bluff card game logic

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARDS_PER_PLAYER = 10;

/**
 * Create a single standard 52-card deck
 */
function createSingleDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck;
}

/**
 * Create N decks based on player count (~1 deck per 5 players)
 */
function createDeck(playerCount) {
  const deckCount = Math.max(1, Math.ceil(playerCount / 5));
  let deck = [];
  for (let i = 0; i < deckCount; i++) {
    const singleDeck = createSingleDeck().map(card => ({
      ...card,
      id: `${card.id}_${i}` // Make IDs unique across decks
    }));
    deck = deck.concat(singleDeck);
  }
  return deck;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards evenly among players
 */
function dealCards(deck, playerCount) {
  const hands = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });
  return hands;
}

/**
 * Sort a hand by rank then suit for display
 */
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const rankDiff = RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
    if (rankDiff !== 0) return rankDiff;
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}

/**
 * Validate a play - check if the cards played actually match the declared rank
 */
function validatePlay(playedCards, declaredRank) {
  return playedCards.every(card => card.rank === declaredRank);
}

/**
 * Resolve a bluff call
 * Returns: { wasBluff: boolean, actualCards: Card[], pickUpPlayerId: string }
 */
function resolveBluff(lastPlay, callerId) {
  const wasBluff = !validatePlay(lastPlay.cards, lastPlay.declaredRank);
  return {
    wasBluff,
    actualCards: lastPlay.cards,
    pickUpPlayerId: wasBluff ? lastPlay.playerId : callerId,
  };
}

/**
 * Check if a player has won (no cards left)
 */
function checkWinner(players) {
  return players.find(p => p.cards.length === 0 && p.connected) || null;
}

/**
 * Get the number of decks for a given player count
 * Formula: enough for 10 per player + at least 1 extra deck for reserve
 */
function getDeckCount(playerCount) {
  return Math.max(2, Math.ceil((CARDS_PER_PLAYER * playerCount) / 52) + 1);
}

/**
 * Get total card count for a given player count
 */
function getTotalCards(playerCount) {
  return getDeckCount(playerCount) * 52;
}

module.exports = {
  SUITS,
  RANKS,
  CARDS_PER_PLAYER,
  createDeck,
  shuffleDeck,
  dealCards,
  sortHand,
  validatePlay,
  resolveBluff,
  checkWinner,
  getDeckCount,
  getTotalCards,
};
