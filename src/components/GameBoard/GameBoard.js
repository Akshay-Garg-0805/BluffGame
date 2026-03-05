'use client';
import { useState, useMemo } from 'react';
import Card from '@/components/Card/Card';
import { RANKS, RANK_NAMES } from '@/lib/constants';
import styles from './GameBoard.module.css';

export default function GameBoard({ state, playerId, bluffResult, onSetRank, onPlayCards, onCallBluff, onPass }) {
  const [selectedCards, setSelectedCards] = useState([]);

  const myIndex = state.players.findIndex(p => p.id === playerId);
  const isMyTurn = state.currentTurnIndex === myIndex;
  const isRoundStarter = state.roundStarter === myIndex && state.currentRank === null;
  const currentPlayer = state.players[state.currentTurnIndex];
  const needsRank = state.currentRank === null;

  // Can I call bluff? Only on my turn, and only if someone else played last
  const canCallBluff = isMyTurn && state.canCallBluff && state.lastPlay && state.lastPlay.playerId !== playerId;

  // Arrange other players around the "table"
  const otherPlayers = useMemo(() => {
    const others = [];
    for (let i = 1; i < state.players.length; i++) {
      const idx = (myIndex + i) % state.players.length;
      others.push({ ...state.players[idx], index: idx });
    }
    return others;
  }, [state.players, myIndex]);

  const toggleCard = (cardId) => {
    if (!isMyTurn || needsRank) return;
    setSelectedCards(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    onPlayCards(selectedCards);
    setSelectedCards([]);
  };

  return (
    <div className={styles.board}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.roomBadge}>🃏 Room: {state.roomId}</div>
        <div className={styles.turnInfo}>
          {needsRank
            ? `${currentPlayer?.name} picks the rank...`
            : `Playing: ${RANK_NAMES[state.currentRank] || state.currentRank}s`
          }
        </div>
        <div className={styles.badges}>
          <div className={styles.pileBadge}>Pile: {state.centerPileCount}</div>
          <div className={styles.reserveBadge}>Reserve: {state.reserveDeckCount ?? '—'}</div>
        </div>
      </div>

      {/* Other players area */}
      <div className={styles.otherPlayers}>
        {otherPlayers.map((player) => (
          <div
            key={player.id}
            className={`${styles.playerSlot} ${state.currentTurnIndex === player.index ? styles.activeTurn : ''} ${!player.connected ? styles.disconnected : ''}`}
          >
            <div className={styles.slotAvatar}>
              {player.avatar}
              {state.currentTurnIndex === player.index && (
                <div className={styles.turnRing}></div>
              )}
            </div>
            <div className={styles.slotInfo}>
              <span className={styles.slotName}>{player.name}</span>
              <span className={styles.slotCards}>{player.cardCount} cards</span>
            </div>
          </div>
        ))}
      </div>

      {/* Center pile */}
      <div className={styles.centerArea}>
        <div className={styles.pile}>
          {state.centerPileCount > 0 && (
            <>
              <div className={styles.pileStack}>
                {Array.from({ length: Math.min(state.centerPileCount, 5) }, (_, i) => (
                  <div key={i} className={styles.pileCard} style={{
                    transform: `rotate(${(i - 2) * 8}deg) translateX(${(i - 2) * 3}px)`,
                    zIndex: i,
                  }}>
                    <Card faceDown small />
                  </div>
                ))}
              </div>
              <div className={styles.pileCount}>{state.centerPileCount} cards</div>
            </>
          )}
          {state.centerPileCount === 0 && (
            <div className={styles.emptyPile}>
              <span>Empty Pile</span>
            </div>
          )}
        </div>

        {/* Last play info */}
        {state.lastPlay && (
          <div className={styles.lastPlay}>
            <span className={styles.lastPlayText}>
              {state.lastPlay.playerName} played {state.lastPlay.declaredCount} {RANK_NAMES[state.lastPlay.declaredRank] || state.lastPlay.declaredRank}(s)
            </span>
          </div>
        )}

        {/* Bluff Result overlay */}
        {bluffResult && (
          <div className={styles.bluffOverlay}>
            <div className={`${styles.bluffModal} ${bluffResult.wasBluff ? styles.bluffCorrect : styles.bluffWrong}`}>
              <div className={styles.bluffEmoji}>
                {bluffResult.wasBluff ? '🚨' : '❌'}
              </div>
              <h3>{bluffResult.wasBluff ? 'BLUFF CAUGHT!' : 'WRONG CALL!'}</h3>
              <p>{bluffResult.pickUpPlayerName} picks up {bluffResult.pileSize} cards!</p>
              <div className={styles.revealCards}>
                {bluffResult.actualCards.map((card) => (
                  <Card key={card.id} card={card} small />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* My turn controls */}
      {isMyTurn && (
        <div className={styles.controls}>
          {/* Step 1: Round starter picks rank */}
          {isRoundStarter && needsRank ? (
            <div className={styles.rankPicker}>
              <p className={styles.controlLabel}>Choose the rank to play:</p>
              <div className={styles.rankGrid}>
                {RANKS.map((rank) => (
                  <button
                    key={rank}
                    className={styles.rankBtn}
                    onClick={() => onSetRank(rank)}
                  >
                    {rank}
                  </button>
                ))}
              </div>
            </div>
          ) : !needsRank ? (
            /* Step 2: It's my turn — I can Call Bluff OR Play Cards OR Pass */
            <div className={styles.turnActions}>
              {/* Call Bluff option (if available) */}
              {canCallBluff && (
                <div className={styles.bluffSection}>
                  <p className={styles.bluffHint}>
                    {state.lastPlay.playerName} claimed {state.lastPlay.declaredCount} {RANK_NAMES[state.lastPlay.declaredRank] || state.lastPlay.declaredRank}(s). Bluff?
                  </p>
                  <button className={styles.bluffBtn} onClick={onCallBluff}>
                    🚨 CALL BLUFF!
                  </button>
                </div>
              )}

              {/* Play cards */}
              <div className={styles.playControls}>
                <p className={styles.controlLabel}>
                  Select cards and play as <strong>{RANK_NAMES[state.currentRank] || state.currentRank}</strong>
                </p>
                <div className={styles.playBtns}>
                  <button
                    className="btn-green"
                    disabled={selectedCards.length === 0}
                    onClick={handlePlay}
                    style={{ opacity: selectedCards.length === 0 ? 0.5 : 1 }}
                  >
                    Play {selectedCards.length} Card{selectedCards.length !== 1 ? 's' : ''}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={onPass}
                    disabled={(state.reserveDeckCount ?? 0) === 0}
                    style={{ opacity: (state.reserveDeckCount ?? 0) === 0 ? 0.35 : 1 }}
                  >
                    {(state.reserveDeckCount ?? 0) > 0
                      ? `🃏 Pass & Draw (${state.reserveDeckCount} left)`
                      : '🃏 Pass (Reserve Empty)'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.waitMsg}>Waiting for round starter to pick a rank...</p>
          )}
        </div>
      )}

      {/* Not my turn — just show whose turn it is */}
      {!isMyTurn && (
        <div className={styles.controls}>
          <p className={styles.waitMsg}>
            {currentPlayer?.name}&apos;s turn {needsRank ? '(picking rank)' : ''}
          </p>
        </div>
      )}

      {/* My hand */}
      <div className={styles.myHand}>
        <div className={styles.handLabel}>
          Your Cards ({state.myCards.length})
        </div>
        <div className={styles.handCards}>
          {state.myCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.includes(card.id)}
              onClick={() => toggleCard(card.id)}
              disabled={!isMyTurn || needsRank}
            />
          ))}
        </div>
      </div>

      {/* Game Log */}
      <div className={styles.gameLog}>
        <div className={styles.logHeader}>📝 Game Log</div>
        <div className={styles.logEntries}>
          {state.gameLog.map((entry, i) => (
            <div key={i} className={styles.logEntry}>
              {entry.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
