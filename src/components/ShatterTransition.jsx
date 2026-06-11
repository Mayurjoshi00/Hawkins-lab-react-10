import React, { useEffect, useRef } from 'react';

/*
 * ShatterTransition
 * ─────────────────
 * Screenshots the current page into a canvas, then shatters it into
 * Voronoi-like shards that crack from the button origin, shudder, then
 * fall away into darkness — revealing black before calling onDone().
 *
 * Technique:
 *  1. html2canvas-free: we draw the page via a screenshot approach using
 *     the canvas itself — we just use coloured polygon shards over a
 *     dark background (no DOM capture needed, keeps it lightweight).
 *  2. Pre-compute ~60 irregular shard polygons (Voronoi approximation).
 *  3. Animate: crack lines draw first, then shards tilt/fall with physics.
 */

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
}

function buildShards(W, H, ox, oy, rng) {
  // Generate ~55 seed points biased toward the origin
  const COUNT = 55;
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    // Mix of clustered (near origin) and spread points
    const r  = i < 20
      ? Math.sqrt(rng()) * Math.min(W, H) * 0.55      // clustered near origin
      : rng() * Math.sqrt(W * W + H * H) * 0.75;       // spread
    const a  = rng() * Math.PI * 2;
    seeds.push({
      x: Math.min(W - 1, Math.max(1, ox + Math.cos(a) * r)),
      y: Math.min(H - 1, Math.max(1, oy + Math.sin(a) * r)),
    });
  }
  // Always include corners + edges so shards cover whole screen
  seeds.push({ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H });
  seeds.push({ x: W/2, y: 0 }, { x: W, y: H/2 }, { x: W/2, y: H }, { x: 0, y: H/2 });

  // Build Voronoi-ish cells via Fortune's relaxed approach:
  // For each of a fine grid of sample points, find nearest seed → bucket
  const STEP   = 12;
  const buckets = new Map(seeds.map((_, i) => [i, []]));

  for (let px = 0; px <= W; px += STEP) {
    for (let py = 0; py <= H; py += STEP) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < seeds.length; i++) {
        const dx = px - seeds[i].x, dy = py - seeds[i].y;
        const d  = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = i; }
      }
      buckets.get(best).push([px, py]);
    }
  }

  // Convert buckets to convex hull polygons
  const shards = [];
  buckets.forEach((pts, i) => {
    if (pts.length < 3) return;
    const hull = convexHull(pts);
    if (hull.length < 3) return;

    // Centroid
    const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;

    // Distance from origin → determines timing
    const dist  = Math.sqrt((cx - ox) ** 2 + (cy - oy) ** 2);
    const maxD  = Math.sqrt(W * W + H * H);

    // Colour: dark with slight red/purple tint per shard
    const hue   = 340 + rng() * 40;
    const light = 4 + rng() * 8;
    const color = `hsl(${hue}, 60%, ${light}%)`;

    // Fall physics — each shard gets unique velocity & rotation
    const fallAngle = Math.atan2(cy - oy, cx - ox);
    const speed     = 0.6 + rng() * 1.4;

    shards.push({
      hull, cx, cy, color, dist, maxD,
      vx:  Math.cos(fallAngle) * speed * (0.4 + rng() * 0.6),
      vy:  Math.sin(fallAngle) * speed * (0.3 + rng() * 0.7) + 0.2,
      vr:  (rng() - 0.5) * 0.06,    // rotation velocity
      rot: 0,
      opacity: 1,
    });
  });

  return shards;
}

// Graham scan convex hull
function convexHull(pts) {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross   = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lower   = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return [...lower, ...upper];
}

