'use client';
import styles from './ResultModal.module.css';

export default function ResultModal({ winner, playerId, isHost, onPlayAgain }) {
  const isWinner = winner.winnerId === playerId;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.emoji}>
          {isWinner ? '🏆' : '😢'}
        </div>
        <h2 className={styles.title}>
          {isWinner ? 'You Win!' : 'Game Over!'}
        </h2>
        <p className={styles.subtitle}>
          {isWinner
            ? 'Congratulations! You bluffed your way to victory!'
            : `${winner.winnerName} won the game!`}
        </p>

        <div className={styles.winnerCard}>
          <span className={styles.crownEmoji}>👑</span>
          <span className={styles.winnerName}>{winner.winnerName}</span>
        </div>

        {isHost && (
          <button className="btn-primary" style={{ width: '100%', padding: '16px', marginTop: '16px' }} onClick={onPlayAgain}>
            🔄 Play Again
          </button>
        )}

        {!isHost && (
          <p className={styles.waitText}>Waiting for host to start a new game...</p>
        )}
      </div>
    </div>
  );
}
