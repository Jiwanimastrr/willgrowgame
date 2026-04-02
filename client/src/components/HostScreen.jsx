import { useEffect, useState, useRef } from 'react';
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

  const [categoryVoteTally, setCategoryVoteTally] = useState({});


  const [showVocabModal, setShowVocabModal] = useState(false);
  const [vocabInput, setVocabInput] = useState('');
  const [customVocabCount, setCustomVocabCount] = useState(0);

  const bgmRef = useRef(null);

  useEffect(() => {
    if (bgmRef.current) {
      if (gameState !== 'lobby') {
        bgmRef.current.volume = 0.4; // 배경음악 크기 조절
        bgmRef.current.play().catch(e => console.log('BGM Play blocked:', e));
      } else {
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
      }
    }
  }, [gameState]);

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

    socket.on('verbState', (data) => {
      setVerbData(data);
      setVerbWinner(null);
    });
    socket.on('verbGameOver', ({ winner }) => setVerbWinner(winner));

    socket.on('categoryVoteUpdate', ({ tally }) => {
      setCategoryVoteTally(tally);
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
      socket.off('hostReviewWord');
      socket.off('bingoWordList');
      socket.off('bingoWordDrawn');
      socket.off('bingoClaimed');
      socket.off('bombState');
      socket.off('bombExploded');
      socket.off('hunterState');
      socket.off('raceState');
      socket.off('raceGameOver');
      socket.off('categoryVoteUpdate');
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

  const handleVocabSubmit = () => {
    if (!vocabInput.trim()) return;
    
    const lines = vocabInput.split('\n').filter(l => l.trim() !== '');
    const parsedWords = [];
    
    lines.forEach(line => {
      // Split by tab, comma, hyphen, colon, or multiple spaces
      const parts = line.split(/\t|,|-|:| {2,}/).filter(p => p.trim() !== '');
      if (parts.length >= 2) {
        parsedWords.push({
          answer: parts[0].trim().toLowerCase(),
          meaning: parts[1].trim()
        });
      } else {
        // Fallback: split by single spaces
        const spaceDelim = line.trim().split(' ');
        if (spaceDelim.length >= 2) {
           parsedWords.push({
             answer: spaceDelim[0].trim().toLowerCase(),
             meaning: spaceDelim.slice(1).join(' ').trim()
           });
        }
      }
    });

    if (parsedWords.length > 0) {
      socket.emit('uploadCustomWords', { pin, words: parsedWords });
      setCustomVocabCount(parsedWords.length);
      setShowVocabModal(false);
      setVocabInput('');
      if (window.soundFX) window.soundFX.playWin();
    } else {
      alert("단어 포맷을 인식할 수 없습니다. '영단어 뜻' 형식으로 입력해주세요.");
    }
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
          
          <audio ref={bgmRef} src="/bgm.webm" loop />

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
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
              <h2 className="display-lg" style={{ color: 'var(--ow-secondary)', margin: '0 0 1rem 0' }}>
                SCAN TO JOIN!
              </h2>
              <h3 className="body-md" style={{ color: 'var(--on-surface)', fontSize: '2rem', marginBottom: '3rem' }}>
                스마트폰 카메라로 화면의 QR 코드를 스캔하세요!
              </h3>
              
              <div style={{ display: 'flex', gap: '5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                {pin ? (
                  <div style={{ padding: '20px', background: 'white', borderRadius: '1.5rem', boxShadow: '0 0 40px rgba(204,151,255,0.4)', outline: '5px solid var(--ow-primary)', outlineOffset: '10px' }}>
                    <QRCodeSVG value={joinUrl} size={320} />
                  </div>
                ) : (
                  <div style={{ width: 320, height: 320, background: 'rgba(255,255,255,0.1)', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span className="headline-lg">LOADING...</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '2rem', marginBottom: '1rem' }}>게임 핀 번호 (GAME PIN)</h3>
                  <div className="display-lg" style={{ fontSize: '7rem', color: 'var(--ow-primary)', letterSpacing: '8px', textShadow: '0 0 40px rgba(204,151,255,0.8)' }}>
                    {pin || 'LOADING...'}
                  </div>
                  <button 
                    className="ow-btn ow-btn-secondary" 
                    style={{ marginTop: '2rem', fontSize: '1.2rem', padding: '1rem 2rem' }}
                    onClick={() => setShowVocabModal(true)}
                  >
                    ⚙️ 커스텀 단어장 업로드
                  </button>
                  {customVocabCount > 0 && (
                    <div style={{ color: 'var(--ow-primary)', marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                      ✅ 커스텀 단어 {customVocabCount}개 적용됨
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
               
               {/* 0. Category Vote */}
               {gameState === 'categoryVote' && (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0, textShadow: '0 0 10px rgba(204,151,255,0.4)' }}>
                     VOTING: WORD QUIZ CATEGORY
                   </h3>
                   <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '600px', marginTop: '3rem', gap: '1.5rem' }}>
                     {['동물 & 자연', '음식 & 과일', '사물 & 장소', '직업 & 인간'].map(cat => {
                       const votes = categoryVoteTally[cat] || 0;
                       const totalVotes = Math.max(1, Object.values(categoryVoteTally).reduce((a,b)=>a+b, 0));
                       const percent = (votes / totalVotes) * 100;
                       return (
                         <div key={cat} className="surface-card" style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem' }}>
                           <span className="headline-lg" style={{ width: '150px' }}>{cat.split(' ')[0]}</span>
                           <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', height: '24px', margin: '0 2rem', borderRadius: '12px', overflow: 'hidden' }}>
                             <div style={{ width: `${percent}%`, background: 'var(--ow-secondary)', height: '100%', transition: 'width 0.3s' }} />
                           </div>
                           <span className="headline-lg" style={{ width: '60px', textAlign: 'right' }}>{votes}명</span>
                         </div>
                       );
                     })}
                   </div>
                   
                   <button 
                     className="ow-btn neon-glow" 
                     style={{ marginTop: '3rem', padding: '1rem 3rem' }}
                     onClick={() => {
                        const entries = Object.entries(categoryVoteTally);
                        let winningCat = '동물 & 자연';
                        if (entries.length > 0) {
                          winningCat = entries.sort((a,b) => b[1] - a[1])[0][0];
                        }
                        socket.emit('endCategoryVote', { pin, winningCategory: winningCat });
                     }}
                   >
                     투표 마감 및 이 카테고리로 시작
                   </button>
                 </>
               )}

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

               {/* 9. Irregular Verb Speed Race */}
               {gameState === 'irregularVerbRace' && verbData && (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0, textShadow: '0 0 10px rgba(204,151,255,0.4)' }}>
                     IRREGULAR VERB SPEED
                   </h3>
                   
                   {verbWinner ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '3rem', padding: '3rem 5rem', textAlign: 'center', borderColor: 'var(--ow-primary)' }}>
                       <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0' }}>RACE FINISHED!</h2>
                       <h3 className="headline-lg" style={{ margin: 0 }}>WINNER: <span style={{ color: 'var(--ow-primary-dim)' }}>{verbWinner}</span></h3>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '2rem' }}>
                       <div className="display-lg" style={{ fontSize: '6rem', color: verbData.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 20px currentColor' }}>
                         {verbData.timeRemaining}s
                       </div>
                       
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '3rem' }}>
                         {[...verbData.playersInfo].sort((a,b)=>b.score - a.score).slice(0, 5).map((p, idx) => (
                           <div key={p.id} className="surface-card" style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem' }}>
                             <span className="headline-lg" style={{ width: '50px', color: 'var(--on-surface-variant)' }}>#{idx + 1}</span>
                             <span className="headline-lg" style={{ width: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.nickname}</span>
                             <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', height: '16px', margin: '0 2rem', borderRadius: '8px', overflow: 'hidden' }}>
                               <div style={{ width: `${Math.min(100, (p.score / 20) * 100)}%`, background: 'var(--ow-primary)', height: '100%', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 8px var(--ow-primary)' }} />
                             </div>
                             <span className="headline-lg" style={{ width: '80px', textAlign: 'right' }}>{p.score} PTS</span>
                           </div>
                         ))}
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
                  <span>{p.nickname}</span>
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
            <button className="ow-btn ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => {
               if (customVocabCount >= 4) {
                 startGame('wordQuiz');
               } else {
                 socket.emit('startCategoryVote', { pin, options: ['동물 & 자연', '음식 & 과일', '사물 & 장소', '직업 & 인간'] });
               }
            }}>
              <span>Word Quiz</span> <Play size={20} />
            </button>
            <button className="ow-btn ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('sentencePuzzle')}>
              <span>Sentence Race</span> <Play size={20} />
            </button>
            <button className="ow-btn ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => startGame('wordChain')}>
              <span>Word Chain</span> <Play size={20} />
            </button>
            <button className="ow-btn ow-btn-secondary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }} onClick={() => {
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
            <button className="ow-btn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', marginTop: '1rem', '--ow-primary': '#48cfae' }} onClick={() => startGame('irregularVerbRace')}>
              <span>Irregular Verb (TYPING)</span> <Play size={20} />
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

      {/* Vocab Modal */}
      {showVocabModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="ow-panel animate-enter" style={{ width: '80%', maxWidth: '800px', padding: '2rem' }}>
             <h2 className="headline-lg" style={{ color: 'var(--ow-primary)', marginBottom: '1rem' }}>⚙️ 커스텀 단어장 업로드</h2>
             <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
               엑셀이나 메모장에서 <strong>"영단어 뜻"</strong> 형태로 드래그하여 아래 빈칸에 붙여넣으세요.<br/>
               (예: <code>apple 사과</code> 또는 <code>banana     바나나</code>)
             </p>
             <textarea 
               value={vocabInput}
               onChange={(e) => setVocabInput(e.target.value)}
               placeholder="apple 사과&#10;banana 바나나&#10;car 자동차"
               style={{ width: '100%', height: '300px', background: 'var(--ow-surface)', color: 'white', border: '2px solid var(--ow-primary-dim)', padding: '1rem', fontFamily: 'monospace', fontSize: '1.2rem', marginBottom: '1.5rem', boxSizing: 'border-box', borderRadius: '8px' }}
             />
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="ow-btn ow-btn-secondary" onClick={() => setShowVocabModal(false)}>취소</button>
                <button className="ow-btn" onClick={handleVocabSubmit}>업로드 및 적용</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostScreen;
