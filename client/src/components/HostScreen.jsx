import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../utils/socket';
import { Users, Play } from 'lucide-react';
import YouTube from 'react-youtube';
import Confetti from 'react-confetti';

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
  const [showSpellingHunterOptions, setShowSpellingHunterOptions] = useState(false);
  const [showWordQuizOptions, setShowWordQuizOptions] = useState(false);
  const [wordQuizWinningScore, setWordQuizWinningScore] = useState(100);
  const [showSpeedRaceSoloOptions, setShowSpeedRaceSoloOptions] = useState(false);
  const [showSpeedRaceTeamOptions, setShowSpeedRaceTeamOptions] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState({});
  const [showQRModal, setShowQRModal] = useState(false);

  const [heroOpacity, setHeroOpacity] = useState(1);
  const heroIntervalRef = useRef(null);
  const [isHeroFadingRef] = useState({ current: false });
  const [showWordChainOptions, setShowWordChainOptions] = useState(false);
  const [isChainLengthLimitEnabled, setIsChainLengthLimitEnabled] = useState(false);
  const [wordChainLengthLimit, setWordChainLengthLimit] = useState(5);

  const lobbyBgmRef = useRef(null);
  const gameBgmRef = useRef(null);

  // 게임 상태에 따라 BGM 전환
  useEffect(() => {
    const isInGame = gameState !== 'lobby' && gameState;
    const gameAudio = gameBgmRef.current;
    const lobbyAudio = lobbyBgmRef.current;

    if (isInGame) {
      // 게임 시작: 로비 BGM 멈추고 게임 BGM 재생
      if (lobbyAudio) {
        lobbyAudio.pause();
      }
      if (gameAudio) {
        gameAudio.volume = 0.25;
        gameAudio.currentTime = 0;
        gameAudio.play().catch(() => {});
      }
    } else {
      // 로비 복귀: 게임 BGM 멈추고 로비 BGM 재생
      if (gameAudio) {
        gameAudio.pause();
        gameAudio.currentTime = 0;
      }
      if (lobbyAudio) {
        lobbyAudio.volume = 0.20;
        lobbyAudio.play().catch(() => {});
      }
    }
  }, [gameState]);

  useEffect(() => {
    // 자동재생 정책(Autoplay Policy) 우회
    const unlockAudio = () => {
      if (lobbyBgmRef.current) {
         lobbyBgmRef.current.volume = 0.20;
         lobbyBgmRef.current.play().catch(() => {});
      }
      // 게임 오디오도 미리 unlock
      if (gameBgmRef.current) {
        gameBgmRef.current.play().then(() => gameBgmRef.current.pause()).catch(() => {});
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

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
      // 이전 게임 상태 전부 리셋
      setRaceData(null);
      setRaceWinner(null);
      setQuizData(null);
      setPuzzleData(null);
      setChainData(null);
      setChainGameOver(null);
      setHunterData(null);
      setBombData(null);
      setBombExploded(null);
    });

    socket.on('hostNewQuestion', ({ meaning, answer }) => {
      setQuizData({ meaning, answer, winner: null });
    });

    socket.on('correctAnswer', ({ winnerNickname, ended }) => {
      setQuizData(prev => prev ? { ...prev, winner: winnerNickname, ended } : null);
    });

    socket.on('sentenceRaceStarted', ({ totalSentences }) => {
      setPuzzleData({ isActive: true, totalSentences, timeRemaining: 180, leaderboard: [], winner: null });
    });

    socket.on('sentenceRaceState', (data) => {
      setPuzzleData(prev => ({ ...(prev || {}), isActive: true, ...data }));
    });

    socket.on('puzzleCorrectAnswer', ({ winnerNickname, finalLeaderboard }) => {
      setPuzzleData(prev => prev ? { ...prev, winner: winnerNickname, finalLeaderboard, isActive: false } : null);
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
    };
  }, []);

  const startGame = (gameMode, category = null, winningScore = null, options = null) => {
    if (players.length === 0) {
      alert('참여자가 1명 이상 필요합니다.');
      return;
    }
    socket.emit('startGame', { pin, gameMode, category, winningScore, options });
    setShowWordQuizOptions(false);
    setShowWordChainOptions(false);
    setShowSpellingHunterOptions(false);
    setShowSpeedRaceSoloOptions(false);
    setShowSpeedRaceTeamOptions(false);
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
    <div className="host-container animate-enter" style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', margin: 0, padding: 0 }}>
      {/* Background Hero Video (Always present) */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none', overflow: 'hidden', background: '#000', opacity: heroOpacity, transition: 'opacity 1s ease-in-out' }}>
        <div style={{ width: '100vw', height: '56.25vw', minHeight: '100vh', minWidth: '177.77vh', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.1)' }}>
          <YouTube 
            videoId="OAP1us_UMxQ"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { autoplay: 1, mute: 1, loop: 0, modestbranding: 1, controls: 0, showinfo: 0, rel: 0, disablekb: 1 }
            }}
            style={{ width: '100%', height: '100%' }}
            onReady={(event) => {
               const player = event.target;
               player.mute();
               player.playVideo();
               if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
               heroIntervalRef.current = setInterval(() => {
                  const time = player.getCurrentTime();
                  const duration = player.getDuration();
                  // Fade out roughly 1.5 seconds before it ends
                  if (duration > 0 && duration - time <= 1.5 && !isHeroFadingRef.current) {
                     isHeroFadingRef.current = true;
                     setHeroOpacity(0);
                     setTimeout(() => {
                        player.seekTo(0);
                        player.playVideo();
                        setTimeout(() => {
                           setHeroOpacity(1);
                           isHeroFadingRef.current = false;
                        }, 100);
                     }, 1300);
                  }
               }, 300);
            }}
          />
        </div>
        {/* Gradient overlay for readability: lobby has side gradient, game modes have radial dim */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
          background: gameState === 'lobby' 
             ? 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 100%)'
             : 'rgba(0,0,0,0.6)'
        }} />
      </div>

      {/* Lobby BGM (local audio file) */}
      <audio ref={lobbyBgmRef} src="/host_bgm.webm" loop preload="auto" />

      {/* Game BGM (local audio file) */}
      <audio ref={gameBgmRef} src="/game_bgm.webm" loop preload="auto" />

      {/* Return Home Button (Not in Lobby) */}
      {(gameState !== 'lobby') && (
        <button 
          className="btn-return-home" 
          onClick={() => {
            if(window.confirm('로비로 돌아가시겠습니까? 게임 진행 상황이 초기화될 수 있습니다.')) {
               socket.emit('startGame', { pin, gameMode: 'lobby' });
            }
          }}
          style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100 }}
        >
          🏠 LOBBY
        </button>
      )}

      {/* Lobby View */}
      {gameState === 'lobby' ? (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
           
           {/* Left Navigation Menu (Overwatch Style) */}
           <div style={{ width: '450px', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '4rem', paddingTop: '2rem', paddingBottom: '2rem', zIndex: 10, overflowY: 'auto' }}>
             
             <div className="ow-main-menu" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => setShowWordQuizOptions(true)}>WORD QUIZ</button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => startGame('sentencePuzzle')}>SENTENCE RACE</button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => setShowWordChainOptions(true)}>WORD CHAIN</button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => { setBingoDrawnWords([]); setBingoWinners([]); startGame('wordBingo'); }}>DIGITAL BINGO</button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => startGame('categoryBomb')}>CATEGORY BOMB</button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => setShowSpellingHunterOptions(true)}>SPELLING HUNTER</button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => setShowSpeedRaceSoloOptions(true)}>SPEED RACE <span style={{fontSize:'1.2rem'}}>(SOLO)</span></button>
                <button className="ow-menu-item" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: '0' }} onClick={() => {
                  const initialAssignments = {};
                  const teamNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
                  const numTeams = Math.max(2, Math.min(4, Math.ceil(players.length / 2)));
                  players.forEach((p, idx) => {
                    initialAssignments[p.id] = teamNames[idx % numTeams];
                  });
                  setTeamAssignments(initialAssignments);
                  setShowSpeedRaceTeamOptions(true);
                }}>SPEED RACE <span style={{fontSize:'1.2rem'}}>(TEAM)</span></button>
             </div>
             
             <button 
               onClick={() => setShowVocabModal(true)}
               style={{ 
                 marginTop: '1.5rem', padding: '0.8rem 2rem', alignSelf: 'flex-start',
                 fontSize: '1.2rem', fontFamily: 'var(--font-header)', fontWeight: 800, fontStyle: 'italic',
                 background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px) saturate(180%)',
                 WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                 border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '50px',
                 color: '#fff', cursor: 'pointer', letterSpacing: '1px',
                 boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                 transition: 'all 0.3s ease', textTransform: 'uppercase'
               }}
               onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
             >
               ⚙️ 커스텀 단어장 ({customVocabCount}) {customVocabCount > 0 ? '✅' : ''}
             </button>
           </div>

           {/* Right Content: Players Only (QR via floating button) */}
           <div style={{ position: 'absolute', right: '5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.6)', padding: '1rem 3rem', borderRadius: '50px' }}>
                 <Users size={32} color="var(--ow-primary)" />
                 <span className="headline-lg" style={{ color: 'var(--ow-primary)', fontSize: '2.5rem' }}>{players.length} PLAYERS</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '400px', marginTop: '1.5rem' }}>
                 {players.map((p, idx) => (
                    <span key={idx} className="glassliquid-badge" style={{ fontSize: '1.5rem', opacity: p.connected === false ? 0.4 : 1, textDecoration: p.connected === false ? 'line-through' : 'none', cursor: 'pointer' }} onClick={() => { if(window.confirm(`${p.nickname}님을 내보내시겠습니까?`)) socket.emit('kickPlayer', { pin, nickname: p.nickname }); }}>{p.nickname}</span>
                 ))}
              </div>
           </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', height: '100%' }}>
          <header className="glassliquid-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 className="headline-lg" style={{ color: 'var(--on-surface)', marginLeft: '1rem' }}>HOST BOARD</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '8rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
              <Users size={24} color="var(--ow-primary)" style={{ marginRight: '0.5rem' }} />
              {players.length > 0 ? players.map((p, idx) => (
                <span key={idx} className="glassliquid-badge" style={{ fontSize: '1.2rem', opacity: p.connected === false ? 0.4 : 1, textDecoration: p.connected === false ? 'line-through' : 'none' }}>
                  {p.nickname}
                </span>
              )) : (
                <span className="headline-lg" style={{ color: 'var(--ow-primary)' }}>0 PLAYERS</span>
              )}
            </div>
          </header>

          <main style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '2rem', padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <section className="glassliquid-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>

               
               {/* 0. Category Vote */}
               {gameState === 'categoryVote' && (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0, textShadow: '0 0 10px rgba(204,151,255,0.4)' }}>
                     VOTING: WORD QUIZ CATEGORY
                   </h3>
                   <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '600px', marginTop: '3rem', gap: '1.5rem' }}>
                     {['동물 & 자연', '음식 & 과일', '사물 & 장소', '직업 & 인간', '숫자'].map(cat => {
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
               {gameState === 'wordQuiz' && !quizData && (
                 <div style={{ textAlign: 'center' }}>
                   <h3 className="headline-lg pulse-wait-text" style={{ color: 'var(--ow-primary)', fontSize: '3rem', textShadow: '0 0 20px var(--ow-primary)' }}>
                     WORD QUIZ LOADING...
                   </h3>
                   <p className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem', marginTop: '2rem' }}>첫 번째 문제를 준비 중입니다</p>
                 </div>
               )}
               {gameState === 'wordQuiz' && quizData ? (
                 <>
                   <h3 className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem', marginBottom: '2rem' }}>WHAT IS THIS WORD?</h3>
                   <div style={{ padding: '2rem', background: 'rgba(0, 255, 255, 0.05)', borderRadius: '1rem', border: '2px solid rgba(0, 255, 255, 0.3)', width: '100%' }}>
                     <h1 className="word-question-big">
                       {quizData.meaning}
                     </h1>
                   </div>
                   
                   {quizData.ended ? (
                      <div className="surface-card neon-glow" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem', border: '2px solid var(--ow-primary)' }}>
                        <h2 className="display-lg" style={{ color: 'var(--ow-primary-dim)', margin: '0 0 2rem 0', fontSize: '4rem' }}>WORD QUIZ FINISHED!</h2>
                        <h3 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginBottom: '1.5rem', fontSize: '2.5rem' }}>{quizData.winner} HAS WON THE GAME!</h3>
                        <div className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Press 'Stop Game' to return to lobby.</div>
                      </div>
                    ) : quizData.winner ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '2rem', textAlign: 'center' }}>
                       <h2 className="headline-lg" style={{ color: 'var(--ow-primary-dim)', margin: '0 0 1rem 0' }}>WINNER: {quizData.winner}</h2>
                       <h3 className="body-md" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>ANSWER: {quizData.answer}</h3>
                       <div className="body-md" style={{ color: 'var(--ow-secondary)', marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                         LOADING NEXT QUESTION...
                       </div>
                     </div>
                   ) : (
                     <div className="body-md" style={{ marginTop: '2rem', color: 'var(--ow-secondary)', fontSize: '1.5rem', opacity: 0.8 }}>WAITING FOR ANSWERS...</div>
                   )}

                   <h2 className="headline-lg" style={{ marginTop: '3rem', marginBottom: '1.5rem', color: 'var(--ow-primary)', textShadow: '0 0 15px rgba(204,151,255,0.6)' }}>
                     🔥 REAL-TIME LEADERBOARD 🔥
                   </h2>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '90%' }}>
                     {[...players].sort((a,b) => b.score - a.score).slice(0, 5).map((p, idx) => {
                       const maxScore = Math.max(50, Math.max(...players.map(p => p.score)));
                       const percent = Math.min(100, (p.score / maxScore) * 100);
                       const isFirst = idx === 0;
                       const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', 'var(--ow-secondary)', 'var(--ow-secondary)']; // 1,2,3등 및 나머지
                       const rankColor = rankColors[idx] || 'var(--ow-secondary)';
                       
                       return (
                         <div key={idx} className="surface-card" style={{ 
                           display: 'flex', alignItems: 'center', padding: '1rem 1.5rem',
                           borderColor: isFirst ? 'var(--ow-primary)' : 'rgba(64,72,93,0.5)',
                           boxShadow: isFirst ? '0 0 20px rgba(204,151,255,0.4) inset, 0 0 10px rgba(204,151,255,0.2)' : 'none',
                           position: 'relative', overflow: 'hidden'
                         }}>
                           {/* 배경 채우기 효과 (오버워치 궁극기 게이지 같은 느낌) */}
                           <div style={{
                             position: 'absolute', top: 0, left: 0, height: '100%',
                             width: `${percent}%`,
                             background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, ${rankColor}33 100%)`, 
                             transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                             zIndex: 0
                           }} />

                           <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
                             {/* 등수 뱃지 */}
                             <div className="display-lg" style={{ 
                               color: rankColor, width: '60px', textAlign: 'center', fontSize: isFirst ? '2.5rem' : '2rem',
                               textShadow: `0 0 15px ${rankColor}88`
                             }}>
                               #{idx + 1}
                             </div>

                             {/* 닉네임 */}
                             <span className="headline-lg" style={{ 
                               width: '200px', marginLeft: '1rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                               color: isFirst ? 'var(--on-surface)' : 'var(--on-surface-variant)'
                             }}>
                               {p.nickname}
                             </span>

                             {/* 프로그레스 바 */}
                             <div style={{ 
                               flex: 1, background: 'rgba(0,0,0,0.6)', height: '12px', margin: '0 2rem', 
                               borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
                             }}>
                               <div style={{ 
                                 width: `${percent}%`, background: rankColor, height: '100%', 
                                 transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
                                 boxShadow: `0 0 12px ${rankColor}` 
                               }} />
                             </div>

                             {/* 점수 */}
                             <div className="display-lg" style={{ 
                               width: '100px', textAlign: 'right', color: rankColor,
                               textShadow: `0 0 10px ${rankColor}`
                             }}>
                               {p.score} PT
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </>
               ) : null}

               {/* 2. Sentence Puzzle (Sentence Race) */}
               {gameState === 'sentencePuzzle' && puzzleData ? (
                 <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="display-lg" style={{ fontSize: '8rem', color: puzzleData.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-primary)', textShadow: '0 0 20px currentColor' }}>
                      {puzzleData.timeRemaining}s
                    </div>
                    
                    {puzzleData.winner ? (
                      <div className="surface-card neon-glow animate-enter" style={{ position: 'relative', marginTop: '3rem', padding: '4rem 5rem', textAlign: 'center', borderColor: 'var(--ow-primary)', background: 'rgba(204,151,255,0.1)' }}>
                        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={600} style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }} />
                        <h2 className="display-lg" style={{ color: 'var(--ow-secondary)', margin: '0 0 2rem 0', fontSize: '3rem', textShadow: '0 0 20px var(--ow-secondary)' }}>RACE FINISHED!</h2>
                        <h3 className="headline-lg" style={{ margin: 0, fontSize: '2rem' }}>WINNER</h3>
                        <div className="display-lg pulse-wait-text" style={{ fontSize: '8rem', color: 'var(--ow-primary-dim)', marginTop: '1rem', textShadow: '0 0 30px var(--ow-primary-dim), 0 0 60px var(--ow-primary)' }}>
                           {raceWinner}
                        </div>
                      </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                          {(puzzleData.finalLeaderboard || puzzleData.leaderboard || []).slice(0, 5).map((p, idx) => {
                             const isFirst = idx === 0;
                             const rankColor = isFirst ? 'var(--ow-primary)' : (idx === 1 ? 'var(--ow-secondary)' : (idx === 2 ? '#b87333' : 'var(--on-surface-variant)'));
                             return (
                               <div key={p.id} className="surface-card" style={{ display: 'flex', alignItems: 'center', padding: '1.5rem 3rem', transform: isFirst ? 'scale(1.05)' : 'none', border: isFirst ? `2px solid ${rankColor}` : 'none' }}>
                                 <div className="display-lg" style={{ color: rankColor, width: '80px', fontSize: isFirst ? '3.5rem' : '2.5rem' }}>#{idx + 1}</div>
                                 <div className="display-lg" style={{ flex: 1, textAlign: 'left', paddingLeft: '2rem', color: isFirst ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontSize: isFirst ? '3rem' : '2rem' }}>{p.nickname}</div>
                                 <div className="display-lg" style={{ color: rankColor, width: '150px', textAlign: 'right', fontSize: isFirst ? '3rem' : '2rem' }}>{p.score} PT</div>
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '2rem', width: '80%' }}>
                        <h3 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginBottom: '1rem', textAlign: 'center' }}>LIVE LEADERBOARD</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {(puzzleData.leaderboard || []).map((p, idx) => {
                             const isFirst = idx === 0;
                             const rankColor = isFirst ? 'var(--ow-primary)' : (idx === 1 ? 'var(--ow-secondary)' : (idx === 2 ? '#b87333' : 'var(--on-surface-variant)'));
                             const progressRatio = Math.min((p.score / 200) * 100, 100); // 20 sentences, 10 points each
                             
                             return (
                               <div key={p.id} className="surface-card" style={{ display: 'flex', alignItems: 'center', padding: '1rem 2rem' }}>
                                 <div className="headline-lg" style={{ color: rankColor, width: '50px', fontSize: isFirst ? '2.5rem' : '2rem' }}>#{idx + 1}</div>
                                 <span className="headline-lg" style={{ width: '200px', paddingLeft: '1rem', color: isFirst ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>{p.nickname}</span>
                                 <div style={{ flex: 1, height: '12px', background: 'rgba(0,0,0,0.5)', margin: '0 2rem', borderRadius: '6px', overflow: 'hidden' }}>
                                   <div style={{ width: `${progressRatio}%`, height: '100%', background: rankColor, transition: 'width 0.5s ease', boxShadow: `0 0 10px ${rankColor}` }} />
                                 </div>
                                 <div className="display-lg" style={{ color: rankColor, width: '100px', textAlign: 'right' }}>{p.score} PT</div>
                               </div>
                             );
                          })}
                        </div>
                      </div>
                    )}
                 </div>
               ) : null}

               {/* 3. Word Chain */}
               {gameState === 'wordChain' && chainData ? (
                 <div style={{ 
                   display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                   width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', borderRadius: '30px', padding: '2rem',
                   boxShadow: '0 0 50px rgba(0,0,0,0.5)',backdropFilter: 'blur(10px)'
                 }}>
                   <h3 className="display-lg" style={{ color: 'var(--ow-primary)', margin: 0, fontSize: '3rem', textShadow: '0 0 30px var(--ow-primary)' }}>WORD CHAIN SURVIVAL</h3>
                   
                   {chainGameOver ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem' }}>
                       <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0', fontSize: '4rem' }}>GAME OVER</h2>
                       <h3 className="display-md" style={{ margin: '0 0 2rem 0', color: 'var(--ow-primary-dim)', fontSize: '2.5rem' }}>WINNER: {chainGameOver}</h3>
                       <button onClick={() => socket.emit('nextQuestion', { pin })} className="ow-btn" style={{ fontSize: '2rem', padding: '1rem 3rem' }}>
                         PLAY AGAIN
                       </button>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '1.5rem' }}>
                       <div className="display-lg" style={{ fontSize: '3.5rem', color: chainData.timeRemaining <= 5 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 20px currentColor' }}>
                         {chainData.timeRemaining}s
                       </div>
                       
                       <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                         {chainData.chain.slice(-8).map((word, idx, arr) => {
                           const isLast = idx === arr.length - 1;
                           return (
                             <div key={`${chainData.chain.length - arr.length + idx}-${word}`} className="glassliquid-panel" style={{ 
                               padding: '0.8rem 2rem', 
                               borderColor: isLast ? 'var(--ow-primary)' : 'rgba(255,255,255,0.1)',
                               background: isLast ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
                               boxShadow: isLast ? '0 0 20px rgba(204,151,255,0.6)' : 'none',
                               animation: 'fadeIn 0.3s ease-out'
                             }}>
                               <span className="display-md" style={{ fontSize: '2.5rem', letterSpacing: '2px' }}>{word.toUpperCase()}</span>
                             </div>
                           );
                         })}
                       </div>

                       <div className="glassliquid-panel" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 3rem' }}>
                         <span className="headline-lg" style={{ fontSize: '2rem' }}>현재 턴:</span>
                         <strong className="display-md" style={{ color: 'var(--ow-primary)', fontSize: '2.5rem' }}>
                           {chainData.playersInfo.find(p => p.id === chainData.currentPlayerId)?.nickname || '알 수 없음'}
                         </strong>
                       </div>
                     </div>
                   )}
                 </div>
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
                   <h3 className="headline-lg" style={{ color: 'var(--ow-secondary)', margin: 0, textShadow: '0 0 10px rgba(0,255,255,0.4)', textAlign: 'center' }}>
                     SPELLING HUNTER SURVIVAL
                   </h3>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '2rem' }}>
                     
                     {!hunterData.isActive ? (
                       <div className="surface-card neon-glow" style={{ padding: '2rem 4rem', borderColor: 'var(--ow-primary)', textAlign: 'center' }}>
                         <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: 0 }}>GAME OVER</h2>
                         {hunterData.winner && <h3 className="headline-lg" style={{ marginTop: '1rem' }}>WINNER: {hunterData.winner}</h3>}
                       </div>
                     ) : (
                        <div className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
                           <span style={{ fontSize: '2rem', color: 'var(--ow-error)' }}>{hunterData.aliveCount}</span> 명 생존중
                           <br />
                           레벨: Math.floor(hunterData.spawnInterval ? (3000 / hunterData.spawnInterval) : 1)
                        </div>
                     )}

                     <h2 className="headline-lg" style={{ marginTop: '3rem', marginBottom: '1rem', color: 'var(--on-surface)' }}>LEADERBOARD (SCORE)</h2>
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
               {(gameState === 'speedRaceIndividual' || gameState === 'speedRaceTeam') && !raceData && (
                 <div style={{ textAlign: 'center' }}>
                   <h3 className="headline-lg pulse-wait-text" style={{ color: 'var(--ow-primary)', fontSize: '4rem', textShadow: '0 0 20px var(--ow-primary)' }}>
                     SPEED RACE LOADING...
                   </h3>
                   <p className="body-md" style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem', marginTop: '2rem' }}>플레이어들에게 문제를 전송하고 있습니다</p>
                 </div>
               )}
               {(gameState === 'speedRaceIndividual' || gameState === 'speedRaceTeam') && raceData && (
                 <>
                   <h3 className="headline-lg" style={{ color: 'var(--ow-primary)', margin: 0, textShadow: '0 0 10px rgba(204,151,255,0.4)', textAlign: 'center' }}>
                     SPEED RACE ({raceData.type === 'team' ? 'TEAM' : 'SOLO'})
                   </h3>
                   
                   {raceWinner ? (
                     <div className="surface-card neon-glow" style={{ marginTop: '3rem', padding: '3rem 5rem', textAlign: 'center', borderColor: 'var(--ow-primary)' }}>
                       <h2 className="display-lg" style={{ color: 'var(--ow-primary)', margin: '0 0 1rem 0' }}>RACE FINISHED!</h2>
                       <h3 className="headline-lg" style={{ margin: 0 }}>WINNER: <span style={{ color: 'var(--ow-primary-dim)' }}>{raceWinner}</span></h3>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '1rem', flex: 1, paddingRight: '2rem' }}>
                       <div className="display-lg" style={{ marginBottom: '2rem', fontSize: '5rem', color: raceData.timeRemaining <= 10 ? 'var(--ow-error)' : 'var(--ow-secondary)', textShadow: '0 0 20px currentColor' }}>
                         {raceData.timeRemaining}s
                       </div>
                       
                       <div style={{ position: 'relative', width: '100%', paddingRight: '30px' }}>
                         {/* Finish Line */}
                         {raceData.type === 'individual' && <div style={{ position: 'absolute', right: '-5px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.5)', zIndex: 0 }}></div>}
                         
                         {raceData.type === 'team' ? (
                           <div style={{ display: 'flex', width: '100%', gap: '2rem' }}>
                             {/* Left Team Roster (RED, GREEN) */}
                             <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                               {['RED', 'GREEN'].map(t => {
                                 if (!raceData.teams[t] && raceData.teams[t] !== 0) return null;
                                 const tMembers = raceData.playersInfo.filter(p => p.team === t);
                                 if (tMembers.length === 0) return null;
                                 const colorMap = { 'RED': '#ef4444', 'GREEN': '#22c55e' };
                                 return (
                                   <div key={t} style={{ border: `2px solid ${colorMap[t]}`, borderRadius: '12px', padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
                                      <h4 className="headline-lg" style={{ color: colorMap[t], margin: '0 0 1rem 0', textAlign: 'center' }}>{t} TEAM</h4>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {tMembers.map(m => <span key={m.id} style={{ color: '#fff', fontSize: '1.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.nickname}</span>)}
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
                             
                             {/* Center Chart */}
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5rem', position: 'relative', paddingTop: '2rem' }}>
                               {/* Finish Line overrides parent finish line for center alignment */}
                               {(() => {
                                  const maxTeamScore = Math.max(0, ...Object.values(raceData.teams));
                                  const dynamicDenom = maxTeamScore + 15;
                                  return Object.entries(raceData.teams)
                                    .sort((a,b) => b[1] - a[1])
                                    .map(([team, score]) => {
                                      const percent = Math.min(100, (score / dynamicDenom) * 100);
                                      const colorMap = { 'RED': '#ef4444', 'BLUE': '#3b82f6', 'GREEN': '#22c55e', 'YELLOW': '#eab308' };
                                      const barColor = colorMap[team] || '#a855f7';
                                      return (
                                        <div key={team} style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative', zIndex: 1 }}>
                                          <span className="headline-lg" style={{ width: '100px', color: '#fff', fontSize: '1.4rem' }}>
                                            {team}
                                          </span>
                                          <div style={{ flex: 1, position: 'relative', height: '16px', background: `${barColor}33`, borderRadius: '8px' }}>
                                            <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '8px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative' }}>
                                               <div style={{ 
                                                  position: 'absolute', right: '-16px', top: '50%', transform: 'translateY(-50%)',
                                                  width: '32px', height: '32px', borderRadius: '50%', background: '#fff', color: '#000',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem',
                                                  boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
                                               }}>
                                                  {score}
                                               </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                  });
                               })()}
                             </div>

                             {/* Right Team Roster (BLUE, YELLOW) */}
                             <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                               {['BLUE', 'YELLOW'].map(t => {
                                 if (!raceData.teams[t] && raceData.teams[t] !== 0) return null;
                                 const tMembers = raceData.playersInfo.filter(p => p.team === t);
                                 if (tMembers.length === 0) return null;
                                 const colorMap = { 'BLUE': '#3b82f6', 'YELLOW': '#eab308' };
                                 return (
                                   <div key={t} style={{ border: `2px solid ${colorMap[t]}`, borderRadius: '12px', padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
                                      <h4 className="headline-lg" style={{ color: colorMap[t], margin: '0 0 1rem 0', textAlign: 'center' }}>{t} TEAM</h4>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {tMembers.map(m => <span key={m.id} style={{ color: '#fff', fontSize: '1.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.nickname}</span>)}
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
                              {(() => {
                                const maxPlayerScore = Math.max(0, ...raceData.playersInfo.map(p => p.score));
                                const dynamicDenom = maxPlayerScore + 15;
                                return [...raceData.playersInfo]
                                  .sort((a,b) => b.score - a.score)
                                  .slice(0, 10)
                                  .map((p, idx) => {
                                    const percent = Math.min(100, (p.score / dynamicDenom) * 100);
                                    const colorList = ['#3b82f6', '#eab308', '#22c55e', '#f97316', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];
                                    const barColor = colorList[idx % colorList.length];
                                    return (
                                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative', zIndex: 1 }}>
                                        <span className="headline-lg" style={{ width: '160px', color: '#fff', fontSize: '1.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                          {p.nickname}
                                        </span>
                                        <div style={{ flex: 1, position: 'relative', height: '14px', background: `${barColor}33`, borderRadius: '7px' }}>
                                          <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '7px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative' }}>
                                             <div style={{ 
                                                position: 'absolute', right: '-14px', top: '50%', transform: 'translateY(-50%)',
                                                width: '28px', height: '28px', borderRadius: '50%', background: '#fff', color: '#000',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                                             }}>
                                                {p.score}
                                             </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                });
                              })()}
                            </div>
                          )}
                       </div>
                     </div>
                   )}
                 </>
               )}


            </div>
             </section>
          </main>
        </div>
      )}

      {/* Genie Category Modals */}
      {showWordQuizOptions && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowWordQuizOptions(false)}>
          <div className="glassliquid-panel" style={{ width: '90%', maxWidth: '800px', animation: 'zoomIn 0.3s ease-out', padding: '3rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginBottom: '1rem' }}>WORD QUIZ OPTIONS</h2>
            
            <div className="surface-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
              <span className="body-md" style={{ fontSize: '1.5rem', color: 'var(--on-surface)' }}>WINNING SCORE (Multiples of 10):</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="ow-btn" style={{ padding: '0.5rem 1rem', fontSize: '1.5rem' }} onClick={() => setWordQuizWinningScore(prev => Math.max(10, prev - 10))}>-</button>
                <span className="display-lg" style={{ color: 'var(--ow-primary)', fontSize: '2.5rem', width: '80px', textAlign: 'center' }}>{wordQuizWinningScore}</span>
                <button className="ow-btn" style={{ padding: '0.5rem 1rem', fontSize: '1.5rem' }} onClick={() => setWordQuizWinningScore(prev => prev + 10)}>+</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <button className="ow-btn" onClick={() => { startGame('wordQuiz', 'All', wordQuizWinningScore); setShowWordQuizOptions(false); }}>ALL RANDOM 🎲</button>
               {['동물 & 자연', '음식 & 과일', '사물 & 장소', '직업 & 인간', '숫자'].map(cat => (
                 <button key={cat} className="ow-btn" onClick={() => { startGame('wordQuiz', cat, wordQuizWinningScore); setShowWordQuizOptions(false); }}>{cat}</button>
               ))}
               <button className="ow-btn" style={{ borderColor: 'var(--ow-error)', color: 'var(--ow-error)' }} onClick={() => { startGame('wordQuiz', 'Custom', wordQuizWinningScore); setShowWordQuizOptions(false); }}>CUSTOM VOCAB 📋</button>
            </div>
            <button className="ow-btn ow-btn-secondary" style={{ marginTop: '3rem', width: '200px' }} onClick={() => setShowWordQuizOptions(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {showSpellingHunterOptions && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glassliquid-panel" style={{ width: '90%', maxWidth: '800px', animation: 'zoomIn 0.3s ease-out', padding: '3rem', textAlign: 'center' }}>
            <h2 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginBottom: '2rem' }}>HUNTER CATEGORY</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <button className="ow-btn" onClick={() => { startGame('spellingHunter', 'All'); setShowSpellingHunterOptions(false); }}>ALL RANDOM 🎲</button>
               {['동물 & 자연', '음식 & 과일', '사물 & 장소', '직업 & 인간', '숫자'].map(cat => (
                 <button key={cat} className="ow-btn" onClick={() => { startGame('spellingHunter', cat); setShowSpellingHunterOptions(false); }}>{cat}</button>
               ))}
               <button className="ow-btn" style={{ borderColor: 'var(--ow-error)', color: 'var(--ow-error)' }} onClick={() => { startGame('spellingHunter', 'Custom'); setShowSpellingHunterOptions(false); }}>CUSTOM VOCAB 📋</button>
            </div>
            <button className="ow-btn ow-btn-secondary" style={{ marginTop: '3rem', width: '200px' }} onClick={() => setShowSpellingHunterOptions(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {showSpeedRaceSoloOptions && (
        <div className="genie-modal-container" onClick={() => setShowSpeedRaceSoloOptions(false)}>
          <div className="genie-modal-content" onClick={(e) => e.stopPropagation()}>
             <h2 className="genie-modal-head">🏎️ SPEED RACE (SOLO)</h2>
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', 'All Random')}>🎲 All Random</button>
             {customVocabCount > 0 && <button className="genie-btn" style={{ color: '#48cfae', borderColor: '#48cfae' }} onClick={() => startGame('speedRaceIndividual', 'Custom')}>⭐ Custom Vocab</button>}
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', '동물 & 자연')}>🦁 Animals & Nature</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', '음식 & 과일')}>🍔 Food & Fruits</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', '사물 & 장소')}>🏫 Objects & Places</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', '직업 & 인간')}>👨‍⚕️ Jobs & People</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', '숫자')}>🔢 Numbers</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceIndividual', '불규칙동사 (과거/과거분사)')}>🔄 Irregular Verbs</button>
             <button className="genie-btn genie-btn-close" onClick={() => setShowSpeedRaceSoloOptions(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {showSpeedRaceTeamOptions && (
        <div className="genie-modal-container" onClick={() => setShowSpeedRaceTeamOptions(false)} style={{ zIndex: 1000 }}>
          <div className="genie-modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
             <h2 className="genie-modal-head" style={{ marginBottom: '0.5rem' }}>🏆 SPEED RACE (TEAM CONFIG)</h2>
             
             {/* Team Configuration UI */}
             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="headline-lg" style={{ margin: 0, color: 'var(--ow-secondary)' }}>팀 배정 (클릭하여 변경)</h3>
                  <button className="ow-btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }} onClick={() => {
                    const newAssignments = {};
                    const teamNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
                    const numTeams = Math.max(2, Math.min(4, Math.ceil(players.length / 2)));
                    const shuffled = [...players].sort(() => 0.5 - Math.random());
                    shuffled.forEach((p, idx) => {
                      newAssignments[p.id] = teamNames[idx % numTeams];
                    });
                    setTeamAssignments(newAssignments);
                  }}>🎲 랜덤 배치</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                  {players.map(p => {
                    const teamColors = {
                      'RED': '#ef4444',
                      'BLUE': '#3b82f6',
                      'GREEN': '#22c55e',
                      'YELLOW': '#eab308'
                    };
                    const currentTeam = teamAssignments[p.id] || 'RED';
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          const teams = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
                          const nextIdx = (teams.indexOf(currentTeam) + 1) % teams.length;
                          setTeamAssignments(prev => ({...prev, [p.id]: teams[nextIdx]}));
                        }}
                        style={{
                          background: teamColors[currentTeam],
                          padding: '0.6rem 1.2rem',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          userSelect: 'none',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{currentTeam}</span>
                        <span style={{ fontSize: '1.2rem' }}>{p.nickname}</span>
                      </div>
                    );
                  })}
                </div>
             </div>

             <h3 className="headline-lg" style={{ marginTop: '1rem', color: '#fff', textAlign: 'center' }}>주제 선택 후 게임 시작</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', 'All Random', null, { teamAssignments })}>🎲 All Random</button>
               {customVocabCount > 0 && <button className="genie-btn" style={{ color: '#48cfae', borderColor: '#48cfae' }} onClick={() => startGame('speedRaceTeam', 'Custom', null, { teamAssignments })}>⭐ Custom Vocab</button>}
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '동물 & 자연', null, { teamAssignments })}>🦁 Animals & Nature</button>
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '음식 & 과일', null, { teamAssignments })}>🍔 Food & Fruits</button>
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '사물 & 장소', null, { teamAssignments })}>🏫 Objects & Places</button>
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '직업 & 인간', null, { teamAssignments })}>👨‍⚕️ Jobs & People</button>
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '숫자', null, { teamAssignments })}>🔢 Numbers</button>
               <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '불규칙동사 (과거/과거분사)', null, { teamAssignments })}>🔄 Irregular Verbs</button>
             </div>
             <button className="genie-btn genie-btn-close" style={{ marginTop: '1rem' }} onClick={() => setShowSpeedRaceTeamOptions(false)}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Word Chain Options Modal */}
      {showWordChainOptions && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowWordChainOptions(false)}>
          <div className="glassliquid-panel" style={{ width: '90%', maxWidth: '600px', animation: 'zoomIn 0.3s ease-out', padding: '3rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="headline-lg" style={{ color: 'var(--ow-secondary)', marginBottom: '2rem' }}>WORD CHAIN OPTIONS</h2>
            
            <div className="surface-card" style={{ marginBottom: '2rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <span className="body-md" style={{ fontSize: '1.5rem', color: 'var(--on-surface)' }}>글자수 제한 켜기:</span>
                 <input type="checkbox" checked={isChainLengthLimitEnabled} onChange={e => setIsChainLengthLimitEnabled(e.target.checked)} style={{ width: '24px', height: '24px', cursor: 'pointer' }} />
              </div>
              
              {isChainLengthLimitEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                    <button className="ow-btn" style={{ padding: '0.5rem 1rem', fontSize: '1.5rem' }} onClick={() => setWordChainLengthLimit(prev => Math.max(2, prev - 1))}>-</button>
                    <span className="display-lg" style={{ color: 'var(--ow-primary)', fontSize: '2.5rem', width: '80px', textAlign: 'center' }}>{wordChainLengthLimit}</span>
                    <button className="ow-btn" style={{ padding: '0.5rem 1rem', fontSize: '1.5rem' }} onClick={() => setWordChainLengthLimit(prev => Math.min(10, prev + 1))}>+</button>
                  </div>
              )}
            </div>

            <button className="ow-btn" style={{ width: '100%', padding: '1.5rem', fontSize: '1.6rem', marginBottom: '1rem' }} onClick={() => startGame('wordChain', null, null, { isLengthLimitEnabled: isChainLengthLimitEnabled, wordChainLengthLimit })}>
              START GAME 🚀
            </button>
            <button className="ow-btn ow-btn-secondary" style={{ width: '100%', padding: '1.5rem', fontSize: '1.6rem' }} onClick={() => setShowWordChainOptions(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Host Judgment Modal */}
      {judgeData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(6, 14, 32, 0.9)', backdropFilter: 'blur(8px)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="glassliquid-panel neon-glow" style={{ textAlign: 'center', padding: '4rem', maxWidth: '700px', width: '90%' }}>
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

      {/* Floating QR Button (always visible) */}
      <button 
        onClick={() => setShowQRModal(true)}
        style={{ 
          position: 'fixed', bottom: '2.5rem', right: '2.5rem', zIndex: 9900, 
          padding: '1.2rem 2.5rem', fontSize: '1.8rem', fontFamily: 'var(--font-header)',
          fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase',
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: '50px',
          color: '#fff', cursor: 'pointer', letterSpacing: '2px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(204,151,255,0.3)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
      >
        📱 QR CODE
      </button>

      {/* QR Code Liquid Glass Modal */}
      {showQRModal && (
        <div 
          onClick={() => setShowQRModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              textAlign: 'center', padding: '3.5rem 4rem',
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)',
              animation: 'genieEffect 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              transformOrigin: 'bottom right',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
              minWidth: '420px'
            }}
          >
            <h1 className="display-lg" style={{ color: 'var(--ow-secondary)', fontSize: '4rem', margin: 0, textShadow: '0 0 25px var(--ow-secondary)' }}>
              PIN: {pin}
            </h1>
            <div style={{ padding: '20px', background: 'white', borderRadius: '24px', display: 'inline-block', boxShadow: '0 15px 40px rgba(0,0,0,0.4)' }}>
              <QRCodeSVG value={joinUrl} size={280} />
            </div>
            <h3 className="body-md" style={{ color: 'var(--on-surface)', fontSize: '1.6rem', margin: 0, letterSpacing: '2px', opacity: 0.8 }}>
              {joinUrl}
            </h3>

            {/* 접속자 현황 */}
            <div style={{
              width: '100%', padding: '1.2rem 1.5rem', marginTop: '0.5rem',
              background: 'rgba(0,0,0,0.35)', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <Users size={22} color="var(--ow-primary)" />
                <span className="headline-lg" style={{ color: 'var(--ow-primary)', fontSize: '1.4rem' }}>
                  접속자 {players.length} / 15
                </span>
              </div>
              {players.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {players.map((p, idx) => (
                    <span key={idx} className="glassliquid-badge" style={{ 
                      fontSize: '1.1rem', padding: '0.4rem 1rem',
                      opacity: p.connected === false ? 0.4 : 1, textDecoration: p.connected === false ? 'line-through' : 'none',
                      animation: 'fadeIn 0.3s ease-out',
                      animationDelay: `${idx * 0.05}s`,
                      animationFillMode: 'both',
                      cursor: 'pointer'
                    }} onClick={() => { if(window.confirm(`${p.nickname}님을 내보내시겠습니까?`)) socket.emit('kickPlayer', { pin, nickname: p.nickname }); }}>
                      {p.nickname}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '1.1rem', opacity: 0.7 }}>
                  QR 스캔 대기 중...
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowQRModal(false)}
              style={{
                marginTop: '0.5rem', padding: '0.8rem 3rem', fontSize: '1.3rem',
                fontFamily: 'var(--font-header)', fontStyle: 'italic', fontWeight: 800,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '50px', color: '#fff', cursor: 'pointer',
                backdropFilter: 'blur(10px)', transition: 'all 0.2s',
                letterSpacing: '2px', textTransform: 'uppercase'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ow-primary)'; e.currentTarget.style.color = '#000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default HostScreen;
