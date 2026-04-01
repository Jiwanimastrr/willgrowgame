import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HostScreen from './components/HostScreen';
import PlayerScreen from './components/PlayerScreen';
import './index.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '2rem' }} className="animate-enter">
      {/* 윌그로우 로고 (로고 파일이 업로드되면 이 img 태그가 활성화됨) */}
      <img src="/willgrow_logo.png" alt="WillGrow Logo" className="logo" onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'block';
      }} />
      <div className="logo-placeholder" style={{ display: 'none' }}>
        WILLGROW
      </div>
      
      <h1 className="display-lg" style={{ color: 'var(--on-surface)', textShadow: '0 4px 10px rgba(0,0,0,0.5)', marginBottom: '1rem', textAlign: 'center' }}>
        Language Event Platform
      </h1>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/host')}>
          <span>Create Room (Host)</span>
        </button>
        <button className="btn-primary" onClick={() => navigate('/player')}>
          <span>Join Game (Player)</span>
        </button>
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
