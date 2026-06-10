import React, { useState, useEffect } from 'react';
import TEAM_CREDENTIALS from '../data/teams';
import './LoginScreen.css';

const API = '';

export default function LoginScreen({ onLogin }) {
  const [teamId,    setTeamId]    = useState('');
  const [pass,      setPass]      = useState('');
  const [members,   setMembers]   = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  // ── Typewriter char effect helper (mirrors original) ──
  function typewriterText(el, text) {
    el.textContent = '';
    text.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'typewriter-char';
      span.textContent = ch;
      span.style.animationDelay = (i * 15) + 'ms';
      el.appendChild(span);
    });
  }

  async function handleLogin() {
    setError('');
    const id = teamId.trim().toUpperCase();

    if (!id || !pass) {
      setError('Enter your Team ID and access code.');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      // ── Try server-based login first (matches original behaviour) ──
      const res = await fetchWithTimeout(API + '/api/team/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ teamId: id, pass, members }),
      }, 4000);

      if (res.ok) {
        const data = await res.json();
        setLoading(false);
        onLogin({
          teamId:        data.teamId,
          teamName:      data.teamName,
          sessionToken:  data.sessionToken,
          questionOrder: data.questionOrder,
          answers:       data.answers,
          flags:         data.flags,
          totalSeconds:  data.totalSeconds,
          usedSeconds:   data.usedSeconds,
          serverMode:    true,
        });
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || 'Login failed.');
    } catch (e) {
      // ── Fallback: standalone / offline mode (client-side credentials) ──
      if (e.name !== 'AbortError') {
        // Server not reachable — use bundled credentials
        const cred = TEAM_CREDENTIALS.find(c => c.id === id && c.pass === pass);
        if (!cred) {
          setError('Invalid Team ID or access code.');
          setLoading(false);
          return;
        }

        // Build a local question order (shuffled per section)
        const questionOrder = createQuestionOrder();

        setLoading(false);
        onLogin({
          teamId:        cred.id,
          teamName:      cred.name,
          members,
          sessionToken:  null, // offline
          questionOrder,
          answers:       new Array(60).fill(null),
          flags:         new Array(60).fill(false),
          totalSeconds:  38 * 60,
          usedSeconds:   0,
          serverMode:    false,
        });
        return;
      }
      setError('Server is busy — please wait a moment and try again.');
    }

    setLoading(false);
  }

  return (
    <div className="login-screen screen">
      <div className="login-wrap">
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
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fetchWithTimeout(url, options = {}, ms = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
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
