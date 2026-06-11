import React, { useEffect, useRef } from 'react';

/*
 * VecnaTendrils
 * ─────────────
 * A full-screen canvas overlay that draws recursive cracking tendrils
 * growing outward from an origin point (the button), swallowing the screen,
 * then fading to black before calling onDone().
 *
 * Pure canvas — no CSS animations, no DOM spam, no memory leaks.
 * Canvas is removed from the DOM as soon as the sequence finishes.
 */

function drawTendrils(canvas, originX, originY, onDone) {
  const ctx    = canvas.getContext('2d');
  const W      = canvas.width;
  const H      = canvas.height;
  const START  = performance.now();

  // ── Tendril parameters ──────────────────────────────────────────────────
  const GROW_DURATION  = 1100; // ms for tendrils to spread
  const HOLD_DURATION  = 200;  // ms at full spread
  const FADE_DURATION  = 500;  // ms black fade-out
  const TOTAL          = GROW_DURATION + HOLD_DURATION + FADE_DURATION;

  // Pre-generate the tendril tree structure (deterministic, no per-frame rand)
  const rng = (() => { let s = 42; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }; })();

  function buildBranch(x, y, angle, length, depth) {
    if (depth === 0 || length < 6) return [];
    const segments = [];
    let cx = x, cy = y, a = angle;
    const steps = 5 + Math.floor(rng() * 4);
    const segLen = length / steps;

    for (let i = 0; i < steps; i++) {
      a += (rng() - 0.5) * 0.55; // organic wobble
      const nx = cx + Math.cos(a) * segLen;
      const ny = cy + Math.sin(a) * segLen;
      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, depth });
      cx = nx; cy = ny;

      // Spawn sub-branches
      if (i > 0 && rng() < 0.45) {
        const branchAngle = a + (rng() - 0.5) * 1.4;
        const branchLen   = length * (0.45 + rng() * 0.3);
        segments.push(...buildBranch(cx, cy, branchAngle, branchLen, depth - 1));
      }
    }
    return segments;
  }

  // Shoot primary arms in 8 directions + 4 diagonal extras
  const ARM_ANGLES = [
    0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75,
    Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75,
    Math.PI * 0.15, Math.PI * 0.6, Math.PI * 1.1, Math.PI * 1.65,
  ];
  const maxLen = Math.sqrt(W * W + H * H) * 0.68;

  const allSegments = [];
  ARM_ANGLES.forEach(angle => {
    const len = maxLen * (0.75 + rng() * 0.35);
    allSegments.push(...buildBranch(originX, originY, angle, len, 5));
  });

  // Assign each segment a "birth time" based on distance from origin
  const maxDist = Math.max(...allSegments.map(s =>
    Math.sqrt((s.x2 - originX) ** 2 + (s.y2 - originY) ** 2)
  ));
  allSegments.forEach(s => {
    const dist = Math.sqrt((s.x1 - originX) ** 2 + (s.y1 - originY) ** 2);
    s.t0 = (dist / maxDist) * GROW_DURATION * 0.9; // start growing at this ms
    s.t1 = s.t0 + GROW_DURATION * 0.18;             // fully drawn by this ms
  });

  // ── Render loop ──────────────────────────────────────────────────────────
  let rafId;

  function frame(now) {
    const elapsed = now - START;
    const t       = Math.min(elapsed, TOTAL);

    ctx.clearRect(0, 0, W, H);

    // Dark radial background that grows with the tendrils
    const bgProg = Math.min(elapsed / (GROW_DURATION + HOLD_DURATION), 1);
    const grad   = ctx.createRadialGradient(originX, originY, 0, originX, originY, maxLen * bgProg);
    grad.addColorStop(0,    `rgba(4, 0, 8, ${0.92 * bgProg})`);
    grad.addColorStop(0.6,  `rgba(2, 0, 4, ${0.7  * bgProg})`);
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Draw each segment up to its birth progress
    allSegments.forEach(seg => {
      const prog = Math.min(Math.max((elapsed - seg.t0) / (seg.t1 - seg.t0), 0), 1);
      if (prog <= 0) return;

      const ex = seg.x1 + (seg.x2 - seg.x1) * prog;
      const ey = seg.y1 + (seg.y2 - seg.y1) * prog;

      const alpha = 0.55 + (5 - seg.depth) * 0.09;
      const width = Math.max(0.4, seg.depth * 0.55);

      // Main tendril — dark reddish-black
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(30, 4, 4, ${alpha})`;
      ctx.lineWidth   = width + 1.5;
      ctx.lineCap     = 'round';
      ctx.stroke();

      // Inner glow — deep red
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(120, 10, 10, ${alpha * 0.6})`;
      ctx.lineWidth   = width;
      ctx.stroke();
    });

    // Spore dots at branch tips
    if (elapsed < GROW_DURATION + HOLD_DURATION) {
      allSegments.forEach(seg => {
        const prog = Math.min(Math.max((elapsed - seg.t0) / (seg.t1 - seg.t0), 0), 1);
        if (prog < 0.98 || seg.depth > 2) return;
        ctx.beginPath();
        ctx.arc(seg.x2, seg.y2, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(160, 20, 20, 0.7)';
        ctx.fill();
      });
    }

    // Final black swallow
    if (elapsed > GROW_DURATION + HOLD_DURATION) {
      const fadeProg = (elapsed - GROW_DURATION - HOLD_DURATION) / FADE_DURATION;
      ctx.fillStyle  = `rgba(0, 0, 0, ${Math.min(fadeProg, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (t < TOTAL) {
      rafId = requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }

  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}

export default function VecnaTendrils({ active, originX, originY, onDone }) {
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    cleanupRef.current = drawTendrils(canvas, originX, originY, onDone);
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, [active]); // eslint-disable-line

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        9999,
        pointerEvents: 'none',
        width:         '100vw',
        height:        '100vh',
      }}
    />
  );
}
