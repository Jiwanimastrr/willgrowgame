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
  const [judgeData, setJudgeData] = useState(null); // { playerId, nickname, word, gameMode }

  const [bingoWordList, setBingoWordList] = useState([]);
  const [bingoDrawnWords, setBingoDrawnWords] = useState([]);
  const [bingoWinners, setBingoWinners] = useState([]);

  const [bombData, setBombData] = useState(null);
  const [bombExploded, setBombExploded] = useState(null);

  const [hunterData, setHunterData] = useState(null);
  const [raceData, setRaceData] = useState(null);
  const [raceWinner, setRaceWinner] = useState(null);

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

    socket.on('hostReviewWord', (data) => {
      setJudgeData(data); // { playerId, nickname, word, gameMode }
    });

    socket.on('chainGameOver', ({ winner }) => {
      setChainGameOver(winner);
    });

    socket.on('bingoWordList', ({ words }) => setBingoWordList(words));
    socket.on('bingoWordDrawn', ({ word }) => setBingoDrawnWords(prev => [word, ...prev]));
    socket.on('bingoClaimed', ({ id, nickname }) => {
      setBingoWinners(prev => {
        if (!prev.find(p => p.id === id)) return [...prev, { id, nickname }];
        return prev;
      });
    });

    socket.on('bombState', (data) => {
      setBombData(data);
      setBombExploded(null);
    });
    socket.on('bombExploded', ({ id }) => setBombExploded(id));

    socket.on('hunterState', (data) => setHunterData(data));
    socket.on('raceState', (data) => {
      setRaceData(data);
      setRaceWinner(null);
    });
    socket.on('raceGameOver', ({ winner }) => setRaceWinner(winner));

    return () => {
      socket.off('playersUpdated');
      socket.off('gameStarted');
      socket.off('hostNewQuestion');
      socket.off('correctAnswer');
      socket.off('hostNewPuzzle');
      socket.off('puzzleCorrectAnswer');
      socket.off('wordChainState');
      socket.off('chainGameOver');
      socket.off('hostReviewWord');
      socket.off('bingoWordList');
      socket.off('bingoWordDrawn');
      socket.off('bingoClaimed');
      socket.off('bombState');
      socket.off('bombExploded');
      socket.off('hunterState');
      socket.off('raceState');
      socket.off('raceGameOver');
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

                {/* 4. Word Bingo */}
                {gameState === 'wordBingo' && (
                  <>
                    <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)', margin: 0 }}>DIGITAL BINGO</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <button 
                        onClick={() => {
                          const undrawn = bingoWordList.filter(w => !bingoDrawnWords.includes(w));
                          if (undrawn.length > 0) {
                            const randomWord = undrawn[Math.floor(Math.random() * undrawn.length)];
                            socket.emit('drawBingoWord', { pin, word: randomWord });
                          } else {
                            alert('모든 단어를 다 뽑았습니다!');
                          }
                        }}
                        className="ow-button blue"
                        style={{ margin: '1rem', transform: 'skewX(-5deg)', fontSize: '2rem' }}
                      >
                        <span style={{ transform: 'skewX(5deg)' }}>RANDOM DRAW</span>
                      </button>
                      
                      {bingoDrawnWords.length > 0 && (
                        <div style={{ fontSize: '5rem', fontFamily: 'Noto Sans KR', color: 'var(--ow-red)', margin: '1rem 0', transform: 'skewX(2deg)' }}>
                          {bingoDrawnWords[0].toUpperCase()}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {bingoDrawnWords.map((w, idx) => (
                           <div key={idx} style={{ 
                             padding: '0.5rem 1rem', 
                             background: idx === 0 ? 'var(--ow-red)' : 'var(--ow-darker)', 
                             color: 'white',
                             borderRadius: '4px',
                             fontSize: '1.5rem',
                             fontFamily: 'Teko'
                           }}>
                             {w}
                           </div>
                        ))}
                      </div>

                      {bingoWinners.length > 0 && (
                        <div style={{ background: 'var(--ow-green)', padding: '1rem', color: 'white', marginTop: '1rem', width: '80%', textAlign: 'center' }}>
                          <h2 style={{ fontSize: '2rem', margin: 0 }}>🎉 BINGO WINNERS! 🎉</h2>
                          <div style={{ fontSize: '1.5rem' }}>
                            {bingoWinners.map(w => w.nickname).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 5. Category Bomb */}
                {gameState === 'categoryBomb' && bombData && (
                  <>
                    <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)', margin: 0 }}>CATEGORY BOMB</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <h1 style={{ fontSize: '3rem', margin: '1rem 0', color: 'var(--ow-blue)' }}>카테고리: {bombData.category}</h1>
                      
                      {bombExploded ? (
                        <div style={{ background: 'var(--ow-red)', padding: '2rem', color: 'white', transform: 'skewX(-5deg)', textAlign: 'center' }}>
                          <h2 style={{ fontSize: '4rem', margin: 0, transform: 'skewX(5deg)' }}>BOOM! 💥</h2>
                          <h3 style={{ fontSize: '2rem', margin: 0, transform: 'skewX(5deg)' }}>
                            {players.find(p => p.id === bombExploded)?.nickname || '알 수 없음'} 탈락!
                          </h3>
                          <button onClick={() => socket.emit('resumeBomb', { pin })} className="ow-button" style={{ marginTop: '1rem', background: 'var(--ow-dark)' }}>
                            <span style={{ transform: 'skewX(-10deg)' }}>RESUME GAME</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '8rem', fontFamily: 'Teko', color: bombData.timeRemaining <= 5 ? 'var(--ow-red)' : 'var(--ow-dark)' }}>
                            {bombData.timeRemaining}s
                          </div>
                          
                          <div style={{ background: 'var(--ow-darker)', color: 'white', padding: '1rem 3rem', transform: 'skewX(-10deg)', marginTop: '1rem' }}>
                            <span style={{ fontSize: '2rem', display: 'block', transform: 'skewX(10deg)' }}>
                              폭탄 소지자: <span style={{ color: 'var(--ow-orange)' }}>{bombData.playersInfo.find(p => p.id === bombData.currentPlayerId)?.nickname || '알 수 없음'}</span>
                            </span>
                          </div>

                          <div style={{ marginTop: '1rem', color: '#666', fontSize: '1.2rem', fontFamily: 'Noto Sans KR' }}>
                            나온 단어: {bombData.usedWords.join(', ')}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* 6. Spelling Hunter */}
                {gameState === 'spellingHunter' && hunterData && (
                  <>
                    <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)', margin: 0 }}>SPELLING HUNTER</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <div style={{ fontSize: '5rem', fontFamily: 'Teko', color: hunterData.timeRemaining <= 10 ? 'var(--ow-red)' : 'var(--ow-blue)' }}>
                        {hunterData.timeRemaining}s
                      </div>
                      
                      {!hunterData.isActive ? (
                        <div style={{ background: 'var(--ow-orange)', padding: '1rem 3rem', color: 'white', transform: 'skewX(-5deg)', marginTop: '1rem' }}>
                          <h2 style={{ fontSize: '3rem', margin: 0, transform: 'skewX(5deg)' }}>GAME OVER</h2>
                        </div>
                      ) : (
                         <div style={{ fontSize: '1.5rem', color: '#888', marginTop: '1rem' }}>진행 중... 화면에서 단어들이 떨어집니다!</div>
                      )}

                      <h2 style={{ fontSize: '2rem', marginTop: '2rem' }}>LEADERBOARD</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '80%' }}>
                        {[...players].sort((a,b) => b.score - a.score).slice(0, 5).map((p, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--ow-darker)', color: 'white', padding: '1rem', fontSize: '1.5rem', borderRadius: '4px' }}>
                            <span>{idx + 1}. {p.nickname}</span>
                            <span style={{ color: 'var(--ow-green)', fontWeight: 'bold' }}>{p.score} PT</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 7, 8. Speed Race */}
                {(gameState === 'speedRaceIndividual' || gameState === 'speedRaceTeam') && raceData && (
                  <>
                    <h3 style={{ fontSize: '2rem', color: '#666', transform: 'skewX(2deg)', margin: 0 }}>
                      SPEED RACE ({raceData.type === 'team' ? 'TEAM' : 'SOLO'})
                    </h3>
                    
                    {raceWinner ? (
                      <div style={{ background: 'var(--ow-blue)', padding: '1rem 3rem', color: 'white', transform: 'skewX(-5deg)', marginTop: '2rem' }}>
                        <h2 style={{ fontSize: '3rem', margin: 0, transform: 'skewX(5deg)' }}>RACE FINISHED!</h2>
                        <h3 style={{ fontSize: '2rem', margin: 0, transform: 'skewX(5deg)' }}>WINNER: {raceWinner}</h3>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <div style={{ fontSize: '6rem', fontFamily: 'Teko', color: raceData.timeRemaining <= 10 ? 'var(--ow-red)' : 'var(--ow-blue)' }}>
                          {raceData.timeRemaining}s
                        </div>
                        
                        <div style={{ width: '100%', marginTop: '2rem' }}>
                          {raceData.type === 'team' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {Object.entries(raceData.teams)
                                .sort((a,b) => b[1] - a[1])
                                .map(([team, score]) => (
                                  <div key={team} style={{ display: 'flex', alignItems: 'center', background: 'var(--ow-darker)', color: 'white', padding: '1rem', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '2rem', width: '150px', fontWeight: 'bold', color: team === 'RED' ? '#ef4444' : team === 'BLUE' ? '#3b82f6' : team === 'GREEN' ? '#22c55e' : '#eab308' }}>
                                      {team} TEAM
                                    </span>
                                    <div style={{ flex: 1, background: '#333', height: '30px', margin: '0 1rem', borderRadius: '15px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(100, (score / 30) * 100)}%`, background: 'var(--ow-blue)', height: '100%', transition: 'width 0.3s ease' }} />
                                    </div>
                                    <span style={{ fontSize: '2rem', fontFamily: 'Teko' }}>{score} PTS</span>
                                  </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {[...raceData.playersInfo]
                                .sort((a,b) => b.score - a.score)
                                .slice(0, 5)
                                .map((p, idx) => (
                                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--ow-darker)', color: 'white', padding: '1rem', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '1.5rem', width: '50px' }}>#{idx + 1}</span>
                                    <span style={{ fontSize: '1.5rem', width: '150px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.nickname}</span>
                                    <div style={{ flex: 1, background: '#333', height: '20px', margin: '0 1rem', borderRadius: '10px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(100, (p.score / 20) * 100)}%`, background: 'var(--ow-orange)', height: '100%', transition: 'width 0.3s ease' }} />
                                    </div>
                                    <span style={{ fontSize: '1.5rem', fontFamily: 'Teko' }}>{p.score} PTS</span>
                                  </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
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
            <button 
              className="ow-button" 
              style={{ width: '100%', justifyContent: 'space-between', background: 'var(--ow-green)', border: '2px solid white' }}
              onClick={() => {
                setBingoDrawnWords([]);
                setBingoWinners([]);
                startGame('wordBingo');
              }}
            >
              <span>4. DIGITAL BINGO</span>
              <Play size={24} />
            </button>
            <button 
              className="ow-button" 
              style={{ width: '100%', justifyContent: 'space-between', background: '#eab308', border: '2px solid white' }}
              onClick={() => startGame('categoryBomb')}
            >
              <span>5. CATEGORY BOMB</span>
              <Play size={24} />
            </button>
            <button 
              className="ow-button" 
              style={{ width: '100%', justifyContent: 'space-between', background: '#8b5cf6', border: '2px solid white' }}
              onClick={() => startGame('spellingHunter')}
            >
              <span>6. SPELLING HUNTER</span>
              <Play size={24} />
            </button>
            <button 
              className="ow-button" 
              style={{ width: '100%', justifyContent: 'space-between', background: '#0284c7', border: '2px solid white' }}
              onClick={() => startGame('speedRaceIndividual')}
            >
              <span>7. SPEED RACE (개인)</span>
              <Play size={24} />
            </button>
            <button 
              className="ow-button" 
              style={{ width: '100%', justifyContent: 'space-between', background: '#ea580c', border: '2px solid white' }}
              onClick={() => startGame('speedRaceTeam')}
            >
              <span>8. SPEED RACE (팀)</span>
              <Play size={24} />
            </button>
          </div>
        </aside>

      </main>

      {/* Host Judgment Modal */}
      {judgeData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="ow-panel" style={{ textAlign: 'center', padding: '4rem', transform: 'skewX(-2deg)', maxWidth: '600px', width: '90%', animation: 'float 2s ease-in-out infinite' }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--ow-blue)', margin: '0 0 1rem 0' }}>HOST APPROVAL REQUIRED</h2>
            <div style={{ fontSize: '2rem', color: '#666' }}>
              <strong style={{ color: 'var(--ow-orange)' }}>{judgeData.nickname}</strong> 님의 답변:
            </div>
            <div style={{ fontSize: '6rem', fontFamily: 'Teko', margin: '2rem 0', color: 'var(--ow-darker)', lineHeight: 1 }}>
              "{judgeData.word.toUpperCase()}"
            </div>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
              <button 
                className="ow-button" 
                style={{ background: 'var(--ow-green)', padding: '1rem 3rem', fontSize: '2.5rem' }}
                onClick={() => {
                  socket.emit('hostJudgeResult', { pin, isCorrect: true, ...judgeData });
                  setJudgeData(null);
                }}
              >
                <span>인정 (ACCEPT)</span>
              </button>
              <button 
                className="ow-button" 
                style={{ background: 'var(--ow-red)', padding: '1rem 3rem', fontSize: '2.5rem' }}
                onClick={() => {
                  socket.emit('hostJudgeResult', { pin, isCorrect: false, ...judgeData });
                  setJudgeData(null);
                }}
              >
                <span>거절 (REJECT)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostScreen;
