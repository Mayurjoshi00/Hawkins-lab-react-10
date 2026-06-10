import React, { useState, useEffect, useRef, useCallback } from 'react';
import ALL_QUESTIONS from '../data/questions';
import SubmitModal   from './SubmitModal';
import './QuizScreen.css';

const API = '';

export default function QuizScreen({ teamData, onSubmit }) {
  // ── Restore state from teamData (server session) or create fresh ──
  const [questionOrder] = useState(() => teamData?.questionOrder || createQuestionOrder());
  const [answers,  setAnswers]  = useState(() => teamData?.answers  || new Array(60).fill(null));
  const [flags,    setFlags]    = useState(() => teamData?.flags    || new Array(60).fill(false));
  const [current,  setCurrent]  = useState(0);
  const [totalSecs, setTotalSecs] = useState(() => teamData?.totalSeconds || 38 * 60);
  const [usedSecs,  setUsedSecs]  = useState(() => teamData?.usedSeconds  || 0);
  const [showModal, setShowModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebResult, setCelebResult] = useState(null);

  const timerRef     = useRef(null);
  const heartbeatRef = useRef(null);
  const wsRef        = useRef(null);

  const serverMode = teamData?.serverMode && teamData?.sessionToken;

  // ── Christmas lights build (matches original) ──
  useEffect(() => {
    // <LightsStrip /> commented out in original; kept here
    // const strip = document.getElementById('lights-strip');
    // if (!strip) return;
    // ...
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTotalSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit();
          return 0;
        }
        return s - 1;
      });
      setUsedSecs(u => u + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line

  // ── Heartbeat (server mode only) ──────────────────────────────────────
  useEffect(() => {
    if (!serverMode) return;
    heartbeatRef.current = setInterval(() => {
      fetch(API + '/api/quiz/heartbeat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          teamId:       teamData.teamId,
          sessionToken: teamData.sessionToken,
          usedSeconds:  usedSecs,
          totalSeconds: totalSecs,
        }),
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(heartbeatRef.current);
  }, [serverMode]); // eslint-disable-line

  // ── WebSocket (server mode only) ──────────────────────────────────────
  useEffect(() => {
    if (!serverMode) return;
    connectWS();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [serverMode]); // eslint-disable-line

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    wsRef.current = new WebSocket(`${proto}://${location.host}`);
    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({ type: 'AUTH_TEAM', teamId: teamData.teamId, sessionToken: teamData.sessionToken }));
    };
    wsRef.current.onclose = () => setTimeout(connectWS, 3000);
  }

  // ── Tab / window visibility detection (report to server) ──────────────
  //
  // DESIGN:
  //  • lastTabSwitchRef persists across renders (unlike a let inside useEffect)
  //    so the 3-second debounce is never accidentally reset.
  //  • We use ONLY visibilitychange — it's the most reliable cross-browser
  //    signal for "user switched to another tab or minimised the window".
  //  • window.blur is intentionally NOT used: it fires when the user clicks
  //    any browser UI element (address bar, devtools, another window) AND
  //    simultaneously with visibilitychange on tab switch, causing double-counts.
  //  • We also check document.hidden inside the handler so that focus loss
  //    from e.g. an in-page dialog does NOT trigger a false positive.
  //  • Submitted teams are guarded on the server side too, but we skip the
  //    fetch early to avoid noise.
  // ────────────────────────────────────────────────────────────────────────
  const lastTabSwitchRef = useRef(0);   // timestamp of last reported switch
  const submittedRef     = useRef(false); // set to true on quiz submit

  useEffect(() => {
    if (!serverMode) return; // offline mode — nothing to report

    function reportTabSwitch() {
      // Only fire when the page is actually hidden (real tab switch / minimise)
      if (!document.hidden) return;

      // Debounce: ignore if we already reported within the last 3 seconds
      const now = Date.now();
      if (now - lastTabSwitchRef.current < 3000) return;
      lastTabSwitchRef.current = now;

      // Don't report after quiz is submitted
      if (submittedRef.current) return;

      fetch(API + '/api/quiz/tabswitch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          teamId:       teamData.teamId,
          sessionToken: teamData.sessionToken,
        }),
      }).catch(() => {});
    }

    document.addEventListener('visibilitychange', reportTabSwitch);
    return () => {
      document.removeEventListener('visibilitychange', reportTabSwitch);
    };
  }, [serverMode]); // eslint-disable-line

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  navigate(-1);
      if (['1', '2', '3', '4'].includes(e.key)) selectAnswer(current, parseInt(e.key) - 1);
      if (e.key === 'f' || e.key === 'F') toggleFlag(current);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current]); // eslint-disable-line

  // ── Panic mode body class ─────────────────────────────────────────────
  useEffect(() => {
    const isPanic = (current >= 10 && current <= 14) ||
                    (current >= 40 && current <= 44) ||
                    (current >= 55 && current <= 59);
    document.body.classList.toggle('panic-mode', isPanic);
    return () => document.body.classList.remove('panic-mode');
  }, [current]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const navigate = useCallback((dir) => {
    setCurrent(c => Math.max(0, Math.min(59, c + dir)));
  }, []);

  async function selectAnswer(qIdx, optIdx) {
    setAnswers(prev => {
      const next = [...prev];
      next[qIdx]  = optIdx;
      return next;
    });

    // Save to server
    if (serverMode) {
      fetch(API + '/api/quiz/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          teamId:       teamData.teamId,
          sessionToken: teamData.sessionToken,
          qIndex:       qIdx,
          answer:       optIdx,
        }),
      }).catch(() => {});
    }
  }

  async function toggleFlag(qIdx) {
    setFlags(prev => {
      const next  = [...prev];
      next[qIdx]  = !next[qIdx];

      // Save to server
      if (serverMode) {
        fetch(API + '/api/quiz/flag', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            teamId:       teamData.teamId,
            sessionToken: teamData.sessionToken,
            qIndex:       qIdx,
            flagged:      next[qIdx],
          }),
        }).catch(() => {});
      }

      return next;
    });
  }

  async function handleFinalSubmit() {
    clearInterval(timerRef.current);
    clearInterval(heartbeatRef.current);
    submittedRef.current = true;  // stop tab-switch reporting
    setShowModal(false);
    document.body.classList.remove('panic-mode');

    // Server submit
    if (serverMode) {
      try {
        const res  = await fetch(API + '/api/quiz/submit', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ teamId: teamData.teamId, sessionToken: teamData.sessionToken, usedSeconds: usedSecs }),
        });
        const result = await res.json();
        result.usedSeconds = result.usedSeconds || usedSecs;
        triggerCelebration(result);
        return;
      } catch (e) {
        // fall through to client-side scoring
      }
    }

    // Client-side scoring (offline / fallback)
    let correct = 0, eC = 0, mC = 0, hC = 0;
    questionOrder.forEach((origIdx, orderPos) => {
      const q = ALL_QUESTIONS[origIdx];
      if (answers[orderPos] === q.ans) {
        correct++;
        if (origIdx < 15)  eC++;
        else if (origIdx < 45) mC++;
        else hC++;
      }
    });

    const wrong = answers.filter((a, i) => a !== null && a !== ALL_QUESTIONS[questionOrder[i]]?.ans).length;
    const skip  = answers.filter(a => a === null).length;
    const pct   = Math.round((correct / 60) * 100);

    triggerCelebration({ correct, wrong, skip, pct, eC, mC, hC, usedSeconds: usedSecs });
  }

  // ── Celebration then results (matches original 4.2s flow) ──
  function triggerCelebration(result) {
    setCelebResult(result);
    setShowCelebration(true);
    fireParticles();
    setTimeout(fireParticles, 1200);
    setTimeout(() => {
      setShowCelebration(false);
      onSubmit(result);
    }, 4200);
  }

  function fireParticles() {
    const container = document.getElementById('celeb-particles');
    if (!container) return;
    const colors = ['#cc1111','#d4780a','#f5c842','#ffffff','#cc20ff','#20ff40','#2060ff','#ff6060'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'celeb-particle';
      const size = 5 + Math.random() * 9;
      p.style.cssText = [
        'left:'   + (Math.random() * 100) + 'vw',
        'bottom:' + (-10 + Math.random() * 20) + 'px',
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'background:' + colors[Math.floor(Math.random() * colors.length)],
        'animation-delay:'    + (Math.random() * 1.0) + 's',
        'animation-duration:' + (1.6 + Math.random() * 1.4) + 's',
      ].join(';');
      container.appendChild(p);
    }
    setTimeout(() => { if (container) container.innerHTML = ''; }, 4000);
  }

  // ── Derived values ─────────────────────────────────────────────────────
  const mins     = Math.floor(totalSecs / 60);
  const secs     = totalSecs % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isWarn   = totalSecs < 300;

  const eAns = answers.slice(0,  15).filter(x => x !== null).length;
  const mAns = answers.slice(15, 45).filter(x => x !== null).length;
  const hAns = answers.slice(45, 60).filter(x => x !== null).length;

  const curQ = ALL_QUESTIONS[questionOrder[current]];

  const sectionLabel = curQ.section === 'easy'
    ? 'Section A — Easy'
    : curQ.section === 'medium'
      ? 'Section B — Moderate'
      : 'Section C — Advanced';

  const isLast = current === 59;

  return (
    <>
      {/* ── Celebration Overlay ── */}
      <div className={`celebration-overlay${showCelebration ? ' show' : ''}`}>
        <div className="celeb-particles" id="celeb-particles" />
        <div className="celeb-title">GATE CLOSED!</div>
        <div className="celeb-team-name">{teamData?.teamName || ''}</div>
        <div className="celeb-sub">Your answers have been recorded · Well done, soldier</div>
      </div>

      {/* ── Save indicator ── */}
      <div className="save-indicator" id="save-indicator">SAVED TO SERVER</div>

      {/* ── Quiz Layout ── */}
      <div className="quiz-screen screen">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div>
            <div className="sidebar-logo">⬡ HAWKINS AV CLUB</div>
            <div className="sidebar-team">{teamData?.teamName || ''}</div>
          </div>

          <div className="timer-box">
            <div className="timer-label">Time Remaining</div>
            <div className={`timer-val${isWarn ? ' warn' : ''}`}>{timerStr}</div>
          </div>

          <div>
            <div className="prog-label">
              <span style={{ color:'var(--red)', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>SECTION A</span>
              <span>{eAns}/15</span>
            </div>
            <div className="prog-bar"><div className="prog-fill easy" style={{ width: `${(eAns/15)*100}%` }} /></div>

            <div className="prog-label" style={{ marginTop: 8 }}>
              <span style={{ color:'var(--amber)', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>SECTION B</span>
              <span>{mAns}/30</span>
            </div>
            <div className="prog-bar"><div className="prog-fill medium" style={{ width: `${(mAns/30)*100}%` }} /></div>

            <div className="prog-label" style={{ marginTop: 8 }}>
              <span style={{ color:'#aa44cc', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>SECTION C</span>
              <span>{hAns}/15</span>
            </div>
            <div className="prog-bar"><div className="prog-fill hard" style={{ width: `${(hAns/15)*100}%` }} /></div>
          </div>

          <div className="section-tabs">
            <button
              className={`sec-tab${current < 15 ? ' active-easy' : ''}`}
              onClick={() => setCurrent(0)}
            >
              <span>⬡ Section A · Easy</span>
              <span className="sec-count">{eAns}/15</span>
            </button>
            <button
              className={`sec-tab${current >= 15 && current < 45 ? ' active-medium' : ''}`}
              onClick={() => setCurrent(15)}
            >
              <span>⬡ Section B · Moderate</span>
              <span className="sec-count">{mAns}/30</span>
            </button>
            <button
              className={`sec-tab${current >= 45 ? ' active-hard' : ''}`}
              onClick={() => setCurrent(45)}
            >
              <span>⬡ Section C · Advanced</span>
              <span className="sec-count">{hAns}/15</span>
            </button>
          </div>

          <div>
            <div className="prog-label" style={{ marginBottom: 8 }}><span>Question Map</span></div>
            <div className="q-grid">
              {Array.from({ length: 60 }, (_, i) => (
                <div
                  key={i}
                  id={`dot-${i}`}
                  className={`q-dot${
                    i === current ? ' current-q'
                    : flags[i]         ? ' flagged'
                    : answers[i] !== null ? ' answered'
                    : ''
                  }`}
                  onClick={() => setCurrent(i)}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-legend">
            <span style={{ color:'var(--red)' }}>■</span> Answered &nbsp;
            <span style={{ color:'var(--amber)' }}>■</span> Flagged &nbsp;
            <span style={{ color:'rgba(255,255,255,0.3)' }}>■</span> Skipped
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="main-content">
          <div className="q-header">
            <div className="q-meta">
              <span className="q-num">Q {current + 1} / 60</span>
              <span className={`diff-badge ${curQ.section}`}>{sectionLabel}</span>
              <span className="cat-badge">{curQ.cat}</span>
            </div>
            <button
              className={`flag-btn${flags[current] ? ' flagged' : ''}`}
              onClick={() => toggleFlag(current)}
            >
              🚩 {flags[current] ? 'Flagged' : 'Flag'}
            </button>
          </div>

          {/* Typewriter-style question text */}
          <div className="q-text" key={current}>
            {curQ.text.split('').map((ch, i) => (
              <span key={i} className="typewriter-char" style={{ animationDelay: `${i * 15}ms` }}>{ch}</span>
            ))}
          </div>

          <div className="options">
            {curQ.opts.map((opt, i) => (
              <div
                key={i}
                className={`option${answers[current] === i ? ' selected' : ''}`}
                onClick={() => selectAnswer(current, i)}
              >
                <div className={`opt-letter${answers[current] === i ? ' selected' : ''}`}>{['A','B','C','D'][i]}</div>
                <div className="opt-text">{opt}</div>
              </div>
            ))}
          </div>

          <div className="q-footer">
            <button
              className="nav-btn"
              disabled={current === 0}
              onClick={() => navigate(-1)}
            >← Prev</button>

            {!isLast && (
              <button className="nav-btn" onClick={() => navigate(1)}>Next →</button>
            )}

            {isLast && (
              <button className="nav-btn submit-btn" onClick={() => setShowModal(true)}>
                Submit Quiz ⬡
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <SubmitModal
          unanswered={answers.filter(x => x === null).length}
          onCancel={() => setShowModal(false)}
          onConfirm={handleFinalSubmit}
        />
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffleSection(indices) {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createQuestionOrder() {
  return [
    ...shuffleSection(Array.from({ length: 15 }, (_, i) => i)),
    ...shuffleSection(Array.from({ length: 30 }, (_, i) => i + 15)),
    ...shuffleSection(Array.from({ length: 15 }, (_, i) => i + 45)),
  ];
}
