import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { Check, X } from 'lucide-react';
import Confetti from 'react-confetti';

function SpeedRacePlayer({ pin, nickname }) {
  const [question, setQuestion] = useState(null);
  const [raceData, setRaceData] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);

  useEffect(() => {
    socket.on('raceNewQuestion', (q) => {
      setQuestion(q);
      setFeedback(null);
    });

    socket.on('raceCorrectAnswer', () => {
      if (window.soundFX) window.soundFX.playCorrect();
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 800);
    });

    socket.on('raceWrongAnswer', () => {
      if (window.soundFX) window.soundFX.playWrong();
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 800);
    });

    socket.on('raceState', (data) => {
      setRaceData(data);
      if (data.timeRemaining <= 5 && data.timeRemaining > 0) {
        if (window.soundFX) window.soundFX.playTick();
      }
      const me = data.playersInfo?.find(p => p.nickname === nickname);
      if (me) setPlayerInfo(me);
    });

    return () => {
      socket.off('raceNewQuestion');
      socket.off('raceCorrectAnswer');
      socket.off('raceWrongAnswer');
      socket.off('raceState');
    };
  }, [nickname]);

  const handleAnswer = (ans) => {
    if (feedback || !question) return;
    socket.emit('submitRaceAnswer', { pin, answer: ans });
  };

  if (raceData && !raceData.isActive) {
    return (
      <div className="animate-enter" style={{ padding: '2rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />
        <h1 className="display-lg ultimate-win" style={{ color: 'var(--ow-primary)', marginBottom: '2rem', textShadow: '0 0 20px var(--ow-primary)', fontSize: '5rem' }}>RACE FINISHED</h1>
        <div className="sci-fi-terminal" style={{ padding: '3rem', borderRadius: '1rem', display: 'inline-block', margin: '0 auto' }}>
          <h2 className="headline-lg" style={{ color: 'var(--on-surface)', fontSize: '3rem' }}>SCORE: {playerInfo?.score || 0} PTS</h2>
          {raceData.type === 'team' && playerInfo?.team && (
             <h2 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginTop: '2rem', fontSize: '2.5rem' }}>[{playerInfo.team} TEAM]: {raceData.teams[playerInfo.team]} PTS</h2>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', boxSizing: 'border-box' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
         <div className="display-lg" style={{ color: raceData?.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 15px currentColor' }}>
           {raceData?.timeRemaining || 60}s
         </div>
         <div style={{ textAlign: 'right' }}>
           <div className="body-md" style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{nickname}</div>
           <div className="headline-lg" style={{ color: 'var(--ow-primary)' }}>SCORE: {playerInfo?.score || 0}</div>
           {raceData?.type === 'team' && playerInfo?.team && (
             <div className="headline-lg" style={{ color: playerInfo.team === 'RED' ? '#ef4444' : playerInfo.team === 'BLUE' ? '#3b82f6' : playerInfo.team === 'GREEN' ? '#22c55e' : '#eab308' }}>
               {playerInfo.team} TEAM: {raceData.teams[playerInfo.team] || 0}
             </div>
           )}
         </div>
      </div>

      {/* Main Play Area */}
      {question ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          
          {/* 화면 전체 피드백 오버레이 */}
          {feedback === 'correct' && (
            <div className="feedback-overlay anim-correct">
              <h1 style={{ fontSize: '8rem', color: '#33ff33', textShadow: '0 0 30px #33ff33' }}>HIT</h1>
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="feedback-overlay anim-wrong">
              <h1 style={{ fontSize: '6rem', color: '#ff3333', textShadow: '0 0 30px #ff3333', textAlign: 'center' }}>MISS</h1>
            </div>
          )}

          <div className="sci-fi-terminal speed-thrust" style={{ textAlign: 'center', marginBottom: '3rem', padding: '3rem 2rem', borderRadius: '1rem' }}>
            <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: 0, textShadow: '0 0 15px currentColor' }}>
              {question.meaning}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', zIndex: 10 }}>
            {question.options.map((opt, idx) => {
              const buttonClass = idx === 0 || idx === 3 ? 'ow-btn' : 'ow-btn-secondary';
              return (
                <button
                  key={idx}
                  className={`${buttonClass} huge-hitbox`}
                  style={{ 
                    opacity: feedback ? 0.7 : 1,
                    pointerEvents: feedback ? 'none' : 'auto',
                    padding: '0.5rem',
                    minHeight: '120px',
                    borderRadius: '8px'
                  }}
                  onClick={() => handleAnswer(opt)}
                >
                  <span style={{ 
                    fontFamily: '"Pretendard", "Roboto", "Helvetica Neue", Arial, sans-serif', 
                    fontWeight: 900, 
                    textAlign: 'center', 
                    fontSize: 'clamp(1.2rem, 5vw, 2.4rem)', 
                    lineHeight: '1.3', 
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    color: '#ffffff',
                    letterSpacing: '0px',
                    textShadow: '2px 2px 5px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)' 
                  }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <h2 className="headline-lg pulse-wait-text" style={{ fontSize: '3rem' }}>AWAITING TARGETS...</h2>
        </div>
      )}
    </div>
  );
}

export default SpeedRacePlayer;
