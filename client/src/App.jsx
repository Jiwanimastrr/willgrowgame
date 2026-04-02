import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import HostScreen from './components/HostScreen';
import PlayerScreen from './components/PlayerScreen';
import { soundFX } from './utils/soundFX';
import './index.css';

window.soundFX = soundFX; // Expose globally for easy access in deeply nested games

// Global click listener for button sound effects
document.addEventListener('click', (e) => {
  if (e.target.closest('.ow-btn') || e.target.closest('.ow-btn-secondary') || e.target.closest('.bingo-cell') || e.target.closest('button')) {
    soundFX.playClick();
  }
});

function Home() {
  const navigate = useNavigate();

  return (
    <div className="ow-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <img src="/willgrow_logo.png" alt="WillGrow Logo" style={{ height: '80px', marginBottom: '1rem' }} onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }} />
        <div className="logo-placeholder ow-subtitle" style={{ display: 'none', fontSize: '2.5rem', marginBottom: '1rem' }}>
          WILLGROW
        </div>
        
        <h1 className="ow-title" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', marginBottom: '0.5rem' }}>
          Language Event
        </h1>
        <div className="ow-subtitle" style={{ fontSize: '1.2rem', color: 'var(--ow-text-muted)' }}>
          Interactive Classroom Platform
        </div>
      </div>

      <div className="ow-panel" style={{ width: '100%', maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '3rem 2rem', marginTop: '2rem' }}>
        <h2 style={{ color: 'var(--ow-text-main)', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Select Your Role
        </h2>
        
        <div style={{ display: 'flex', gap: '1.5rem', width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="ow-btn ow-btn-secondary" style={{ flex: '1 1 220px', padding: '1.2rem 0', textAlign: 'center' }} onClick={() => navigate('/host')}>
            <span>Create Room (Host)</span>
          </button>
          
          <button className="ow-btn" style={{ flex: '1 1 220px', padding: '1.2rem 0', textAlign: 'center' }} onClick={() => navigate('/player')}>
            <span>Join Game (Player)</span>
          </button>
        </div>
      </div>

    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostScreen />} />
        <Route path="/player" element={<PlayerScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
