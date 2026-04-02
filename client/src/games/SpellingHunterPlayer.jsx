import { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';

function SpellingHunterPlayer({ pin, nickname }) {
  const [hunterState, setHunterState] = useState(null);
  const [activeWords, setActiveWords] = useState([]);
  const [hp, setHp] = useState(5);
  const [alive, setAlive] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [gameOverInfo, setGameOverInfo] = useState(null);
  const wordsRef = useRef([]); // To keep track of words inside timeouts
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      // visualViewport가 있으면 실제 보이는 영역으로 세팅 (모바일 키보드 호환)
      if (window.visualViewport) {
         setViewportHeight(window.visualViewport.height);
      } else {
         setViewportHeight(window.innerHeight);
      }
    };
    
    // 초기 세팅
    handleResize();

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize); // 간혹 스크롤 시에도 변경됨
    window.addEventListener('resize', handleResize);
    
    return () => {
       window.visualViewport?.removeEventListener('resize', handleResize);
       window.visualViewport?.removeEventListener('scroll', handleResize);
       window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    socket.on('hunterState', (data) => {
      setHunterState(prev => ({ ...prev, ...data }));
    });

    socket.on('hunterSpawnWord', (wordData) => {
      if (!alive) return; // 죽은 플레이어에겐 생성하지 않음

      // 새로 생성된 단어를 상태와 ref에 추가
      const newWord = { ...wordData, spawnedAt: Date.now() };
      setActiveWords(prev => [...prev, newWord]);
      wordsRef.current = [...wordsRef.current, newWord];

      // duration 후에도 단어가 남아있으면 대미지 로직
      setTimeout(() => {
        // 현재 살아있는 단어 목록에 해당 id가 있는지 확인
        const stillExists = wordsRef.current.find(w => w.id === wordData.id);
        if (stillExists) {
          // 화면에 바닥에 닿았으므로 삭제 및 대미지
          removeWord(wordData.id);
          takeDamage();
        }
      }, wordData.duration);
    });

    socket.on('hunterSpeedUp', (data) => {
      setHunterState(prev => ({ ...prev, ...data }));
    });

    socket.on('hunterGameOver', ({ winner }) => {
      setGameOverInfo(winner);
      setHunterState(prev => prev ? { ...prev, isActive: false } : null);
    });

    return () => {
      socket.off('hunterState');
      socket.off('hunterSpawnWord');
      socket.off('hunterSpeedUp');
      socket.off('hunterGameOver');
    };
  }, [alive]);

  const removeWord = (id) => {
    setActiveWords(prev => prev.filter(w => w.id !== id));
    wordsRef.current = wordsRef.current.filter(w => w.id !== id);
  };

  const takeDamage = () => {
    if (!alive) return;
    if (window.soundFX) window.soundFX.playWrong();
    
    setHp(prev => {
      const nextHp = prev - 1;
      if (nextHp <= 0) {
        setAlive(false);
        socket.emit('hunterPlayerDied', { pin });
        return 0;
      }
      return nextHp;
    });
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!alive || !hunterState?.isActive) return;
    
    const typed = inputValue.trim().toLowerCase();
    setInputValue(''); // 인풋창 비우기
    
    if (!typed) return;

    // 화면에 있는 단어 중 매칭되는 것이 있는지 찾기 (가장 먼저/낮게 떨어진 것 우선)
    const sortedWords = [...activeWords].sort((a, b) => a.spawnedAt - b.spawnedAt);
    const matchedWord = sortedWords.find(w => w.text === typed);

    if (matchedWord) {
      if (window.soundFX) window.soundFX.playLaser();
      removeWord(matchedWord.id);
      socket.emit('hunterScore', { pin, points: 10 });
    }
  };

  if (gameOverInfo) {
    return (
      <div style={{ position: 'relative', height: viewportHeight, width: '100%', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--ow-primary)', margin: '0 0 1rem 0' }}>GAME OVER</h1>
        <h2 style={{ fontSize: '2rem' }}>WINNER: {gameOverInfo}</h2>
        <p style={{ marginTop: '2rem', color: '#ccc' }}>호스트의 다음 지시를 기다리세요.</p>
      </div>
    );
  }

  if (!alive) {
    return (
      <div style={{ position: 'relative', height: viewportHeight, width: '100%', background: '#450a0a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '4rem', color: 'var(--ow-error)', margin: '0 0 1rem 0' }}>YOU DIED</h1>
        <p style={{ fontSize: '1.5rem', color: '#ccc' }}>다른 생존자들의 경기를 관전중입니다...</p>
      </div>
    );
  }

  if (!hunterState) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>단어 사냥터 전장으로 이동 중...</div>;
  }

  return (
    <div style={{ position: 'relative', height: viewportHeight, width: '100%', overflow: 'hidden', background: 'radial-gradient(circle at top, #1e293b, #0f172a)', color: 'white' }}>
      
      {/* 상단 UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', zIndex: 10, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
           {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ fontSize: '1.5rem', opacity: i < hp ? 1 : 0.3 }}>❤️</span>
           ))}
        </div>
        <div style={{ fontSize: '1.2rem', fontFamily: 'Manrope', color: 'var(--ow-secondary)' }}>
           Level {hunterState.level || 1}
        </div>
      </div>

      {/* 떨어지는 단어들 구역 */}
      <div style={{ position: 'absolute', top: '60px', left: 0, right: 0, bottom: '80px', overflow: 'hidden' }}>
        {hunterState.isActive && activeWords.map(word => (
          <div 
            key={word.id}
            className="ow-badge"
            style={{
              position: 'absolute',
              left: `${word.xPosition}%`,
              top: '-50px',
              animation: `hunterFall ${word.duration}ms linear forwards`,
              padding: '0.6rem 1.2rem',
              boxShadow: '0 4px 15px rgba(255, 255, 255, 0.2)',
              transform: 'translateX(-50%)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {word.text}
          </div>
        ))}
      </div>

      {/* 하단 입력 폼 (모바일 키보드 호환) */}
      <form onSubmit={handleInputSubmit} style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        padding: '1rem',
        background: 'rgba(0,0,0,0.8)',
        boxSizing: 'border-box',
        display: 'flex',
        gap: '0.5rem'
      }}>
         <input 
           type="text" 
           value={inputValue}
           onChange={(e) => setInputValue(e.target.value)}
           placeholder="Type the word..."
           autoFocus
           style={{
             flex: 1,
             padding: '1rem',
             fontSize: '1.2rem',
             borderRadius: '8px',
             border: '2px solid var(--ow-primary)',
             background: 'rgba(255,255,255,0.1)',
             color: 'white',
             outline: 'none'
           }}
         />
         <button type="submit" className="ow-btn" style={{ padding: '0 1.5rem' }}>FIRE</button>
      </form>

      {/* CSS Keyframes for Falling Animation */}
      <style>
        {`
          @keyframes hunterFall {
            0% { top: -50px; }
            100% { top: 100%; }
          }
        `}
      </style>
    </div>
  );
}

export default SpellingHunterPlayer;
