import React, { useEffect } from 'react';
import './LandingScreen.css';

export default function LandingScreen({ teamData, onStart }) {
  const teamName = teamData?.teamName || '';

  /* ── Stagger stat pills and sp-cards on mount ── */
  useEffect(() => {
    const els = document.querySelectorAll('.stat-pill, .sp-card');
    els.forEach((el, i) => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition = `opacity 0.45s ease ${0.1 + i * 0.1}s, transform 0.45s ease ${0.1 + i * 0.1}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }));
    });
  }, []);

  return (
    <div className="landing-screen screen tv-on">
      <div className="team-greeting typing-cursor">Welcome, {teamName}</div>

      <div className="st-title landing-title hero-entrance">
        The Gate<br /><span>Is Open</span>
      </div>

      <p className="landing-sub hero-entrance" style={{ animationDelay: '0.2s' }}>
        60 questions across three levels of the Upside Down. Your answers are saved in real time —
        a refresh will restore your progress. Stay focused. The Mind Flayer is watching.
      </p>

      <div className="stats-row">
        <div className="stat-pill">
          <span className="stat-icon">⏱</span>
          <div>
            <div className="stat-val">38:00</div>
            <div className="stat-label">Time Limit</div>
          </div>
        </div>
        <div className="stat-pill">
          <span className="stat-icon">📋</span>
          <div>
            <div className="stat-val">60</div>
            <div className="stat-label">Questions</div>
          </div>
        </div>
        <div className="stat-pill">
          <span className="stat-icon">🔀</span>
          <div>
            <div className="stat-val">Random</div>
            <div className="stat-label">Order</div>
          </div>
        </div>
      </div>

      <div className="section-preview">
        <div className="sp-card easy">
          <div className="sp-label">Section A</div>
          <div className="sp-count">15</div>
          <div className="sp-topics">UX Basics · Color · Typography · Design Process</div>
        </div>
        <div className="sp-card medium">
          <div className="sp-label">Section B</div>
          <div className="sp-count">30</div>
          <div className="sp-topics">Interaction · Research · IA · Accessibility · Systems</div>
        </div>
        <div className="sp-card hard">
          <div className="sp-label">Section C</div>
          <div className="sp-count">15</div>
          <div className="sp-topics">Advanced Methods · Strategy · Metrics · Governance</div>
        </div>
      </div>

      <button className="begin-btn btn-submit-pulse" onClick={onStart}>
        ▶ &nbsp; ENTER THE GATE
      </button>
    </div>
  );
}
