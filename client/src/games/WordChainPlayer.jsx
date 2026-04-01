import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { AlertCircle } from 'lucide-react';

function WordChainPlayer({ pin, nickname }) {
  const [chainData, setChainData] = useState(null);
  const [inputWord, setInputWord] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [eliminated, setEliminated] = useState(false);
  const [isWaitingForJudge, setIsWaitingForJudge] = useState(false);

  useEffect(() => {
    socket.on('wordChainState', (data) => {
      setChainData(data);
      setAlertMsg('');
    });

    socket.on('playerEliminated', ({ id }) => {
      if (id === socket.id) {
        setEliminated(true);
      }
    });

    socket.on('invalidWord', ({ message }) => {
      setAlertMsg(message);
      setIsWaitingForJudge(false);
    });

    socket.on('waitingForJudge', () => {
      setIsWaitingForJudge(true);
    });

    socket.on('judgeComplete', () => {
      setIsWaitingForJudge(false);
      setInputWord('');
    });

    return () => {
      socket.off('wordChainState');
      socket.off('playerEliminated');
      socket.off('invalidWord');
      socket.off('waitingForJudge');
      socket.off('judgeComplete');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputWord.trim() || isWaitingForJudge) return;
    
    socket.emit('submitChainWord', { pin, word: inputWord.trim() });
    // inputWord는 심사가 끝난 후 초기화됨
  };

  if (eliminated) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '4rem', color: 'var(--error)' }}>ELIMINATED</h1>
        <p style={{ fontSize: '1.5rem' }}>You didn't answer in time!</p>
      </div>
    );
  }

  if (!chainData) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ fontSize: '3rem', color: 'gray' }}>WAITING...</h2>
      </div>
    );
  }

  const isMyTurn = chainData.currentPlayerId === socket.id;
  const lastWord = chainData.chain[chainData.chain.length - 1];
  const requiredLetter = lastWord.charAt(lastWord.length - 1).toUpperCase();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', alignItems: 'center' }}>
      <h2 style={{ fontSize: '2rem', color: 'var(--surface-high)', margin: '1rem 0', textShadow: '2px 2px 0 var(--primary)' }}>WORD CHAIN SURVIVAL</h2>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ fontSize: '1.5rem', color: 'gray', marginBottom: '1rem' }}>
          Last Word:
        </div>
        <div style={{ fontSize: '3.5rem', fontFamily: 'Space Grotesk', color: 'var(--secondary)', lineHeight: 1 }}>
          {lastWord.toUpperCase()}
        </div>
        
        <div style={{ margin: '2rem 0', width: '100%', borderBottom: '2px solid #ccc', position: 'relative' }}>
          {/* Progress Bar for Timer */}
          <div style={{ 
            position: 'absolute', 
            bottom: 0, left: 0, 
            height: '4px', 
            background: chainData.timeRemaining <= 5 ? 'var(--error)' : 'var(--primary)', 
            width: `${(chainData.timeRemaining / 15) * 100}%`,
            transition: 'width 1s linear'
          }}></div>
        </div>

        {isMyTurn ? (
          <form style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleSubmit}>
            <div style={{ fontSize: '1.5rem', color: 'var(--error)', fontWeight: 'bold', textAlign: 'center' }}>
              YOUR TURN! Start with: <span style={{ fontSize: '2.5rem', fontFamily: 'Space Grotesk' }}>{requiredLetter}</span>
            </div>
            
            <input 
              type="text" 
              className="luxe-input" 
              autoFocus 
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              placeholder={`Starts with ${requiredLetter}...`}
              style={{ fontSize: '2rem', padding: '1rem' }}
            />
            {alertMsg && (
              <div style={{ color: 'var(--error)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(210,60,50,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                <AlertCircle size={16} />
                {alertMsg}
              </div>
            )}
            
            {isWaitingForJudge ? (
              <div style={{ padding: '1.5rem', background: 'var(--tertiary)', color: 'white', textAlign: 'center', fontSize: '1.5rem', borderRadius: '4px' }}>
                호스트 승인 대기 중... ⏳
              </div>
            ) : (
              <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '2rem' }}>
                <span>SUBMIT</span>
              </button>
            )}
          </form>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: 'gray' }}>Waiting for other player...</div>
            <div style={{ fontSize: '2rem', fontFamily: 'Manrope', fontWeight: 'bold', color: 'var(--surface-high)' }}>
              {chainData.timeRemaining}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WordChainPlayer;
