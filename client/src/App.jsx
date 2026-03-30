import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HostScreen from './components/HostScreen';
import PlayerScreen from './components/PlayerScreen';
import './index.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '2rem' }}>
      <h1 className="ow-title" style={{ fontSize: '4rem', color: 'var(--ow-orange)', textShadow: '4px 4px 0 #000' }}>
        WillGrow Word Battle
      </h1>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="ow-button" onClick={() => navigate('/host')}>
          <span>Create Room (Host)</span>
        </button>
        <button className="ow-button blue" onClick={() => navigate('/player')}>
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
