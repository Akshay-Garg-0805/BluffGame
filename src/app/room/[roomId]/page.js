'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/socket';
import Lobby from '@/components/Lobby/Lobby';
import GameBoard from '@/components/GameBoard/GameBoard';
import ResultModal from '@/components/ResultModal/ResultModal';
import styles from './page.module.css';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const roomIdParam = params.roomId;
  const playerName = searchParams.get('name') || session?.user?.name || 'Player';
  const avatar = searchParams.get('avatar') || '\ud83d\ude00';
  const action = searchParams.get('action') || 'join';

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState(roomIdParam === 'new' ? null : roomIdParam);
  const [playerId, setPlayerId] = useState(null);
  const [lobbyState, setLobbyState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [bluffResult, setBluffResult] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Protect route
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);

      if (action === 'create' || roomIdParam === 'new') {
        s.emit('create-room', { playerName, avatar });
      } else {
        s.emit('join-room', { roomId: roomIdParam, playerName, avatar });
      }
    });

    s.on('room-created', ({ roomId: newRoomId, playerId: pid }) => {
      setRoomId(newRoomId);
      setPlayerId(pid);
      // Update URL without reload
      window.history.replaceState({}, '', `/room/${newRoomId}`);
    });

    s.on('room-joined', ({ roomId: joinedRoomId, playerId: pid }) => {
      setRoomId(joinedRoomId);
      setPlayerId(pid);
    });

    s.on('room-update', (state) => {
      setLobbyState(state);
      setGameState(null);
    });

    s.on('game-started', (state) => {
      setGameState(state);
      setLobbyState(null);
      setBluffResult(null);
      setGameOver(null);
    });

    s.on('game-update', (state) => {
      setGameState(state);
    });

    s.on('bluff-result', (result) => {
      setBluffResult(result);
      // Auto-clear after 3s
      setTimeout(() => setBluffResult(null), 3500);
    });

    s.on('game-over', (result) => {
      setGameOver(result);
    });

    s.on('back-to-lobby', () => {
      setGameState(null);
      setGameOver(null);
      setBluffResult(null);
    });

    s.on('error-message', ({ message }) => {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(''), 4000);
    });

    s.on('disconnect', () => setConnected(false));

    return () => {
      s.off('connect');
      s.off('room-created');
      s.off('room-joined');
      s.off('room-update');
      s.off('game-started');
      s.off('game-update');
      s.off('bluff-result');
      s.off('game-over');
      s.off('back-to-lobby');
      s.off('error-message');
      s.off('disconnect');
    };
  }, []);

  const handleStartGame = useCallback(() => {
    if (socket && roomId) {
      socket.emit('start-game', { roomId });
    }
  }, [socket, roomId]);

  const handleSetRank = useCallback((rank) => {
    if (socket && roomId) {
      socket.emit('set-rank', { roomId, rank });
    }
  }, [socket, roomId]);

  const handlePlayCards = useCallback((cardIds) => {
    if (socket && roomId) {
      socket.emit('play-cards', { roomId, cardIds });
    }
  }, [socket, roomId]);

  const handleCallBluff = useCallback(() => {
    if (socket && roomId) {
      socket.emit('call-bluff', { roomId });
    }
  }, [socket, roomId]);

  const handlePass = useCallback(() => {
    if (socket && roomId) {
      socket.emit('pass-turn', { roomId });
    }
  }, [socket, roomId]);

  const handlePlayAgain = useCallback(() => {
    if (socket && roomId) {
      socket.emit('play-again', { roomId });
    }
  }, [socket, roomId]);

  const handleSendEmoji = useCallback((emoji) => {
    if (socket && roomId) {
      socket.emit('send-emoji', { roomId, emoji });
    }
  }, [socket, roomId]);

  // Loading state
  if (status === 'loading' || !connected) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{status === 'loading' ? 'Checking auth...' : 'Connecting to server...'}</p>
        </div>
      </main>
    );
  }

  // Double check auth before rendering
  if (status === 'unauthenticated') return null;

  return (
    <main className={styles.main}>
      {/* Error toast */}
      {errorMsg && (
        <div className={styles.toast}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Lobby */}
      {lobbyState && !gameState && (
        <Lobby
          state={lobbyState}
          playerId={playerId}
          onStart={handleStartGame}
        />
      )}

      {/* Game Board */}
      {gameState && (
        <GameBoard
          state={gameState}
          playerId={playerId}
          bluffResult={bluffResult}
          onSetRank={handleSetRank}
          onPlayCards={handlePlayCards}
          onCallBluff={handleCallBluff}
          onPass={handlePass}
          onSendEmoji={handleSendEmoji}
        />
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <ResultModal
          winner={gameOver}
          playerId={playerId}
          isHost={lobbyState?.hostId === playerId || gameState?.hostId === playerId}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </main>
  );
}
