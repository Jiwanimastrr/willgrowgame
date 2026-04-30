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
  },
  pingInterval: 25000,
  pingTimeout: 60000 // 연결 지연 시 끊김 방지를 위해 60초로 증가
});

const PORT = process.env.PORT || 3001;

// 상태 관리용 (추후 별도 파일로 분리 가능)
// room 구조: { host: socket.id, players: [{id, nickname, score}], gameState: 'lobby'|'quiz'|'puzzle'|'chain', currentQuestion: null }
const rooms = {};

// 간단한 단어 문제 DB (서버 분리 파일 불러오기)
const wordQuizDB = require('./data/wordQuizDB');

let sentenceDB = [
  // === 인사 & 자기소개 ===
  { id: 1, sentence: 'I am a student', meaning: '나는 학생입니다' },
  { id: 2, sentence: 'My name is Tom', meaning: '내 이름은 톰입니다' },
  { id: 3, sentence: 'Nice to meet you', meaning: '만나서 반갑습니다' },
  { id: 4, sentence: 'How are you today', meaning: '오늘 기분이 어떻니' },
  { id: 5, sentence: 'I am fine thank you', meaning: '저는 괜찮아요 감사합니다' },
  { id: 6, sentence: 'Where are you from', meaning: '어디에서 왔니' },
  { id: 7, sentence: 'I am from Korea', meaning: '나는 한국에서 왔어요' },
  { id: 8, sentence: 'I am ten years old', meaning: '나는 열 살이에요' },
  { id: 9, sentence: 'See you tomorrow', meaning: '내일 보자' },
  { id: 10, sentence: 'Have a nice day', meaning: '좋은 하루 보내세요' },
  // === 학교 생활 ===
  { id: 11, sentence: 'I go to school by bus', meaning: '나는 버스로 학교에 가요' },
  { id: 12, sentence: 'What is your favorite subject', meaning: '가장 좋아하는 과목이 뭐야' },
  { id: 13, sentence: 'I like math and science', meaning: '나는 수학과 과학을 좋아해요' },
  { id: 14, sentence: 'Can I borrow your pencil', meaning: '연필 빌려줄 수 있어' },
  { id: 15, sentence: 'Let us study together', meaning: '같이 공부하자' },
  { id: 16, sentence: 'Please open your book', meaning: '책을 펴세요' },
  { id: 17, sentence: 'I have homework today', meaning: '오늘 숙제가 있어요' },
  { id: 18, sentence: 'The class starts at nine', meaning: '수업은 아홉 시에 시작해요' },
  { id: 19, sentence: 'She is our English teacher', meaning: '그녀는 우리 영어 선생님이에요' },
  { id: 20, sentence: 'We have a test tomorrow', meaning: '내일 시험이 있어요' },
  // === 가족 ===
  { id: 21, sentence: 'I have two brothers', meaning: '나는 남자 형제가 두 명이에요' },
  { id: 22, sentence: 'My mom is a nurse', meaning: '우리 엄마는 간호사예요' },
  { id: 23, sentence: 'My dad cooks dinner', meaning: '아빠가 저녁을 요리해요' },
  { id: 24, sentence: 'I love my family', meaning: '나는 우리 가족을 사랑해요' },
  { id: 25, sentence: 'My sister plays the piano', meaning: '내 언니는 피아노를 쳐요' },
  { id: 26, sentence: 'We live in a big house', meaning: '우리는 큰 집에 살아요' },
  { id: 27, sentence: 'My grandma makes cookies', meaning: '할머니가 쿠키를 만들어요' },
  { id: 28, sentence: 'He has a cute baby', meaning: '그에게는 귀여운 아기가 있어요' },
  { id: 29, sentence: 'My uncle is very tall', meaning: '삼촌은 키가 매우 커요' },
  { id: 30, sentence: 'We eat breakfast together', meaning: '우리는 함께 아침을 먹어요' },
  // === 음식 ===
  { id: 31, sentence: 'I want some water please', meaning: '물 좀 주세요' },
  { id: 32, sentence: 'This pizza is delicious', meaning: '이 피자 맛있어요' },
  { id: 33, sentence: 'Do you like ice cream', meaning: '아이스크림 좋아하니' },
  { id: 34, sentence: 'I eat rice every day', meaning: '나는 매일 밥을 먹어요' },
  { id: 35, sentence: 'She is eating an apple', meaning: '그녀는 사과를 먹고 있어요' },
  { id: 36, sentence: 'Can I have some milk', meaning: '우유 좀 줄 수 있나요' },
  { id: 37, sentence: 'I am hungry now', meaning: '나는 지금 배고파요' },
  { id: 38, sentence: 'He likes chocolate cake', meaning: '그는 초콜릿 케이크를 좋아해요' },
  { id: 39, sentence: 'We made sandwiches for lunch', meaning: '점심으로 샌드위치를 만들었어요' },
  { id: 40, sentence: 'The soup is very hot', meaning: '국이 매우 뜨거워요' },
  // === 날씨 & 계절 ===
  { id: 41, sentence: 'It is sunny today', meaning: '오늘 날씨가 맑아요' },
  { id: 42, sentence: 'It is raining outside', meaning: '밖에 비가 와요' },
  { id: 43, sentence: 'I love the snow', meaning: '나는 눈을 좋아해요' },
  { id: 44, sentence: 'Spring is my favorite season', meaning: '봄은 내가 가장 좋아하는 계절이에요' },
  { id: 45, sentence: 'It is very cold in winter', meaning: '겨울에는 매우 추워요' },
  { id: 46, sentence: 'The wind is blowing hard', meaning: '바람이 세게 불어요' },
  { id: 47, sentence: 'Bring your umbrella today', meaning: '오늘 우산 가져가요' },
  { id: 48, sentence: 'Summer is hot and fun', meaning: '여름은 덥고 재미있어요' },
  { id: 49, sentence: 'The leaves are falling down', meaning: '나뭇잎이 떨어지고 있어요' },
  { id: 50, sentence: 'I can see a rainbow', meaning: '무지개가 보여요' },
  // === 취미 & 놀이 ===
  { id: 51, sentence: 'I like to play soccer', meaning: '나는 축구하는 것을 좋아해요' },
  { id: 52, sentence: 'She reads books every night', meaning: '그녀는 매일 밤 책을 읽어요' },
  { id: 53, sentence: 'We play games after school', meaning: '방과 후에 게임을 해요' },
  { id: 54, sentence: 'He can swim very fast', meaning: '그는 매우 빨리 수영할 수 있어요' },
  { id: 55, sentence: 'I draw pictures in art class', meaning: '미술 시간에 그림을 그려요' },
  { id: 56, sentence: 'Do you want to play together', meaning: '같이 놀래' },
  { id: 57, sentence: 'I listen to music every day', meaning: '나는 매일 음악을 들어요' },
  { id: 58, sentence: 'She dances very well', meaning: '그녀는 춤을 매우 잘 춰요' },
  { id: 59, sentence: 'We went to the park yesterday', meaning: '어제 공원에 갔어요' },
  { id: 60, sentence: 'I ride my bike on weekends', meaning: '주말에 자전거를 타요' },
  // === 동물 ===
  { id: 61, sentence: 'The dog is running fast', meaning: '강아지가 빨리 달려요' },
  { id: 62, sentence: 'I have a pet cat', meaning: '나는 반려 고양이가 있어요' },
  { id: 63, sentence: 'The bird is singing a song', meaning: '새가 노래를 부르고 있어요' },
  { id: 64, sentence: 'Elephants are very big', meaning: '코끼리는 매우 커요' },
  { id: 65, sentence: 'The rabbit likes carrots', meaning: '토끼는 당근을 좋아해요' },
  { id: 66, sentence: 'Fish live in the water', meaning: '물고기는 물에서 살아요' },
  { id: 67, sentence: 'We saw monkeys at the zoo', meaning: '동물원에서 원숭이를 봤어요' },
  { id: 68, sentence: 'The lion is the king', meaning: '사자는 왕이에요' },
  { id: 69, sentence: 'My hamster is very small', meaning: '내 햄스터는 매우 작아요' },
  { id: 70, sentence: 'Penguins live in cold places', meaning: '펭귄은 추운 곳에 살아요' },
  // === 장소 & 이동 ===
  { id: 71, sentence: 'Where is the library', meaning: '도서관이 어디에 있어요' },
  { id: 72, sentence: 'Turn left at the corner', meaning: '모퉁이에서 왼쪽으로 돌아요' },
  { id: 73, sentence: 'The store is next to the bank', meaning: '가게는 은행 옆에 있어요' },
  { id: 74, sentence: 'Go straight and turn right', meaning: '직진하고 오른쪽으로 돌아요' },
  { id: 75, sentence: 'We are going to the beach', meaning: '우리는 해변에 갈 거예요' },
  { id: 76, sentence: 'The hospital is across the street', meaning: '병원은 길 건너편에 있어요' },
  { id: 77, sentence: 'I take the subway to school', meaning: '지하철로 학교에 가요' },
  { id: 78, sentence: 'My house is near the park', meaning: '우리 집은 공원 근처에 있어요' },
  { id: 79, sentence: 'We traveled to Jeju island', meaning: '제주도로 여행 갔어요' },
  { id: 80, sentence: 'The airport is very far', meaning: '공항은 매우 멀어요' },
  // === 감정 & 상태 ===
  { id: 81, sentence: 'I am so happy today', meaning: '오늘 너무 행복해요' },
  { id: 82, sentence: 'She looks very tired', meaning: '그녀는 매우 피곤해 보여요' },
  { id: 83, sentence: 'He is sad because of the rain', meaning: '비 때문에 그는 슬퍼요' },
  { id: 84, sentence: 'We are excited about the trip', meaning: '여행이 기대돼요' },
  { id: 85, sentence: 'I feel sick today', meaning: '오늘 몸이 안 좋아요' },
  { id: 86, sentence: 'She is surprised by the gift', meaning: '선물에 그녀가 놀랐어요' },
  { id: 87, sentence: 'Do not be afraid of the dark', meaning: '어둠을 무서워하지 마' },
  { id: 88, sentence: 'I am proud of my work', meaning: '내 작품이 자랑스러워요' },
  { id: 89, sentence: 'He is angry at his brother', meaning: '그는 동생에게 화가 났어요' },
  { id: 90, sentence: 'They are very kind to me', meaning: '그들은 나에게 매우 친절해요' },
  // === 시간 & 일과 ===
  { id: 91, sentence: 'What time is it now', meaning: '지금 몇 시야' },
  { id: 92, sentence: 'I wake up at seven every morning', meaning: '매일 아침 7시에 일어나요' },
  { id: 93, sentence: 'I brush my teeth after eating', meaning: '밥 먹고 양치를 해요' },
  { id: 94, sentence: 'She goes to bed at ten', meaning: '그녀는 10시에 잠자리에 들어요' },
  { id: 95, sentence: 'We have lunch at twelve', meaning: '12시에 점심을 먹어요' },
  { id: 96, sentence: 'I do my homework after dinner', meaning: '저녁 먹고 숙제를 해요' },
  { id: 97, sentence: 'He takes a shower every night', meaning: '그는 매일 밤 샤워해요' },
  { id: 98, sentence: 'I walk to school in the morning', meaning: '아침에 걸어서 학교에 가요' },
  { id: 99, sentence: 'We clean our classroom together', meaning: '함께 교실 청소를 해요' },
  { id: 100, sentence: 'Today is Monday and I am busy', meaning: '오늘은 월요일이고 바빠요' },
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
      setTimeout(() => emitNextWordQuiz(pin, room), 1000);
      console.log(`🏁 Voting ended in ${pin}. Winning category: ${winningCategory}`);
    }
  });
  // ------------------------------------


  // 2. 방 접속 (Player) - 최대 15명 제한
  const MAX_PLAYERS = 15;
  socket.on('joinRoom', ({ pin, nickname, playerId }, callback) => {
    if (!playerId) playerId = socket.id;
    if (rooms[pin]) {
      const existingPlayer = rooms[pin].players.find(p => p.id === playerId);
      let player;
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        existingPlayer.nickname = nickname;
        existingPlayer.connected = true;
        if (existingPlayer.disconnectTimeout) {
          clearTimeout(existingPlayer.disconnectTimeout);
          delete existingPlayer.disconnectTimeout;
        }
        player = existingPlayer;
        socket.join(pin);
        io.to(pin).emit('playersUpdated', rooms[pin].players);
        console.log(`👤 User ${nickname} (ID:${playerId}) reconnected to room ${pin}`);
      } else {
        if (rooms[pin].players.length >= MAX_PLAYERS) {
          console.log(`🚫 Room ${pin} is full (${MAX_PLAYERS}/${MAX_PLAYERS}). ${nickname} rejected.`);
          if(typeof callback === 'function') callback({ success: false, message: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS}명)` });
          return;
        }
        player = { id: playerId, socketId: socket.id, nickname, score: 0, connected: true };
        rooms[pin].players.push(player);
        socket.join(pin);
        io.to(pin).emit('playersUpdated', rooms[pin].players);
        console.log(`👤 User ${nickname}(${socket.id}) joined room ${pin} (${rooms[pin].players.length}/${MAX_PLAYERS})`);
      }
      if(typeof callback === 'function') callback({ success: true, room: rooms[pin], player });
    } else {
      if(typeof callback === 'function') callback({ success: false, message: 'Invalid PIN' });
    }
  });

  // 3. 게임 시작 (Host)
  socket.on('startGame', ({ pin, gameMode, category, winningScore, options }) => {
    const room = rooms[pin];
    if (room && room.host === socket.id) {
      // 기존 게임 타이머 전부 정리
      if (room.sentenceRaceTimer) { clearInterval(room.sentenceRaceTimer); room.sentenceRaceTimer = null; }
      if (room.raceTimer) { clearInterval(room.raceTimer); room.raceTimer = null; }
      if (room.chainTimer) { clearInterval(room.chainTimer); room.chainTimer = null; }
      if (room.bombTimer) { clearInterval(room.bombTimer); room.bombTimer = null; }
      if (room.hunterTimer) { clearInterval(room.hunterTimer); room.hunterTimer = null; }
      if (room.hunterGame && room.hunterGame.enemies) { room.hunterGame.enemies = []; }

      room.sentenceRace = null;
      room.raceGame = null;
      room.wordChain = null;

      room.players.forEach(p => p.score = 0);
      room.gameState = gameMode;
      if (category) {
        room.quizCategory = category === 'All' ? null : category;
      }
      if (options) {
        room[`${gameMode}Options`] = options;
      }
      io.to(pin).emit('gameStarted', { gameMode });
      io.to(pin).emit('playersUpdated', room.players);
      console.log(`🎮 Game ${gameMode} started in room ${pin} (Cat: ${category})`);
      
      if (gameMode === 'wordQuiz') {
        room.wordQuizWinningScore = winningScore || 100;
        io.to(pin).emit('playersUpdated', room.players);
        setTimeout(() => emitNextWordQuiz(pin, room), 1000);
      }
      // 2번 게임: 문장 퍼즐 (Sentence Race)
      else if (gameMode === 'sentencePuzzle') {
        setTimeout(() => startSentenceRace(pin, room), 1000);
      }
      // 3번 게임: 끝말잇기
      else if (gameMode === 'wordChain') {
        startWordChain(pin, room);
      }
      // 4번 게임: 디지털 빙고
      else if (gameMode === 'wordBingo') {
        setTimeout(() => startWordBingo(pin, room), 1000);
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
        console.log(`🏁 Starting Speed Race Individual in room ${pin} with ${room.players.length} players`);
        setTimeout(() => {
          if (rooms[pin]) startSpeedRace(pin, rooms[pin], 'individual');
        }, 1500);
      }
      // 8번 게임: 스피드 레이스 (팀전)
      else if (gameMode === 'speedRaceTeam') {
        console.log(`🏁 Starting Speed Race Team in room ${pin} with ${room.players.length} players`);
        setTimeout(() => {
          if (rooms[pin]) startSpeedRace(pin, rooms[pin], 'team', options);
        }, 1500);
      }
      // 9번 게임: 불규칙동사 스피드게임 (타이핑)

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
    
    if (room.quizCategory === 'Custom' && room.customWordDB && room.customWordDB.length >= 4) {
      sourceDB = room.customWordDB;
    } else if (room.quizCategory && room.quizCategory !== 'All' && room.quizCategory !== 'Custom') {
      sourceDB = wordQuizDB.filter(w => w.category === room.quizCategory);
    }
    
    // 만약 타겟 데이터베이스가 너무 적을 경우 폴백(fallback)
    if (!sourceDB || sourceDB.length < 4) {
      sourceDB = wordQuizDB;
    }

    const question = sourceDB[Math.floor(Math.random() * sourceDB.length)];
    room.currentQuestion = question;

    // 방 전체에 문제 전송 (호스트는 정답+뜻, 플레이어는 뜻만)
    io.to(pin).emit('hostNewQuestion', { meaning: question.meaning, answer: question.answer });
    console.log(`📝 Word Quiz: meaning="${question.meaning}", answer="${question.answer}", pin=${pin}`);
    
    // Player들에게는 뜻(meaning)과 함께 주관식 출제 알림 전송
    room.players.forEach(p => {
      io.to(p.socketId).emit('playerNewQuestion', { type: 'typing', meaning: question.meaning });
    });
  }

  function startSentenceRace(pin, room) {
    const shuffledDB = [...sentenceDB].sort(() => 0.5 - Math.random());
    const selectedSentences = shuffledDB.slice(0, 20);

    room.sentenceRace = {
      sentences: selectedSentences,
      isActive: true,
      timeRemaining: 180, // 3 minutes limit
      playerProgress: {},
      finishers: []
    };

    room.players.forEach(p => {
      room.sentenceRace.playerProgress[p.id] = 0;
      p.score = 0;
    });
    
    io.to(pin).emit('playersUpdated', room.players);
    io.to(room.host).emit('sentenceRaceStarted', { totalSentences: 20 });
    
    room.players.forEach(p => {
      const firstQ = selectedSentences[0];
      const tokens = firstQ.sentence.split(' ').map((word, idx) => ({ id: `${idx}-${word}`, text: word }));
      const shuffledTokens = [...tokens].sort(() => 0.5 - Math.random());
      
      io.to(p.socketId).emit('playerNewPuzzle', { tokens: shuffledTokens, index: 0, total: 20 });
    });

    if (room.sentenceRaceTimer) clearInterval(room.sentenceRaceTimer);

    room.sentenceRaceTimer = setInterval(() => {
      if (!room || room.gameState !== 'sentencePuzzle' || !room.sentenceRace.isActive) {
        clearInterval(room.sentenceRaceTimer);
        return;
      }
      room.sentenceRace.timeRemaining -= 1;
      
      const sortedPlayers = [...room.players].sort((a,b) => b.score - a.score);
      io.to(pin).emit('sentenceRaceState', {
        timeRemaining: room.sentenceRace.timeRemaining,
        leaderboard: sortedPlayers.slice(0, 5)
      });

      if (room.sentenceRace.timeRemaining <= 0) {
        clearInterval(room.sentenceRaceTimer);
        room.sentenceRace.isActive = false;
        const winner = sortedPlayers[0];
        io.to(pin).emit('puzzleCorrectAnswer', { winnerId: winner?.id, winnerNickname: winner?.nickname || 'TIME UP' });
      }
    }, 1000);
  }

  // 끝말잇기 게임 상태 시작
  function startWordChain(pin, room) {
    if (room.chainTimer) clearInterval(room.chainTimer);
    
    // 무작위 첫 단어 설정 (특수기호나 띄어쓰기가 없는 단어만 후보로)
    const db = (room.customWordDB && room.customWordDB.length > 0) ? room.customWordDB : wordQuizDB;
    let validDb = db.filter(w => /^[a-zA-Z]+$/.test(w.answer));
    
    if (room.wordChainOptions && room.wordChainOptions.isLengthLimitEnabled) {
      const limit = room.wordChainOptions.wordChainLengthLimit;
      const lengthFiltered = validDb.filter(w => w.answer.length === limit);
      if (lengthFiltered.length > 0) validDb = lengthFiltered;
    }
    
    let startingWord = validDb.length > 0 ? validDb[Math.floor(Math.random() * validDb.length)].answer : 'apple';
    
    room.wordChain = {
      activePlayers: [...room.players.map(p => p.id)], // 현재 방의 플레이어 ID 목록 복사
      currentPlayerIndex: 0,
      chain: [startingWord],
      timeRemaining: 10, // 10초 제한
      options: room.wordChainOptions || {}
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
        room.wordChain.timeRemaining = 10;
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
      const player = room.players.find(p => p.socketId === socket.id);
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
      const player = room.players.find(p => p.socketId === socket.id);
      
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

  // ==== 6. 스펠링 헌터 (서바이벌 타이핑 방식) ====
  function startSpellingHunter(pin, room) {
    if (room.hunterTimer) clearTimeout(room.hunterTimer);
    
    // 호스트가 선택한 카테고리에 맞는 단어 소스 준비 
    let sourceDB = wordQuizDB;
    if (room.quizCategory === 'Custom' && room.customWordDB && room.customWordDB.length >= 4) {
      sourceDB = room.customWordDB;
    } else if (room.quizCategory && room.quizCategory !== 'All' && room.quizCategory !== 'Custom') {
      sourceDB = wordQuizDB.filter(w => w.category === room.quizCategory);
      if (!sourceDB || sourceDB.length < 4) sourceDB = wordQuizDB; // fallback
    }

    room.hunterGame = {
      isActive: true,
      alivePlayers: room.players.map(p => p.id), // 살아남은 플레이어 ID 목록
      spawnInterval: 3000,   // 처음엔 3초 간격으로 스폰
      fallDuration: 12000,   // 처음엔 바닥에 닿기까지 12초
      wordCount: 0,
    };
    
    // 시작 상태 전송 (살아있는 플레이어, 스피드 정보 등)
    io.to(pin).emit('hunterState', { 
       isActive: true, 
       aliveCount: room.hunterGame.alivePlayers.length,
       spawnInterval: room.hunterGame.spawnInterval,
       fallDuration: room.hunterGame.fallDuration
    });
    
    const spawnLoop = () => {
       if (!room || room.gameState !== 'spellingHunter' || !room.hunterGame.isActive) return;
       
       const wordItem = sourceDB[Math.floor(Math.random() * sourceDB.length)];
       const id = Date.now() + Math.random().toString(36).substr(2, 5); // 고유 단어 ID
       
       io.to(pin).emit('hunterSpawnWord', {
          id,
          text: wordItem.answer.toLowerCase(),
          xPosition: Math.floor(Math.random() * 80) + 10, // 10% ~ 90% 사이의 X 좌표
          duration: room.hunterGame.fallDuration
       });
       
       room.hunterGame.wordCount++;
       
       // 10단어 생성될 때마다 난이도 증가 (속도 빨라짐)
       if (room.hunterGame.wordCount % 10 === 0) {
           room.hunterGame.spawnInterval = Math.max(600, room.hunterGame.spawnInterval * 0.85); // 생성 주기 짧아짐
           room.hunterGame.fallDuration = Math.max(3000, room.hunterGame.fallDuration * 0.85); // 떨어지는 시간 짧아짐
           io.to(pin).emit('hunterSpeedUp', { 
               spawnInterval: room.hunterGame.spawnInterval,
               fallDuration: room.hunterGame.fallDuration,
               level: Math.floor(room.hunterGame.wordCount / 10) + 1
           });
       }
       
       room.hunterTimer = setTimeout(spawnLoop, room.hunterGame.spawnInterval);
    };
    
    // 게임 시작 시 초기 딜레이 (애니메이션, 로딩 감안) 3초 후 첫 시작
    room.hunterTimer = setTimeout(spawnLoop, 3000); 
  }

  // 플레이어가 단어를 타이핑해서 맞췄을 때
  socket.on('hunterScore', ({ pin, points }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'spellingHunter' && room.hunterGame && room.hunterGame.isActive) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.score += points;
        io.to(socket.id).emit('myScoreUpdated', { score: player.score });
        // 실시간 서버 랭킹 반영 (네트워크 플러딩을 막기 위해 가끔 쏴주는 것이 좋으나 일단 전송)
        io.to(pin).emit('playersUpdated', room.players);
      }
    }
  });

  // 플레이어의 목숨(HP)이 0이 되어 사망했을 때
  socket.on('hunterPlayerDied', ({ pin }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'spellingHunter' && room.hunterGame && room.hunterGame.isActive) {
       room.hunterGame.alivePlayers = room.hunterGame.alivePlayers.filter(id => id !== socket.id);
       
       io.to(pin).emit('hunterPlayerDied', { id: socket.id, aliveCount: room.hunterGame.alivePlayers.length });
       
       // 최후의 1인이거나 모두 전멸했을 경우 게임 오버
       if (room.hunterGame.alivePlayers.length <= 1) {
          room.hunterGame.isActive = false;
          if (room.hunterTimer) clearTimeout(room.hunterTimer);
          
          let winner = null;
          if (room.hunterGame.alivePlayers.length === 1) {
              const survivor = room.players.find(p => p.id === room.hunterGame.alivePlayers[0]);
              winner = survivor ? survivor.nickname : "UNKNOWN";
          } else {
              winner = "DRAW (All Died)";
          }
          
          io.to(pin).emit('hunterGameOver', { winner });
          io.to(pin).emit('playersUpdated', room.players); // 최종 스코어 전송
       }
    }
  });

  // 4. 단어 퀴즈 정답 제출 (Player)
  socket.on('submitWordQuiz', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'wordQuiz' && room.currentQuestion) {
      if (answer.trim().toLowerCase() === room.currentQuestion.answer.trim().toLowerCase()) {
        // 정답을 맞힌 플레이어 점수 증가
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.score += 10;
          io.to(pin).emit('playersUpdated', room.players); // 점수 업데이트
          
          if (room.wordQuizWinningScore && player.score >= room.wordQuizWinningScore) {
            io.to(pin).emit('correctAnswer', { winnerId: socket.id, winnerNickname: player.nickname, ended: true, winner: player.nickname });
            room.currentQuestion = null;
          } else {
            io.to(pin).emit('correctAnswer', { winnerId: socket.id, winnerNickname: player.nickname, ended: false });
            // 문제 초기화
            room.currentQuestion = null;

            // 자동으로 다음 문제 출제 (3초 대기)
            setTimeout(() => {
              if (rooms[pin] && rooms[pin].gameState === 'wordQuiz') {
                emitNextWordQuiz(pin, rooms[pin]);
              }
            }, 3000);
          }
        }
      }
    }
  });

  // 5. 문장 퍼즐 정답 제출 (Player)
  socket.on('submitSentence', ({ pin, submittedSentence }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'sentencePuzzle' && room.sentenceRace?.isActive) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;
      const playerId = player.id;
      const progressIndex = room.sentenceRace.playerProgress[playerId];
      if (progressIndex === undefined) return;

      const currentQ = room.sentenceRace.sentences[progressIndex];
      if (!currentQ) return; 

      if (submittedSentence === currentQ.sentence) {
        player.score += 10;
        room.sentenceRace.playerProgress[playerId] = progressIndex + 1;
        
        const nextIndex = progressIndex + 1;
        if (nextIndex >= 20) {
          player.score += 50; 
          io.to(socket.id).emit('sentenceRaceFinished');
          room.sentenceRace.finishers.push(player);
          
          const sortedPlayers = [...room.players].sort((a,b) => b.score - a.score);
          io.to(pin).emit('playersUpdated', room.players);

          if (room.sentenceRace.finishers.length >= Math.min(3, room.players.length)) {
             room.sentenceRace.isActive = false;
             if (room.sentenceRaceTimer) clearInterval(room.sentenceRaceTimer);
             
             io.to(pin).emit('puzzleCorrectAnswer', { 
               winnerId: sortedPlayers[0].id, 
               winnerNickname: sortedPlayers[0].nickname,
               finalLeaderboard: sortedPlayers
             });
          } else {
             io.to(pin).emit('sentenceRaceState', {
               timeRemaining: room.sentenceRace.timeRemaining,
               leaderboard: sortedPlayers.slice(0, 5)
             });
          }
        } else {
          const nextQ = room.sentenceRace.sentences[nextIndex];
          const tokens = nextQ.sentence.split(' ').map((word, idx) => ({ id: `${idx}-${word}`, text: word }));
          const shuffledTokens = [...tokens].sort(() => 0.5 - Math.random());
          io.to(socket.id).emit('sentenceRaceCorrect');
          io.to(pin).emit('playersUpdated', room.players); // 리더보드용 실시간 점수갱신
          setTimeout(() => {
            io.to(socket.id).emit('playerNewPuzzle', { tokens: shuffledTokens, index: nextIndex, total: 20 });
          }, 500);
        }
      } else {
        io.to(socket.id).emit('sentenceRaceWrong');
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
      
      if (room.wordChain.options?.isLengthLimitEnabled) {
        const limit = room.wordChain.options.wordChainLengthLimit;
        if (word.length !== limit) {
           io.to(socket.id).emit('invalidWord', { message: `반드시 ${limit}글자 단어를 입력해야 합니다!` });
           return;
        }
      }
      
      // 이미 사용된 단어인지 검사
      if (room.wordChain.chain.includes(word.toLowerCase())) {
        io.to(socket.id).emit('invalidWord', { message: `이미 사용된 단어입니다!` });
        return;
      }

      // 호스트 승인 대기를 위해 타이머 일시정지
      clearInterval(room.chainTimer);
      const player = room.players.find(p => p.socketId === socket.id);
      
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
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            io.to(player.socketId).emit('invalidBombWord', { message: '호스트가 오답 처리했습니다!' });
          }
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
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            io.to(player.socketId).emit('invalidWord', { message: '호스트가 오답 처리했습니다! 다시 입력하세요.' });
            
            room.wordChain.currentTurnIndex = room.players.findIndex(p => p.id === playerId);
          }
          io.to(pin).emit('judgeComplete', { isCorrect: false });
        }
        broadcastChainState(pin, room);
        startChainTimer(pin, room);
      }
    }
  });

  // ==== 7, 8. 스피드 레이스 (개인전 / 팀전) ====

  function startSpeedRace(pin, room, type, options = null) {
    if (!room || !room.players || room.players.length === 0) {
      console.log(`❌ Cannot start Speed Race: room or players missing`);
      return;
    }
    if (room.raceTimer) clearInterval(room.raceTimer);

    room.raceGame = {
      type: type, // 'individual' or 'team'
      timeRemaining: 60, // 60초 타임어택
      isActive: true,
      teams: {}, // 팀전용 점수풀
    };

    if (type === 'team') {
      const teamNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
      let activeTeams = [];
      
      if (options && options.teamAssignments) {
        // Use host provided assignments
        const uniqueTeams = [...new Set(Object.values(options.teamAssignments))];
        activeTeams = uniqueTeams;
        activeTeams.forEach(t => room.raceGame.teams[t] = 0);
        
        room.players.forEach(p => {
          p.score = 0;
          p.team = options.teamAssignments[p.id] || 'RED';
          p.currentRaceAnswer = null;
        });
      } else {
        // Fallback random
        const numTeams = Math.max(2, Math.min(4, Math.ceil(room.players.length / 2)));
        activeTeams = teamNames.slice(0, numTeams);
        activeTeams.forEach(t => room.raceGame.teams[t] = 0);

        const shuffledPlayers = [...room.players].sort(() => 0.5 - Math.random());
        shuffledPlayers.forEach((p, idx) => {
          p.score = 0;
          p.team = activeTeams[idx % numTeams];
          p.currentRaceAnswer = null;
        });
      }
    } else {
      room.players.forEach(p => {
        p.score = 0;
        p.currentRaceAnswer = null;
      });
    }

    console.log(`🏁 Speed Race ${type} initialized for ${room.players.length} players, pin=${pin}`);

    io.to(pin).emit('playersUpdated', room.players);
    const raceStatePayload = {
      type: room.raceGame.type,
      timeRemaining: room.raceGame.timeRemaining,
      isActive: room.raceGame.isActive,
      teams: room.raceGame.teams,
      playersInfo: room.players
    };
    console.log(`📡 Emitting initial raceState to room ${pin}`);
    io.to(pin).emit('raceState', raceStatePayload);

    // 각자에게 독립적인 첫 문제 전송 (약간의 딜레이)
    setTimeout(() => {
      room.players.forEach(p => {
        console.log(`📤 Sending first question to ${p.nickname} (${p.id})`);
        emitRaceQuestion(pin, p.id);
      });
    }, 500);

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
        // 매초 상태 갱신
        io.to(pin).emit('raceState', {
           type: room.raceGame.type,
           timeRemaining: room.raceGame.timeRemaining,
           isActive: room.raceGame.isActive,
           teams: room.raceGame.teams,
           playersInfo: room.players
        });
      }
    }, 1000);
  }

  function emitRaceQuestion(pin, playerId) {
    const room = rooms[pin];
    if (!room) return;
    if ((room.gameState !== 'speedRaceIndividual' && room.gameState !== 'speedRaceTeam') || !room.raceGame || !room.raceGame.isActive) return;
      
    let filteredDB = wordQuizDB;
    if (room.quizCategory === 'Custom' && room.customWordDB && room.customWordDB.length >= 4) {
      filteredDB = room.customWordDB;
    } else if (room.quizCategory && room.quizCategory !== 'All Random' && room.quizCategory !== 'All') {
      const catDB = wordQuizDB.filter(q => q.category === room.quizCategory);
      if (catDB.length >= 4) filteredDB = catDB;
    }
      
    if (!filteredDB || filteredDB.length < 4) filteredDB = wordQuizDB;

    const question = filteredDB[Math.floor(Math.random() * filteredDB.length)];
    const incorrectOptions = filteredDB.filter(q => q.id !== question.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      
    let safetyCounter = 0;
    while (incorrectOptions.length < 3 && safetyCounter < 20) {
      safetyCounter++;
      const extraQuestion = wordQuizDB[Math.floor(Math.random() * wordQuizDB.length)];
      if (extraQuestion.id !== question.id && !incorrectOptions.find(q => q.id === extraQuestion.id)) {
        incorrectOptions.push(extraQuestion);
      }
    }

    const options = [question, ...incorrectOptions].map(q => q.answer).sort(() => 0.5 - Math.random());
      
    const player = room.players.find(p => p.id === playerId);
    if (player) {
       player.currentRaceAnswer = question.answer;
       io.to(player.socketId).emit('raceNewQuestion', { meaning: question.meaning, options });
    } else {
       console.log(`⚠️ emitRaceQuestion: player ${playerId} not found in room ${pin}`);
    }
  }

  socket.on('submitRaceAnswer', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && (room.gameState === 'speedRaceIndividual' || room.gameState === 'speedRaceTeam') && room.raceGame && room.raceGame.isActive) {
      const player = room.players.find(p => p.socketId === socket.id);
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
        
        emitRaceQuestion(pin, player.id);
        
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
    socket.on('kickPlayer', ({ pin, nickname }) => {
    if (rooms[pin]) {
      const pIdx = rooms[pin].players.findIndex(p => p.nickname === nickname);
      if (pIdx !== -1) {
        const kickedSocketId = rooms[pin].players[pIdx].socketId;
        rooms[pin].players.splice(pIdx, 1);
        io.to(pin).emit('playersUpdated', rooms[pin].players);
        if (kickedSocketId) {
          io.to(kickedSocketId).emit('kicked');
        }
        console.log(`👢 Host kicked ${nickname} from room ${pin}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    for (const [pin, room] of Object.entries(rooms)) {
      if (room.host === socket.id) {
        console.log(`🛑 Host left room ${pin}. Destroying room.`);
        io.to(pin).emit('hostDisconnected');
        // Clear all timers
        if (room.sentenceRaceTimer) clearInterval(room.sentenceRaceTimer);
        if (room.raceTimer) clearInterval(room.raceTimer);
        if (room.chainTimer) clearInterval(room.chainTimer);
        if (room.bombTimer) clearInterval(room.bombTimer);
        if (room.hunterTimer) clearInterval(room.hunterTimer);
        delete rooms[pin];
      } else {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.connected = false;
          console.log(`👋 User ${player.nickname} disconnected from room ${pin}`);
          io.to(pin).emit('playersUpdated', room.players);
          
          player.disconnectTimeout = setTimeout(() => {
             const index = room.players.findIndex(p => p.id === player.id);
             if (index !== -1 && !room.players[index].connected) {
                room.players.splice(index, 1);
                console.log(`👻 User ${player.nickname} permanently removed from ${pin}`);
                io.to(pin).emit('playersUpdated', room.players);
             }
          }, 30000); // Remove after 30 seconds if not reconnected
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
