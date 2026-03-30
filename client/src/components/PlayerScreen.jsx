import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { socket } from '../utils/socket';
import { LogIn, User } from 'lucide-react';

// 게임 컴포넌트 임포트 (아직 생성 안됨 - 뼈대만)
import WordQuizPlayer from '../games/WordQuizPlayer';
import SentencePuzzlePlayer from '../games/SentencePuzzlePlayer';
import WordChainPlayer from '../games/WordChainPlayer';

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
      <div className="player-container" style={{ padding: '2rem', justifyContent: 'center', alignItems: 'center' }}>
        <form className="ow-panel" onSubmit={handleJoin} style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', transform: 'skewX(-2deg)' }}>
          <h2 style={{ fontSize: '3rem', textAlign: 'center', color: 'var(--ow-blue)', margin: 0, transform: 'skewX(2deg)' }}>JOIN GAME</h2>
          
          <div style={{ transform: 'skewX(2deg)' }}>
            <label style={{ display: 'block', fontSize: '1.2rem', fontFamily: 'Teko', fontWeight: 'bold' }}>GAME PIN</label>
            <input 
              type="text" 
              className="ow-input" 
              style={{ width: '100%', boxSizing: 'border-box', letterSpacing: '2px', fontSize: '2rem' }}
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="e.g. 123456"
              maxLength={6}
            />
          </div>

          <div style={{ transform: 'skewX(2deg)' }}>
            <label style={{ display: 'block', fontSize: '1.2rem', fontFamily: 'Teko', fontWeight: 'bold' }}>NICKNAME</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '3px solid var(--ow-darker)', borderRadius: '4px' }}>
              <User size={24} style={{ marginLeft: '10px' }} color="var(--ow-darker)" />
              <input 
                type="text" 
                className="ow-input" 
                style={{ border: 'none', width: '100%', boxSizing: 'border-box' }}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your Name"
                maxLength={10}
              />
            </div>
          </div>

          <button type="submit" className="ow-button" style={{ width: '100%', marginTop: '1rem' }}>
            <span>ENTER MATCH</span>
            <LogIn size={24} style={{ marginLeft: '10px' }} />
          </button>
        </form>
      </div>
    );
  }

  // 연결된 상태에서의 뷰
  return (
    <div className="player-container">
      {gameState === 'lobby' && (
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '4rem', color: 'var(--ow-orange)', margin: 0 }}>WAITING...</h1>
            <p style={{ fontSize: '1.5rem', fontFamily: 'Noto Sans KR', fontWeight: 'bold' }}>호스트가 게임을 시작할 때까지 대기해주세요.</p>
            <div className="ow-panel" style={{ marginTop: '2rem', transform: 'skewX(-5deg)', background: 'var(--ow-dark)', color: 'white' }}>
              <h2 style={{ fontSize: '2rem', margin: 0, transform: 'skewX(5deg)' }}>{nickname}</h2>
            </div>
         </div>
      )}

      {/* 게임 모드 라우팅 컴포넌트 렌더링 */}
      {gameState === 'wordQuiz' && <WordQuizPlayer pin={pin} nickname={nickname} />}
      {gameState === 'sentencePuzzle' && <SentencePuzzlePlayer pin={pin} nickname={nickname} />}
      {gameState === 'wordChain' && <WordChainPlayer pin={pin} nickname={nickname} />}
    </div>
  );
}

export default PlayerScreen;
