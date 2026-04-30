const fs = require('fs');
const file = '/Users/jiwanjeon/Downloads/안티그래비티/윌그로우이벤트/client/src/components/HostScreen.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add teamAssignments state
if (!content.includes('const [teamAssignments, setTeamAssignments]')) {
  content = content.replace(
    `  const [showSpeedRaceTeamOptions, setShowSpeedRaceTeamOptions] = useState(false);`,
    `  const [showSpeedRaceTeamOptions, setShowSpeedRaceTeamOptions] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState({});`
  );
}

// Update the SPEED RACE (TEAM) button to initialize teamAssignments
content = content.replace(
  `onClick={() => setShowSpeedRaceTeamOptions(true)}>SPEED RACE <span style={{fontSize:'1.2rem'}}>(TEAM)</span></button>`,
  `onClick={() => {
                  const initialAssignments = {};
                  const teamNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
                  const numTeams = Math.max(2, Math.min(4, Math.ceil(players.length / 2)));
                  players.forEach((p, idx) => {
                    initialAssignments[p.id] = teamNames[idx % numTeams];
                  });
                  setTeamAssignments(initialAssignments);
                  setShowSpeedRaceTeamOptions(true);
                }}>SPEED RACE <span style={{fontSize:'1.2rem'}}>(TEAM)</span></button>`
);

// Update startGame calls in speedRaceTeam modal to pass teamAssignments
content = content.replace(
  `{showSpeedRaceTeamOptions && (
        <div className="genie-modal-container" onClick={() => setShowSpeedRaceTeamOptions(false)}>
          <div className="genie-modal-content" onClick={(e) => e.stopPropagation()}>
             <h2 className="genie-modal-head">🏆 SPEED RACE (TEAM)</h2>
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', 'All Random')}>🎲 All Random</button>
             {customVocabCount > 0 && <button className="genie-btn" style={{ color: '#48cfae', borderColor: '#48cfae' }} onClick={() => startGame('speedRaceTeam', 'Custom')}>⭐ Custom Vocab</button>}
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '동물 & 자연')}>🦁 Animals & Nature</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '음식 & 과일')}>🍔 Food & Fruits</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '사물 & 장소')}>🏫 Objects & Places</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '직업 & 인간')}>👨‍⚕️ Jobs & People</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '숫자')}>🔢 Numbers</button>
             <button className="genie-btn" onClick={() => startGame('speedRaceTeam', '불규칙동사 (과거/과거분사)')}>🔄 Irregular Verbs</button>
             <button className="genie-btn genie-btn-close" onClick={() => setShowSpeedRaceTeamOptions(false)}>CLOSE</button>
          </div>
        </div>
      )}`,
  `{showSpeedRaceTeamOptions && (
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
      )}`
);

fs.writeFileSync(file, content);
console.log("Updated HostScreen.jsx with Team Configuration UI");
