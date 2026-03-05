'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AVATARS } from '@/lib/constants';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😀');
  const [showAvatars, setShowAvatars] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name from Google session
  const displayName = playerName || session?.user?.name || '';

  const handleCreate = (e) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) { setError('Enter your name'); return; }
    const params = new URLSearchParams({
      name,
      avatar: selectedAvatar,
      action: 'create',
      email: session?.user?.email || '',
    });
    router.push(`/room/new?${params.toString()}`);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) { setError('Enter your name'); return; }
    if (!roomCode.trim()) { setError('Enter room code'); return; }
    const params = new URLSearchParams({
      name,
      avatar: selectedAvatar,
      action: 'join',
      email: session?.user?.email || '',
    });
    router.push(`/room/${roomCode.trim().toUpperCase()}?${params.toString()}`);
  };

  const isLoading = status === 'loading';
  const isSignedIn = !!session;

  return (
    <main className={styles.main}>
      {/* Background effects */}
      <div className={styles.bgOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
        <div className={styles.orb3}></div>
      </div>

      <div className={styles.container}>
        {/* Hero */}
        <div className={styles.hero}>
          <img src="/logo.png" alt="Bluff Logo" className={styles.logoIcon} />
          <h1 className={styles.title}>BLUFF</h1>
          <p className={styles.subtitle}>The Ultimate Card Game of Deception</p>
          <p className={styles.desc}>
            Challenge your friends online. Play your cards, bluff your way through, and call out the liars. First to empty your hand wins!
          </p>
        </div>

        {/* Auth Section */}
        {!isSignedIn && !isLoading && (
          <div className={styles.authSection}>
            <button className={styles.googleBtn} onClick={() => signIn('google')}>
              <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
            <p className={styles.authHint}>Sign in to create or join a game</p>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingAuth}>
            <div className={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        )}

        {/* Signed In - Show user info + actions */}
        {isSignedIn && (
          <>
            {/* User Card */}
            <div className={styles.userCard}>
              {session.user.image ? (
                <img src={session.user.image} alt="" className={styles.userAvatar} referrerPolicy="no-referrer" />
              ) : (
                <div className={styles.userAvatarFallback}>{session.user.name?.[0] || '?'}</div>
              )}
              <div className={styles.userInfo}>
                <span className={styles.userName}>{session.user.name}</span>
                <span className={styles.userEmail}>{session.user.email}</span>
              </div>
              <button className={styles.signOutBtn} onClick={() => signOut()}>
                Sign Out
              </button>
            </div>

            {/* Action Buttons */}
            {!mode && (
              <div className={styles.actions}>
                <button className={`btn-primary ${styles.actionBtn}`} onClick={() => setMode('create')}>
                  <span className={styles.btnIcon}>✨</span>
                  Create Room
                </button>
                <button className={`btn-outline ${styles.actionBtn}`} onClick={() => setMode('join')}>
                  <span className={styles.btnIcon}>🚪</span>
                  Join Room
                </button>
              </div>
            )}

            {/* Form */}
            {mode && (
              <div className={styles.formCard}>
                <button className={styles.backBtn} onClick={() => { setMode(null); setError(''); }}>
                  ← Back
                </button>

                <h2 className={styles.formTitle}>
                  {mode === 'create' ? '✨ Create a Room' : '🚪 Join a Room'}
                </h2>

                <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className={styles.form}>
                  {/* Avatar Picker */}
                  <div className={styles.avatarSection}>
                    <button
                      type="button"
                      className={styles.avatarBtn}
                      onClick={() => setShowAvatars(!showAvatars)}
                    >
                      <span className={styles.avatarDisplay}>{selectedAvatar}</span>
                      <span className={styles.avatarLabel}>Pick Avatar</span>
                    </button>
                    {showAvatars && (
                      <div className={styles.avatarGrid}>
                        {AVATARS.map((av) => (
                          <button
                            key={av}
                            type="button"
                            className={`${styles.avatarOption} ${selectedAvatar === av ? styles.avatarSelected : ''}`}
                            onClick={() => { setSelectedAvatar(av); setShowAvatars(false); }}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    className="input-field"
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
                    maxLength={20}
                  />

                  {mode === 'join' && (
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Room Code (e.g. ABC123)"
                      value={roomCode}
                      onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                      maxLength={6}
                      style={{ textTransform: 'uppercase', letterSpacing: '3px', textAlign: 'center' }}
                    />
                  )}

                  {error && <p className={styles.error}>{error}</p>}

                  <button type="submit" className="btn-green" style={{ width: '100%', padding: '14px' }}>
                    {mode === 'create' ? '🎮 Create & Enter Room' : '🚀 Join Room'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* How to Play */}
        <div className={styles.howToPlay}>
          <h3 className={styles.howTitle}>How to Play</h3>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div>
                <strong>Create or Join</strong>
                <p>Sign in with Google, create a room and share the code</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div>
                <strong>Play Cards</strong>
                <p>On your turn, place cards face-down and declare them as the chosen rank</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div>
                <strong>Bluff or Truth</strong>
                <p>You can place any cards — not just the declared rank. That&apos;s bluffing!</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <div>
                <strong>Call Bluff!</strong>
                <p>Suspect someone? Call their bluff! If right, they pick up the pile</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
