const fs = require('fs');
const file = '/Users/jiwanjeon/Downloads/안티그래비티/윌그로우이벤트/server/index.js';
let content = fs.readFileSync(file, 'utf8');

// Update startSpeedRace invocation
content = content.replace(
  `      // 8번 게임: 스피드 레이스 (팀전)
      else if (gameMode === 'speedRaceTeam') {
        console.log(\`🏁 Starting Speed Race Team in room \${pin} with \${room.players.length} players\`);
        setTimeout(() => {
          if (rooms[pin]) startSpeedRace(pin, rooms[pin], 'team');
        }, 1500);
      }`,
  `      // 8번 게임: 스피드 레이스 (팀전)
      else if (gameMode === 'speedRaceTeam') {
        console.log(\`🏁 Starting Speed Race Team in room \${pin} with \${room.players.length} players\`);
        setTimeout(() => {
          if (rooms[pin]) startSpeedRace(pin, rooms[pin], 'team', options);
        }, 1500);
      }`
);

// Update startSpeedRace definition
content = content.replace(
  `  function startSpeedRace(pin, room, type) {`,
  `  function startSpeedRace(pin, room, type, options = null) {`
);

// Update startSpeedRace team logic
content = content.replace(
  `    if (type === 'team') {
      const teamNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
      const numTeams = Math.max(2, Math.min(4, Math.ceil(room.players.length / 2)));
      const activeTeams = teamNames.slice(0, numTeams);
      activeTeams.forEach(t => room.raceGame.teams[t] = 0);

      const shuffledPlayers = [...room.players].sort(() => 0.5 - Math.random());
      shuffledPlayers.forEach((p, idx) => {
        p.score = 0;
        p.team = activeTeams[idx % numTeams];
        p.currentRaceAnswer = null;
      });
    } else {`,
  `    if (type === 'team') {
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
    } else {`
);

fs.writeFileSync(file, content);
console.log("Updated server/index.js for Speed Race Team logic");
