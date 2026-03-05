'use client';
import { useState } from 'react';
import styles from './Lobby.module.css';

export default function Lobby({ state, playerId, onStart }) {
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === playerId;

  const copyCode = () => {
    navigator.clipboard.writeText(state.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.lobby}>
      <div className={styles.header}>
        <h1 className={styles.title}>🃏 Game Lobby</h1>
        <div className={styles.roomCode}>
          <span className={styles.codeLabel}>Room Code</span>
          <button className={styles.code} onClick={copyCode}>
            {state.roomId}
            <span className={styles.copyIcon}>{copied ? '✅' : '📋'}</span>
          </button>
          <span className={styles.copyHint}>{copied ? 'Copied!' : 'Click to copy'}</span>
        </div>
      </div>

      {/* Deck Info */}
      <div className={styles.deckInfo}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Players</span>
          <span className={styles.infoValue}>{state.players.length}</span>
        </div>
        <div className={styles.infoDivider}></div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Decks</span>
          <span className={styles.infoValue}>{state.deckInfo.deckCount}</span>
        </div>
        <div className={styles.infoDivider}></div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Total Cards</span>
          <span className={styles.infoValue}>{state.deckInfo.totalCards}</span>
        </div>
        <div className={styles.infoDivider}></div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Per Player</span>
          <span className={styles.infoValue}>~{state.deckInfo.cardsPerPlayer}</span>
        </div>
        <div className={styles.infoDivider}></div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Reserve</span>
          <span className={styles.infoValueReserve}>+{state.deckInfo.reserveCards}</span>
        </div>
      </div>

      {/* Distribution Note */}
      <div className={styles.distributionNote}>
        <span>📋</span>
        <span>{state.deckInfo.deckCount} deck(s) shuffled together. {state.deckInfo.cardsPerPlayer} cards dealt per player, {state.deckInfo.reserveCards} cards in reserve for pass draws. No duplicates between players.</span>
      </div>

      {/* Players List */}
      <div className={styles.playerList}>
        <h3 className={styles.playersTitle}>Players Joined</h3>
        <div className={styles.players}>
          {state.players.map((p) => (
            <div key={p.id} className={`${styles.playerCard} ${p.id === playerId ? styles.isMe : ''}`}>
              <span className={styles.avatar}>{p.avatar}</span>
              <span className={styles.name}>
                {p.name}
                {p.id === playerId && <span className={styles.youBadge}>You</span>}
                {p.isHost && <span className={styles.hostBadge}>Host</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Waiting / Start */}
      <div className={styles.footer}>
        {state.players.length < 3 && (
          <p className={styles.waiting}>Waiting for at least 3 players to join...</p>
        )}
        {isHost && state.players.length >= 3 && (
          <button className="btn-green" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={onStart}>
            🚀 Start Game ({state.players.length} players)
          </button>
        )}
        {!isHost && state.players.length >= 3 && (
          <p className={styles.waiting}>Waiting for host to start the game...</p>
        )}
      </div>
    </div>
  );
}
