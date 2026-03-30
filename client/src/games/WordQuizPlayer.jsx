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
        setResult('correct');
      } else {
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
      <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--ow-orange)', margin: '1rem 0' }}>WORD QUIZ CHAMPIONSHIP</h2>
      
      {question ? (
        <div className="ow-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '1rem', background: '#fff', transform: 'skewX(-2deg)' }}>
           {result ? (
             <div style={{ textAlign: 'center', transform: 'skewX(2deg)' }}>
               <h1 style={{ fontSize: '3rem', margin: 0, color: result === 'correct' ? 'var(--ow-green)' : 'var(--ow-red)' }}>
                 {result === 'correct' ? 'CORRECT!' : result === 'waiting' ? 'WAIT...' : result}
               </h1>
             </div>
           ) : (
             <div style={{ transform: 'skewX(2deg)', display: 'flex', flexDirection: 'column', height: '100%' }}>
               <h3 style={{ fontSize: '2rem', textAlign: 'center', fontFamily: 'Teko', marginBottom: '2rem', color: '#666' }}>
                 CHOOSE THE RIGHT ONE
               </h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', flex: 1 }}>
                 {question.options.map((opt, idx) => (
                   <button 
                     key={idx} 
                     className="ow-button" 
                     onClick={() => handleAnswer(opt)}
                     style={{ minWidth: '0', fontSize: '2rem', padding: '1.5rem', background: 'var(--ow-blue)', transform: 'skewX(-5deg)', border: 'none' }}
                   >
                     <span style={{ transform: 'skewX(5deg)' }}>{opt.toUpperCase()}</span>
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
