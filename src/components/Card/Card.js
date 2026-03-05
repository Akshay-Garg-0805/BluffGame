'use client';
import { SUIT_COLORS } from '@/lib/constants';
import styles from './Card.module.css';

export default function Card({ card, selected, onClick, faceDown, small, disabled }) {
  if (faceDown) {
    return (
      <div className={`${styles.card} ${styles.faceDown} ${small ? styles.small : ''}`}>
        <div className={styles.cardBack}>
          <img src="/logo.png" className={styles.cardPattern} alt="" draggable="false" />
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? 'var(--card-red)' : 'var(--card-black)';

  return (
    <button
      className={`${styles.card} ${selected ? styles.selected : ''} ${small ? styles.small : ''} ${disabled ? styles.disabled : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{ color }}
      disabled={disabled}
    >
      <div className={styles.cardInner}>
        <div className={styles.topLeft}>
          <span className={styles.rank}>{card.rank}</span>
          <span className={styles.suit}>{card.suit}</span>
        </div>
        <div className={styles.center}>
          <span className={styles.centerSuit}>{card.suit}</span>
        </div>
        <div className={styles.bottomRight}>
          <span className={styles.rank}>{card.rank}</span>
          <span className={styles.suit}>{card.suit}</span>
        </div>
      </div>
    </button>
  );
}
