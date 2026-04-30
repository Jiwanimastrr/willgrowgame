import { useState, useEffect } from 'react';
import { socket, getPlayerId } from '../utils/socket';

function BombGamePlayer({ pin }) {
  const [bombState, setBombState] = useState(null);
  const [bombExploded, setBombExploded] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [invalidMsg, setInvalidMsg] = useState('');
  const [isWaitingForJudge, setIsWaitingForJudge] = useState(false);

  useEffect(() => {
    socket.on('bombState', (data) => {
      setBombState(prev => {
        if (data.timeRemaining <= 5 && data.timeRemaining > 0 && (!prev || prev.timeRemaining !== data.timeRemaining)) {
          if (window.soundFX) window.soundFX.playTick();
        }
        return data;
      });
      setBombExploded(false);
      setInvalidMsg('');
    });

    socket.on('bombExploded', ({ id }) => {
      // 폭발 이벤트 시 화면 처리
      if (id === getPlayerId()) {
        if (window.soundFX) window.soundFX.playExplosion();
        setBombExploded(true);
      }
    });

    socket.on('invalidBombWord', ({ message }) => {
      if (window.soundFX) window.soundFX.playWrong();
      setInvalidMsg(message);
      setIsWaitingForJudge(false);
    });

    socket.on('bombPassed', () => {
      if (window.soundFX) window.soundFX.playCorrect();
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

  const isMyTurn = getPlayerId() === bombState.currentPlayerId;
  const isSpectator = !bombState.activePlayers.includes(getPlayerId());

  if (bombExploded || isSpectator) {
    return (
      <div className={`ow-panel ${bombExploded ? 'bomb-exploded' : ''}`} style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 className="ow-title" style={{ fontSize: '4rem', color: bombExploded ? 'var(--ow-error)' : 'var(--ow-text-muted)' }}>
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
        
        <h2 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--ow-secondary)' }}>
          카테고리: {bombState.category}
        </h2>
        
        <div style={{ 
          margin: '2rem 0', 
          fontSize: isMyTurn ? '8rem' : '4rem', 
          fontFamily: 'Space Grotesk', 
          color: isMyTurn ? 'var(--ow-error)' : 'var(--ow-surface-light)',
          lineHeight: 1
        }}>
          {bombState.timeRemaining}s
        </div>

        {isMyTurn ? (
          <div className="ow-panel">
            <h3 style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0', fontSize: '2rem' }}>🔥 내 차례입니다! 빨리 입력하세요! 🔥</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                value={wordInput} 
                onChange={(e) => setWordInput(e.target.value)}
                placeholder="단어 입력..."
                style={{ fontSize: '2rem', padding: '1rem', width: '100%', boxSizing: 'border-box' }}
                autoFocus
                disabled={isWaitingForJudge}
              />
              {isWaitingForJudge ? (
                <div style={{ padding: '1.5rem', background: 'var(--ow-primary-dim)', color: 'white', textAlign: 'center', fontSize: '1.5rem', borderRadius: '4px' }}>
                  호스트 확인 중... ⏳
                </div>
              ) : (
                <button type="submit" className="ow-btn" style={{ fontSize: '2rem', padding: '1rem' }}>
                  입력
                </button>
              )}
            </form>
            {invalidMsg && <p style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '1rem' }}>{invalidMsg}</p>}
          </div>
        ) : (
          <div style={{ fontSize: '2rem', color: '#666', fontFamily: 'Manrope' }}>
            <strong style={{ color: 'var(--ow-primary)' }}>
              {bombState.playersInfo.find(p => p.id === bombState.currentPlayerId)?.nickname}
            </strong>님의 턴을 기다리는 중...
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', background: 'white', padding: '1rem', borderRadius: '8px', border: '2px solid #ccc' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--ow-surface-light)' }}>나온 단어들 (중복 불가)</h4>
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
