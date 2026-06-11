import React, { useState, useRef } from 'react';
import ShatterTransition from './ShatterTransition';
import TEAM_CREDENTIALS from '../data/teams';
import './LoginScreen.css';

// ── API base: empty string = same origin (proxied to backend in dev via package.json proxy)
const API = '';

export default function LoginScreen({ onLogin }) {
  const [teamId,  setTeamId]  = useState('');
  const [pass,    setPass]    = useState('');
  const [members, setMembers] = useState('');
  const [error,   setError]   = useState('');
  const [shatter,  setShatter]  = useState(false);
  const [sOrigin,  setSOrigin]  = useState({ x: 0, y: 0 });
  const pendingData = useRef(null);
  const btnRef = useRef(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    const id = teamId.trim().toUpperCase();

    if (!id || !pass) {
      setError('Enter your Team ID and access code.');
      return;
    }
    if (loading) return;
    setLoading(true);

    // ── Step 1: Try the backend server ──────────────────────────────────────
    let serverReachable = false;
    try {
      const res = await fetchWithTimeout(API + '/api/team/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ teamId: id, pass, members }),
      }, 5000);

      // 502 = proxy couldn't reach backend → treat as unreachable, use offline mode
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        serverReachable = false;
        throw new Error('Backend not reachable');
      }

      serverReachable = true; // Server replied with a real response (2xx or 4xx)

      if (res.ok) {
        const data = await res.json();
        const loginPayload = {
          teamId:        data.teamId,
          teamName:      data.teamName,
          members:       members,
          sessionToken:  data.sessionToken,
          questionOrder: data.questionOrder,
          answers:       data.answers        || new Array(60).fill(null),
          flags:         data.flags          || new Array(60).fill(false),
          totalSeconds:  data.totalSeconds   || 38 * 60,
          usedSeconds:   data.usedSeconds    || 0,
          serverMode:    true,
        };
        triggerShatter(loginPayload);
        return;
      }

      // Server is running but rejected the login (wrong creds, already submitted, etc.)
      let errMsg = 'Login failed.';
      try {
        const errBody = await res.json();
        errMsg = errBody.error || errMsg;
      } catch {}
      setError(errMsg);
      setLoading(false);
      return; // ← STOP: don't fall through to offline when server is reachable

    } catch (e) {
      // Network error, timeout, or server not running → fall through to offline
      serverReachable = false;
    }

    // ── Step 2: Offline / standalone fallback (only when server not reachable) ──
    if (!serverReachable) {
      const cred = TEAM_CREDENTIALS.find(c => c.id === id && c.pass === pass);
      if (!cred) {
        setError('Invalid Team ID or access code.');
        setLoading(false);
        return;
      }

      triggerShatter({
        teamId:        cred.id,
        teamName:      cred.name,
        members,
        sessionToken:  null,
        questionOrder: createQuestionOrder(),
        answers:       new Array(60).fill(null),
        flags:         new Array(60).fill(false),
        totalSeconds:  38 * 60,
        usedSeconds:   0,
        serverMode:    false,
      });
      return;
    }

    setLoading(false);
  }

  function triggerShatter(payload) {
    pendingData.current = payload;
    const btn = btnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      setSOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    } else {
      setSOrigin({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    setLoading(false);
    setShatter(true);
  }

  function handleShatterDone() {
    setShatter(false);
    onLogin(pendingData.current);
  }

  return (
    <>
    <ShatterTransition
      active={shatter}
      originX={sOrigin.x}
      originY={sOrigin.y}
      onDone={handleShatterDone}
    />
    <div className="login-screen screen tv-on">
      <div className="login-wrap login-glitch-enter">
        <div className="login-eyebrow">Hawkins Middle School · AV Club</div>
        <div className="st-title login-title-main">STRANGER<br />THINGS</div>
        <div className="login-subtitle">UI/UX Quiz Championship — Round I</div>

        <div className="reg-card">
          <div className="input-group">
            <label>Team ID</label>
            <input
              type="text"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              placeholder="TEAM01"
              autoComplete="off"
              spellCheck={false}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="input-group">
            <label>Access Code</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="input-group">
            <label>Team Members <span className="optional-tag">(optional)</span></label>
            <input
              type="text"
              value={members}
              onChange={e => setMembers(e.target.value)}
              placeholder="e.g. Mike, Eleven, Dustin"
              autoComplete="off"
            />
          </div>

          {error && <div className="input-err show">{error}</div>}

          <button
            ref={btnRef}
            className="start-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            <span>⬡</span> {loading ? '● Opening the gate...' : 'Enter the Upside Down'}
          </button>
        </div>

        <div className="login-footer-note">
          Once you begin, the gate cannot be reopened.<br />
          Do not close this tab — your progress is saved to the server.
        </div>
      </div>
    </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fetchWithTimeout(url, options = {}, ms = 5000) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

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
