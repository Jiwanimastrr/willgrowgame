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
  
  const [voteOptions, setVoteOptions] = useState([]);
  const [myVote, setMyVote] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('gameStarted', ({ gameMode }) => {
      setGameState(gameMode);
    });

    socket.on('categoryVoteStarted', ({ options }) => {
      setGameState('categoryVote');
      setVoteOptions(options);
      setMyVote(null);
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
        <form className="sci-fi-terminal" onSubmit={handleJoin} style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '3rem', borderRadius: '1rem' }}>
          
          <div style={{ textAlign: 'center' }}>
            <img src="/willgrow_logo.png" alt="WillGrow Logo" className="logo" onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }} style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 10px var(--ow-primary))' }} />
            <div className="logo-placeholder" style={{ display: 'none', marginBottom: '1rem', color: 'var(--ow-primary)', textShadow: '0 0 10px var(--ow-primary)' }}>
              WILLGROW
            </div>
            <h2 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0, letterSpacing: '4px' }}>SYSTEM LOGIN</h2>
          </div>
          
          <div>
            <label className="body-md" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--ow-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>[ SECURE PIN ]</label>
            <input 
              type="text" 
              className="sci-fi-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="000000"
              maxLength={6}
            />
          </div>

          <div>
            <label className="body-md" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--ow-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>[ CALLSIGN ]</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <User size={30} color="var(--ow-primary)" style={{ position: 'absolute', marginLeft: '10px' }} />
              <input 
                type="text" 
                className="sci-fi-input"
                style={{ paddingLeft: '50px' }}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="NICKNAME"
                maxLength={10}
              />
            </div>
          </div>

          <button type="submit" className="ow-btn neon-glow" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', fontSize: '1.8rem', height: '60px' }}>
            <span>INITIALIZE</span>
            <LogIn size={28} style={{ marginLeft: '15px' }} />
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
            <div className="sci-fi-terminal" style={{ padding: '4rem', borderRadius: '50%', width: '300px', height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <h1 className="display-lg pulse-wait-text" style={{ margin: 0, border: 'none' }}>STANDBY</h1>
              <p className="body-md" style={{ fontSize: '1.2rem', color: 'var(--ow-secondary-dim)', marginTop: '1rem', textTransform: 'uppercase' }}>Awaiting Directive</p>
            </div>
            
            <div style={{ marginTop: '3rem', padding: '1rem 3rem', background: 'rgba(0, 162, 255, 0.1)', border: '1px solid var(--ow-secondary)', borderRadius: '0.5rem' }}>
              <h2 className="headline-lg" style={{ color: 'var(--ow-secondary)', margin: 0, letterSpacing: '3px' }}>[{nickname}]</h2>
            </div>
         </div>
      )}

      {/* Category Vote State */}
      {gameState === 'categoryVote' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', width: '100%', boxSizing: 'border-box' }}>
          <h2 className="headline-lg" style={{ color: 'var(--ow-primary)', textShadow: '0 0 10px currentColor', marginBottom: '3rem', textAlign: 'center' }}>
            투표할 주제를 선택하세요!
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '400px' }}>
            {voteOptions.map(opt => (
              <button 
                key={opt}
                className={myVote === opt ? 'ow-btn' : 'ow-btn-secondary'}
                style={{ height: '80px', fontSize: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={() => {
                  setMyVote(opt);
                  socket.emit('submitCategoryVote', { pin, nickname, vote: opt });
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {myVote && (
            <p className="body-md" style={{ color: 'var(--ow-secondary)', marginTop: '2rem', fontSize: '1.2rem', textAlign: 'center' }}>
              선택 완료! 칠판 화면을 봐주세요.
            </p>
          )}
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
