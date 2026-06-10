import React, { useState, useEffect } from 'react';
import './ResultsScreen.css';

function ScoreRing({ pct }) {
  const r            = 65;
  const circumference = 2 * Math.PI * r;
  const color        = pct >= 70 ? '#cc1111' : pct >= 45 ? '#d4780a' : '#8833bb';
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(circumference - (pct / 100) * circumference);
    }, 200);
    return () => clearTimeout(t);
  }, [pct, circumference]);

  return (
    <div className="score-ring">
      <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-90deg)' }}>
        <circle className="ring-bg" cx="80" cy="80" r={r} />
        <circle
          className="ring-fill"
          cx="80" cy="80" r={r}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-center">
        <div className="score-pct" style={{ color }}>{pct}%</div>
        <div className="score-lbl">Score</div>
      </div>
    </div>
  );
}

function outcomeTitle(pct) {
  if (pct >= 80) return 'YOU SURVIVED THE UPSIDE DOWN';
  if (pct >= 60) return 'CLOSE ENCOUNTER';
  if (pct >= 40) return 'THE DEMOGORGON ESCAPED';
  return 'CONSUMED BY THE SHADOW';
}

export default function ResultsScreen({ teamData, results, onReset }) {
  const { correct, wrong, skip, pct, eC, mC, hC, usedSeconds } = results;
  const teamName = teamData?.teamName || '';

  const uMin = Math.floor((usedSeconds || 0) / 60);
  const uSec = (usedSeconds || 0) % 60;

  // Animate section bars after mount
  const [barsVisible, setBarsVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="results-screen screen">
      <div className="result-header">
        <div className="result-team">{teamName ? `Team: ${teamName}` : ''}</div>
        <div className="st-title result-title">{outcomeTitle(pct)}</div>

        <ScoreRing pct={pct} />
      </div>

      {/* ── Stat cards ── */}
      <div className="result-cards">
        <div className="res-card">
          <div className="res-card-val" style={{ color: 'var(--red)' }}>{correct}</div>
          <div className="res-card-label">Correct</div>
        </div>
        <div className="res-card">
          <div className="res-card-val" style={{ color: '#ff6060' }}>{wrong}</div>
          <div className="res-card-label">Wrong</div>
        </div>
        <div className="res-card">
          <div className="res-card-val" style={{ color: 'var(--text-dim)' }}>{skip}</div>
          <div className="res-card-label">Skipped</div>
        </div>
        <div className="res-card">
          <div className="res-card-val" style={{ color: 'var(--amber)' }}>{uMin}m {uSec}s</div>
          <div className="res-card-label">Time Used</div>
        </div>
      </div>

      {/* ── Section breakdown ── */}
      <div className="section-breakdown">
        <div className="sec-res">
          <div className="sec-res-top">
            <span className="sec-res-title" style={{ color: 'var(--red)' }}>SECTION A · EASY</span>
            <span className="sec-res-score" style={{ color: 'var(--red)' }}>{eC}/15</span>
          </div>
          <div className="sec-bar">
            <div className="sec-bar-fill" style={{ background: 'var(--red)', width: barsVisible ? `${(eC/15)*100}%` : '0%' }} />
          </div>
        </div>
        <div className="sec-res">
          <div className="sec-res-top">
            <span className="sec-res-title" style={{ color: 'var(--amber)' }}>SECTION B · MODERATE</span>
            <span className="sec-res-score" style={{ color: 'var(--amber)' }}>{mC}/30</span>
          </div>
          <div className="sec-bar">
            <div className="sec-bar-fill" style={{ background: 'var(--amber)', width: barsVisible ? `${(mC/30)*100}%` : '0%' }} />
          </div>
        </div>
        <div className="sec-res">
          <div className="sec-res-top">
            <span className="sec-res-title" style={{ color: '#aa44cc' }}>SECTION C · ADVANCED</span>
            <span className="sec-res-score" style={{ color: '#aa44cc' }}>{hC}/15</span>
          </div>
          <div className="sec-bar">
            <div className="sec-bar-fill" style={{ background: '#aa44cc', width: barsVisible ? `${(hC/15)*100}%` : '0%' }} />
          </div>
        </div>
      </div>

      {/* ── Done message ── */}
      <div className="result-done-msg">
        <strong>Assessment Submitted Successfully</strong><br />
        Your results are stored on the server. The demogorgon has recorded your score. You may now close this window.
      </div>
    </div>
  );
}
