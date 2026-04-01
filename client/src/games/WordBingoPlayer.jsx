import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';

function WordBingoPlayer({ pin, nickname }) {
  const [wordList, setWordList] = useState([]);
  const [boardSize, setBoardSize] = useState(16); // 16 (4x4) or 25 (5x5)
  const [myBoard, setMyBoard] = useState([]); // string[]
  const [marks, setMarks] = useState([]); // boolean[]
  const [drawnWords, setDrawnWords] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [bingoClaimed, setBingoClaimed] = useState(false);
  const [bingoCount, setBingoCount] = useState(0);

  useEffect(() => {
    socket.on('bingoWordList', ({ words }) => {
      setWordList(words);
    });

    socket.on('bingoWordDrawn', ({ word }) => {
      if (window.soundFX) window.soundFX.playTick();
      setDrawnWords(prev => [word, ...prev]);
    });

    return () => {
      socket.off('bingoWordList');
      socket.off('bingoWordDrawn');
    };
  }, []);

  // 보드 크기에 따른 랜덤 단어 채우기
  const handleAutoFill = () => {
    if (wordList.length < boardSize) {
      alert('단어 수가 부족합니다.');
      return;
    }
    const shuffled = [...wordList].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, boardSize);
    setMyBoard(selected);
    setMarks(new Array(boardSize).fill(false));
  };

  const checkBingo = (newMarks) => {
    const size = Math.sqrt(boardSize);
    let lines = 0;

    // 가로 검사
    for (let r = 0; r < size; r++) {
      let isLine = true;
      for (let c = 0; c < size; c++) {
        if (!newMarks[r * size + c]) isLine = false;
      }
      if (isLine) lines++;
    }

    // 세로 검사
    for (let c = 0; c < size; c++) {
      let isLine = true;
      for (let r = 0; r < size; r++) {
        if (!newMarks[r * size + c]) isLine = false;
      }
      if (isLine) lines++;
    }

    // 대각선 검사 1
    let diag1 = true;
    for (let i = 0; i < size; i++) {
      if (!newMarks[i * size + i]) diag1 = false;
    }
    if (diag1) lines++;

    // 대각선 검사 2
    let diag2 = true;
    for (let i = 0; i < size; i++) {
      if (!newMarks[i * size + (size - 1 - i)]) diag2 = false;
    }
    if (diag2) lines++;

    setBingoCount(lines);
  };

  const handleCellClick = (index) => {
    if (!isReady) return; // 아직 준비단계이면 터치 무시
    const word = myBoard[index];
    if (drawnWords.includes(word)) {
      if (!marks[index] && window.soundFX) window.soundFX.playCorrect();
      const newMarks = [...marks];
      newMarks[index] = true;
      setMarks(newMarks);
      checkBingo(newMarks);
    }
  };

  const handleClaimBingo = () => {
    if (bingoCount > 0 && !bingoClaimed) {
      if (window.soundFX) window.soundFX.playWin();
      socket.emit('claimBingo', { pin });
      setBingoClaimed(true);
    }
  };

  if (!isReady) {
    return (
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk', margin: 0, color: 'var(--ow-secondary)' }}>BINGO SETUP</h2>
        <p>빙고판 크기를 선택하고 랜덤 채우기를 누르세요.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            className="ow-btn" 
            style={{ background: boardSize === 16 ? 'var(--ow-primary)' : 'var(--ow-surface-lighter)' }}
            onClick={() => setBoardSize(16)}
          >
            4 x 4 (16칸)
          </button>
          <button 
            className="ow-btn" 
            style={{ background: boardSize === 25 ? 'var(--ow-primary)' : 'var(--ow-surface-lighter)' }}
            onClick={() => setBoardSize(25)}
          >
            5 x 5 (25칸)
          </button>
        </div>

        <button 
          className="ow-btn" 
          style={{ width: '100%', marginBottom: '1rem', background: '#eab308' }}
          onClick={handleAutoFill}
        >
          🎲 자동 채우기 (Auto Fill)
        </button>

        {myBoard.length > 0 && (
          <button 
            className="ow-btn" 
            style={{ width: '100%', background: 'var(--ow-primary-dim)' }}
            onClick={() => setIsReady(true)}
          >
            ✅ 준비 완료 (Ready!)
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
         <h2 style={{ margin: 0, fontFamily: 'Space Grotesk', fontSize: '2rem', color: 'var(--ow-error)' }}>
           BINGO LINES: <span style={{ fontSize: '3rem' }}>{bingoCount}</span>
         </h2>
         {drawnWords.length > 0 ? (
           <div style={{ background: 'var(--ow-surface-lighter)', color: 'white', padding: '1rem', borderRadius: '8px' }}>
             최근 나온 단어: <strong style={{ color: 'var(--ow-primary)', fontSize: '1.5rem' }}>{drawnWords[0]}</strong>
           </div>
         ) : (
           <div style={{ color: '#888' }}>선생님이 단어를 뽑기를 기다리세요...</div>
         )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${Math.sqrt(boardSize)}, 1fr)`, 
        gap: '5px', 
        flex: 1,
        maxHeight: '60vh'
      }}>
        {myBoard.map((word, idx) => (
          <div
            key={idx}
            onClick={() => handleCellClick(idx)}
            className={`bingo-cell ${marks[idx] ? 'bingo-marked-pop marked' : ''}`}
            style={{ wordBreak: 'break-word', fontSize: boardSize === 25 ? '0.9rem' : '1.2rem', padding: '0.2rem' }}
          >
            {word}
          </div>
        ))}
      </div>

      {bingoCount >= 1 && (
        <button 
          className={`ow-btn ${bingoClaimed ? '' : 'ultimate-win'}`} style={{ marginTop: 'auto', fontSize: '3rem', padding: '1rem', background: bingoClaimed ? 'var(--ow-surface)' : 'var(--ow-primary)' }}
          onClick={handleClaimBingo}
          disabled={bingoClaimed}
        >
          {bingoClaimed ? 'BINGO 외침 완료!' : '📢 BINGO 외치기!'}
        </button>
      )}
    </div>
  );
}

export default WordBingoPlayer;
