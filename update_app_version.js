const fs = require('fs');
const file = '/Users/jiwanjeon/Downloads/안티그래비티/윌그로우이벤트/client/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostScreen />} />
        <Route path="/player" element={<PlayerScreen />} />
      </Routes>
    </Router>`;

const replacement = `    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostScreen />} />
        <Route path="/player" element={<PlayerScreen />} />
      </Routes>
      <div style={{ position: 'fixed', bottom: '10px', right: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', zIndex: 9999, pointerEvents: 'none', fontFamily: 'monospace' }}>
        v1.0
      </div>
    </Router>`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Updated App.jsx with version indicator");
