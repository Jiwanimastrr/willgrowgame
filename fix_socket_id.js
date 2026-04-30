const fs = require('fs');
const file = '/Users/jiwanjeon/Downloads/안티그래비티/윌그로우이벤트/server/index.js';
let content = fs.readFileSync(file, 'utf8');

// Join room logic
content = content.replace(
  /socket\.on\('joinRoom', \(\{ pin, nickname \}, callback\) => \{([\s\S]*?)const player = \{ id: socket\.id, nickname, score: 0 \};\s*rooms\[pin\]\.players\.push\(player\);\s*socket\.join\(pin\);\s*\/\/ 방 전체에 새로운 플레이어 접속 알림\s*io\.to\(pin\)\.emit\('playersUpdated', rooms\[pin\]\.players\);\s*console\.log\(`👤 User \$\{nickname\}\(\$\{socket\.id\}\) joined room \$\{pin\} \(\$\{rooms\[pin\]\.players\.length\}\/\$\{MAX_PLAYERS\}\)`\);\s*if\(typeof callback === 'function'\) callback\(\{ success: true, room: rooms\[pin\], player \}\);\s*\} else \{\s*if\(typeof callback === 'function'\) callback\(\{ success: false, message: 'Invalid PIN' \}\);\s*\}\s*\}\);/,
  `socket.on('joinRoom', ({ pin, nickname, playerId }, callback) => {
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
        console.log(\`👤 User \${nickname} (ID:\${playerId}) reconnected to room \${pin}\`);
      } else {
        if (rooms[pin].players.length >= MAX_PLAYERS) {
          console.log(\`🚫 Room \${pin} is full (\${MAX_PLAYERS}/\${MAX_PLAYERS}). \${nickname} rejected.\`);
          if(typeof callback === 'function') callback({ success: false, message: \`방이 가득 찼습니다 (최대 \${MAX_PLAYERS}명)\` });
          return;
        }
        player = { id: playerId, socketId: socket.id, nickname, score: 0, connected: true };
        rooms[pin].players.push(player);
        socket.join(pin);
        io.to(pin).emit('playersUpdated', rooms[pin].players);
        console.log(\`👤 User \${nickname}(\${socket.id}) joined room \${pin} (\${rooms[pin].players.length}/\${MAX_PLAYERS})\`);
      }
      if(typeof callback === 'function') callback({ success: true, room: rooms[pin], player });
    } else {
      if(typeof callback === 'function') callback({ success: false, message: 'Invalid PIN' });
    }
  });`
);

// Update all p.id === socket.id to p.socketId === socket.id
content = content.replace(/p => p\.id === socket\.id/g, "p => p.socketId === socket.id");

// Disconnect logic
content = content.replace(
  /socket\.on\('disconnect', \(\) => \{([\s\S]*?)const index = room\.players\.findIndex\(p => p\.socketId === socket\.id\);\s*if \(index !== -1\) \{\s*const p = room\.players\[index\];\s*room\.players\.splice\(index, 1\);\s*console\.log\(`👋 User \$\{p\.nickname\} left room \$\{pin\}`\);\s*io\.to\(pin\)\.emit\('playersUpdated', room\.players\);\s*\}\s*\}\s*\}\s*\}\s*\}\);/,
  `socket.on('disconnect', () => {
    console.log(\`❌ User disconnected: \${socket.id}\`);
    for (const pin in rooms) {
      const room = rooms[pin];
      if (room.host === socket.id) {
        console.log(\`🛑 Host left room \${pin}. Destroying room.\`);
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
          console.log(\`👋 User \${player.nickname} disconnected from room \${pin}\`);
          io.to(pin).emit('playersUpdated', room.players);
          
          player.disconnectTimeout = setTimeout(() => {
             const index = room.players.findIndex(p => p.id === player.id);
             if (index !== -1 && !room.players[index].connected) {
                room.players.splice(index, 1);
                console.log(\`👻 User \${player.nickname} permanently removed from \${pin}\`);
                io.to(pin).emit('playersUpdated', room.players);
             }
          }, 30000); // Remove after 30 seconds if not reconnected
        }
      }
    }
  });`
);

fs.writeFileSync(file, content);
console.log('Done replacing.');
