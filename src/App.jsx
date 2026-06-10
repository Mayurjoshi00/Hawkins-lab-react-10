import React, { useState, useEffect, useRef } from 'react';
import HomeScreen      from './components/HomeScreen';
import LoginScreen     from './components/LoginScreen';
import LandingScreen   from './components/LandingScreen';
import QuizScreen      from './components/QuizScreen';
import ResultsScreen   from './components/ResultsScreen';
import AdminPanel      from './components/AdminPanel';

// ── Which screen is showing right now ────────────────────────────────────────
// Possible values: 'home' | 'login' | 'landing' | 'quiz' | 'results' | 'admin'

export default function App() {
  const [screen,      setScreen]      = useState('connecting');
  const [teamData,    setTeamData]    = useState(null);
  const [results,     setResults]     = useState(null);
  const [showRcToast, setShowRcToast] = useState(false);
  const rcTimerRef = useRef(null);

  // ── Connecting → Login transition (matches original 200ms delay) ──
  useEffect(() => {
    const t = setTimeout(() => setScreen('home'), 200);
    return () => clearTimeout(t);
  }, []);

  // ── Protection: block right-click, copy, shortcuts ───────────────────────
  useEffect(() => {
    // 1. Block right-click — show themed toast
    const onContextMenu = (e) => {
      e.preventDefault();
      setShowRcToast(true);
      clearTimeout(rcTimerRef.current);
      rcTimerRef.current = setTimeout(() => setShowRcToast(false), 2400);
      return false;
    };

    // 2. Block keyboard shortcuts
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      // Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+S, Ctrl+U, Ctrl+P
      if (ctrl && ['c', 'x', 'a', 's', 'u', 'p'].includes(k)) { e.preventDefault(); return false; }
      // Ctrl+Shift+I / J / C (DevTools)
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(k)) { e.preventDefault(); return false; }
      // F12
      if (e.key === 'F12') { e.preventDefault(); return false; }
      // Ctrl+Shift+K (Firefox DevTools)
      if (ctrl && e.shiftKey && k === 'k') { e.preventDefault(); return false; }
    };

    // 3. Block copy and cut events
    const onCopy = (e) => { e.preventDefault(); return false; };
    const onCut  = (e) => { e.preventDefault(); return false; };

    // 4. Block drag-to-copy
    const onDragStart = (e) => { e.preventDefault(); return false; };

    // 5. Block print
    const onBeforePrint = () => false;

    // 6. Disable text selection via JS (inputs still selectable via CSS)
    document.onselectstart = (e) => {
      if (e.target && e.target.tagName === 'INPUT') return true;
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown',     onKeyDown);
    document.addEventListener('copy',        onCopy);
    document.addEventListener('cut',         onCut);
    document.addEventListener('dragstart',   onDragStart);
    window.onbeforeprint = onBeforePrint;

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown',     onKeyDown);
      document.removeEventListener('copy',        onCopy);
      document.removeEventListener('cut',         onCut);
      document.removeEventListener('dragstart',   onDragStart);
      document.onselectstart = null;
    };
  }, []);

  // ── Route: /chmod777 → admin panel ───────────────────────────────────────
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/chmod777') {
      setScreen('admin');
    }
    // Also watch for URL changes (hash/pushState)
    const onPopState = () => {
      if (window.location.pathname === '/chmod777') setScreen('admin');
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
    // Screen transition is handled inside QuizScreen after celebration
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
      {/* ── Panic border (controlled by body class in QuizScreen) ── */}
      <div className="panic-border" id="panic-border" />
      <div className="panic-label" id="panic-label">⚠ THE DEMOGORGON IS NEAR ⚠</div>

      {/* ── Right-click blocked toast ── */}
      <div className={`rc-blocked${showRcToast ? ' show' : ''}`}>
        ⬡ Right-click is disabled during the quiz
      </div>

      {/* ── Route rendering ── */}
      {screen === 'home'    && <HomeScreen    onEnter={() => setScreen('login')} />}
      {screen === 'login'   && <LoginScreen   onLogin={handleLogin} />}
      {screen === 'landing' && <LandingScreen teamData={teamData} onStart={handleStart} />}
      {screen === 'quiz'    && <QuizScreen    teamData={teamData}  onSubmit={handleSubmit} />}
      {screen === 'results' && <ResultsScreen teamData={teamData}  results={results} onReset={handleReset} />}
      {screen === 'admin'   && <AdminPanel />}
    </>
  );
}