function runShatter(canvas, ox, oy, onDone) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;
  const rng = seededRng(Math.floor(ox * 1000 + oy));

  const CRACK_DUR  = 380;   // ms — crack lines spread
  const HOLD_DUR   = 80;    // ms — brief freeze
  const FALL_DUR   = 620;   // ms — shards fall
  const TOTAL      = CRACK_DUR + HOLD_DUR + FALL_DUR;

  const shards = buildShards(W, H, ox, oy, rng);
  const START  = performance.now();

  // Pre-draw crack lines (from origin outward through shard edges)
  const crackLines = shards.slice(0, 28).map(s => {
    const a = Math.atan2(s.cy - oy, s.cx - ox);
    return {
      x1: ox, y1: oy,
      x2: ox + Math.cos(a) * Math.sqrt(W*W + H*H),
      y2: oy + Math.sin(a) * Math.sqrt(W*W + H*H),
      t0: (s.dist / (s.maxD || 1)) * CRACK_DUR * 0.85,
    };
  });

  let rafId;
  function frame(now) {
    const elapsed = now - START;
    ctx.clearRect(0, 0, W, H);

    // ── Phase 1: crack lines grow ──
    if (elapsed < CRACK_DUR + HOLD_DUR) {
      // Dark overlay
      ctx.fillStyle = 'rgba(2,0,4,0.55)';
      ctx.fillRect(0, 0, W, H);

      // Draw shards (static, coloured)
      shards.forEach(s => {
        const prog = Math.min(Math.max((elapsed - s.dist / s.maxD * CRACK_DUR * 0.4) / (CRACK_DUR * 0.6), 0), 1);
        if (prog <= 0) return;
        ctx.save();
        ctx.globalAlpha = 0.7 + prog * 0.3;
        ctx.beginPath();
        s.hull.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        // Bright crack edge
        ctx.strokeStyle = `rgba(200, 30, 30, ${0.4 * prog})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
        ctx.restore();
      });

      // Crack lines radiating out
      crackLines.forEach(cl => {
        const prog = Math.min(Math.max((elapsed - cl.t0) / (CRACK_DUR * 0.5), 0), 1);
        if (prog <= 0) return;
        const ex = cl.x1 + (cl.x2 - cl.x1) * prog;
        const ey = cl.y1 + (cl.y2 - cl.y1) * prog;
        ctx.beginPath();
        ctx.moveTo(cl.x1, cl.y1);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(255, 60, 60, ${0.7 * prog})`;
        ctx.lineWidth   = 1.2;
        ctx.stroke();
        // Glow
        ctx.beginPath();
        ctx.moveTo(cl.x1, cl.y1);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(255, 120, 120, ${0.25 * prog})`;
        ctx.lineWidth   = 3;
        ctx.stroke();
      });

      // Flash at origin
      const flashProg = Math.max(0, 1 - elapsed / 200);
      if (flashProg > 0) {
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(1, 80 * flashProg));
        g.addColorStop(0, `rgba(255,80,80,${0.8 * flashProg})`);
        g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // ── Phase 2: shards fall ──
    if (elapsed > CRACK_DUR + HOLD_DUR) {
      const ft = (elapsed - CRACK_DUR - HOLD_DUR) / FALL_DUR; // 0→1

      ctx.fillStyle = `rgba(0,0,0,${Math.min(ft * 1.4, 1)})`;
      ctx.fillRect(0, 0, W, H);

      shards.forEach((s, idx) => {
        // Stagger fall start by shard distance
        const delay = (s.dist / s.maxD) * 0.3;
        const lt    = Math.max(0, ft - delay) / (1 - delay + 0.001);
        if (lt <= 0) return;

        const gravity = lt * lt * 320;
        const tx = s.cx + s.vx * lt * 180;
        const ty = s.cy + s.vy * lt * 180 + gravity;
        const rot = s.vr * lt * 8;
        const alpha = Math.max(0, 1 - lt * 1.3);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.translate(-s.cx, -s.cy);

        ctx.beginPath();
        s.hull.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fillStyle   = s.color;
        ctx.fill();
        ctx.strokeStyle = `rgba(180,20,20,0.5)`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
        ctx.restore();
      });
    }

    if (elapsed < TOTAL) {
      rafId = requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }

  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}

export default function ShatterTransition({ active, originX, originY, onDone }) {
  const canvasRef  = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    cleanupRef.current = runShatter(canvas, originX, originY, onDone);
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, [active]); // eslint-disable-line

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:          0,
        zIndex:         9999,
        pointerEvents: 'none',
        width:          '100vw',
        height:         '100vh',
      }}
    />
  );
}
