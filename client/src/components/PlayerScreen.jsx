import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { socket } from '../utils/socket';
import { LogIn, User } from 'lucide-react';

// 게임 컴포넌트 임포트
import WordQuizPlayer from '../games/WordQuizPlayer';
import SentencePuzzlePlayer from '../games/SentencePuzzlePlayer';
import WordChainPlayer from '../games/WordChainPlayer';
import WordBingoPlayer from '../games/WordBingoPlayer';
import BombGamePlayer from '../games/BombGamePlayer';
import SpellingHunterPlayer from '../games/SpellingHunterPlayer';
import SpeedRacePlayer from '../games/SpeedRacePlayer';

function PlayerScreen() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';

  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState('lobby');

  useEffect(() => {
    socket.connect();

    socket.on('gameStarted', ({ gameMode }) => {
      setGameState(gameMode);
    });

    socket.on('hostDisconnected', () => {
      alert('Host has left the game.');
      setJoined(false);
      setGameState('lobby');
    });

    return () => {
      socket.off('gameStarted');
      socket.off('hostDisconnected');
      socket.disconnect();
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin || !nickname) return alert('Enter Game PIN and Nickname!');
    
    socket.emit('joinRoom', { pin, nickname }, (res) => {
      if (res.success) {
        setJoined(true);
        setGameState(res.room.gameState);
      } else {
        alert(res.message);
      }
    });
  };

  if (!joined) {
    return (
      <div className="player-container animate-enter" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <form className="glass-panel" onSubmit={handleJoin} style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ textAlign: 'center' }}>
            <img src="/willgrow_logo.png" alt="WillGrow Logo" className="logo" onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }} style={{ marginBottom: '1rem' }} />
            <div className="logo-placeholder" style={{ display: 'none', marginBottom: '1rem' }}>
              WILLGROW
            </div>
            <h2 className="headline-lg" style={{ color: 'var(--primary)', margin: 0 }}>JOIN GAME</h2>
          </div>
          
          <div>
            <label className="body-md" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--secondary)' }}>GAME PIN</label>
            <input 
              type="text" 
              className="luxe-input" 
              style={{ width: '100%', boxSizing: 'border-box', letterSpacing: '4px', fontSize: '2rem' }}
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="e.g. 123456"
              maxLength={6}
            />
          </div>

          <div>
            <label className="body-md" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--secondary)' }}>NICKNAME</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderBottom: '2px solid rgba(64,72,93,0.3)', borderRadius: '0.75rem 0.75rem 0 0', padding: '0 1rem' }}>
              <User size={24} color="var(--on-surface-variant)" />
              <input 
                type="text" 
                className="luxe-input" 
                style={{ border: 'none', width: '100%', boxSizing: 'border-box', background: 'transparent' }}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your Name"
                maxLength={10}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary neon-glow" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
            <span>ENTER MATCH</span>
            <LogIn size={24} style={{ marginLeft: '10px' }} />
          </button>
        </form>
      </div>
    );
  }

  // 연결된 상태에서의 뷰
  return (
    <div className="player-container animate-enter" style={{ padding: '0', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {gameState === 'lobby' && (
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
            <h1 className="display-lg neon-glow" style={{ color: 'var(--primary)', margin: 0, textShadow: '0 0 20px currentColor', border: 'none' }}>WAITING...</h1>
            <p className="body-md" style={{ fontSize: '1.5rem', color: 'var(--on-surface-variant)', marginTop: '1rem' }}>호스트가 게임을 시작할 때까지 대기해주세요.</p>
            <div className="surface-card" style={{ marginTop: '3rem', padding: '1rem 3rem' }}>
              <h2 className="headline-lg" style={{ color: 'var(--secondary)', margin: 0 }}>{nickname}</h2>
            </div>
         </div>
      )}

      {/* 게임 모드 라우팅 컴포넌트 렌더링 */}
      {gameState === 'wordQuiz' && <WordQuizPlayer pin={pin} nickname={nickname} />}
      {gameState === 'sentencePuzzle' && <SentencePuzzlePlayer pin={pin} nickname={nickname} />}
      {gameState === 'wordChain' && <WordChainPlayer pin={pin} nickname={nickname} />}
      {gameState === 'wordBingo' && <WordBingoPlayer pin={pin} nickname={nickname} />}
      {gameState === 'categoryBomb' && <BombGamePlayer pin={pin} nickname={nickname} />}
      {gameState === 'spellingHunter' && <SpellingHunterPlayer pin={pin} nickname={nickname} />}
      {(gameState === 'speedRaceIndividual' || gameState === 'speedRaceTeam') && <SpeedRacePlayer pin={pin} nickname={nickname} />}
    </div>
  );
}

export default PlayerScreen;
