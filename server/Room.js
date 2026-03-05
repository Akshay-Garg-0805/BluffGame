// Room class - manages game state for a single room

const { createDeck, shuffleDeck, sortHand, resolveBluff, getDeckCount, getTotalCards, RANKS, CARDS_PER_PLAYER } = require('./gameEngine');

class Room {
  constructor(id, host) {
    this.id = id;
    this.players = [host];
    this.hostId = host.id;
    this.status = 'lobby'; // lobby | playing | finished
    this.currentTurnIndex = 0;
    this.currentRank = null; // First player picks this each round
    this.roundStarter = 0; // Index of player who starts the round (picks rank)
    this.centerPile = [];
    this.reserveDeck = []; // Extra cards for drawing on pass
    this.lastPlay = null;
    this.canCallBluff = false;
    this.winner = null;
    this.gameLog = [];
    this.createdAt = Date.now();
  }

  addPlayer(player) {
    if (this.status !== 'lobby') return { error: 'Game already in progress' };
    if (this.players.find(p => p.id === player.id)) return { error: 'Already in room' };
    this.players.push(player);
    return { success: true };
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx === -1) return;

    if (this.status === 'lobby') {
      this.players.splice(idx, 1);
      if (this.hostId === playerId && this.players.length > 0) {
        this.hostId = this.players[0].id;
      }
    } else {
      this.players[idx].connected = false;
      this.addLog(`${this.players[idx].name} disconnected`);
      if (this.currentTurnIndex === idx) {
        this.nextTurn();
      }
    }
  }

  reconnectPlayer(playerId, newSocketId) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.connected = true;
      player.socketId = newSocketId;
    }
  }

  getPlayerCount() {
    return this.players.length;
  }

  getDeckInfo() {
    const count = this.getPlayerCount();
    const deckCount = getDeckCount(count);
    const totalCards = deckCount * 52;
    const dealtCards = CARDS_PER_PLAYER * count;
    const reserveCards = totalCards - dealtCards;
    return {
      deckCount,
      totalCards,
      cardsPerPlayer: CARDS_PER_PLAYER,
      reserveCards,
    };
  }

  startGame() {
    if (this.players.length < 3) return { error: 'Need at least 3 players' };
    if (this.status !== 'lobby') return { error: 'Game already started' };

    const playerCount = this.players.length;
    const deckCount = getDeckCount(playerCount);

    // Create all decks, shuffle together into one big pool
    let allCards = [];
    for (let d = 0; d < deckCount; d++) {
      const singleDeck = shuffleDeck(createDeck(1));
      // Ensure unique IDs across decks
      singleDeck.forEach(card => {
        allCards.push({ ...card, id: `${card.id}_d${d}` });
      });
    }
    allCards = shuffleDeck(allCards); // Final shuffle of the entire pool

    // Deal 10 cards per player from the pool
    this.players.forEach((player, index) => {
      player.cards = sortHand(allCards.splice(0, CARDS_PER_PLAYER));
      player.connected = true;
    });

    // Remaining cards = reserve deck
    this.reserveDeck = allCards;

    this.status = 'playing';
    this.currentTurnIndex = 0;
    this.roundStarter = 0;
    this.currentRank = null;
    this.centerPile = [];
    this.lastPlay = null;
    this.canCallBluff = false;
    this.winner = null;

    const totalCards = deckCount * 52;
    this.addLog(`\ud83c\udccf Game started! Using ${deckCount} deck(s) (${totalCards} total cards).`);
    this.addLog(`\ud83d\udce6 ${CARDS_PER_PLAYER} cards dealt to each of ${playerCount} players. Each card is unique \u2014 no duplicates between players.`);
    this.addLog(`\ud83c\udfb4 Reserve deck: ${this.reserveDeck.length} cards kept aside for pass draws.`);
    this.addLog(`${this.players[0].name} picks the rank to play.`);

    return { success: true };
  }

  setRank(playerId, rank) {
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx !== this.roundStarter) return { error: 'Only the round starter can pick the rank' };
    if (playerIdx !== this.currentTurnIndex) return { error: 'Not your turn' };
    if (this.currentRank !== null) return { error: 'Rank already set for this round' };
    if (!RANKS.includes(rank)) return { error: 'Invalid rank' };

    this.currentRank = rank;
    this.addLog(`${this.players[playerIdx].name} chose rank: ${rank}`);
    return { success: true };
  }

  playCards(playerId, cardIds) {
    if (this.status !== 'playing') return { error: 'Game not in progress' };
    if (this.currentRank === null) return { error: 'Rank not set yet' };

    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx === -1) return { error: 'Player not found' };
    if (playerIdx !== this.currentTurnIndex) return { error: 'Not your turn' };
    if (cardIds.length === 0) return { error: 'Must play at least one card' };

    const player = this.players[playerIdx];

    const playedCards = [];
    for (const cardId of cardIds) {
      const card = player.cards.find(c => c.id === cardId);
      if (!card) return { error: `Card ${cardId} not in your hand` };
      playedCards.push(card);
    }

    player.cards = player.cards.filter(c => !cardIds.includes(c.id));
    this.centerPile.push(...playedCards);

    this.lastPlay = {
      playerId,
      playerName: player.name,
      cards: playedCards,
      declaredRank: this.currentRank,
      declaredCount: playedCards.length,
    };

    // After playing, bluff can be called by the NEXT player on their turn
    this.canCallBluff = true;

    this.addLog(`${player.name} played ${playedCards.length} card(s) as ${this.currentRank}`);

    if (player.cards.length === 0) {
      this.addLog(`${player.name} has no cards left!`);
    }

    // Auto-advance turn after playing
    this.advanceTurn();

    return {
      success: true,
      play: {
        playerId,
        playerName: player.name,
        declaredRank: this.currentRank,
        declaredCount: playedCards.length,
        playerCardsLeft: player.cards.length,
      },
    };
  }

  callBluff(callerId) {
    if (!this.canCallBluff) return { error: 'No play to call bluff on' };
    if (!this.lastPlay) return { error: 'No play to call bluff on' };
    if (this.lastPlay.playerId === callerId) return { error: 'Cannot call bluff on yourself' };

    // Caller must be the current player (it's their turn)
    const callerIdx = this.players.findIndex(p => p.id === callerId);
    if (callerIdx !== this.currentTurnIndex) return { error: 'You can only call bluff on your turn' };

    const caller = this.players.find(p => p.id === callerId);
    if (!caller) return { error: 'Player not found' };

    const result = resolveBluff(this.lastPlay, callerId);

    const pickUpPlayer = this.players.find(p => p.id === result.pickUpPlayerId);
    pickUpPlayer.cards.push(...this.centerPile);
    pickUpPlayer.cards = sortHand(pickUpPlayer.cards);

    const pileSize = this.centerPile.length;
    this.centerPile = [];
    this.canCallBluff = false;

    if (result.wasBluff) {
      this.addLog(`🚨 ${caller.name} called BLUFF on ${this.lastPlay.playerName} — CORRECT! ${this.lastPlay.playerName} picks up ${pileSize} cards!`);
    } else {
      this.addLog(`❌ ${caller.name} called BLUFF on ${this.lastPlay.playerName} — WRONG! ${caller.name} picks up ${pileSize} cards!`);
    }

    // After bluff: picker starts new round
    const pickerIdx = this.players.findIndex(p => p.id === result.pickUpPlayerId);
    this.currentTurnIndex = pickerIdx;
    this.roundStarter = pickerIdx;
    this.currentRank = null;
    const savedLastPlay = this.lastPlay;
    this.lastPlay = null;

    this.addLog(`${pickUpPlayer.name} starts a new round and picks the rank.`);

    return {
      success: true,
      wasBluff: result.wasBluff,
      actualCards: result.actualCards,
      callerName: caller.name,
      blufferName: savedLastPlay?.playerName || 'Unknown',
      pickUpPlayerName: pickUpPlayer.name,
      pickUpPlayerId: result.pickUpPlayerId,
      pileSize,
      newTurnIndex: this.currentTurnIndex,
      newRoundStarter: this.roundStarter,
    };
  }

  advanceTurn() {
    let next = (this.currentTurnIndex + 1) % this.players.length;
    let attempts = 0;
    while (!this.players[next].connected && attempts < this.players.length) {
      next = (next + 1) % this.players.length;
      attempts++;
    }
    this.currentTurnIndex = next;

    // Check if turn cycled back to the last player who played
    this.checkCycleBack();
  }

  checkCycleBack() {
    // If the turn lands on the player whose card is on top (lastPlay),
    // it means everyone else passed — start a new round
    if (this.lastPlay && this.players[this.currentTurnIndex]?.id === this.lastPlay.playerId) {
      const player = this.players[this.currentTurnIndex];

      // Check win first: if that player has 0 cards and nobody called bluff
      if (player.cards.length === 0) {
        this.winner = player;
        this.status = 'finished';
        this.addLog(`\ud83c\udfc6 ${player.name} wins the game!`);
        return;
      }

      this.addLog(`\u21bb Everyone passed! ${player.name} starts a new round and picks a new rank.`);
      this.roundStarter = this.currentTurnIndex;
      this.currentRank = null;
      this.canCallBluff = false;
      this.lastPlay = null;
    }
  }

  nextTurn() {
    this.canCallBluff = false;
    this.advanceTurn();
  }

  pass(playerId) {
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx !== this.currentTurnIndex) return { error: 'Not your turn' };
    if (this.currentRank === null) return { error: 'You must pick a rank first (you are the round starter)' };
    if (this.reserveDeck.length === 0) return { error: 'Reserve deck is empty \u2014 you cannot pass!' };

    const player = this.players[playerIdx];

    // Draw a card from reserve deck
    const drawnCard = this.reserveDeck.pop();
    player.cards.push(drawnCard);
    player.cards = sortHand(player.cards);
    this.addLog(`${player.name} passed and drew a card. (${this.reserveDeck.length} left in reserve)`);

    // Passing does NOT clear the last play \u2014 next player can still call bluff
    this.advanceTurn();

    return {
      success: true,
      drawnCard,
      reserveLeft: this.reserveDeck.length,
    };
  }

  // Check if previous player's last card was played and no bluff was called
  checkWinAfterTurn() {
    if (this.lastPlay) {
      const lastPlayer = this.players.find(p => p.id === this.lastPlay.playerId);
      if (lastPlayer && lastPlayer.cards.length === 0) {
        this.winner = lastPlayer;
        this.status = 'finished';
        this.addLog(`🏆 ${lastPlayer.name} wins the game!`);
        return { gameOver: true, winner: lastPlayer };
      }
    }
    return { gameOver: false };
  }

  addLog(message) {
    this.gameLog.push({
      message,
      timestamp: Date.now(),
    });
    if (this.gameLog.length > 100) {
      this.gameLog = this.gameLog.slice(-100);
    }
  }

  getStateForPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return {
      roomId: this.id,
      status: this.status,
      hostId: this.hostId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        cardCount: p.cards ? p.cards.length : 0,
        connected: p.connected,
        isHost: p.id === this.hostId,
      })),
      myCards: player ? player.cards : [],
      currentTurnIndex: this.currentTurnIndex,
      currentRank: this.currentRank,
      roundStarter: this.roundStarter,
      centerPileCount: this.centerPile.length,
      lastPlay: this.lastPlay ? {
        playerId: this.lastPlay.playerId,
        playerName: this.lastPlay.playerName,
        declaredRank: this.lastPlay.declaredRank,
        declaredCount: this.lastPlay.declaredCount,
      } : null,
      canCallBluff: this.canCallBluff,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      gameLog: this.gameLog.slice(-20),
      deckInfo: this.getDeckInfo(),
      reserveDeckCount: this.reserveDeck.length,
    };
  }

  getLobbyState() {
    return {
      roomId: this.id,
      status: this.status,
      hostId: this.hostId,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.id === this.hostId,
      })),
      deckInfo: this.getDeckInfo(),
    };
  }
}

module.exports = Room;
