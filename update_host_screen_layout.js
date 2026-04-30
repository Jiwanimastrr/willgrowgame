const fs = require('fs');
const file = '/Users/jiwanjeon/Downloads/안티그래비티/윌그로우이벤트/client/src/components/HostScreen.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `{raceData.type === 'team' ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
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
                                        <span className="headline-lg" style={{ width: '160px', color: '#fff', fontSize: '1.4rem' }}>
                                          {team}
                                        </span>
                                        <div style={{ flex: 1, position: 'relative', height: '16px', background: \`\${barColor}33\`, borderRadius: '8px' }}>
                                          <div style={{ width: \`\${percent}%\`, height: '100%', background: barColor, borderRadius: '8px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative' }}>
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
                          ) : (`

const replacement = `{raceData.type === 'team' ? (
                           <div style={{ display: 'flex', width: '100%', gap: '2rem' }}>
                             {/* Left Team Roster (RED, GREEN) */}
                             <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                               {['RED', 'GREEN'].map(t => {
                                 if (!raceData.teams[t] && raceData.teams[t] !== 0) return null;
                                 const tMembers = raceData.playersInfo.filter(p => p.team === t);
                                 if (tMembers.length === 0) return null;
                                 const colorMap = { 'RED': '#ef4444', 'GREEN': '#22c55e' };
                                 return (
                                   <div key={t} style={{ border: \`2px solid \${colorMap[t]}\`, borderRadius: '12px', padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
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
                                          <div style={{ flex: 1, position: 'relative', height: '16px', background: \`\${barColor}33\`, borderRadius: '8px' }}>
                                            <div style={{ width: \`\${percent}%\`, height: '100%', background: barColor, borderRadius: '8px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative' }}>
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
                                   <div key={t} style={{ border: \`2px solid \${colorMap[t]}\`, borderRadius: '12px', padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
                                      <h4 className="headline-lg" style={{ color: colorMap[t], margin: '0 0 1rem 0', textAlign: 'center' }}>{t} TEAM</h4>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {tMembers.map(m => <span key={m.id} style={{ color: '#fff', fontSize: '1.2rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.nickname}</span>)}
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                          ) : (`

content = content.replace(target, replacement);

// Also remove the finish line that was wrapping the entire div, so we can isolate it to just individual mode
content = content.replace(
  `                       <div style={{ position: 'relative', width: '100%', paddingRight: '30px' }}>
                         {/* Finish Line */}
                         <div style={{ position: 'absolute', right: '-5px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.5)', zIndex: 0 }}></div>
                         
                         {raceData.type === 'team' ? (`,
  `                       <div style={{ position: 'relative', width: '100%', paddingRight: '30px' }}>
                         {/* Finish Line */}
                         {raceData.type === 'individual' && <div style={{ position: 'absolute', right: '-5px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.5)', zIndex: 0 }}></div>}
                         
                         {raceData.type === 'team' ? (`
)

fs.writeFileSync(file, content);
console.log("Updated HostScreen.jsx layout");
