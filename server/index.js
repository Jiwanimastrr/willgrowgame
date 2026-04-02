const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const irregularVerbDB = require('./data/irregularVerbDB');
const app = express();
app.use(cors());
app.use(express.json()); // JSON 바디 파싱 추가

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// 상태 관리용 (추후 별도 파일로 분리 가능)
// room 구조: { host: socket.id, players: [{id, nickname, score}], gameState: 'lobby'|'quiz'|'puzzle'|'chain', currentQuestion: null }
const rooms = {};

// 간단한 단어 문제 DB (서버 분리 파일 불러오기)
const wordQuizDB = require('./data/wordQuizDB');

let sentenceDB = [
  { id: 1, sentence: 'I am a student', meaning: '나는 학생입니다' },
  { id: 2, sentence: 'This is an apple', meaning: '이것은 사과입니다' },
];

// 빙고 게임을 위한 기초 단어셋 (최소 25개)
let bingoDB = [
  "apple", "banana", "car", "dog", "elephant", "frog", "grape", "house", "ice", "juice",
  "kite", "lion", "monkey", "nose", "orange", "pig", "queen", "rabbit", "snake", "tree",
  "umbrella", "van", "water", "xylophone", "yacht", "zebra", "bear", "cat", "duck", "eagle"
];

// 폭탄 돌리기 카테고리
let categoryDB = {
  "과일": ["사과", "바나나", "포도", "오렌지", "수박", "딸기", "메론", "파인애플", "복숭아", "배", "키위", "귤", "망고", "체리"],
  "동물": ["강아지", "고양이", "사자", "호랑이", "코끼리", "원숭이", "기린", "토끼", "뱀", "곰", "돼지", "소", "말", "양"],
  "색깔": ["빨강", "주황", "노랑", "초록", "파랑", "남색", "보라", "검정", "하양", "분홍", "갈색", "회색", "핑크", "레드", "블루"]
};

// 스펠링 헌터 DB
let spellingDB = [
  { correct: "apple", wrong: ["aple", "appple", "epple"] },
  { correct: "banana", wrong: ["bananna", "bannana", "bananaa"] },
  { correct: "elephant", wrong: ["elefant", "ellephant", "alephant"] },
  { correct: "rabbit", wrong: ["rabit", "rabbitt", "reabbit"] },
  { correct: "monkey", wrong: ["monky", "mankey", "munkey"] }
];

// 간단한 CRUD API 엔드포인트 세팅 (선생님이 나중에 API로 추가/수정 가능하도록 설정)
app.get('/api/words', (req, res) => res.json(wordQuizDB));
app.post('/api/words', (req, res) => {
  const newWord = { id: Date.now(), ...req.body };
  wordQuizDB.push(newWord);
  res.json(newWord);
});

app.get('/api/sentences', (req, res) => res.json(sentenceDB));
app.post('/api/sentences', (req, res) => {
  const newSentence = { id: Date.now(), ...req.body };
  sentenceDB.push(newSentence);
  res.json(newSentence);
});

