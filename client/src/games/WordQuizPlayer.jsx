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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--ow-primary)', margin: '1rem 0' }}>WORD QUIZ CHAMPIONSHIP</h2>
      
      {question ? (
        <div className="ow-panel speed-thrust" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '1rem', background: 'var(--ow-surface)' }}>
           {result ? (
             <div style={{ textAlign: 'center' }}>
               <h1 className="display-lg" style={{ fontSize: '4rem', margin: 0, color: result === 'correct' ? 'var(--ow-primary-dim)' : 'var(--ow-error)' }}>
                 {result === 'correct' ? 'CORRECT!' : result === 'waiting' ? 'WAIT...' : result.toUpperCase()}
               </h1>
             </div>
           ) : (
             <form onSubmit={handleAnswer} style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
               <h3 className="headline-lg" style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '3rem', color: 'var(--on-surface-variant)' }}>
                 TYPE THE ANSWER!
               </h3>
               
               <input 
                 ref={inputRef}
                 type="text" 
                 value={inputValue} 
                 onChange={e => setInputValue(e.target.value)}
                 autoComplete="off"
                 autoCorrect="off"
                 spellCheck="false"
                 style={{ 
                   width: '100%', 
                   maxWidth: '400px',
                   padding: '2rem', 
                   fontSize: '3rem', 
                   textAlign: 'center',
                   background: 'rgba(0,0,0,0.5)',
                   border: '2px solid var(--ow-primary)',
                   color: 'var(--on-surface)',
                   borderRadius: '1.5rem',
                   marginBottom: '2rem',
                   boxShadow: '0 0 20px rgba(0,0,0,0.3) inset'
                 }} 
               />

               <button 
                 type="submit"
                 className="ow-btn neon-glow" 
                 style={{ fontSize: '2.5rem', padding: '1.5rem 4rem', minWidth: '200px' }}
                 disabled={!inputValue.trim()}
               >
                 <span>SUBMIT</span>
               </button>
             </form>
           )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h1 className="display-lg" style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>WAITING FOR QUESTION...</h1>
        </div>
      )}
    </div>
  );
}

export default WordQuizPlayer;
