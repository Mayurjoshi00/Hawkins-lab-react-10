import React, { useEffect, useRef } from 'react';
import './HomeScreen.css';

// ── Generate Christmas Lights ─────────────────────────────────────────────
function LightsStrip() {
  const stripRef = useRef(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const colors = ['lb-red','lb-amber','lb-green','lb-blue','lb-yellow','lb-purple','lb-white'];
    const count  = Math.floor(window.innerWidth / 22) || 50;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div');
      b.className = 'light-bulb ' + colors[i % colors.length];
      b.style.animationDelay    = (Math.random() * 8) + 's';
      b.style.animationDuration = (6 + Math.random() * 6) + 's';
      strip.appendChild(b);
    }
  }, []);

  return <div className="lights-strip" ref={stripRef} />;
}

export default function HomeScreen({ onEnter }) {
  // ── Smooth scroll for nav links ──
  function handleNavClick(e, hash) {
    e.preventDefault();
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Animate on scroll ──
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feat-card, .step, .mock-row').forEach(el => {
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page">
      {/* ── Christmas Lights ── */}
      {/* <LightsStrip /> */}

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-logo">⬡ <span>HAWKINS</span> LAB</div>
        <div className="nav-links">
          <a href="#how"         className="nav-link" onClick={e => handleNavClick(e, '#how')}>How It Works</a>
          <a href="#leaderboard" className="nav-link" onClick={e => handleNavClick(e, '#leaderboard')}>Leaderboard</a>
          {/* <a href="/chmod777" className="nav-admin-btn">⬡ Admin</a> */}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" id="hero">
        <div className="scanline" />

        <div className="hero-eyebrow">Hawkins National Laboratory · Classified Event · 1986</div>

        <div className="st-title hero-title">STRANGER<br />THINGS</div>
        {/* <div className="hero-sub">Quiz Night</div> */}

        <div className="hero-divider" />

        <p className="hero-desc">
          Welcome to the Lab. Your team has been cleared for access.<br />
          Navigate the Upside Down — answer wisely, survive the questions.
        </p>

        <div className="quiz-meta">
          <div className="meta-badge">
            <span className="meta-val">60</span>
            <span className="meta-label">Questions</span>
          </div>
          <div className="meta-badge">
            <span className="meta-val">3</span>
            <span className="meta-label">Sections</span>
          </div>
          <div className="meta-badge">
            <span className="meta-val">45</span>
            <span className="meta-label">Min Timer</span>
          </div>
          <div className="meta-badge live-badge">
            <span className="live-dot" />
            <span className="meta-label">Live</span>
          </div>
        </div>

        <div className="cta-group">
          <button className="cta-btn cta-primary" onClick={onEnter}>⬡ &nbsp; Enter The Lab</button>
          {/* <button className="cta-btn cta-secondary">⬡ &nbsp; Control Room</button> */}
        </div>

        <div className="section-eyebrow">What awaits your team</div>

        <div className="features">
          <div className="feat-card fc-red">
            <div className="feat-icon">🔴</div>
            <div className="feat-title">Easy Sector</div>
            <div className="feat-desc">15 questions. Standard Hawkins intel. Every agent begins here.</div>
          </div>
          <div className="feat-card fc-amber">
            <div className="feat-icon">🟠</div>
            <div className="feat-title">Medium Sector</div>
            <div className="feat-desc">30 questions. Upside Down territory. Tread carefully.</div>
          </div>
          <div className="feat-card fc-purple">
            <div className="feat-icon">🟣</div>
            <div className="feat-title">Advanced Sector</div>
            <div className="feat-desc">15 questions. Deep Lab access. Only the brave proceed.</div>
          </div>
          <div className="feat-card fc-green">
            <div className="feat-icon">👁</div>
            <div className="feat-title">Live Monitoring</div>
            <div className="feat-desc">The admin watches all. Tab switches are logged. The Mind Flayer sees.</div>
          </div>
        </div>
      </section>

      {/* ── Warning Banner ── */}
      <div className="warning-banner">
        <span className="warn-icon">⚠</span>
        <div>
          <div className="warn-text">Integrity Protocol Active — Tab Switches Are Monitored</div>
          <div className="warn-sub">Switching tabs during the quiz will be flagged in the admin control room</div>
        </div>
        <span className="warn-icon">⚠</span>
      </div>

      {/* ── How It Works ── */}
      <section className="how-section" id="how">
        <div className="how-title">How It Works</div>
        <p className="how-sub">From clearance to scoreboard — your mission briefing</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <div className="step-icon">🔑</div>
            <div className="step-title">Get Your Code</div>
            <div className="step-desc">Receive your team ID and password from the Quiz Master before the event.</div>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <div className="step-icon">🚪</div>
            <div className="step-title">Enter The Lab</div>
            <div className="step-desc">Log in with your credentials. Enter your team name and member names.</div>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <div className="step-icon">🧠</div>
            <div className="step-title">Answer Questions</div>
            <div className="step-desc">Work through Easy, Medium, and Advanced sections before the timer expires.</div>
          </div>
          <div className="step">
            <div className="step-num">04</div>
            <div className="step-icon">📡</div>
            <div className="step-title">Submit & Score</div>
            <div className="step-desc">Submit your answers. Results appear live on the leaderboard instantly.</div>
          </div>
        </div>
      </section>

      {/* ── Mock Leaderboard ── */}
      <section className="preview-section" id="leaderboard">
        <div className="section-heading">Live Leaderboard</div>
        <p className="section-subheading">Results update in real-time as teams submit. The Mind Flayer ranks all.</p>
        <div className="preview-card">
          <div className="preview-header">
            <div className="preview-header-title">🏆 Current Rankings</div>
            <div className="preview-header-live"><span className="live-dot" /> LIVE</div>
          </div>
          {[
            { rank: 1, cls: 'r1', name: 'Hawkins Heroes',     pct: 88, color: 'var(--red)',    tag: 'done' },
            { rank: 2, cls: 'r2', name: 'The Demogorgons',    pct: 74, color: 'var(--amber)',  tag: 'done' },
            { rank: 3, cls: 'r3', name: 'Upside Down Gang',   pct: 61, color: '#c07030',       tag: 'done' },
            { rank: 4, cls: 'rn', name: "Mind Flayer Fan Club", pct: 0, color:'var(--text-dim)',tag:'live' },
            { rank: 5, cls: 'rn', name: "Eleven's Army",      pct:  0, color:'var(--text-dim)',tag:'live' },
          ].map(row => (
            <div className="mock-row" key={row.rank}>
              <div className={`mock-rank ${row.cls}`}>{row.rank}</div>
              <div className="mock-name">{row.name}</div>
              <div className="mock-bar-wrap">
                <div className="mock-bar">
                  <div className="mock-bar-fill" style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
              <div className="mock-score" style={{ color: row.color }}>
                {row.pct > 0 ? `${row.pct}%` : '—'}
              </div>
              <div className={`mock-tag ${row.tag === 'done' ? 'tag-done' : 'tag-live'}`}>
                {row.tag === 'done' ? '✓ Done' : '● Active'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="final-cta">
        <div className="final-cta-title">Ready to Face<br />The Upside Down?</div>
        <p className="final-cta-sub">
          Your team awaits. The clock is ticking.<br />
          Don't let the Mind Flayer win.
        </p>
        <div className="cta-group">
          <button className="cta-btn cta-primary" onClick={onEnter}>⬡ &nbsp; Begin The Quiz</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        <div className="footer-logo">⬡ <span>HAWKINS</span> NATIONAL LABORATORY</div>
        <div className="footer-text">All activity monitored · Authorized personnel only · 1986</div>
        <div className="footer-links">
          <button className="footer-link" onClick={onEnter}>Enter Lab</button>
          {/* <a href="/chmod777" className="footer-link">Admin</a> */}
        </div>
      </footer>
    </div>
  );
}
