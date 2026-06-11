import React, { useState, useEffect, useRef, useCallback } from 'react';
import HomeScreen      from './components/HomeScreen';
import LoginScreen     from './components/LoginScreen';
import LandingScreen   from './components/LandingScreen';
import QuizScreen      from './components/QuizScreen';
import ResultsScreen   from './components/ResultsScreen';
import AdminPanel      from './components/AdminPanel';
import VecnaTendrils   from './components/VecnaTendrils';

function getInitialScreen() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path === '/chmod777') return 'admin';
  if (hash === '#/chmod777' || hash === '#chmod777') return 'admin';
  try {
    if (sessionStorage.getItem('__hw_admin') === '1') {
      sessionStorage.removeItem('__hw_admin');
      return 'admin';
    }
  } catch {}
  return 'connecting';
}

/* ── Vine SVG — pure CSS, no images ── */
function VineDecoration() {
  return (
    <>
      <div className="vine-left">
        <svg className="vine-svg" viewBox="0 0 80 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M60 0 C40 80, 70 160, 45 240 C20 320, 65 400, 40 480 C15 560, 55 640, 35 720 C15 800, 50 860, 30 920"
            stroke="#3a1a00" strokeWidth="2" fill="none"/>
          <path d="M50 60 C30 80, 10 70, 5 90" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M45 160 C60 175, 70 165, 75 180" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M38 280 C20 295, 8 285, 2 300" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M50 380 C65 390, 72 380, 76 395" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M40 480 C22 492, 10 485, 4 500" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <circle cx="5" cy="92"  r="4" fill="#1a0800" opacity="0.7"/>
          <circle cx="76" cy="182" r="3" fill="#1a0800" opacity="0.6"/>
          <circle cx="2"  cy="302" r="4" fill="#1a0800" opacity="0.7"/>
          <circle cx="77" cy="397" r="3" fill="#1a0800" opacity="0.5"/>
        </svg>
      </div>
      <div className="vine-right">
        <svg className="vine-svg" viewBox="0 0 80 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M20 0 C40 80, 10 160, 35 240 C60 320, 15 400, 40 480 C65 560, 25 640, 45 720 C65 800, 30 860, 50 920"
            stroke="#3a1a00" strokeWidth="2" fill="none"/>
          <path d="M30 80 C50 95, 65 85, 70 100" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M35 200 C15 212, 5 205, 0 218" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M42 320 C60 330, 70 322, 75 338" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <path d="M30 440 C12 450, 2 444, 0 458" stroke="#2a1200" strokeWidth="1.5" fill="none"/>
          <circle cx="71" cy="102" r="4" fill="#1a0800" opacity="0.7"/>
          <circle cx="0"  cy="220" r="3" fill="#1a0800" opacity="0.6"/>
          <circle cx="76" cy="340" r="4" fill="#1a0800" opacity="0.7"/>
          <circle cx="0"  cy="460" r="3" fill="#1a0800" opacity="0.5"/>
        </svg>
      </div>
    </>
  );
}

