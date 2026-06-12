import React, { useState, useEffect, useRef } from 'react';
import LOCAL_TEAM_CREDENTIALS from '../data/teams';
import './AdminPanel.css';

const ADMIN_PASSWORD = 'chmod777';

export default function AdminPanel() {
  const [loggedIn,    setLoggedIn]    = useState(false);
  const [passInput,   setPassInput]   = useState('');
  const [passErr,     setPassErr]     = useState(false);
  const [adminToken,  setAdminToken]  = useState(null);
  const [teams,       setTeams]       = useState([]);
  const [credentials, setCredentials] = useState(LOCAL_TEAM_CREDENTIALS);
  const [serverOnline, setServerOnline] = useState(null);
  const [toasts,       setToasts]       = useState([]);
  const [tabAlerts,   setTabAlerts]   = useState([]);  // { teamId, teamName, count, timestamp }
  const [wsStatus,    setWsStatus]    = useState('LIVE');
  const [showClear,   setShowClear]   = useState(false);
  const [backupName,  setBackupName]  = useState('');
  const [spinning,    setSpinning]    = useState(false);
  const [clearing,    setClearing]    = useState(false);

  const wsRef        = useRef(null);
  const toastRef     = useRef(null);
  const alertTimers  = useRef({});
  const toastTimers  = useRef({});
  const refreshIntervalRef = useRef(null);
  const adminTokenRef = useRef(null);  // always up-to-date token for WS callbacks

  // ── Christmas lights (commented out in original) ──
  // useEffect(() => { buildLights(); }, []);

  // ── Auto-refresh every 20s when logged in ────────────────────────────
  useEffect(() => {
    if (!loggedIn || !adminToken) return;
    adminTokenRef.current = adminToken;
    refreshIntervalRef.current = setInterval(() => {
      renderDashboard(adminToken);
    }, 20000);
    return () => clearInterval(refreshIntervalRef.current);
  }, [loggedIn, adminToken]); // eslint-disable-line

  // ── Display admin code on login screen ──
  // (shown as pw-box in original)

  function adminLogin() {
    if (passInput !== ADMIN_PASSWORD) {
      setPassErr(true);
      return;
    }
    const token = 'admin_' + ADMIN_PASSWORD;
    setAdminToken(token);
    adminTokenRef.current = token;
    setLoggedIn(true);
    setPassErr(false);
    renderDashboard(token);
    connectWS(token);
  }

  function adminLogout() {
    clearInterval(refreshIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auto-reconnect
      wsRef.current.close();
    }
    adminTokenRef.current = null;
    setAdminToken(null);
    setLoggedIn(false);
  }

  // ── WebSocket for live events ──
  function connectWS(token) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}`);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'AUTH_ADMIN', token }));
      setWsStatus('LIVE');
    };
    ws.onmessage = (e) => {
      try { handleWSMessage(JSON.parse(e.data), token); } catch {}
    };
    ws.onclose = () => {
      // Only reconnect if still logged in
      if (!adminTokenRef.current) return;
      setWsStatus('RECONNECTING');
      setTimeout(() => {
        if (adminTokenRef.current) connectWS(adminTokenRef.current);
      }, 3000);
    };
  }

  function handleWSMessage(msg, token) {
    if (msg.type === 'SNAPSHOT') {
      // Full snapshot on connect — set teams directly, no HTTP round-trip
      setTeams(msg.teams || []);
    } else if (msg.type === 'TEAM_JOINED') {
      // New team logged in — add or update in place
      setTeams(prev => {
        const exists = prev.findIndex(t => t.id === msg.team.id);
        if (exists >= 0) {
          const next = [...prev]; next[exists] = msg.team; return next;
        }
        return [...prev, msg.team];
      });
    } else if (msg.type === 'TEAM_SUBMITTED') {
      // Team submitted — update their entry instantly
      setTeams(prev => prev.map(t => t.id === msg.team.id ? msg.team : t));
    } else if (msg.type === 'TAB_SWITCH') {
      // Tab switch — update team's tabSwitchCount inline + show toast
      setTeams(prev => prev.map(t =>
        t.id === msg.teamId ? { ...t, tabSwitchCount: msg.count } : t
      ));
      setTabAlerts(prev => {
        const existing = prev.findIndex(a => a.teamId === msg.teamId);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], count: msg.count, timestamp: msg.timestamp };
          return next;
        }
        return [{ teamId: msg.teamId, teamName: msg.teamName, count: msg.count, timestamp: msg.timestamp }, ...prev];
      });
      showAlertToast(msg.teamName, msg.count, msg.timestamp);
    } else if (msg.type === 'DATA_CLEARED') {
      setTeams([]);
      setTabAlerts([]);
    }
  }

  // ── Stacked alert toasts (8s auto-dismiss) ──
  function showAlertToast(teamName, count, timestamp) {
    const id = 'toast_' + Date.now() + '_' + Math.random();
    const time = new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
    setToasts(prev => [...prev, { id, teamName, count, time }]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), 8000);
  }

  function dismissToast(id) {
    clearTimeout(toastTimers.current[id]);
    delete toastTimers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  // ── Main dashboard fetch ──
  async function renderDashboard(token) {
    try {
      const res = await fetch('/api/admin/teams', {
        headers: { 'x-admin-token': token || adminToken },
      });
      if (!res.ok) {
        setServerOnline(false);
        setCredentials(LOCAL_TEAM_CREDENTIALS);
        return;
      }
      const data = await res.json();
      setServerOnline(true);
      setTeams(data.teams || []);
      setCredentials(data.credentials && data.credentials.length ? data.credentials : LOCAL_TEAM_CREDENTIALS);
    } catch {
      setServerOnline(false);
      setCredentials(LOCAL_TEAM_CREDENTIALS);
    }
  }

  async function refreshDash() {
    setSpinning(true);
    await renderDashboard(adminToken);
    setTimeout(() => setSpinning(false), 600);
  }

  function openClearModal() {
    setBackupName(defaultBackupFilename());
    setShowClear(true);
  }

  function exportTeamsCsv(nameInput) {
    if (!teams.length) return null;
    const filename = resolveBackupFilename(nameInput);
    downloadCsv(buildTeamsCsv(teams), filename);
    return filename;
  }

  function downloadTeamsCsv() {
    const name = window.prompt(
      'Backup file name (edit or keep the default):',
      defaultBackupFilename()
    );
    if (name === null) return;
    exportTeamsCsv(name);
  }

  async function clearAllData() {
    if (clearing) return;
    setClearing(true);
    try {
      const filename = teams.length ? exportTeamsCsv(backupName) : null;
      await fetch('/api/admin/clear', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ backupName: filename || backupName }),
      });
      setShowClear(false);
      setBackupName('');
      setTabAlerts([]);
      renderDashboard(adminToken);
    } finally {
      setClearing(false);
    }
  }

  // ── Dismiss alert ──
  function dismissAlert(teamId) {
    clearTimeout(alertTimers.current[teamId]);
    setTabAlerts(prev => prev.filter(a => a.teamId !== teamId));
  }

  // ── Helpers ──
  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function calcMarks(pct) {
    return Math.round(pct * 0.5 * 10) / 10;
  }

  // ── Derived stats ──
  const submitted   = teams.filter(t => t.submitted);
  const avg         = submitted.length ? Math.round(submitted.reduce((s, t) => s + t.pct, 0) / submitted.length) : null;
  const top         = submitted.length ? Math.max(...submitted.map(t => t.pct)) : null;
  const switchTotal = teams.reduce((s, t) => s + (t.tabSwitchCount || 0), 0);

  const sortedTeams = [...teams].sort((a, b) => {
    if (a.submitted && b.submitted) return b.pct - a.pct;
    if (a.submitted) return -1;
    if (b.submitted) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  let rankCounter = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN LOGIN SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="admin-login-screen screen">
        {/* <div className="lights-strip" id="lights-strip" /> */}

        <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'.3em', textTransform:'uppercase', color:'var(--text-dim)', marginBottom:'20px', textAlign:'center' }}>
          HAWKINS NATIONAL LABORATORY · CLASSIFIED
        </div>
        <div className="st-title" style={{ fontSize:'clamp(36px,6vw,60px)', textAlign:'center', marginBottom:'6px' }}>
          CONTROL<br />ROOM
        </div>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'13px', color:'var(--text-dim)', fontStyle:'italic', textAlign:'center', marginBottom:'40px' }}>
          Admin Access · Authorized Personnel Only
        </div>

        <div className="admin-card">
          <div className="admin-icon">⬡</div>
          <div className="admin-title">OPERATOR LOGIN</div>
          <div className="admin-sub">Enter your clearance code to access the control room</div>

          <div className="input-group">
            <label>Clearance Code</label>
            <input
              type="password"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassErr(false); }}
              placeholder="••••••••••"
              autoComplete="off"
              className={passErr ? 'error' : ''}
              onKeyDown={e => e.key === 'Enter' && adminLogin()}
            />
          </div>

          {passErr && <div className="admin-err">⚠ Invalid clearance code. Access denied.</div>}

          <button className="login-btn" onClick={adminLogin}>
            ⬡ &nbsp; ACCESS CONTROL ROOM
          </button>
        </div>

        <div style={{ marginTop:'24px', textAlign:'center' }}>
          <div style={{ fontSize:'11px', color:'var(--text-dim)', marginBottom:'8px', letterSpacing:'.08em' }}>Your admin code:</div>
          <div className="pw-box">{ADMIN_PASSWORD}</div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dash screen">
      {/* ── Stacked tab-switch toasts ── */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div className="tab-toast" key={t.id}>
            <div className="tab-toast-header">
              <span className="tab-toast-icon">⚠</span>
              <span className="tab-toast-title">TAB SWITCH DETECTED</span>
              <button className="tab-toast-close" onClick={() => dismissToast(t.id)}>&#x2715;</button>
            </div>
            <div className="tab-toast-team">{t.teamName}</div>
            <div className="tab-toast-meta">
              <span>🕒 {t.time}</span>
              <span>&middot;</span>
              <span>Switch #{t.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Dashboard Header ── */}
      <div className="dash-header">
        <div className="dash-logo">⬡ <span>HAWKINS LAB</span> · QUIZ CONTROL</div>
        <div className="dash-meta">
          <span className="live-dot-label">{wsStatus}</span>
          <button className={`action-btn${spinning ? ' spinning' : ''}`} onClick={refreshDash}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            REFRESH
          </button>
          <button className="action-btn" onClick={downloadTeamsCsv} disabled={teams.length === 0}>
            ↓ DOWNLOAD CSV
          </button>
          <button className="action-btn danger" onClick={openClearModal}>⬡ CLEAR DATA</button>
          <button className="action-btn logout-btn" onClick={adminLogout}>LOGOUT</button>
        </div>
      </div>

      <div className="dash-body">
        {/* ── Stats Row ── */}
        <div className="dash-stats">
          <div className="dash-stat s-red">
            <div className="dash-stat-val" style={{ color:'var(--red)' }}>{teams.length}</div>
            <div className="dash-stat-label">Teams Active</div>
          </div>
          <div className="dash-stat s-green">
            <div className="dash-stat-val" style={{ color:'var(--green)' }}>{submitted.length}</div>
            <div className="dash-stat-label">Submitted</div>
          </div>
          <div className="dash-stat s-amber">
            <div className="dash-stat-val" style={{ color:'var(--amber)' }}>{avg !== null ? avg + '%' : '—'}</div>
            <div className="dash-stat-label">Average Score</div>
          </div>
          <div className="dash-stat s-purple">
            <div className="dash-stat-val" style={{ color:'#bb55ee' }}>{top !== null ? top + '%' : '—'}</div>
            <div className="dash-stat-label">Top Score</div>
          </div>
          <div className="dash-stat s-red">
            <div className="dash-stat-val" style={{ color:'var(--amber)' }}>{switchTotal}</div>
            <div className="dash-stat-label">Tab Switches</div>
          </div>
        </div>

        {/* ── Tab Switch Alerts ── */}
        <div className="section-title">
          ⚠ TAB SWITCH ALERTS
          {tabAlerts.length > 0 && <span>({tabAlerts.length} team{tabAlerts.length !== 1 ? 's' : ''} flagged)</span>}
        </div>
        <div className="alerts-log">
          <div className="alert-list">
            {tabAlerts.length === 0 ? (
              <div className="no-alerts">No tab switches detected yet. The Mind Flayer is watching...</div>
            ) : (
              [...tabAlerts].sort((a, b) => b.timestamp - a.timestamp).map(a => (
                <div className="alert-item" key={a.teamId} id={`alert-${a.teamId}`}>
                  <span className="alert-icon">👁</span>
                  <div>
                    <div className="alert-team">
                      {a.teamName}
                      <span style={{ fontSize:'10px', color:'var(--text-dim)' }}> ({a.teamId})</span>
                    </div>
                    <div className="alert-detail">Tab switch detected · Last at {fmtTime(a.timestamp)}</div>
                  </div>
                  <div className="alert-count">{a.count}×</div>
                  <button className="alert-collapse-btn" onClick={() => dismissAlert(a.teamId)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Team Credentials ── */}
        <div className="section-title">
          🔑 TEAM CREDENTIALS
          {credentials.length > 0 && <span>({credentials.length} registered)</span>}
          {serverOnline === false && (
            <span style={{ fontSize:'10px', color:'var(--amber)', fontStyle:'italic' }}>
              &#9889; backend offline — showing local credentials
            </span>
          )}
        </div>
        <div className="creds-grid">
          {credentials.map(c => {
            const t = teams.find(x => x.id === c.id);
            let statusEl;
            if (t && t.submitted)    statusEl = <div className="cred-status cred-done">✓ Submitted</div>;
            else if (t && !t.submitted) statusEl = <div className="cred-status cred-started">● In Progress</div>;
            else                    statusEl = <div className="cred-status cred-waiting">○ Not Started</div>;
            return (
              <div className="cred-card" key={c.id}>
                <div className="cred-id">{c.id}</div>
                <div className="cred-name">{c.name}</div>
                <div className="cred-pass">{c.pass}</div>
                {statusEl}
                {t && t.tabSwitchCount > 0 && (
                  <div style={{ fontSize:'9px', color:'var(--amber)', marginTop:'3px', letterSpacing:'.05em' }}>
                    👁 {t.tabSwitchCount} tab switch{t.tabSwitchCount !== 1 ? 'es' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Leaderboard ── */}
        <div className="section-title">
          🏆 LEADERBOARD
          {teams.length > 0 && <span>({teams.length} team{teams.length !== 1 ? 's' : ''}, {submitted.length} submitted)</span>}
        </div>
        <div className="table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Score</th>
                <th>Marks</th>
                <th>Correct</th>
                <th>Wrong</th>
                <th>Skipped</th>
                <th>Breakdown</th>
                <th>Time</th>
                <th>Tab Switches</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-icon">📡</div>
                      <div className="empty-title">Waiting for teams...</div>
                      <div>Teams will appear once they log in.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedTeams.map(t => {
                  if (t.submitted) rankCounter++;
                  const rank = t.submitted ? rankCounter : null;
                  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';
                  const pctColor = !t.submitted ? 'var(--text-dim)' : t.pct >= 70 ? 'var(--red)' : t.pct >= 45 ? 'var(--amber)' : '#9933bb';
                  const timeStr  = t.submitted ? `${Math.floor((t.usedSeconds||0)/60)}m ${(t.usedSeconds||0)%60}s` : '—';
                  return (
                    <tr key={t.id}>
                      <td><div className={`rank-badge ${rankClass}`}>{rank || '–'}</div></td>
                      <td>
                        <div className="team-name-cell">{t.name || t.id}</div>
                        {t.members && <div style={{ fontSize:'11px', color:'var(--text-dim)', marginTop:'2px', fontStyle:'italic' }}>{t.members}</div>}
                      </td>
                      <td>
                        {t.submitted ? (
                          <>
                            <div className="score-pct-cell" style={{ color: pctColor }}>{t.pct}%</div>
                            <div className="mini-bar"><div className="mini-bar-fill" style={{ width:`${t.pct}%`, background: pctColor }} /></div>
                          </>
                        ) : (
                          <span style={{ color:'var(--amber)', fontSize:'12px', fontFamily:'var(--font-display)', letterSpacing:'.08em' }}>● IN PROGRESS</span>
                        )}
                      </td>
                      <td className="stat-cell" style={{ color:'#bb55ee' }}>
                        {t.submitted ? calcMarks(t.correct) : '—'}
                      </td>
                      <td className="stat-cell" style={{ color:'var(--red)' }}>{t.submitted ? t.correct : '—'}</td>
                      <td className="stat-cell" style={{ color:'#ff6060' }}>{t.submitted ? t.wrong   : '—'}</td>
                      <td className="stat-cell" style={{ color:'var(--text-dim)' }}>{t.submitted ? t.skip : '—'}</td>
                      <td>
                        {t.submitted ? (
                          <div className="section-scores">
                            <div><div className="sec-mini-val" style={{ color:'var(--red)' }}>{t.eC}/15</div><div className="sec-mini-label">Easy</div></div>
                            <span style={{ color:'rgba(80,40,40,0.5)' }}>|</span>
                            <div><div className="sec-mini-val" style={{ color:'var(--amber)' }}>{t.mC}/30</div><div className="sec-mini-label">Med</div></div>
                            <span style={{ color:'rgba(80,40,40,0.5)' }}>|</span>
                            <div><div className="sec-mini-val" style={{ color:'#aa44cc' }}>{t.hC}/15</div><div className="sec-mini-label">Adv</div></div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="time-cell">{timeStr}</td>
                      <td>
                        {t.tabSwitchCount > 0
                          ? <span style={{ color:'var(--amber)', fontFamily:'var(--font-display)', fontSize:'13px' }}>⚠ {t.tabSwitchCount}</span>
                          : <span style={{ color:'var(--text-dim)', fontSize:'11px' }}>—</span>
                        }
                      </td>
                      <td>
                        {t.submitted
                          ? <span className="submitted-badge sub-done">✓ DONE</span>
                          : <span style={{ fontFamily:'var(--font-display)', fontSize:'10px', color:'var(--amber)', letterSpacing:'.1em' }}>● ACTIVE</span>
                        }
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Clear Modal ── */}
      {showClear && (
        <div className="modal-overlay open">
          <div className="modal modal-wide">
            <h3>⚠ PURGE ALL DATA?</h3>
            <p>
              A CSV backup will download automatically before deletion.
              You can also save a JSON copy on the server. This cannot be undone.
            </p>
            <div className="input-group modal-input-group">
              <label>Backup file name <span className="optional-tag">(optional)</span></label>
              <input
                type="text"
                value={backupName}
                onChange={e => setBackupName(e.target.value)}
                placeholder="hawkins-backup-YYYY-MM-DD_HH-mm-ss"
                autoComplete="off"
                onKeyDown={e => e.key === 'Enter' && clearAllData()}
              />
            </div>
            <div className="modal-btns">
              <button
                className="modal-download"
                onClick={() => exportTeamsCsv(backupName)}
                disabled={teams.length === 0}
              >
                ↓ Download CSV
              </button>
              <button className="modal-cancel" onClick={() => setShowClear(false)}>Cancel</button>
              <button className="modal-confirm" onClick={clearAllData} disabled={clearing}>
                {clearing ? 'Purging…' : 'Purge Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV export helpers ────────────────────────────────────────────────────────
function defaultBackupFilename() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `hawkins-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function resolveBackupFilename(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return defaultBackupFilename();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return safe || defaultBackupFilename();
}

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function calcMarksExport(pct) {
  return Math.round(pct * 0.5 * 10) / 10;
}

