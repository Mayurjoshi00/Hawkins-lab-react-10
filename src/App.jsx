import React, { useState, useEffect, useRef } from 'react';
import HomeScreen      from './components/HomeScreen';
import LoginScreen     from './components/LoginScreen';
import LandingScreen   from './components/LandingScreen';
import QuizScreen      from './components/QuizScreen';
import ResultsScreen   from './components/ResultsScreen';
import AdminPanel      from './components/AdminPanel';

// ── Which screen is showing right now ────────────────────────────────────────
// Possible values: 'home' | 'login' | 'landing' | 'quiz' | 'results' | 'admin'

// Determine initial screen synchronously — before any render or effect.
// We check BOTH window.location.pathname (works in prod + CRA dev without proxy rewrite)
// AND a sessionStorage flag (belt-and-suspenders for edge cases).
function getInitialScreen() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // Direct pathname match (works when CRA's history fallback serves index.html
  // with pathname intact — which it does for /chmod777 without any proxy rewrite)
  if (path === '/chmod777') return 'admin';

  // Hash-based fallback: navigating to /#/chmod777 also opens admin
  if (hash === '#/chmod777' || hash === '#chmod777') return 'admin';

  // sessionStorage flag set by a redirect (belt-and-suspenders)
  try {
    if (sessionStorage.getItem('__hw_admin') === '1') {
      sessionStorage.removeItem('__hw_admin');
      return 'admin';
    }
  } catch {}

  return 'connecting';
}

export default function App() {
  const [screen,      setScreen]      = useState(getInitialScreen);
  const [teamData,    setTeamData]    = useState(null);
  const [results,     setResults]     = useState(null);
  const [showRcToast, setShowRcToast] = useState(false);
  const rcTimerRef = useRef(null);

  // ── Connecting → Home transition ──────────────────────────────────────────
  // Only runs when we're NOT already on admin. The [] dep array means 'screen'
  // is captured at mount time — which is fine because if initial screen is
  // 'admin' we skip, and for every other start value we want to show home.
  useEffect(() => {
    if (screen === 'admin') return; // already on admin — do nothing
    const t = setTimeout(() => setScreen('home'), 200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  // ── Protection: block right-click, copy, shortcuts ───────────────────────
  useEffect(() => {
    const onContextMenu = (e) => {
      e.preventDefault();
      setShowRcToast(true);
      clearTimeout(rcTimerRef.current);
      rcTimerRef.current = setTimeout(() => setShowRcToast(false), 2400);
      return false;
    };

    const onKeyDown = (e) => {
      const k    = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['c', 'x', 'a', 's', 'u', 'p'].includes(k)) { e.preventDefault(); return false; }
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(k))   { e.preventDefault(); return false; }
      if (e.key === 'F12')                                       { e.preventDefault(); return false; }
      if (ctrl && e.shiftKey && k === 'k')                       { e.preventDefault(); return false; }
    };

    const onCopy      = (e) => { e.preventDefault(); return false; };
    const onCut       = (e) => { e.preventDefault(); return false; };
    const onDragStart = (e) => { e.preventDefault(); return false; };

    document.onselectstart = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return true;
      e.preventDefault();
      return false;
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

  // ── Route: /chmod777 → admin panel (handles popstate / link navigation) ──
  useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p === '/chmod777' || h === '#/chmod777' || h === '#chmod777') {
        setScreen('admin');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleLogin(data) {
    setTeamData(data);
    setScreen('landing');
  }

  function handleStart() {
    setScreen('quiz');
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

  // ── Connecting screen ─────────────────────────────────────────────────────
  if (screen === 'connecting') {
    return (
      <>
        <div className="vignette" />
        <div className="screen" style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '60px 20px',
        }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            letterSpacing: '0.2em',
            color: 'var(--red)',
            textShadow: '0 0 15px var(--red-glow)',
            animation: 'blink 1.2s ease infinite',
            textTransform: 'uppercase',
          }}>
            ● Entering the Upside Down...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="vignette" />
      <div className="panic-border" id="panic-border" />
      <div className="panic-label" id="panic-label">⚠ THE DEMOGORGON IS NEAR ⚠</div>

      <div className={`rc-blocked${showRcToast ? ' show' : ''}`}>
        ⬡ Right-click is disabled during the quiz
      </div>

      {screen === 'home'    && <HomeScreen    onEnter={() => setScreen('login')} />}
      {screen === 'login'   && <LoginScreen   onLogin={handleLogin} />}
      {screen === 'landing' && <LandingScreen teamData={teamData} onStart={handleStart} />}
      {screen === 'quiz'    && <QuizScreen    teamData={teamData}  onSubmit={handleSubmit} />}
      {screen === 'results' && <ResultsScreen teamData={teamData}  results={results} onReset={handleReset} />}
      {screen === 'admin'   && <AdminPanel />}
    </>
  );
}
