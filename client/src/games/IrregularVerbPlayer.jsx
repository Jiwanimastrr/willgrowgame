import { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';
import { Check, X, Send } from 'lucide-react';

function IrregularVerbPlayer({ pin, nickname }) {
  const [question, setQuestion] = useState(null);
  const [verbData, setVerbData] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    socket.on('verbNewQuestion', (q) => {
      setQuestion(q);
      setFeedback(null);
      setInputValue('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    });

    socket.on('verbCorrectAnswer', () => {
      if (window.soundFX) window.soundFX.playCorrect();
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 800);
    });

    socket.on('verbWrongAnswer', () => {
      if (window.soundFX) window.soundFX.playWrong();
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 800);
    });

    socket.on('verbState', (data) => {
      setVerbData(data);
      if (data.timeRemaining <= 5 && data.timeRemaining > 0) {
        if (window.soundFX) window.soundFX.playTick();
      }
      const me = data.playersInfo?.find(p => p.nickname === nickname);
      if (me) setPlayerInfo(me);
    });

    return () => {
      socket.off('verbNewQuestion');
      socket.off('verbCorrectAnswer');
      socket.off('verbWrongAnswer');
      socket.off('verbState');
    };
  }, [nickname]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedback || !question || !inputValue.trim()) return;
    socket.emit('submitVerbAnswer', { pin, answer: inputValue });
  };

  if (verbData && !verbData.isActive) {
    return (
      <div className="animate-enter" style={{ padding: '2rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 className="display-lg neon-glow" style={{ color: 'var(--ow-primary)', marginBottom: '2rem' }}>RACE FINISHED</h1>
        <h2 className="headline-lg" style={{ color: 'var(--on-surface)' }}>내 점수: {playerInfo?.score || 0}점</h2>
      </div>
    );
  }

  return (
    <div className="animate-enter player-container">
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
         <div className="display-lg" style={{ color: verbData?.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 15px currentColor' }}>
           {verbData?.timeRemaining || 60}s
         </div>
         <div style={{ textAlign: 'right' }}>
           <div className="body-md" style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{nickname}</div>
           <div className="headline-lg" style={{ color: 'var(--ow-primary)' }}>SCORE: {playerInfo?.score || 0}</div>
         </div>
      </div>

      {/* Main Play Area */}
      {question ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          
          {feedback && (
             <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center',
                width: '180px', height: '180px', borderRadius: '50%',
                background: feedback === 'correct' ? 'rgba(197, 255, 201, 0.9)' : 'rgba(255, 110, 132, 0.9)',
                boxShadow: feedback === 'correct' ? '0 0 40px var(--ow-primary-dim)' : '0 0 40px var(--ow-error)',
                animation: 'pulse-glow 0.5s ease-out forwards'
             }}>
                {feedback === 'correct' ? <Check size={100} color="var(--bg-base)" /> : <X size={100} color="var(--bg-base)" />}
             </div>
          )}

          <div className="ow-panel speed-thrust" style={{ textAlign: 'center', marginBottom: '2rem', padding: '3rem 2rem' }}>
            <h2 className="display-lg" style={{ color: 'var(--ow-secondary)', margin: '0 0 1rem 0', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
              {question.meaning}
            </h2>
            <div className="headline-lg" style={{ color: 'var(--on-surface-variant)' }}>
              다음 형태를 영어로 입력하세요: <span style={{ color: 'var(--ow-primary)', textDecoration: 'underline' }}>{question.targetForm}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
             <input
               ref={inputRef}
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               placeholder="Write the correct form..."
               disabled={!!feedback}
               className="ow-input"
               style={{ 
                 fontSize: '2rem', 
                 padding: '2rem', 
                 textAlign: 'center',
                 borderRadius: '12px',
                 border: '2px solid var(--ow-primary-dim)'
               }}
               autoComplete="off"
               autoCorrect="off"
               autoCapitalize="none"
             />
             <button
               type="submit"
               className="ow-btn"
               disabled={!inputValue.trim() || !!feedback}
               style={{ 
                 padding: '2rem', 
                 fontSize: '1.5rem', 
                 display: 'flex',
                 justifyContent: 'center',
                 alignItems: 'center',
                 gap: '1rem'
               }}
             >
               <span>SUBMIT</span> <Send size={24} />
             </button>
          </form>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <h2 className="headline-lg neon-glow" style={{ color: 'var(--on-surface-variant)' }}>Waiting for Game...</h2>
        </div>
      )}
    </div>
  );
}

export default IrregularVerbPlayer;
