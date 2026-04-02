import { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';

function WordQuizPlayer({ pin, nickname }) {
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null); // 'waiting', 'correct', 'incorrect'
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    socket.on('playerNewQuestion', (data) => {
      setQuestion(data);
      setResult(null); // 문제 초기화 시 UI 리셋
      setInputValue('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    });

    socket.on('correctAnswer', ({ winnerId, winnerNickname }) => {
      if (winnerId === socket.id) {
        if (window.soundFX) window.soundFX.playCorrect();
        setResult('correct');
      } else {
        if (window.soundFX) window.soundFX.playWrong();
        setResult(`Winner: ${winnerNickname}`);
      }
    });

    return () => {
      socket.off('playerNewQuestion');
      socket.off('correctAnswer');
    };
  }, []);

  const handleAnswer = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    socket.emit('submitWordQuiz', { pin, answer: inputValue });
    setResult('waiting');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', position: 'relative' }}>
      
      {/* 화면 전체 피드백 오버레이 */}
      {result === 'correct' && (
        <div className="feedback-overlay anim-correct">
          <h1 style={{ fontSize: '8rem', color: '#33ff33', textShadow: '0 0 30px #33ff33' }}>SUCCESS</h1>
        </div>
      )}
      {result && result !== 'correct' && result !== 'waiting' && (
        <div className="feedback-overlay anim-wrong">
          <h1 style={{ fontSize: '6rem', color: '#ff3333', textShadow: '0 0 30px #ff3333', textAlign: 'center' }}>{result.toUpperCase()}</h1>
        </div>
      )}

      <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--ow-primary)', margin: '1rem 0', letterSpacing: '3px' }}>[ TERMINAL UPLINK ]</h2>
      
      {question ? (
        <div className="sci-fi-terminal" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '1rem', borderRadius: '1rem' }}>
           {result ? (
             <div style={{ textAlign: 'center', zIndex: 10 }}>
               <h1 className="display-lg" style={{ fontSize: '4rem', margin: 0, color: result === 'correct' ? 'var(--ow-success)' : 'var(--ow-error)' }}>
                 {result === 'correct' ? 'ACCEPTED' : result === 'waiting' ? 'VERIFYING...' : 'FAILED'}
               </h1>
             </div>
           ) : (
             <form onSubmit={handleAnswer} style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                {question.meaning && (
                  <div style={{ 
                    fontSize: '3rem', fontWeight: 700, color: '#fff', textAlign: 'center', 
                    marginBottom: '1.5rem', padding: '1rem 2rem',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    textShadow: '0 0 15px rgba(204,151,255,0.4)'
                  }}>
                    {question.meaning}
                  </div>
                )}
                <h3 className="headline-lg" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '2rem', color: 'var(--ow-secondary)', textTransform: 'uppercase' }}>
                  영어 단어를 입력하세요
                </h3>
               
               <input 
                 ref={inputRef}
                 type="text" 
                 value={inputValue} 
                 onChange={e => setInputValue(e.target.value)}
                 autoComplete="off"
                 autoCorrect="off"
                 spellCheck="false"
                 className="sci-fi-input"
                 style={{ 
                   width: '100%', 
                   maxWidth: '500px',
                   padding: '1rem', 
                   fontSize: '4rem', 
                   marginBottom: '3rem'
                 }} 
               />

               <button 
                 type="submit"
                 className="ow-btn neon-glow" 
                 style={{ fontSize: '2.5rem', padding: '1rem 4rem', minWidth: '250px' }}
                 disabled={!inputValue.trim()}
               >
                 <span>TRANSMIT</span>
               </button>
             </form>
           )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h1 className="display-lg pulse-wait-text" style={{ fontSize: '3rem', textAlign: 'center' }}>WAITING FOR DATA...</h1>
        </div>
      )}
    </div>
  );
}

export default WordQuizPlayer;
