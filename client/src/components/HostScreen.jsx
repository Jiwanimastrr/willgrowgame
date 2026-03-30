import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../utils/socket';
import { Users, Play } from 'lucide-react';

function HostScreen() {
  const [pin, setPin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('lobby');
  const [quizData, setQuizData] = useState(null); // { meaning, answer, winner }
  const [puzzleData, setPuzzleData] = useState(null); // { meaning, sentence, winner }
  const [chainData, setChainData] = useState(null); // { chain, activePlayers, currentPlayerId, timeRemaining, playersInfo }
  const [chainGameOver, setChainGameOver] = useState(null); // winner logic

  useEffect(() => {
    socket.connect();
    
    socket.emit('createRoom', (res) => {
      if (res.success) {
        setPin(res.pin);
      }
    });

    socket.on('playersUpdated', (newPlayers) => {
      setPlayers(newPlayers);
    });

    socket.on('gameStarted', ({ gameMode }) => {
      setGameState(gameMode);
    });

    socket.on('hostNewQuestion', ({ meaning, answer }) => {
      setQuizData({ meaning, answer, winner: null });
    });

    socket.on('correctAnswer', ({ winnerId, winnerNickname }) => {
      setQuizData(prev => prev ? { ...prev, winner: winnerNickname } : null);
    });

    socket.on('hostNewPuzzle', ({ meaning, sentence }) => {
      setPuzzleData({ meaning, sentence, winner: null });
    });

    socket.on('puzzleCorrectAnswer', ({ winnerId, winnerNickname }) => {
      setPuzzleData(prev => prev ? { ...prev, winner: winnerNickname } : null);
    });

    socket.on('wordChainState', (data) => {
      setChainData(data);
      setChainGameOver(null);
    });

    socket.on('chainGameOver', ({ winner }) => {
      setChainGameOver(winner);
    });

    return () => {
      socket.off('playersUpdated');
      socket.off('gameStarted');
      socket.off('hostNewQuestion');
      socket.off('correctAnswer');
      socket.off('hostNewPuzzle');
      socket.off('puzzleCorrectAnswer');
      socket.off('wordChainState');
      socket.off('chainGameOver');
      socket.disconnect();
    };
  }, []);

  const startGame = (gameMode) => {
    if (players.length === 0) {
      alert('참여자가 1명 이상 필요합니다.');
      return;
    }
    socket.emit('startGame', { pin, gameMode });
  };

  const joinUrl = `${window.location.origin}/player?pin=${pin}`;

  return (
    <div className="host-container">
      <header className="host-header">
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>WORD BATTLE HOST</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users size={32} color="var(--ow-orange)" />
          <span style={{ fontSize: '2rem', fontFamily: 'Teko', fontWeight: 'bold' }}>
            {players.length} PLAYERS
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', gap: '2rem', padding: '2rem 0' }}>
        
        {/* Left Side: Lobby & Players */}
        <section className="ow-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {gameState === 'lobby' ? (
            <>
              <h2 style={{ color: 'var(--ow-blue)', fontSize: '2rem', marginTop: 0 }}>
                JOIN AT <span style={{ color: 'var(--ow-darker)', textDecoration: 'underline' }}>{window.location.host}/player</span>
              </h2>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
                {pin && (
                  <div style={{ border: '8px solid var(--ow-orange)', padding: '10px', background: 'white' }}>
                    <QRCodeSVG value={joinUrl} size={150} />
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.5rem', color: '#666' }}>GAME PIN:</h3>
                  <div style={{ fontSize: '5rem', fontFamily: 'Teko', fontWeight: 'bold', color: 'var(--ow-dark)', lineHeight: 1, letterSpacing: '5px' }}>
                    {pin || 'LOADING...'}
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
               {gameState === 'wordQuiz' && quizData ? (
                 <>
                   <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)' }}>WHAT IS THIS WORD?</h3>
                   <h1 style={{ fontSize: '5rem', fontFamily: 'Noto Sans KR', color: 'var(--ow-darker)', margin: '1rem 0', transform: 'skewX(2deg)' }}>
                     {quizData.meaning}
                   </h1>
                   
                   {quizData.winner ? (
                     <div style={{ background: 'var(--ow-green)', padding: '1rem 3rem', color: 'white', transform: 'skewX(-5deg)', marginTop: '2rem' }}>
                       <h2 style={{ fontSize: '2.5rem', margin: 0, transform: 'skewX(5deg)' }}>WINNER: {quizData.winner}</h2>
                       <h3 style={{ fontSize: '1.5rem', margin: 0, transform: 'skewX(5deg)' }}>ANSWER: {quizData.answer}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-button" style={{ marginTop: '1rem', background: 'var(--ow-dark)', transform: 'skewX(10deg)' }}>
                         <span style={{ transform: 'skewX(-10deg)' }}>NEXT QUESTION</span>
                       </button>
                     </div>
                   ) : (
                     <div style={{ marginTop: '2rem', color: 'var(--ow-orange)', fontSize: '1.5rem', transform: 'skewX(2deg)' }}>WAITING FOR ANSWERS...</div>
                   )}
                 </>
               ) : (
                 <h2 style={{ fontSize: '3rem', color: 'var(--ow-red)' }}>GAME IN PROGRESS...</h2>
               )}
               {gameState === 'sentencePuzzle' && puzzleData ? (
                 <>
                   <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)' }}>WHAT IS THIS SENTENCE?</h3>
                   <h1 style={{ fontSize: '4rem', fontFamily: 'Noto Sans KR', color: 'var(--ow-darker)', margin: '1rem 0', transform: 'skewX(2deg)' }}>
                     {puzzleData.meaning}
                   </h1>
                   
                   {puzzleData.winner ? (
                     <div style={{ background: 'var(--ow-green)', padding: '1rem 3rem', color: 'white', transform: 'skewX(-5deg)', marginTop: '2rem' }}>
                       <h2 style={{ fontSize: '2.5rem', margin: 0, transform: 'skewX(5deg)' }}>WINNER: {puzzleData.winner}</h2>
                       <h3 style={{ fontSize: '1.5rem', margin: 0, transform: 'skewX(5deg)' }}>ANSWER: {puzzleData.sentence}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-button" style={{ marginTop: '1rem', background: 'var(--ow-dark)', transform: 'skewX(10deg)' }}>
                         <span style={{ transform: 'skewX(-10deg)' }}>NEXT PUZZLE</span>
                       </button>
                     </div>
                   ) : (
                     <div style={{ marginTop: '2rem', color: 'var(--ow-orange)', fontSize: '1.5rem', transform: 'skewX(2deg)' }}>WAITING FOR COMPLETED SENTENCES...</div>
                   )}
                 </>
               ) : null}
               {gameState === 'wordChain' && chainData ? (
                 <>
                   <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)', margin: 0 }}>WORD CHAIN SURVIVAL</h3>
                   
                   {chainGameOver ? (
                     <div style={{ background: 'var(--ow-blue)', padding: '1rem 3rem', color: 'white', transform: 'skewX(-5deg)', marginTop: '2rem' }}>
                       <h2 style={{ fontSize: '3rem', margin: 0, transform: 'skewX(5deg)' }}>GAME OVER</h2>
                       <h3 style={{ fontSize: '2rem', margin: 0, transform: 'skewX(5deg)' }}>WINNER: {chainGameOver}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-button" style={{ marginTop: '1rem', background: 'var(--ow-orange)', transform: 'skewX(10deg)' }}>
                         <span style={{ transform: 'skewX(-10deg)' }}>PLAY AGAIN</span>
                       </button>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                       <div style={{ fontSize: '4rem', fontFamily: 'Teko', color: 'var(--ow-red)', margin: '1rem 0', transform: 'skewX(2deg)' }}>
                         TIME: {chainData.timeRemaining}s
                       </div>
                       
                       <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                         {chainData.chain.map((word, idx) => (
                           <div key={idx} style={{ 
                             fontSize: '2.5rem', 
                             fontFamily: 'Teko', 
                             padding: '0.5rem 1rem', 
                             background: idx === chainData.chain.length - 1 ? 'var(--ow-orange)' : 'var(--ow-darker)', 
                             color: 'white',
                             transform: 'skewX(-10deg)'
                           }}>
                             <span style={{ transform: 'skewX(10deg)', display: 'block' }}>{word.toUpperCase()}</span>
                           </div>
                         ))}
                       </div>

                       <div style={{ marginTop: '2rem', fontSize: '1.5rem', fontFamily: 'Noto Sans KR', color: 'var(--ow-darker)' }}>
                         현재 턴: <strong>{chainData.playersInfo.find(p => p.id === chainData.currentPlayerId)?.nickname || '알 수 없음'}</strong>
                       </div>
                     </div>
                   )}
                 </>
               ) : null}
            </div>
          )}

          <div style={{ borderTop: '4px solid var(--ow-dark)', paddingTop: '1rem', flex: 1 }}>
            <h3 style={{ fontSize: '2rem', marginTop: 0 }}>PLAYERS ({players.length})</h3>
            <div className="grid-players">
              {players.map((p, idx) => (
                <div key={idx} className="player-card">
                  <span>{p.nickname}</span>
                </div>
              ))}
              {players.length === 0 && (
                <div style={{ color: '#888', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                  Waiting for players to join...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Side: Game Controls */}
        <aside className="ow-panel" style={{ width: '350px', background: 'var(--ow-darker)', color: 'white' }}>
          <h2 style={{ color: 'var(--ow-orange)', marginTop: 0, fontSize: '2.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            SELECT GAME
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
            <button 
              className="ow-button blue" 
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => startGame('wordQuiz')}
            >
              <span>1. WORD QUIZ</span>
              <Play size={24} />
            </button>
            <button 
              className="ow-button red" 
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => startGame('sentencePuzzle')}
            >
              <span>2. SENTENCE RACE</span>
              <Play size={24} />
            </button>
            <button 
              className="ow-button dark" 
              style={{ width: '100%', justifyContent: 'space-between', border: '2px solid var(--ow-orange)' }}
              onClick={() => startGame('wordChain')}
            >
              <span>3. WORD CHAIN</span>
              <Play size={24} />
            </button>
          </div>
        </aside>

      </main>
    </div>
  );
}

export default HostScreen;
