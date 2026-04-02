import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { Check, X } from 'lucide-react';
import Confetti from 'react-confetti';

function SentencePuzzlePlayer({ pin, nickname }) {
  const [tokens, setTokens] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [puzzleInfo, setPuzzleInfo] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [raceData, setRaceData] = useState(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    socket.on('playerNewPuzzle', ({ tokens, index, total }) => {
      setTokens(tokens);
      setSelectedTokens([]);
      setPuzzleInfo({ index, total });
      setFeedback(null);
    });

    socket.on('sentenceRaceState', (data) => {
      setRaceData(data);
    });

    socket.on('sentenceRaceCorrect', () => {
      if (window.soundFX) window.soundFX.playCorrect();
      setFeedback('correct');
    });

    socket.on('sentenceRaceWrong', () => {
      if (window.soundFX) window.soundFX.playWrong();
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        // 틀리면 자동 리셋
        setTokens(prev => [...selectedTokens, ...prev].sort((a,b) => 0.5 - Math.random()));
        setSelectedTokens([]);
      }, 500);
    });

    socket.on('sentenceRaceFinished', () => {
      setFinished(true);
      if (window.soundFX) window.soundFX.playWin();
    });

    socket.on('puzzleCorrectAnswer', ({ finalLeaderboard }) => {
      // 게임 완전 종료
      if (!finished) setFinished(true);
      setRaceData(prev => ({ ...prev, leaderboard: finalLeaderboard, ended: true }));
    });

    return () => {
      socket.off('playerNewPuzzle');
      socket.off('sentenceRaceState');
      socket.off('sentenceRaceCorrect');
      socket.off('sentenceRaceWrong');
      socket.off('sentenceRaceFinished');
      socket.off('puzzleCorrectAnswer');
    };
  }, [selectedTokens, finished]);

  useEffect(() => {
    // 마지막 토큰까지 모두 선택되었으면 자동 제출
    if (puzzleInfo && tokens.length === 0 && selectedTokens.length > 0 && !feedback && !finished) {
      const submittedSentence = selectedTokens.map(t => t.text).join(' ');
      socket.emit('submitSentence', { pin, submittedSentence });
    }
  }, [tokens, selectedTokens, puzzleInfo, feedback, finished, pin]);

  const handleSelect = (token) => {
    if (feedback || finished) return;
    setTokens(prev => prev.filter(t => t.id !== token.id));
    setSelectedTokens(prev => [...prev, token]);
    if (window.soundFX) window.soundFX.playTick();
  };

  const handleDeselect = (token) => {
    if (feedback || finished) return;
    setSelectedTokens(prev => prev.filter(t => t.id !== token.id));
    setTokens(prev => [...prev, token]);
    if (window.soundFX) window.soundFX.playTick();
  };

  if (finished || raceData?.ended) {
    const sortedLeaderboard = raceData?.leaderboard || [];
    const myRankIndex = sortedLeaderboard.findIndex(p => p.nickname === nickname);
    const myRank = myRankIndex >= 0 ? myRankIndex + 1 : '-';

    return (
      <div className="animate-enter" style={{ padding: '2rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />
        <h1 className="display-lg ultimate-win" style={{ color: 'var(--ow-primary)', marginBottom: '1rem', textShadow: '0 0 20px var(--ow-primary)', fontSize: '4rem' }}>RACE FINISHED!</h1>
        <h2 style={{ fontSize: '2rem', color: '#fff' }}>YOUR RANK: #{myRank}</h2>
        <p style={{ marginTop: '2rem', color: '#ccc' }}>Look at the main screen for final results!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
         <div className="display-lg" style={{ color: raceData?.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 10px currentColor' }}>
           {raceData?.timeRemaining || 180}s
         </div>
         <div style={{ textAlign: 'right' }}>
           <div className="body-md" style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{nickname}</div>
           {puzzleInfo && (
             <div className="headline-lg" style={{ color: 'var(--ow-primary)' }}>
               {puzzleInfo.index + 1} / {puzzleInfo.total}
             </div>
           )}
         </div>
      </div>

      {puzzleInfo ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {feedback === 'correct' && (
            <div className="feedback-overlay anim-correct">
              <h1 style={{ fontSize: '6rem', color: '#33ff33', textShadow: '0 0 20px #33ff33' }}>GREAT!</h1>
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="feedback-overlay anim-wrong">
              <h1 style={{ fontSize: '5rem', color: '#ff3333', textShadow: '0 0 20px #ff3333' }}>MISS!</h1>
            </div>
          )}

          {/* Constructed Sentence Area */}
          <div className="sci-fi-terminal" style={{ minHeight: '120px', padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', 
            display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignContent: 'flex-start', border: '2px solid rgba(255,255,255,0.1)' }}>
            {selectedTokens.length === 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem', margin: 'auto' }}>Tap words below to build sentence</span>}
            {selectedTokens.map(t => (
              <button 
                key={t.id} 
                className="ow-btn" 
                style={{ padding: '0.5rem 1rem', fontSize: '1.5rem', height: 'fit-content' }}
                onClick={() => handleDeselect(t)}
              >
                {t.text}
              </button>
            ))}
          </div>

          {/* Unused Words Area */}
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignContent: 'flex-start' }}>
            {tokens.map(t => (
              <button 
                key={t.id} 
                className="ow-btn-secondary" 
                style={{ padding: '0.5rem 1rem', fontSize: '1.5rem', fontWeight: 'bold' }}
                onClick={() => handleSelect(t)}
              >
                {t.text}
              </button>
            ))}
          </div>

        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.5)' }}>WAITING FOR RACE...</h1>
        </div>
      )}

      {/* Mini Leaderboard at Bottom */}
      {raceData?.leaderboard && (
         <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
           <div style={{ fontSize: '0.9rem', color: 'var(--ow-secondary)', marginBottom: '0.5rem' }}>LIVE RANKING</div>
           <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
             {raceData.leaderboard.slice(0, 3).map((p, idx) => (
               <div key={p.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', minWidth: '120px' }}>
                 <div style={{ color: idx === 0 ? 'var(--ow-primary)' : idx === 1 ? 'var(--ow-secondary)' : '#b87333', fontWeight: 'bold', marginRight: '0.5rem' }}>#{idx + 1}</div>
                 <div style={{ flex: 1, color: p.nickname === nickname ? 'white' : '#aaa', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.nickname}</div>
                 <div style={{ color: '#fff', marginLeft: '0.5rem' }}>{p.score}</div>
               </div>
             ))}
           </div>
         </div>
      )}

    </div>
  );
}

export default SentencePuzzlePlayer;

