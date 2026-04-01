import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';

function BombGamePlayer({ pin, nickname }) {
  const [bombState, setBombState] = useState(null);
  const [bombExploded, setBombExploded] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [invalidMsg, setInvalidMsg] = useState('');
  const [isWaitingForJudge, setIsWaitingForJudge] = useState(false);

  useEffect(() => {
    socket.on('bombState', (data) => {
      setBombState(data);
      setBombExploded(false);
      setInvalidMsg('');
    });

    socket.on('bombExploded', ({ id }) => {
      // 폭발 이벤트 시 화면 처리
      if (id === socket.id) {
        setBombExploded(true);
      }
    });

    socket.on('invalidBombWord', ({ message }) => {
      setInvalidMsg(message);
      setIsWaitingForJudge(false);
    });

    socket.on('bombPassed', () => {
      setWordInput('');
      setIsWaitingForJudge(false);
    });

    socket.on('waitingForJudge', () => {
      setIsWaitingForJudge(true);
    });

    return () => {
      socket.off('bombState');
      socket.off('bombExploded');
      socket.off('invalidBombWord');
      socket.off('bombPassed');
      socket.off('waitingForJudge');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!wordInput.trim() || isWaitingForJudge) return;
    socket.emit('submitBombWord', { pin, word: wordInput.trim() });
  };

  if (!bombState) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>준비 중...</div>;
  }

  const isMyTurn = socket.id === bombState.currentPlayerId;
  const isSpectator = !bombState.activePlayers.includes(socket.id);

  if (bombExploded || isSpectator) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', background: 'var(--surface-highest)', color: 'white' }}>
        <h1 style={{ fontSize: '4rem', color: bombExploded ? 'var(--error)' : '#888' }}>
          {bombExploded ? 'BOOM! 탈락!' : '관전 모드'}
        </h1>
        <p style={{ fontSize: '1.5rem', fontFamily: 'Manrope' }}>
          다른 플레이어들을 응원하세요!
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', 
      background: isMyTurn ? (bombState.timeRemaining <= 5 ? '#fca5a5' : '#fed7aa') : '#f1f5f9',
      padding: '1rem', boxSizing: 'border-box',
      transition: 'background 0.3s'
    }}>
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--secondary)' }}>
          카테고리: {bombState.category}
        </h2>
        
        <div style={{ 
          margin: '2rem 0', 
          fontSize: isMyTurn ? '8rem' : '4rem', 
          fontFamily: 'Space Grotesk', 
          color: isMyTurn ? 'var(--error)' : 'var(--surface-high)',
          lineHeight: 1
        }}>
          {bombState.timeRemaining}s
        </div>

        {isMyTurn ? (
          <div style={{ background: 'var(--surface-highest)', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ color: 'var(--primary)', margin: '0 0 1rem 0', fontSize: '2rem' }}>🔥 내 차례입니다! 빨리 입력하세요! 🔥</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                value={wordInput} 
                onChange={(e) => setWordInput(e.target.value)}
                placeholder="단어 입력..."
                style={{ fontSize: '2rem', padding: '1rem', border: '5px solid var(--error)', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}
                autoFocus
                disabled={isWaitingForJudge}
              />
              {isWaitingForJudge ? (
                <div style={{ padding: '1.5rem', background: 'var(--tertiary)', color: 'white', textAlign: 'center', fontSize: '1.5rem', borderRadius: '4px' }}>
                  호스트 확인 중... ⏳
                </div>
              ) : (
                <button type="submit" className="btn-primary" style={{ fontSize: '2rem', padding: '1rem' }}>
                  입력
                </button>
              )}
            </form>
            {invalidMsg && <p style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '1rem' }}>{invalidMsg}</p>}
          </div>
        ) : (
          <div style={{ fontSize: '2rem', color: '#666', fontFamily: 'Manrope' }}>
            <strong style={{ color: 'var(--primary)' }}>
              {bombState.playersInfo.find(p => p.id === bombState.currentPlayerId)?.nickname}
            </strong>님의 턴을 기다리는 중...
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', background: 'white', padding: '1rem', borderRadius: '8px', border: '2px solid #ccc' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--surface-high)' }}>나온 단어들 (중복 불가)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {bombState.usedWords.map((w, idx) => (
            <span key={idx} style={{ background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>{w}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BombGamePlayer;
