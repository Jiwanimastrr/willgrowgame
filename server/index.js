const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

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

// 간단한 단어 문제 DB (인메모리, 추후 DB 연동 가능)
let wordQuizDB = [
  { id: 1, answer: 'apple', meaning: '사과' },
  { id: 2, answer: 'banana', meaning: '길쭉하고 노란 과일' },
  { id: 3, answer: 'car', meaning: '자동차' },
  { id: 4, answer: 'dog', meaning: '강아지, 개' },
];

let sentenceDB = [
  { id: 1, sentence: 'I am a student', meaning: '나는 학생입니다' },
  { id: 2, sentence: 'This is an apple', meaning: '이것은 사과입니다' },
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
app.get('*', (req, res) => {
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
    const question = wordQuizDB[Math.floor(Math.random() * wordQuizDB.length)];
    room.currentQuestion = question;
    // 오답 보기 3개 + 정답 1개 섞기
    const incorrectOptions = wordQuizDB.filter(q => q.id !== question.id).sort(() => 0.5 - Math.random()).slice(0, 3);
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
    const startingWord = wordQuizDB[Math.floor(Math.random() * wordQuizDB.length)].answer;
    
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
      
      // 내 턴이 아니면 무시
      if (socket.id !== currentPlayerId) return;

      const lastWord = room.wordChain.chain[room.wordChain.chain.length - 1];
      const validStart = lastWord.charAt(lastWord.length - 1).toLowerCase();
      const submittedStart = word.charAt(0).toLowerCase();

      // 끝말잇기 룰 체크 (간단히 첫/끝 철자 일치만 확인)
      // *TODO: 실제 사전에 있는지 외부 API 등을 이용한 체크 로직 추가 가능
      if (validStart === submittedStart && word.length > 1) {
        room.wordChain.chain.push(word.toLowerCase());
        
        // 다음 사람 턴으로 이동
        room.wordChain.currentPlayerIndex = (room.wordChain.currentPlayerIndex + 1) % room.wordChain.activePlayers.length;
        room.wordChain.timeRemaining = 15;
        
        broadcastChainState(pin, room);
      } else {
        // 틀린 단어를 제출한 경우 패널티 처리 기능 (여기선 경고 표시 등 UI로만 처리하고 아무일도 안 일어남)
        io.to(socket.id).emit('invalidWord', { message: `'${validStart}'로 시작하는 다른 단어를 입력하세요!` });
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