function buildTeamsCsv(teams) {
  const sorted = [...teams].sort((a, b) => {
    if (a.submitted && b.submitted) return b.pct - a.pct;
    if (a.submitted) return -1;
    if (b.submitted) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const headers = [
    'Rank', 'Team ID', 'Team Name', 'Members', 'Score (%)', 'Marks',
    'Correct', 'Wrong', 'Skipped', 'Easy', 'Medium', 'Advanced',
    'Time Used', 'Tab Switches', 'Status',
  ];

  let rank = 0;
  const rows = sorted.map(t => {
    if (t.submitted) rank++;
    const timeUsed = t.submitted
      ? `${Math.floor((t.usedSeconds || 0) / 60)}m ${(t.usedSeconds || 0) % 60}s`
      : '';
    return [
      t.submitted ? rank : '',
      t.id,
      t.name || t.id,
      t.members || '',
      t.submitted ? t.pct : '',
      t.submitted ? calcMarksExport(t.pct) : '',
      t.submitted ? t.correct : '',
      t.submitted ? t.wrong : '',
      t.submitted ? t.skip : '',
      t.submitted ? `${t.eC}/15` : '',
      t.submitted ? `${t.mC}/30` : '',
      t.submitted ? `${t.hC}/15` : '',
      timeUsed,
      t.tabSwitchCount || 0,
      t.submitted ? 'Submitted' : 'In Progress',
    ];
  });

  return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
}

function downloadCsv(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
