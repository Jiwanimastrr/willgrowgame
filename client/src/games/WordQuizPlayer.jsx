import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';

function WordQuizPlayer({ pin, nickname }) {
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null); // 'waiting', 'correct', 'incorrect'

  useEffect(() => {
    socket.on('playerNewQuestion', (data) => {
      setQuestion(data);
      setResult(null); // 문제 초기화 시 UI 리셋
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

  const handleAnswer = (answer) => {
    socket.emit('submitWordQuiz', { pin, answer });
    setResult('waiting');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--ow-primary)', margin: '1rem 0' }}>WORD QUIZ CHAMPIONSHIP</h2>
      
      {question ? (
        <div className="ow-panel speed-thrust" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '1rem', background: 'var(--ow-surface)' }}>
           {result ? (
             <div style={{ textAlign: 'center' }}>
               <h1 style={{ fontSize: '3rem', margin: 0, color: result === 'correct' ? 'var(--ow-primary-dim)' : 'var(--ow-error)' }}>
                 {result === 'correct' ? 'CORRECT!' : result === 'waiting' ? 'WAIT...' : result}
               </h1>
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
               <h3 style={{ fontSize: '2rem', textAlign: 'center', fontFamily: 'Space Grotesk', marginBottom: '2rem', color: '#666' }}>
                 CHOOSE THE RIGHT ONE
               </h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', flex: 1 }}>
                 {question.options.map((opt, idx) => (
                   <button 
                     key={idx} 
                     className="ow-btn" 
                     onClick={() => handleAnswer(opt)}
                     style={{ minWidth: '0', fontSize: '2rem', padding: '1.5rem', background: 'var(--ow-secondary)', border: 'none' }}
                   >
                     <span style={{ }}>{opt.toUpperCase()}</span>
                   </button>
                 ))}
               </div>
             </div>
           )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.5)' }}>WAITING FOR QUESTION...</h1>
        </div>
      )}
    </div>
  );
}

export default WordQuizPlayer;
