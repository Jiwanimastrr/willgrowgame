import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { Check, X } from 'lucide-react';

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
      setFeedback('correct');
      setTimeout(() => setFeedback(null), 800);
    });

    socket.on('raceWrongAnswer', () => {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 800);
    });

    socket.on('raceState', (data) => {
      setRaceData(data);
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
        <h1 className="display-lg neon-glow" style={{ color: 'var(--primary)', marginBottom: '2rem' }}>RACE FINISHED</h1>
        <h2 className="headline-lg" style={{ color: 'var(--on-surface)' }}>내 점수: {playerInfo?.score || 0}점</h2>
        {raceData.type === 'team' && playerInfo?.team && (
           <h2 className="headline-lg" style={{ color: 'var(--secondary)', marginTop: '1rem' }}>우리팀({playerInfo.team}): {raceData.teams[playerInfo.team]}점</h2>
        )}
      </div>
    );
  }

  return (
    <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem', boxSizing: 'border-box' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
         <div className="display-lg" style={{ color: raceData?.timeRemaining <= 10 ? 'var(--error)' : 'var(--secondary)', textShadow: '0 0 15px currentColor' }}>
           {raceData?.timeRemaining || 60}s
         </div>
         <div style={{ textAlign: 'right' }}>
           <div className="body-md" style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{nickname}</div>
           <div className="headline-lg" style={{ color: 'var(--primary)' }}>SCORE: {playerInfo?.score || 0}</div>
           {raceData?.type === 'team' && playerInfo?.team && (
             <div className="headline-lg" style={{ color: playerInfo.team === 'RED' ? 'var(--error)' : playerInfo.team === 'BLUE' ? 'var(--secondary)' : playerInfo.team === 'GREEN' ? 'var(--tertiary)' : 'var(--primary)' }}>
               {playerInfo.team} TEAM: {raceData.teams[playerInfo.team] || 0}
             </div>
           )}
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
                background: feedback === 'correct' ? 'rgba(197, 255, 201, 0.9)' : 'rgba(255, 110, 132, 0.9)', /* tertiary or error */
                boxShadow: feedback === 'correct' ? '0 0 40px var(--tertiary)' : '0 0 40px var(--error)',
                animation: 'pulse-glow 0.5s ease-out forwards'
             }}>
                {feedback === 'correct' ? <Check size={100} color="var(--bg-base)" /> : <X size={100} color="var(--bg-base)" />}
             </div>
          )}

          <div className="glass-panel" style={{ textAlign: 'center', marginBottom: '3rem', padding: '3rem 2rem' }}>
            <h2 className="display-lg" style={{ color: 'var(--on-surface)', margin: 0, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
              {question.meaning}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {question.options.map((opt, idx) => {
              // Create variants for modern look
              const buttonClass = idx === 0 || idx === 3 ? 'btn-primary' : 'btn-secondary';
              
              return (
                <button
                  key={idx}
                  className={buttonClass}
                  style={{ 
                    padding: '3rem 1rem', 
                    fontSize: '1.5rem', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: feedback ? 0.7 : 1,
                    pointerEvents: feedback ? 'none' : 'auto',
                    minHeight: '120px'
                  }}
                  onClick={() => handleAnswer(opt)}
                >
                  <span className="headline-lg" style={{ wordBreak: 'break-word', textAlign: 'center' }}>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <h2 className="headline-lg neon-glow" style={{ color: 'var(--on-surface-variant)' }}>Waiting for Question...</h2>
        </div>
      )}
    </div>
  );
}

export default SpeedRacePlayer;
