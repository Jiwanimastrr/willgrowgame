const fs = require('fs');
const file = '/Users/jiwanjeon/Downloads/안티그래비티/윌그로우이벤트/client/src/games/SpeedRacePlayer.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `           {raceData?.type === 'team' && playerInfo?.team && (
             <div className="headline-lg" style={{ color: playerInfo.team === 'RED' ? 'var(--ow-error)' : playerInfo.team === 'BLUE' ? 'var(--ow-secondary)' : playerInfo.team === 'GREEN' ? 'var(--ow-primary-dim)' : 'var(--ow-primary)' }}>
               {playerInfo.team} TEAM: {raceData.teams[playerInfo.team] || 0}
             </div>
           )}`;

const replacement = `           {raceData?.type === 'team' && playerInfo?.team && (
             <div className="headline-lg" style={{ color: playerInfo.team === 'RED' ? '#ef4444' : playerInfo.team === 'BLUE' ? '#3b82f6' : playerInfo.team === 'GREEN' ? '#22c55e' : '#eab308' }}>
               {playerInfo.team} TEAM: {raceData.teams[playerInfo.team] || 0}
             </div>
           )}`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Updated SpeedRacePlayer.jsx colors");