// React 정적 파일 제공 (프로덕션 환경 배포용)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// API가 아닌 모든 GET 요청은 React Router로 넘김
app.use((req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // 1. 방 생성 (Host)
  socket.on('createRoom', (callback) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    rooms[pin] = {
      host: socket.id,
      players: [],
      gameState: 'lobby',
      currentQuestion: null,
    };
    socket.join(pin);
    console.log(`🏠 Room created: ${pin} by ${socket.id}`);
    
    // 호스트에게 생성된 핀번호 전달
    if(typeof callback === 'function') callback({ success: true, pin });
  });

  socket.on('uploadCustomWords', ({ pin, words }) => {
    if (rooms[pin] && rooms[pin].host === socket.id) {
      rooms[pin].customWordDB = words;
      console.log(`📚 Custom words uploaded for room ${pin}: ${words.length} words`);
    }
  });

  // ---- 퀴즈 카테고리 투표 시스템 ----
  socket.on('startCategoryVote', ({ pin, options }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      room.gameState = 'categoryVote';
      room.categoryVotes = {}; // 초기화
      // 미리 정의된 카테고리 옵션(사물, 동물, 등)을 전송
      io.to(pin).emit('categoryVoteStarted', { options });
      console.log(`🗳️ Category vote started in room ${pin}`);
    }
  });

  socket.on('submitCategoryVote', ({ pin, nickname, vote }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'categoryVote') {
      room.categoryVotes[socket.id] = vote;
      // 실시간 집계 투표 현황 호스트에게 전송 (카운트 계산)
      const tally = Object.values(room.categoryVotes).reduce((acc, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      io.to(room.host).emit('categoryVoteUpdate', { tally });
      console.log(`🗳️ ${nickname} voted for ${vote}`);
    }
  });

  socket.on('endCategoryVote', ({ pin, winningCategory }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      room.quizCategory = winningCategory; // 선택된 카테고리 저장
      room.gameState = 'wordQuiz';
      io.to(pin).emit('gameStarted', { gameMode: 'wordQuiz' });
      emitNextWordQuiz(pin, room);
      console.log(`🏁 Voting ended in ${pin}. Winning category: ${winningCategory}`);
    }
  });
  // ------------------------------------


  // 2. 방 접속 (Player)
  socket.on('joinRoom', ({ pin, nickname }, callback) => {
    if (rooms[pin]) {
      const player = { id: socket.id, nickname, score: 0 };
      rooms[pin].players.push(player);
      socket.join(pin);
      
      // 방 전체에 새로운 플레이어 접속 알림
      io.to(pin).emit('playersUpdated', rooms[pin].players);
      
      console.log(`👤 User ${nickname}(${socket.id}) joined room ${pin}`);
      if(typeof callback === 'function') callback({ success: true, room: rooms[pin], player });
    } else {
      if(typeof callback === 'function') callback({ success: false, message: 'Invalid PIN' });
    }
  });

  // 3. 게임 시작 (Host)
  socket.on('startGame', ({ pin, gameMode }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      room.gameState = gameMode;
      io.to(pin).emit('gameStarted', { gameMode });
      console.log(`🎮 Game ${gameMode} started in room ${pin}`);

      // 1번 게임: 단어 퀴즈
      if (gameMode === 'wordQuiz') {
        emitNextWordQuiz(pin, room);
      }
      // 2번 게임: 문장 퍼즐
      else if (gameMode === 'sentencePuzzle') {
        emitNextSentencePuzzle(pin, room);
      }
      // 3번 게임: 끝말잇기
      else if (gameMode === 'wordChain') {
        startWordChain(pin, room);
      }
      // 4번 게임: 디지털 빙고
      else if (gameMode === 'wordBingo') {
        startWordBingo(pin, room);
      }
      // 5번 게임: 카테고리 폭탄
      else if (gameMode === 'categoryBomb') {
        startCategoryBomb(pin, room);
      }
      // 6번 게임: 스펠링 헌터
      else if (gameMode === 'spellingHunter') {
        startSpellingHunter(pin, room);
      }
      // 7번 게임: 스피드 레이스 (개인전)
      else if (gameMode === 'speedRaceIndividual') {
        startSpeedRace(pin, room, 'individual');
      }
      // 8번 게임: 스피드 레이스 (팀전)
      else if (gameMode === 'speedRaceTeam') {
        startSpeedRace(pin, room, 'team');
      }
      // 9번 게임: 불규칙동사 스피드게임 (타이핑)
      else if (gameMode === 'irregularVerbRace') {
        startIrregularVerbRace(pin, room);
      }
    }
  });

  // 호스트의 다음 문제 요청
  socket.on('nextQuestion', ({ pin }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      if (room.gameState === 'wordQuiz') emitNextWordQuiz(pin, room);
      else if (room.gameState === 'sentencePuzzle') emitNextSentencePuzzle(pin, room);
      // 끝말잇기는 nextQuestion 개념 대신 restart 기능으로 사용
      else if (room.gameState === 'wordChain') startWordChain(pin, room);
    }
  });

  function emitNextWordQuiz(pin, room) {
    let sourceDB = wordQuizDB;
    // 커스텀 DB 우선 사용, 없으면 투표된 카테고리로 필터링
    if (room.customWordDB && room.customWordDB.length >= 4) {
       sourceDB = room.customWordDB;
    } else if (room.quizCategory) {
       sourceDB = wordQuizDB.filter(w => w.category === room.quizCategory);
    }
    
    // 만약 타겟 데이터베이스가 너무 적을 경우 폴백(fallback)
    if (!sourceDB || sourceDB.length < 4) {
      sourceDB = wordQuizDB;
    }

    const question = sourceDB[Math.floor(Math.random() * sourceDB.length)];
    room.currentQuestion = question;
    // 오답 보기 3개 + 정답 1개 섞기
    const incorrectOptions = sourceDB.filter(q => q.id !== question.id && q.answer !== question.answer).sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [question, ...incorrectOptions].map(q => q.answer).sort(() => 0.5 - Math.random());

    // Host에게는 정답 & 메인 문제 전송
    io.to(room.host).emit('hostNewQuestion', { meaning: question.meaning, answer: question.answer });
    
    // Player들에게는 보기만 전송
    room.players.forEach(p => {
      io.to(p.id).emit('playerNewQuestion', { options });
    });
  }

  function emitNextSentencePuzzle(pin, room) {
    const question = sentenceDB[Math.floor(Math.random() * sentenceDB.length)];
    room.currentQuestion = question;
    const tokens = question.sentence.split(' ').map((word, idx) => ({ id: `${idx}-${word}`, text: word }));
    const shuffledTokens = [...tokens].sort(() => 0.5 - Math.random());

    io.to(room.host).emit('hostNewPuzzle', { meaning: question.meaning, sentence: question.sentence });
    
    room.players.forEach(p => {
      io.to(p.id).emit('playerNewPuzzle', { tokens: shuffledTokens });
    });
  }

  // 끝말잇기 게임 상태 시작
  function startWordChain(pin, room) {
    if (room.chainTimer) clearInterval(room.chainTimer);
    
    // 무작위 첫 단어 설정
    const db = (room.customWordDB && room.customWordDB.length > 0) ? room.customWordDB : wordQuizDB;
    const startingWord = db[Math.floor(Math.random() * db.length)].answer;
    
    room.wordChain = {
      activePlayers: [...room.players.map(p => p.id)], // 현재 방의 플레이어 ID 목록 복사
      currentPlayerIndex: 0,
      chain: [startingWord],
      timeRemaining: 15, // 15초 제한
    };

    broadcastChainState(pin, room);
    startChainTimer(pin, room);
  }

  function broadcastChainState(pin, room) {
    io.to(pin).emit('wordChainState', {
      chain: room.wordChain.chain,
      activePlayers: room.wordChain.activePlayers,
      currentPlayerId: room.wordChain.activePlayers[room.wordChain.currentPlayerIndex],
      timeRemaining: room.wordChain.timeRemaining,
      playersInfo: room.players // 닉네임 등을 표시하기 위해
    });
  }

  function startChainTimer(pin, room) {
    if (room.chainTimer) clearInterval(room.chainTimer);
    
    room.chainTimer = setInterval(() => {
      if (!room || room.gameState !== 'wordChain') {
        clearInterval(room.chainTimer);
        return;
      }
      
      room.wordChain.timeRemaining -= 1;
      
      if (room.wordChain.timeRemaining <= 0) {
        // 시간 초과: 현재 플레이어 탈락
        const eliminatedId = room.wordChain.activePlayers[room.wordChain.currentPlayerIndex];
        room.wordChain.activePlayers.splice(room.wordChain.currentPlayerIndex, 1);
        io.to(pin).emit('playerEliminated', { id: eliminatedId });

        // 승자 확인
        if (room.wordChain.activePlayers.length <= 1) {
          clearInterval(room.chainTimer);
          const winnerId = room.wordChain.activePlayers[0];
          const winnerInfo = room.players.find(p => p.id === winnerId);
          if (winnerInfo) winnerInfo.score += 30; // 30점 획득
          io.to(pin).emit('chainGameOver', { winner: winnerInfo ? winnerInfo.nickname : 'No one' });
          io.to(pin).emit('playersUpdated', room.players);
          return;
        }

        // 인덱스 조정 (배열이 줄어들었으므로 그대로 두면 다음 사람, 범위를 넘어가면 0)
        if (room.wordChain.currentPlayerIndex >= room.wordChain.activePlayers.length) {
          room.wordChain.currentPlayerIndex = 0;
        }
        
        // 턴 초기화
        room.wordChain.timeRemaining = 15;
      }
      
      broadcastChainState(pin, room);
    }, 1000);
  }

  // ==== 4. 빙고 게임 ====
  function startWordBingo(pin, room) {
    // 플레이어들이 보드에 배치할 전체 단어 세트 전송
    let wordsToSend = bingoDB;
    if (room.customWordDB && room.customWordDB.length > 0) {
      wordsToSend = room.customWordDB.map(w => w.answer);
      // 빙고판을 채우려면 최소 16~25단어 필요. 부족하면 반복해서 채움.
      if (wordsToSend.length < 25) {
         let temp = [...wordsToSend];
         while(temp.length < 25) {
           temp = [...temp, ...wordsToSend];
         }
         wordsToSend = temp;
      }
    }
    io.to(pin).emit('bingoWordList', { words: wordsToSend });
  }

  // 호스트가 단어 뽑기
  socket.on('drawBingoWord', ({ pin, word }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      io.to(pin).emit('bingoWordDrawn', { word });
    }
  });

  // 플레이어가 빙고 달성 시
  socket.on('claimBingo', ({ pin }) => {
    const room = rooms[pin];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score += 50; // 빙고 완성 보너스
        io.to(pin).emit('playersUpdated', room.players);
        io.to(pin).emit('bingoClaimed', { id: player.id, nickname: player.nickname });
      }
    }
  });

  // ==== 5. 카테고리 폭탄 ====
  function startCategoryBomb(pin, room) {
    if (room.bombTimer) clearInterval(room.bombTimer);
    
    const categories = Object.keys(categoryDB);
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    room.bombGame = {
      activePlayers: [...room.players.map(p => p.id)],
      currentPlayerIndex: Math.floor(Math.random() * room.players.length), // 시작은 완전 랜덤
      category: category,
      timeRemaining: 20, // 20초 제한
      usedWords: [] // 이미 말한 단어 중복 방지
    };

    broadcastBombState(pin, room);
    startBombTimer(pin, room);
  }

  function broadcastBombState(pin, room) {
    io.to(pin).emit('bombState', {
      category: room.bombGame.category,
      activePlayers: room.bombGame.activePlayers,
      currentPlayerId: room.bombGame.activePlayers[room.bombGame.currentPlayerIndex],
      timeRemaining: room.bombGame.timeRemaining,
      usedWords: room.bombGame.usedWords,
      playersInfo: room.players
    });
  }

  function startBombTimer(pin, room) {
    if (room.bombTimer) clearInterval(room.bombTimer);
    
    room.bombTimer = setInterval(() => {
      if (!room || room.gameState !== 'categoryBomb') {
        clearInterval(room.bombTimer);
        return;
      }
      
      room.bombGame.timeRemaining -= 1;
      
      if (room.bombGame.timeRemaining <= 0) {
        // 폭발
        const explodedId = room.bombGame.activePlayers[room.bombGame.currentPlayerIndex];
        io.to(pin).emit('bombExploded', { id: explodedId });
        
        // 해당 유저는 점수 깎이거나 탈락 (여기서는 스킵하고 다음 판으로, 혹은 게임 진행 안내)
        // 일단 타이머 정지
        clearInterval(room.bombTimer);
      } else {
        broadcastBombState(pin, room);
      }
    }, 1000);
  }

  socket.on('submitBombWord', ({ pin, word }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'categoryBomb' && room.bombGame) {
      const currentPlayerId = room.bombGame.activePlayers[room.bombGame.currentPlayerIndex];
      if (socket.id !== currentPlayerId) return;
      
      // 이미 사용된 단어인지 확인
      if (room.bombGame.usedWords.includes(word)) {
        io.to(socket.id).emit('invalidBombWord', { message: '이미 사용된 단어입니다!' });
        return;
      }

      // 호스트 승인 대기를 위해 타이머 일시정지
      clearInterval(room.bombTimer);
      const player = room.players.find(p => p.id === socket.id);
      
      io.to(room.host).emit('hostReviewWord', {
        playerId: socket.id,
        nickname: player ? player.nickname : '알 수 없음',
        word,
        gameMode: 'categoryBomb'
      });
      io.to(pin).emit('waitingForJudge', { word, nickname: player ? player.nickname : '' });
    }
  });

  // 카테고리 폭탄 재개 (호스트가 클릭)
  socket.on('resumeBomb', ({ pin }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'categoryBomb') {
      startCategoryBomb(pin, room);
    }
  });

  // ==== 6. 스펠링 헌터 ====
  function startSpellingHunter(pin, room) {
    if (room.hunterTimer) clearInterval(room.hunterTimer);
    
    room.hunterGame = {
      timeRemaining: 60, // 60초간 진행
      isActive: true
    };
    
    let dbToSend = spellingDB;
    if (room.customWordDB && room.customWordDB.length > 0) {
      dbToSend = room.customWordDB.map(w => {
         const correct = w.answer.toLowerCase();
         // 대충 모음 등 하나 치환하거나 글자 하나 빼서 3가지 오답 만들기
         const wrong = Array(3).fill(0).map((_, i) => {
             const idx = Math.floor(Math.random() * correct.length);
             const arr = correct.split('');
             if (i === 0) arr.splice(idx, 1); // 문자 하나 빼기
             else if (i === 1) arr.splice(idx, 0, arr[idx]); // 문자 중복
             else arr[idx] = ['a','e','i','o','u'][Math.floor(Math.random()*5)]; // 모음 덮어쓰기
             return arr.join('');
         }).filter(fake => fake !== correct); // 우연히 정답과 같아지면 방지
         
         // 3개가 안되면 기본 대충 넣기
         while(wrong.length < 3) {
            wrong.push(correct + "x" + Math.floor(Math.random()*10));
         }
         return { correct, wrong };
      });
    }
    
    io.to(pin).emit('hunterState', { timeRemaining: 60, isActive: true, words: dbToSend });
    
    room.hunterTimer = setInterval(() => {
      if (!room || room.gameState !== 'spellingHunter') {
        clearInterval(room.hunterTimer);
        return;
      }
      
      room.hunterGame.timeRemaining -= 1;
      
      if (room.hunterGame.timeRemaining <= 0) {
        room.hunterGame.isActive = false;
        clearInterval(room.hunterTimer);
        io.to(pin).emit('hunterState', { timeRemaining: 0, isActive: false });
        io.to(pin).emit('playersUpdated', room.players); // 최종 리더보드 전송
      } else {
        if (room.hunterGame.timeRemaining % 3 === 0) {
          // 3초마다 타이머 및 실시간 리더보드 동기화 (네트워크 플러딩 억제)
          io.to(pin).emit('hunterState', { timeRemaining: room.hunterGame.timeRemaining, isActive: true });
          io.to(pin).emit('playersUpdated', room.players);
        }
      }
    }, 1000);
  }

  // 플레이어가 스펠링을 맞춰서 점수 획득 (다중 접속 시 부하를 막기 위해 playersUpdated는 즉각 emit하지 않음)
  socket.on('hunterScore', ({ pin, points }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'spellingHunter' && room.hunterGame && room.hunterGame.isActive) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.score += points;
        // 클라이언트 단의 개별 반응(효과음/피드백)을 위해 본인에게만 업데이트 알림
        io.to(socket.id).emit('myScoreUpdated', { score: player.score });
      }
    }
  });

  // 4. 단어 퀴즈 정답 제출 (Player)
  socket.on('submitWordQuiz', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'wordQuiz' && room.currentQuestion) {
      if (answer === room.currentQuestion.answer) {
        // 정답을 맞힌 플레이어 점수 증가
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.score += 10;
          io.to(pin).emit('playersUpdated', room.players); // 점수 업데이트
          io.to(pin).emit('correctAnswer', { winnerId: socket.id, winnerNickname: player.nickname });
          
          // 문제 초기화
          room.currentQuestion = null;
        }
      }
    }
  });

  // 5. 문장 퍼즐 정답 제출 (Player)
  socket.on('submitSentence', ({ pin, submittedSentence }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'sentencePuzzle' && room.currentQuestion) {
      if (submittedSentence === room.currentQuestion.sentence) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.score += 20;
          io.to(pin).emit('playersUpdated', room.players);
          io.to(pin).emit('puzzleCorrectAnswer', { winnerId: socket.id, winnerNickname: player.nickname });
          room.currentQuestion = null;
        }
      }
    }
  });

  // 6. 끝말잇기 단어 제출
  socket.on('submitChainWord', ({ pin, word }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'wordChain' && room.wordChain) {
      const currentPlayerId = room.wordChain.activePlayers[room.wordChain.currentPlayerIndex];
      if (socket.id !== currentPlayerId) return;

      const lastWord = room.wordChain.chain[room.wordChain.chain.length - 1];
      const validStart = lastWord.charAt(lastWord.length - 1).toLowerCase();
      const submittedStart = word.charAt(0).toLowerCase();

      if (validStart !== submittedStart || word.length <= 1) {
        io.to(socket.id).emit('invalidWord', { message: `'${validStart}'로 시작하는 2글자 이상의 단어를 입력하세요!` });
        return;
      }
      
      // 이미 사용된 단어인지 검사
      if (room.wordChain.chain.includes(word.toLowerCase())) {
        io.to(socket.id).emit('invalidWord', { message: `이미 사용된 단어입니다!` });
        return;
      }

      // 호스트 승인 대기를 위해 타이머 일시정지
      clearInterval(room.chainTimer);
      const player = room.players.find(p => p.id === socket.id);
      
      io.to(room.host).emit('hostReviewWord', {
        playerId: socket.id,
        nickname: player ? player.nickname : '알 수 없음',
        word,
        gameMode: 'wordChain'
      });
      io.to(pin).emit('waitingForJudge', { word, nickname: player ? player.nickname : '' });
    }
  });

  // 호스트 단어 심사 결과 처리
  socket.on('hostJudgeResult', ({ pin, isCorrect, word, gameMode, playerId }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      if (gameMode === 'categoryBomb' && room.bombGame) {
        if (isCorrect) {
          room.bombGame.usedWords.push(word);
          
          const otherPlayers = room.bombGame.activePlayers.filter((_, idx) => idx !== room.bombGame.currentPlayerIndex);
          if (otherPlayers.length > 0) {
            const nextPlayerId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            room.bombGame.currentPlayerIndex = room.bombGame.activePlayers.indexOf(nextPlayerId);
            room.bombGame.timeRemaining = Math.min(room.bombGame.timeRemaining + 5, 20); 
            
            io.to(pin).emit('bombPassed', { passedTo: nextPlayerId, word, isCorrect: true, message: '정답 인정!' });
          }
        } else {
          io.to(playerId).emit('invalidBombWord', { message: '호스트가 오답 처리했습니다!' });
          io.to(pin).emit('bombPassed', { passedTo: playerId, word, isCorrect: false });
        }
        broadcastBombState(pin, room);
        startBombTimer(pin, room);
      } 
      else if (gameMode === 'wordChain' && room.wordChain) {
        if (isCorrect) {
          room.wordChain.chain.push(word.toLowerCase());
          room.wordChain.currentPlayerIndex = (room.wordChain.currentPlayerIndex + 1) % room.wordChain.activePlayers.length;
          room.wordChain.timeRemaining = 15;
          io.to(pin).emit('judgeComplete', { isCorrect: true });
        } else {
          io.to(playerId).emit('invalidWord', { message: '호스트가 오답 처리했습니다! 다시 입력하세요.' });
          io.to(pin).emit('judgeComplete', { isCorrect: false });
        }
        broadcastChainState(pin, room);
        startChainTimer(pin, room);
      }
    }
  });

  // ==== 7, 8. 스피드 레이스 (개인전 / 팀전) ====
  /* ========== 불규칙동사 스피드게임 핵심 로직 ========== */

  function startIrregularVerbRace(pin, room) {
    if (room.verbTimer) clearInterval(room.verbTimer);

    room.verbGame = {
      timeRemaining: 60,
      isActive: true,
    };

    room.players.forEach(p => {
      p.score = 0;
      p.currentVerbAnswer = null;
    });

    io.to(pin).emit('playersUpdated', room.players);
    io.to(pin).emit('verbState', {
      timeRemaining: room.verbGame.timeRemaining,
      isActive: room.verbGame.isActive,
      playersInfo: room.players
    });

    room.players.forEach(p => {
      emitVerbQuestion(pin, p.id);
    });

    room.verbTimer = setInterval(() => {
      if (!room || !room.verbGame || !room.verbGame.isActive) {
        clearInterval(room.verbTimer);
        return;
      }
      room.verbGame.timeRemaining -= 1;
      
      io.to(pin).emit('verbState', {
        timeRemaining: room.verbGame.timeRemaining,
        isActive: room.verbGame.isActive,
        playersInfo: room.players
      });

      if (room.verbGame.timeRemaining <= 0) {
        clearInterval(room.verbTimer);
        room.verbGame.isActive = false;
        io.to(pin).emit('verbState', {
          timeRemaining: 0,
          isActive: false,
          playersInfo: room.players
        });
      }
    }, 1000);
  }

  function emitVerbQuestion(pin, playerId) {
    const room = rooms[pin];
    if (room && room.gameState === 'irregularVerbRace' && room.verbGame && room.verbGame.isActive) {
      const verb = irregularVerbDB[Math.floor(Math.random() * irregularVerbDB.length)];
      const isPast = Math.random() > 0.5;
      const targetForm = isPast ? '과거형' : '과거분사형(p.p.)';
      const answer = isPast ? verb.past : verb.pp;
      
      const player = room.players.find(p => p.id === playerId);
      if (player) {
         player.currentVerbAnswer = answer;
         io.to(playerId).emit('verbNewQuestion', { meaning: `${verb.base} (${verb.meaning})`, targetForm });
      }
    }
  }

  socket.on('submitVerbAnswer', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'irregularVerbRace' && room.verbGame && room.verbGame.isActive) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.currentVerbAnswer) {
        // 정답 판정 (소문자 변환 통일)
        const normalizedAnswer = answer.trim().toLowerCase();
        // was/were 같이 슬래시로 구분된 여러개의 정답 처리
        const possibleAnswers = player.currentVerbAnswer.toLowerCase().split('/').map(w => w.trim());
        
        if (possibleAnswers.includes(normalizedAnswer)) {
          player.score += 1;
          io.to(socket.id).emit('verbCorrectAnswer');
        } else {
          // 오답 시 점수 깎기
          player.score = Math.max(0, player.score - 1);
          io.to(socket.id).emit('verbWrongAnswer');
        }
        
        // 정답 오답 상관없이 새로운 문제 출제
        player.currentVerbAnswer = null;
        io.to(pin).emit('playersUpdated', room.players); // 호스트 리더보드 용
        setTimeout(() => {
          if (room.verbGame.isActive) emitVerbQuestion(pin, socket.id);
        }, 500); // UI 이펙트(빨강/초록 깜박임)를 볼 수 있도록 약간의 딜레이
      }
    }
  });

  /* ========== 불규칙동사 스피드게임 핵심 로직 (타이핑) ========== */

  function startIrregularVerbRace(pin, room) {
    if (room.verbTimer) clearInterval(room.verbTimer);

    room.verbGame = {
      timeRemaining: 60,
      isActive: true,
    };

    room.players.forEach(p => {
      p.score = 0;
      p.currentVerbAnswer = null;
    });

    io.to(pin).emit('playersUpdated', room.players);
    io.to(pin).emit('verbState', {
      timeRemaining: room.verbGame.timeRemaining,
      isActive: room.verbGame.isActive,
      playersInfo: room.players
    });

    room.players.forEach(p => {
      emitVerbQuestion(pin, p.id);
    });

    room.verbTimer = setInterval(() => {
      if (!room || !room.verbGame || !room.verbGame.isActive) {
        clearInterval(room.verbTimer);
        return;
      }
      room.verbGame.timeRemaining -= 1;
      
      io.to(pin).emit('verbState', {
        timeRemaining: room.verbGame.timeRemaining,
        isActive: room.verbGame.isActive,
        playersInfo: room.players
      });

      if (room.verbGame.timeRemaining <= 0) {
        clearInterval(room.verbTimer);
        room.verbGame.isActive = false;
        io.to(pin).emit('verbState', {
          timeRemaining: 0,
          isActive: false,
          playersInfo: room.players
        });
      }
    }, 1000);
  }

  function emitVerbQuestion(pin, playerId) {
    const room = rooms[pin];
    if (room && room.gameState === 'irregularVerbRace' && room.verbGame && room.verbGame.isActive) {
      const verb = irregularVerbDB[Math.floor(Math.random() * irregularVerbDB.length)];
      const isPast = Math.random() > 0.5;
      const targetForm = isPast ? '과거형' : '과거분사형(p.p.)';
      const answer = isPast ? verb.past : verb.pp;
      
      const player = room.players.find(p => p.id === playerId);
      if (player) {
         player.currentVerbAnswer = answer;
         io.to(playerId).emit('verbNewQuestion', { meaning: `${verb.base} (${verb.meaning})`, targetForm });
      }
    }
  }

  socket.on('submitVerbAnswer', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'irregularVerbRace' && room.verbGame && room.verbGame.isActive) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.currentVerbAnswer) {
        const normalizedAnswer = answer.trim().toLowerCase();
        const possibleAnswers = player.currentVerbAnswer.toLowerCase().split('/').map(w => w.trim());
        
        if (possibleAnswers.includes(normalizedAnswer)) {
          player.score += 1;
          io.to(socket.id).emit('verbCorrectAnswer');
        } else {
          player.score = Math.max(0, player.score - 1);
          io.to(socket.id).emit('verbWrongAnswer');
        }
        
        player.currentVerbAnswer = null;
        io.to(pin).emit('playersUpdated', room.players);
        setTimeout(() => {
          if (room.verbGame.isActive) emitVerbQuestion(pin, socket.id);
        }, 500);
      }
    }
  });

  function startSpeedRace(pin, room, type) {
    if (room.raceTimer) clearInterval(room.raceTimer);

    room.raceGame = {
      type: type, // 'individual' or 'team'
      timeRemaining: 60, // 60초 타임어택
      isActive: true,
      teams: {}, // 팀전용 점수풀
    };

    if (type === 'team') {
      const teamNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
      // 인원수에 따라 최소 2팀 배정
      const numTeams = Math.max(2, Math.min(4, Math.ceil(room.players.length / 2)));
      const activeTeams = teamNames.slice(0, numTeams);
      activeTeams.forEach(t => room.raceGame.teams[t] = 0);

      // 플레이어 셔플 후 팀 배당
      const shuffledPlayers = [...room.players].sort(() => 0.5 - Math.random());
      shuffledPlayers.forEach((p, idx) => {
        p.score = 0;
        p.team = activeTeams[idx % numTeams];
        p.currentRaceAnswer = null;
      });
    } else {
      room.players.forEach(p => {
        p.score = 0;
        p.currentRaceAnswer = null;
      });
    }

    io.to(pin).emit('playersUpdated', room.players);
    io.to(pin).emit('raceState', {
      type: room.raceGame.type,
      timeRemaining: room.raceGame.timeRemaining,
      isActive: room.raceGame.isActive,
      teams: room.raceGame.teams,
      playersInfo: room.players
    });

    // 각자에게 독립적인 첫 문제 전송
    room.players.forEach(p => {
      emitRaceQuestion(pin, p.id);
    });

    room.raceTimer = setInterval(() => {
      if (!room || !room.raceGame || !room.raceGame.isActive) {
        clearInterval(room.raceTimer);
        return;
      }
      room.raceGame.timeRemaining -= 1;
      
      if (room.raceGame.timeRemaining <= 0) {
        room.raceGame.isActive = false;
        clearInterval(room.raceTimer);
        
        let winner = null;
        if (room.raceGame.type === 'team') {
          const entries = Object.entries(room.raceGame.teams);
          entries.sort((a,b) => b[1] - a[1]);
          if(entries.length > 0) winner = entries[0][0] + " TEAM";
        } else {
          const sorted = [...room.players].sort((a,b) => b.score - a.score);
          if (sorted.length > 0) winner = sorted[0].nickname;
        }

        io.to(pin).emit('raceGameOver', { winner: winner || 'Nobody' });
        io.to(pin).emit('raceState', {
           ...room.raceGame,
           timeRemaining: 0,
           isActive: false,
           playersInfo: room.players
        });
        io.to(pin).emit('playersUpdated', room.players);
      } else {
        // 타이머 및 상태 갱신
        if (room.raceGame.timeRemaining % 2 === 0 || room.raceGame.timeRemaining <= 5) {
          io.to(pin).emit('raceState', {
             ...room.raceGame,
             playersInfo: room.players
          });
        }
      }
    }, 1000);
  }

  function emitRaceQuestion(pin, playerId) {
    const room = rooms[pin];
    if (room && (room.gameState === 'speedRaceIndividual' || room.gameState === 'speedRaceTeam') && room.raceGame && room.raceGame.isActive) {
      const question = wordQuizDB[Math.floor(Math.random() * wordQuizDB.length)];
      const incorrectOptions = wordQuizDB.filter(q => q.id !== question.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [question, ...incorrectOptions].map(q => q.answer).sort(() => 0.5 - Math.random());
      
      const player = room.players.find(p => p.id === playerId);
      if (player) {
         player.currentRaceAnswer = question.answer;
         io.to(playerId).emit('raceNewQuestion', { meaning: question.meaning, options });
      }
    }
  }

  socket.on('submitRaceAnswer', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && (room.gameState === 'speedRaceIndividual' || room.gameState === 'speedRaceTeam') && room.raceGame && room.raceGame.isActive) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        if (answer === player.currentRaceAnswer) {
          player.score += 1;
          if (room.raceGame.type === 'team') room.raceGame.teams[player.team] += 1;
          io.to(socket.id).emit('raceCorrectAnswer');
        } else {
          // 오답 시 점수 깎기 (최소 0점)
          player.score = Math.max(0, player.score - 1);
          if (room.raceGame.type === 'team') {
            room.raceGame.teams[player.team] = Math.max(0, room.raceGame.teams[player.team] - 1);
          }
          io.to(socket.id).emit('raceWrongAnswer');
        }
        
        emitRaceQuestion(pin, socket.id);
        
        // 제출 즉시 상태 동기화
        io.to(pin).emit('raceState', {
           ...room.raceGame,
           playersInfo: room.players
        });
        io.to(pin).emit('playersUpdated', room.players);
      }
    }
  });

  // 연결 종료 처리
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    for (const [pin, room] of Object.entries(rooms)) {
      if (room.host === socket.id) {
        // 호스트가 나가면 방 폭파
        io.to(pin).emit('hostDisconnected');
        delete rooms[pin];
      } else {
        const index = room.players.findIndex(p => p.id === socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          io.to(pin).emit('playersUpdated', room.players);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
