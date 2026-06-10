import React from 'react';
import './LandingScreen.css';

export default function LandingScreen({ teamData, onStart }) {
  const teamName = teamData?.teamName || '';

  return (
    <div className="landing-screen screen">
      <div className="team-greeting">Welcome back, {teamName}! 👋</div>

      <div className="st-title landing-title">
        The Quiz<br /><span>Awaits</span>
      </div>

      <p className="landing-sub">
        60 questions across three levels of the Upside Down. Your answers are saved to the server in real time —
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

      <button className="begin-btn" onClick={onStart}>
        ▶ &nbsp; ENTER THE GATE
      </button>
    </div>
  );
}
