import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../utils/socket';
import { Users, Play } from 'lucide-react';

function HostScreen() {
  const [pin, setPin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState('lobby');
  const [quizData, setQuizData] = useState(null);
  const [puzzleData, setPuzzleData] = useState(null);
  const [chainData, setChainData] = useState(null);
  const [chainGameOver, setChainGameOver] = useState(null);
  const [judgeData, setJudgeData] = useState(null);

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
      setJudgeData(data);
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
    <div className="host-container animate-enter">
      <header className="host-header" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/willgrow_logo.png" alt="WillGrow Logo" className="logo" onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }} />
          <div className="logo-placeholder" style={{ display: 'none' }}>
            WILLGROW
          </div>
          <h1 className="headline-lg" style={{ color: 'var(--on-surface)', marginLeft: '1rem' }}>HOST BOARD</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users size={32} color="var(--ow-primary)" />
          <span className="headline-lg" style={{ color: 'var(--ow-primary)' }}>
            {players.length} PLAYERS
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '2rem', paddingBottom: '2rem' }}>
        
        {/* Left Side: Lobby & Dashboards */}
        <section className="ow-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {gameState === 'lobby' ? (
            <div style={{ padding: '2rem' }}>
              <h2 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginTop: 0 }}>
                JOIN AT <span style={{ color: 'var(--ow-primary)', textDecoration: 'underline' }}>{window.location.host}/player</span>
              </h2>
              <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', marginTop: '3rem' }}>
                {pin && (
                  <div style={{ padding: '15px', background: 'white', borderRadius: '1rem', boxShadow: '0 0 30px rgba(204,151,255,0.3)' }}>
                    <QRCodeSVG value={joinUrl} size={180} />
                  </div>
                )}
                <div>
                  <h3 className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem' }}>GAME PIN:</h3>
                  <div className="display-lg" style={{ color: 'var(--ow-primary)', letterSpacing: '4px', textShadow: '0 0 20px rgba(204,151,255,0.6)' }}>
                    {pin || 'LOADING...'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
               
               {/* 1. Word Quiz */}
               {gameState === 'wordQuiz' && quizData ? (
                 <>
                   <h3 className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem' }}>WHAT IS THIS WORD?</h3>
                   <h1 className="display-lg" style={{ color: 'var(--on-surface)', margin: '1rem 0', textAlign: 'center' }}>
                     {quizData.meaning}
                   </h1>
                   
                   {quizData.winner ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '2rem', textAlign: 'center' }}>
                       <h2 className="headline-lg" style={{ color: 'var(--ow-primary-dim)', margin: '0 0 1rem 0' }}>WINNER: {quizData.winner}</h2>
                       <h3 className="body-md" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>ANSWER: {quizData.answer}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-btn">
                         NEXT QUESTION
                       </button>
                     </div>
                   ) : (
                     <div className="body-md" style={{ marginTop: '2rem', color: 'var(--ow-secondary)', fontSize: '1.5rem', opacity: 0.8 }}>WAITING FOR ANSWERS...</div>
                   )}
                 </>
               ) : null}

               {/* 2. Sentence Puzzle */}
               {gameState === 'sentencePuzzle' && puzzleData ? (
                 <>
                   <h3 className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem' }}>WHAT IS THIS SENTENCE?</h3>
                   <h1 className="display-lg" style={{ color: 'var(--on-surface)', margin: '1rem 0', textAlign: 'center' }}>
                     {puzzleData.meaning}
                   </h1>
                   
                   {puzzleData.winner ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '2rem', textAlign: 'center' }}>
                       <h2 className="headline-lg" style={{ color: 'var(--ow-primary-dim)', margin: '0 0 1rem 0' }}>WINNER: {puzzleData.winner}</h2>
                       <h3 className="body-md" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>ANSWER: {puzzleData.sentence}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-btn">
                         NEXT PUZZLE
                       </button>
                     </div>
                   ) : (
                     <div className="body-md" style={{ marginTop: '2rem', color: 'var(--ow-secondary)', fontSize: '1.5rem', opacity: 0.8 }}>WAITING FOR COMPLETED SENTENCES...</div>
                   )}
                 </>
               ) : null}

               {/* 3. Word Chain */}
               {gameState === 'wordChain' && chainData ? (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0 }}>WORD CHAIN SURVIVAL</h3>
                   
                   {chainGameOver ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '2rem', textAlign: 'center' }}>
                       <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0' }}>GAME OVER</h2>
                       <h3 className="headline-lg" style={{ margin: '0 0 2rem 0', color: 'var(--ow-primary-dim)' }}>WINNER: {chainGameOver}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-btn-secondary">
                         PLAY AGAIN
                       </button>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                       <div className="display-lg" style={{ color: chainData.timeRemaining <= 5 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 10px currentColor' }}>
                         {chainData.timeRemaining}s
                       </div>
                       
                       <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
                         {chainData.chain.map((word, idx) => (
                           <div key={idx} className="surface-card" style={{ 
                             padding: '1rem 2rem', 
                             borderColor: idx === chainData.chain.length - 1 ? 'var(--ow-primary)' : 'rgba(64, 72, 93, 0.5)',
                             boxShadow: idx === chainData.chain.length - 1 ? '0 0 15px rgba(204,151,255,0.4)' : 'none'
                           }}>
                             <span className="headline-lg">{word.toUpperCase()}</span>
                           </div>
                         ))}
                       </div>

                       <div className="surface-card" style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <span className="body-md">현재 턴:</span>
                         <strong className="headline-lg" style={{ color: 'var(--ow-primary)' }}>
                           {chainData.playersInfo.find(p => p.id === chainData.currentPlayerId)?.nickname || '알 수 없음'}
                         </strong>
                       </div>
                     </div>
                   )}
                 </>
               ) : null}

               {/* 4. Digital Bingo */}
               {gameState === 'wordBingo' && (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0 }}>DIGITAL BINGO</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '2rem' }}>
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
                       className="ow-btn neon-glow"
                     >
                       RANDOM DRAW
                     </button>
                     
                     {bingoDrawnWords.length > 0 && (
                       <div className="display-lg" style={{ color: 'var(--ow-secondary)', textShadow: '0 0 15px currentColor', margin: '2rem 0' }}>
                         {bingoDrawnWords[0].toUpperCase()}
                       </div>
                     )}

                     <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                       {bingoDrawnWords.map((w, idx) => (
                          <div key={idx} className="surface-card" style={{ 
                            padding: '0.8rem 1.2rem', 
                            borderColor: idx === 0 ? 'var(--ow-secondary)' : 'rgba(64,72,93,0.3)',
                            background: idx === 0 ? 'var(--ow-surface-light)' : 'var(--ow-surface-lighter)'
                          }}>
                            <span className="headline-lg">{w}</span>
                          </div>
                       ))}
                     </div>

                     {bingoWinners.length > 0 && (
                       <div className="surface-card neon-glow" style={{ marginTop: '2rem', width: '80%', textAlign: 'center', borderColor: 'var(--ow-primary-dim)' }}>
                         <h2 className="headline-lg" style={{ color: 'var(--ow-primary-dim)', margin: '0 0 1rem 0' }}>🎉 BINGO WINNERS! 🎉</h2>
                         <div className="headline-lg">
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
                   <h3 className="headline-lg" style={{ color: 'var(--ow-error)', margin: 0, textShadow: '0 0 10px rgba(255,110,132,0.5)' }}>CATEGORY BOMB</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                     <h1 className="headline-lg" style={{ margin: '1rem 0', color: 'var(--on-surface)' }}>Category: {bombData.category}</h1>
                     
                     {bombExploded ? (
                       <div className="surface-card neon-glow" style={{ borderColor: 'var(--ow-error)', textAlign: 'center', marginTop: '2rem', padding: '3rem' }}>
                         <h2 className="display-lg" style={{ color: 'var(--ow-error)', margin: '0 0 1rem 0' }}>BOOM! 💥</h2>
                         <h3 className="headline-lg" style={{ margin: '0 0 2rem 0' }}>
                           {players.find(p => p.id === bombExploded)?.nickname || '알 수 없음'} 탈락!
                         </h3>
                         <button onClick={() => socket.emit('resumeBomb', { pin })} className="ow-btn-secondary">
                           RESUME GAME
                         </button>
                       </div>
                     ) : (
                       <>
                         <div className="display-lg" style={{ fontSize: '8rem', color: bombData.timeRemaining <= 5 ? 'var(--ow-error)' : 'var(--ow-primary)', textShadow: '0 0 20px currentColor' }}>
                           {bombData.timeRemaining}s
                         </div>
                         
                         <div className="surface-card" style={{ marginTop: '2rem', padding: '1.5rem 3rem', borderColor: 'var(--ow-primary)' }}>
                           <span className="headline-lg" style={{ display: 'block' }}>
                             폭탄 소지자: <span style={{ color: 'var(--ow-primary)' }}>{bombData.playersInfo.find(p => p.id === bombData.currentPlayerId)?.nickname || '알 수 없음'}</span>
                           </span>
                         </div>

                         <div className="body-md" style={{ marginTop: '2rem', color: 'var(--on-surface-variant)' }}>
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
                   <h3 className="headline-lg" style={{ color: 'var(--ow-secondary)', margin: 0 }}>SPELLING HUNTER</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '2rem' }}>
                     <div className="display-lg" style={{ color: hunterData.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-primary)', textShadow: '0 0 15px currentColor' }}>
                       {hunterData.timeRemaining}s
                     </div>
                     
                     {!hunterData.isActive ? (
                       <div className="surface-card neon-glow" style={{ marginTop: '2rem', padding: '2rem 4rem', borderColor: 'var(--ow-primary)', textAlign: 'center' }}>
                         <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: 0 }}>GAME OVER</h2>
                       </div>
                     ) : (
                        <div className="body-md" style={{ color: 'var(--on-surface-variant)', marginTop: '1rem' }}>진행 중... 화면에서 단어들이 떨어집니다!</div>
                     )}

                     <h2 className="headline-lg" style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--on-surface)' }}>LEADERBOARD</h2>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '80%' }}>
                       {[...players].sort((a,b) => b.score - a.score).slice(0, 5).map((p, idx) => (
                         <div key={idx} className="surface-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem' }}>
                           <span className="headline-lg">{idx + 1}. {p.nickname}</span>
                           <span className="headline-lg" style={{ color: 'var(--ow-primary-dim)' }}>{p.score} PT</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </>
               )}

               {/* 7 & 8. Speed Race */}
               {(gameState === 'speedRaceIndividual' || gameState === 'speedRaceTeam') && raceData && (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0, textShadow: '0 0 10px rgba(204,151,255,0.4)' }}>
                     SPEED RACE ({raceData.type === 'team' ? 'TEAM' : 'SOLO'})
                   </h3>
                   
                   {raceWinner ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '3rem', padding: '3rem 5rem', textAlign: 'center', borderColor: 'var(--ow-primary)' }}>
                       <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0' }}>RACE FINISHED!</h2>
                       <h3 className="headline-lg" style={{ margin: 0 }}>WINNER: <span style={{ color: 'var(--ow-primary-dim)' }}>{raceWinner}</span></h3>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '2rem' }}>
                       <div className="display-lg" style={{ fontSize: '6rem', color: raceData.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 20px currentColor' }}>
                         {raceData.timeRemaining}s
                       </div>
                       
                       <div style={{ width: '100%', marginTop: '3rem' }}>
                         {raceData.type === 'team' ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                             {Object.entries(raceData.teams)
                               .sort((a,b) => b[1] - a[1])
                               .map(([team, score]) => (
                                 <div key={team} className="surface-card" style={{ display: 'flex', alignItems: 'center' }}>
                                   <span className="headline-lg" style={{ width: '180px', color: team === 'RED' ? 'var(--ow-error)' : team === 'BLUE' ? 'var(--ow-secondary)' : team === 'GREEN' ? 'var(--ow-primary-dim)' : 'var(--ow-primary)' }}>
                                     {team} TEAM
                                   </span>
                                   <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', height: '24px', margin: '0 2rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                     <div style={{ width: `${Math.min(100, (score / 30) * 100)}%`, background: 'var(--ow-primary)', height: '100%', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 10px var(--ow-primary)' }} />
                                   </div>
                                   <span className="headline-lg" style={{ width: '100px', textAlign: 'right' }}>{score} PTS</span>
                                 </div>
                             ))}
                           </div>
                         ) : (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             {[...raceData.playersInfo]
                               .sort((a,b) => b.score - a.score)
                               .slice(0, 5)
                               .map((p, idx) => (
                                 <div key={p.id} className="surface-card" style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem' }}>
                                   <span className="headline-lg" style={{ width: '50px', color: 'var(--on-surface-variant)' }}>#{idx + 1}</span>
                                   <span className="headline-lg" style={{ width: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.nickname}</span>
                                   <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', height: '16px', margin: '0 2rem', borderRadius: '8px', overflow: 'hidden' }}>
                                     <div style={{ width: `${Math.min(100, (p.score / 20) * 100)}%`, background: 'var(--ow-secondary)', height: '100%', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 8px var(--ow-secondary)' }} />
                                   </div>
                                   <span className="headline-lg" style={{ width: '80px', textAlign: 'right' }}>{p.score} PTS</span>
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

          {/* Lobby bottom area with joining players list */}
          <div style={{ borderTop: '1px solid rgba(64, 72, 93, 0.4)', marginTop: '2rem', paddingTop: '2rem', flex: 1 }}>
            <h3 className="headline-lg" style={{ margin: '0 0 1.5rem 0', color: 'var(--on-surface)' }}>PLAYERS ({players.length})</h3>
            <div className="grid-players">
              {players.map((p, idx) => (
                <div key={idx} className="player-badge">
                  {p.nickname}
                </div>
              ))}
              {players.length === 0 && (
                <div className="body-md" style={{ color: 'var(--on-surface-variant)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                  Waiting for players to join...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Side: Game Controls (Cyber-Luxe Monolith Style) */}
        <aside className="ow-panel" style={{ width: '380px', flexShrink: 0 }}>
          <h2 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 2rem 0', paddingBottom: '1rem', borderBottom: '1px solid rgba(64,72,93,0.5)' }}>
            GAME MODES
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <button className="ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('wordQuiz')}>
              <span>Word Quiz</span> <Play size={20} />
            </button>
            <button className="ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('sentencePuzzle')}>
              <span>Sentence Race</span> <Play size={20} />
            </button>
            <button className="ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('wordChain')}>
              <span>Word Chain</span> <Play size={20} />
            </button>
            <button className="ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => {
              setBingoDrawnWords([]); setBingoWinners([]); startGame('wordBingo');
            }}>
              <span>Digital Bingo</span> <Play size={20} />
            </button>
            <button className="ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('categoryBomb')}>
              <span>Category Bomb</span> <Play size={20} />
            </button>
            <button className="ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('spellingHunter')}>
              <span>Spelling Hunter</span> <Play size={20} />
            </button>
            <button className="ow-btn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', marginTop: '1rem' }} onClick={() => startGame('speedRaceIndividual')}>
              <span>Speed Race (SOLO)</span> <Play size={20} />
            </button>
            <button className="ow-btn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('speedRaceTeam')}>
              <span>Speed Race (TEAM)</span> <Play size={20} />
            </button>
          </div>
        </aside>

      </main>

      {/* Host Judgment Modal */}
      {judgeData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(6, 14, 32, 0.9)', backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="ow-panel neon-glow" style={{ textAlign: 'center', padding: '4rem', maxWidth: '700px', width: '90%' }}>
            <h2 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0' }}>APPROVAL REQUIRED</h2>
            <div className="body-md" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
              <strong style={{ color: 'var(--ow-secondary)' }}>{judgeData.nickname}</strong> 님의 답변:
            </div>
            <div className="display-lg" style={{ margin: '2rem 0', color: 'var(--on-surface)', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
              "{judgeData.word.toUpperCase()}"
            </div>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '3rem' }}>
              <button 
                className="ow-btn" 
                style={{ padding: '1.5rem 3rem' }}
                onClick={() => {
                  socket.emit('hostJudgeResult', { pin, isCorrect: true, ...judgeData });
                  setJudgeData(null);
                }}
              >
                ACCEPT (인정)
              </button>
              <button 
                className="ow-btn-danger" 
                style={{ padding: '1.5rem 3rem' }}
                onClick={() => {
                  socket.emit('hostJudgeResult', { pin, isCorrect: false, ...judgeData });
                  setJudgeData(null);
                }}
              >
                REJECT (거절)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostScreen;
