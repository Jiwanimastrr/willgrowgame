import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { Check, X } from 'lucide-react';

function SpeedRacePlayer({ pin, nickname }) {
  const [question, setQuestion] = useState(null); // { meaning, options: [] }
  const [raceData, setRaceData] = useState(null); // { type, timeRemaining, isActive, teams, playersInfo }
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
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
    if (feedback || !question) return; // 피드백 중이거나 문제가 없으면 클릭 무시
    socket.emit('submitRaceAnswer', { pin, answer: ans });
  };

  if (raceData && !raceData.isActive) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', color: 'var(--ow-red)', transform: 'skewX(-2deg)' }}>RACE FINISHED</h1>
        <h2 style={{ fontSize: '2rem', fontFamily: 'Noto Sans KR' }}>내 점수: {playerInfo?.score || 0}점</h2>
        {raceData.type === 'team' && playerInfo?.team && (
           <h2 style={{ fontSize: '2rem', color: 'var(--ow-blue)' }}>우리팀: {raceData.teams[playerInfo.team]}점</h2>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
      {/* 상단 정보 영역 (헤더) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
         <div style={{ fontSize: '3rem', fontFamily: 'Teko', color: raceData?.timeRemaining <= 10 ? 'var(--ow-red)' : 'var(--ow-dark)' }}>
           {raceData?.timeRemaining || 60}s
         </div>
         <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '1.2rem', fontFamily: 'Noto Sans KR', fontWeight: 'bold' }}>{nickname}</div>
           <div style={{ fontSize: '2rem', fontFamily: 'Teko', color: 'var(--ow-orange)' }}>SCORE: {playerInfo?.score || 0}</div>
           {raceData?.type === 'team' && playerInfo?.team && (
             <div style={{ fontSize: '1.5rem', fontFamily: 'Teko', color: playerInfo.team === 'RED' ? '#ef4444' : playerInfo.team === 'BLUE' ? '#3b82f6' : playerInfo.team === 'GREEN' ? '#22c55e' : '#eab308' }}>
               {playerInfo.team} TEAM: {raceData.teams[playerInfo.team] || 0}
             </div>
           )}
         </div>
      </div>

      {/* 문제 컴포넌트 */}
      {question ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          {/* 피드백 애니메이션 (O/X) */}
          {feedback && (
             <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center',
                width: '150px', height: '150px', borderRadius: '50%',
                background: feedback === 'correct' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                animation: 'pulse 0.5s ease-out'
             }}>
                {feedback === 'correct' ? <Check size={80} color="white" /> : <X size={80} color="white" />}
             </div>
          )}

          <div className="ow-panel" style={{ textAlign: 'center', transform: 'skewX(-2deg)', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '3rem', fontFamily: 'Noto Sans KR', color: 'var(--ow-darker)', margin: '1rem 0' }}>
              {question.meaning}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {question.options.map((opt, idx) => {
              const colors = ['blue', 'red', 'dark', 'green'];
              const bcolor = colors[idx % 4];
              
              return (
                <button
                  key={idx}
                  className={`ow-button ${bcolor}`}
                  style={{ 
                    padding: '2rem', 
                    fontSize: '1.5rem', 
                    justifyContent: 'center',
                    opacity: feedback ? 0.7 : 1,
                    pointerEvents: feedback ? 'none' : 'auto'
                  }}
                  onClick={() => handleAnswer(opt)}
                >
                  <span style={{ transform: 'skewX(10deg)', fontFamily: 'Noto Sans KR', fontWeight: 'bold' }}>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <h2 style={{ fontSize: '2rem', color: '#888', fontStyle: 'italic' }}>문제를 기다리는 중...</h2>
        </div>
      )}
    </div>
  );
}

export default SpeedRacePlayer;
