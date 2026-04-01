import { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';

function SpellingHunterPlayer({ pin, nickname }) {
  const [hunterState, setHunterState] = useState(null);
  const [fallingItems, setFallingItems] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null); // { id, dbItem, currentWrong }
  const [options, setOptions] = useState([]);
  const nextId = useRef(0);
  const spawnInterval = useRef(null);

  useEffect(() => {
    socket.on('hunterState', (data) => {
      setHunterState(prev => {
        if (!prev) return data; // 초기 세팅
        return { ...prev, ...data }; // 부분 업데이트
      });
    });

    return () => {
      socket.off('hunterState');
      if (spawnInterval.current) clearInterval(spawnInterval.current);
    };
  }, []);

  useEffect(() => {
    if (hunterState && hunterState.isActive && hunterState.words) {
      if (!spawnInterval.current) {
        spawnInterval.current = setInterval(() => {
          spawnWord(hunterState.words);
        }, 1500); // 1.5초마다 단어 생성
      }
    } else {
      if (spawnInterval.current) {
        clearInterval(spawnInterval.current);
        spawnInterval.current = null;
      }
      if (hunterState && !hunterState.isActive) {
        setFallingItems([]); // 게임 종료 시 화면 비우기
      }
    }
  }, [hunterState]);

  const spawnWord = (wordsDb) => {
    const dbItem = wordsDb[Math.floor(Math.random() * wordsDb.length)];
    const wrongWord = dbItem.wrong[Math.floor(Math.random() * dbItem.wrong.length)];
    
    const newItem = {
      id: nextId.current++,
      text: wrongWord,
      dbItem: dbItem,
      left: Math.floor(Math.random() * 70) + 10, // 10% ~ 80% left
      speed: Math.floor(Math.random() * 4) + 4 // 4s ~ 8s to fall
    };
    
    setFallingItems(prev => [...prev, newItem]);

    // 일정 시간 후 화면에서 제거 (애니메이션 완료 시간 기준)
    setTimeout(() => {
      setFallingItems(prev => prev.filter(item => item.id !== newItem.id));
    }, newItem.speed * 1000);
  };

  const handleWordTouch = (item) => {
    // 이미 팝업이 떠있으면 무시
    if (selectedWord) return;

    // 해당 항목을 화면에서 지우고 팝업 표시
    setFallingItems(prev => prev.filter(i => i.id !== item.id));
    setSelectedWord(item);

    // 객관식 선택지 생성 (정답 1 + 오답 2)
    const choices = [item.dbItem.correct, ...item.dbItem.wrong].sort(() => 0.5 - Math.random());
    // 오답 중에 랜덤으로 2개를 뽑기 위해 썩는 방법도 좋지만, 여기선 다 넣고 셔플 (기본 오답 3+정답1=4개)
    // 빠른 템포를 위해 3개만 추출
    setOptions(choices.slice(0, 3).includes(item.dbItem.correct) ? choices.slice(0, 3) : [item.dbItem.correct, ...choices.slice(0, 2)].sort(() => 0.5 - Math.random()));
  };

  const handleOptionSelect = (option) => {
    if (option === selectedWord.dbItem.correct) {
      // 정답
      socket.emit('hunterScore', { pin, points: 10 });
    } else {
      // 오답 패널티 (점수 깎거나 진동 등)
      // 여기서는 그냥 넘어감
    }
    // 팝업 닫기
    setSelectedWord(null);
  };

  const isGameOver = hunterState && !hunterState.isActive;

  if (!hunterState) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>단어 사냥터로 이동 중...</div>;
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden', background: '#0f172a', color: 'white' }}>
      
      {/* 상단 UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', zIndex: 10, boxSizing: 'border-box' }}>
        <div style={{ fontSize: '1.5rem', fontFamily: 'Space Grotesk', color: 'var(--error)' }}>TIME: {hunterState.timeRemaining}s</div>
        <div style={{ fontSize: '1.2rem', fontFamily: 'Manrope' }}>{nickname}</div>
      </div>

      {isGameOver && (
         <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 100 }}>
           <h1 style={{ fontSize: '4rem', color: 'var(--primary)', margin: 0 }}>TIME UP!</h1>
           <p style={{ fontSize: '1.5rem', color: '#ccc' }}>호스트 메인 화면의 결과를 확인하세요.</p>
         </div>
      )}

      {/* 떨어지는 단어들 */}
      {hunterState.isActive && fallingItems.map(item => (
        <div 
          key={item.id}
          onClick={() => handleWordTouch(item)}
          style={{
            position: 'absolute',
            left: `${item.left}%`,
            top: '-50px', // 시작 위치
            animation: `fall ${item.speed}s linear forwards`,
            background: 'var(--surface-highest)',
            padding: '0.8rem 1.5rem',
            borderRadius: '50px',
            border: '3px solid var(--secondary)',
            cursor: 'pointer',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            transform: 'translateX(-50%)'
          }}
        >
          {item.text}
        </div>
      ))}

      {/* 수정 팝업 */}
      {selectedWord && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          zIndex: 50
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center', width: '80%', maxWidth: '300px' }}>
            <h3 style={{ color: 'var(--surface-highest)', margin: '0 0 1rem 0' }}>올바른 철자를 찾아라!</h3>
            <p style={{ fontSize: '2rem', color: 'var(--error)', fontWeight: 'bold', margin: '0 0 2rem 0', textDecoration: 'line-through' }}>
              {selectedWord.text}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {options.map((opt, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleOptionSelect(opt)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '1rem', fontSize: '1.5rem', background: 'var(--secondary)' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSS Keyframes for Falling Animation */}
      <style>
        {`
          @keyframes fall {
            0% { top: -50px; }
            100% { top: 110vh; }
          }
        `}
      </style>
    </div>
  );
}

export default SpellingHunterPlayer;