/* ── Portal overlay — used on login success ── */
function PortalOverlay({ phase, onDone }) {
  // phase: null | 'opening' | 'expanding'
  const sparks = [
    { x:  60, y: -80, d: 0.0 }, { x: -70, y: -60, d: 0.1 },
    { x:  80, y:  40, d: 0.2 }, { x: -50, y:  70, d: 0.15 },
    { x:  30, y:-100, d: 0.05 },{ x: -90, y: -20, d: 0.25 },
    { x:  50, y:  90, d: 0.3 }, { x: -30, y:-110, d: 0.1 },
  ];

  useEffect(() => {
    if (phase === 'expanding') {
      const t = setTimeout(onDone, 800);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  if (!phase) return null;

  return (
    <div className={`portal-overlay ${phase}`}>
      <div className="portal-ring-wrap">
        <div className="portal-halo" />
        <div className={`portal-ring ${phase === 'expanding' ? '' : ''}`}
          style={phase === 'expanding' ? { animation: 'portalExpand 0.8s cubic-bezier(0.4,0,0.2,1) forwards' } : {}}>
          <div className="portal-tendrils" />
        </div>
        {sparks.map((s, i) => (
          <div key={i} className="portal-spark" style={{
            top: '50%', left: '50%',
            '--s-x': `${s.x}px`, '--s-y': `${s.y}px`,
            '--s-dur': '1.2s', '--s-delay': `${s.d}s`,
            background: i % 3 === 0 ? '#cc44ff' : i % 3 === 1 ? '#ff44aa' : '#4444ff',
          }} />
        ))}
        <div className="portal-label">Gate is opening…</div>
      </div>
    </div>
  );
}

/* ── Gate ripple — used on ENTER THE GATE click ── */
function GateRipple({ active }) {
  if (!active) return null;
  return <div className="gate-ripple-overlay active" />;
}


export default function App() {
  const [screen,      setScreen]      = useState(getInitialScreen);
  const [teamData,    setTeamData]    = useState(null);
  const [results,     setResults]     = useState(null);
  const [showRcToast, setShowRcToast] = useState(false);

  // Vecna tendril state — triggered by Enter The Lab
  const [tendrilActive, setTendrilActive] = useState(false);
  const [tendrilOrigin, setTendrilOrigin] = useState({ x: 0, y: 0 });

  // Portal state
  const [portalPhase,  setPortalPhase]  = useState(null); // null | 'opening' | 'expanding'
  const [gateActive,   setGateActive]   = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null);

  const rcTimerRef = useRef(null);

  // Connecting → Home
  useEffect(() => {
    if (screen === 'admin') return;
    const t = setTimeout(() => setScreen('home'), 200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  // Right-click / copy protection
  useEffect(() => {
    const onContextMenu = (e) => {
      e.preventDefault();
      setShowRcToast(true);
      clearTimeout(rcTimerRef.current);
      rcTimerRef.current = setTimeout(() => setShowRcToast(false), 2400);
      return false;
    };
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['c','x','a','s','u','p'].includes(k)) { e.preventDefault(); return false; }
      if (ctrl && e.shiftKey && ['i','j','c'].includes(k)) { e.preventDefault(); return false; }
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (ctrl && e.shiftKey && k === 'k') { e.preventDefault(); return false; }
    };
    const onCopy      = (e) => { e.preventDefault(); return false; };
    const onCut       = (e) => { e.preventDefault(); return false; };
    const onDragStart = (e) => { e.preventDefault(); return false; };
    document.onselectstart = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return true;
      e.preventDefault(); return false;
    };
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown',     onKeyDown);
    document.addEventListener('copy',        onCopy);
    document.addEventListener('cut',         onCut);
    document.addEventListener('dragstart',   onDragStart);
    window.onbeforeprint = () => false;
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown',     onKeyDown);
      document.removeEventListener('copy',        onCopy);
      document.removeEventListener('cut',         onCut);
      document.removeEventListener('dragstart',   onDragStart);
      document.onselectstart = null;
    };
  }, []);

  // Admin popstate
  useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p === '/chmod777' || h === '#/chmod777' || h === '#chmod777') setScreen('admin');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Enter The Lab: Vecna tendrils then go to login ──
  function handleEnterLab(e) {
    // Get button center as origin for the tendrils
    let ox = window.innerWidth  / 2;
    let oy = window.innerHeight / 2;
    if (e && e.currentTarget) {
      const r = e.currentTarget.getBoundingClientRect();
      ox = r.left + r.width  / 2;
      oy = r.top  + r.height / 2;
    }
    setTendrilOrigin({ x: ox, y: oy });
    setTendrilActive(true);
  }

  function handleTendrilDone() {
    setTendrilActive(false);
    setScreen('login');
  }

  // ── Login: show portal, then transition ──
  function handleLogin(data) {
    setPendingLogin(data);
    setPortalPhase('opening');
    // After 1.8s show portal open, then expand
    setTimeout(() => setPortalPhase('expanding'), 1800);
  }

  const handlePortalDone = useCallback(() => {
    setPortalPhase(null);
    setTeamData(pendingLogin);
    setPendingLogin(null);
    setScreen('landing');
  }, [pendingLogin]);

  // ── Start quiz: gate ripple then transition ──
  function handleStart() {
    setGateActive(true);
    setTimeout(() => {
      setGateActive(false);
      setScreen('quiz');
    }, 850);
  }

  function handleSubmit(resultData) {
    setResults(resultData);
    setScreen('results');
  }

  function handleReset() {
    setScreen('home');
    setTeamData(null);
    setResults(null);
  }

  // ── Connecting screen ──
  if (screen === 'connecting') {
    return (
      <div className="connecting-screen tv-on">
        <div className="connecting-signal">
          <div className="connecting-dot" />
        </div>
        <p className="connecting-text">● Entering the Upside Down…</p>
      </div>
    );
  }

  const showVines = ['home', 'login', 'landing'].includes(screen);

  return (
    <>
      <div className="vignette" />
      <div className="panic-border" id="panic-border" />
      <div className="panic-label"  id="panic-label">⚠ THE DEMOGORGON IS NEAR ⚠</div>
      {showVines && <VineDecoration />}

      <div className={`rc-blocked${showRcToast ? ' show' : ''}`}>
        ⬡ Right-click is disabled during the quiz
      </div>

      {screen === 'home'    && <HomeScreen    onEnter={handleEnterLab} />}
      {screen === 'login'   && <LoginScreen   onLogin={handleLogin} />}
      {screen === 'landing' && <LandingScreen teamData={teamData} onStart={handleStart} />}
      {screen === 'quiz'    && <QuizScreen    teamData={teamData}  onSubmit={handleSubmit} />}
      {screen === 'results' && <ResultsScreen teamData={teamData}  results={results} onReset={handleReset} />}
      {screen === 'admin'   && <AdminPanel />}

      {/* Vecna tendrils — shown when Enter The Lab is clicked */}
      <VecnaTendrils
        active={tendrilActive}
        originX={tendrilOrigin.x}
        originY={tendrilOrigin.y}
        onDone={handleTendrilDone}
      />

      {/* Portal overlay — shown on login success */}
      <PortalOverlay phase={portalPhase} onDone={handlePortalDone} />

      {/* Gate ripple — shown on ENTER THE GATE */}
      <GateRipple active={gateActive} />
    </>
  );
}
