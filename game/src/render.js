// Draws the harbor at night: sea, shore and piers, the lighthouse islet, hazards, boats,
// and the darkness the lamp cuts through.

import { BOAT_COLORS, BOAT_TYPES, LIGHTHOUSE, PALETTE, PIER, PIERS, SHORE_Y, SPAWN_WARN, VIEW } from './config.js';
import { beamArc, beamHalfAngle, beamLength } from './beam.js';
import { logEnds } from './hazards.js';
import { createRng } from './rng.js';

const waveRng = createRng(99);
const WAVES = Array.from({ length: 70 }, () => ({ x: waveRng.range(0, VIEW.w), y: waveRng.range(0, SHORE_Y), len: waveRng.range(10, 26), phase: waveRng.range(0, 6.28) }));
const RAIN = Array.from({ length: 120 }, () => ({ x: waveRng.range(0, VIEW.w), y: waveRng.range(0, VIEW.h), speed: waveRng.range(500, 800) }));
const FOG_PUFFS = Array.from({ length: 16 }, () => ({ x: waveRng.range(0, VIEW.w + 300), y: waveRng.range(60, SHORE_Y), r: waveRng.range(90, 170), speed: waveRng.range(10, 24), phase: waveRng.range(0, 6.28) }));
let shade = null;

function drawSea(ctx, t, current) {
  const g = ctx.createLinearGradient(0, 0, 0, SHORE_Y);
  g.addColorStop(0, PALETTE.abyss);
  g.addColorStop(1, PALETTE.sea);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.strokeStyle = PALETTE.wave;
  ctx.lineWidth = 1.5;
  for (const w of WAVES) {
    const x = (((w.x + current[0] * t * 0.6) % VIEW.w) + VIEW.w) % VIEW.w;
    const y = (((w.y + current[1] * t * 0.6) % SHORE_Y) + SHORE_Y) % SHORE_Y;
    const lift = Math.sin(t * 1.6 + w.phase) * 2;
    ctx.beginPath();
    ctx.moveTo(x - w.len / 2, y + lift);
    ctx.quadraticCurveTo(x, y + lift - 4, x + w.len / 2, y + lift);
    ctx.stroke();
  }
}

function drawShore(ctx, t) {
  ctx.fillStyle = PALETTE.shoreRock;
  ctx.beginPath();
  ctx.moveTo(0, VIEW.h);
  for (let x = 0; x <= VIEW.w; x += 24) ctx.lineTo(x, SHORE_Y + 4 + Math.sin(x * 0.37) * 4);
  ctx.lineTo(VIEW.w, VIEW.h);
  ctx.fill();
  ctx.strokeStyle = 'rgba(215, 236, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= VIEW.w; x += 24) ctx.lineTo(x, SHORE_Y + Math.sin(x * 0.37) * 4 + Math.sin(t * 2 + x) * 1.5);
  ctx.stroke();
  for (const pier of PIERS) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(pier.x - PIER.halfWidth - 3, PIER.top - 2, PIER.halfWidth * 2 + 6, VIEW.h - PIER.top);
    ctx.fillStyle = PALETTE.wood;
    for (let y = PIER.top; y < VIEW.h; y += 9) ctx.fillRect(pier.x - PIER.halfWidth, y, PIER.halfWidth * 2, 7);
    ctx.fillStyle = BOAT_COLORS[pier.color];
    ctx.fillRect(pier.x - PIER.halfWidth - 3, PIER.top - 6, PIER.halfWidth * 2 + 6, 5);
    ctx.beginPath();
    ctx.arc(pier.x - PIER.halfWidth - 2, PIER.top - 10, 4, 0, Math.PI * 2);
    ctx.arc(pier.x + PIER.halfWidth + 2, PIER.top - 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIslet(ctx, t) {
  const { x, y, radius } = LIGHTHOUSE;
  ctx.fillStyle = PALETTE.rock;
  ctx.beginPath();
  ctx.arc(x, y + 4, radius + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(215, 236, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 4, radius + 5 + Math.sin(t * 2) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.rockLight;
  ctx.beginPath();
  ctx.arc(x - 6, y, radius - 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.tower;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.towerBand;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.lampHot;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.tilt);
  const n = rock.corners.length;
  const path = () => {
    ctx.beginPath();
    rock.corners.forEach((k, i) => {
      const a = (i / n) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rock.r * k, Math.sin(a) * rock.r * k);
    });
    ctx.closePath();
  };
  ctx.strokeStyle = 'rgba(215, 236, 255, 0.45)';
  ctx.lineWidth = 5;
  path();
  ctx.stroke();
  ctx.fillStyle = PALETTE.rock;
  path();
  ctx.fill();
  ctx.fillStyle = PALETTE.rockLight;
  ctx.beginPath();
  ctx.arc(-rock.r * 0.25, -rock.r * 0.25, rock.r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWhirlpool(ctx, pool) {
  ctx.save();
  ctx.translate(pool.x, pool.y);
  ctx.rotate(pool.spin);
  for (let arm = 0; arm < 4; arm++) {
    ctx.strokeStyle = `rgba(140, 200, 255, ${0.18 + arm * 0.05})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      const a = arm * (Math.PI / 2) + k * 4 * pool.dir;
      const r = pool.core + (pool.radius - pool.core) * (1 - k);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.abyss;
  ctx.beginPath();
  ctx.arc(0, 0, pool.core, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLog(ctx, log) {
  const e = logEnds(log);
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(e.ax, e.ay);
  ctx.lineTo(e.bx, e.by);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.wood;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawBoat(ctx, boat, t) {
  const spec = BOAT_TYPES[boat.type];
  const r = spec.radius;
  ctx.fillStyle = 'rgba(215, 236, 255, 0.25)';
  boat.trail.forEach((p, i) => {
    ctx.globalAlpha = 1 - i / boat.trail.length;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.35 + i * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.facing);
  const bob = 1 + Math.sin(t * 3 + boat.bob) * 0.04;
  ctx.scale(bob, bob);
  if (boat.lit) {
    ctx.strokeStyle = 'rgba(255, 230, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.1, r * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = spec.hull;
  ctx.strokeStyle = '#2b211b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 1.7, 0);
  ctx.quadraticCurveTo(r * 0.6, -r, -r * 1.2, -r * 0.75);
  ctx.lineTo(-r * 1.2, r * 0.75);
  ctx.quadraticCurveTo(r * 0.6, r, r * 1.7, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = BOAT_COLORS[boat.color];
  if (boat.type === 'trawler') ctx.fillRect(-r * 0.7, -r * 0.45, r * 1.1, r * 0.9);
  else {
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(-r * 0.6, -r * 0.6);
    ctx.lineTo(-r * 0.6, r * 0.6);
    ctx.fill();
  }
  ctx.restore();
}

function getShade() {
  if (!shade) {
    shade = document.createElement('canvas');
    shade.width = VIEW.w;
    shade.height = VIEW.h;
  }
  return shade;
}

function conePath(c, world, stats) {
  const arc = beamArc(world.beam, stats);
  c.beginPath();
  c.moveTo(LIGHTHOUSE.x, LIGHTHOUSE.y);
  for (const p of arc) c.lineTo(p.x, p.y);
  c.closePath();
}

function drawDarkness(ctx, world, stats, lampOn) {
  const s = getShade().getContext('2d');
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, VIEW.w, VIEW.h);
  s.fillStyle = `rgba(2, 6, 16, ${world.night.dark})`;
  s.fillRect(0, 0, VIEW.w, VIEW.h);
  s.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => {
    const g = s.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = g;
    s.fillRect(x - r, y - r, r * 2, r * 2);
  };
  if (lampOn) {
    const g = s.createRadialGradient(LIGHTHOUSE.x, LIGHTHOUSE.y, 20, LIGHTHOUSE.x, LIGHTHOUSE.y, beamLength(world.beam, stats));
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    s.fillStyle = g;
    conePath(s, world, stats);
    s.fill();
    hole(LIGHTHOUSE.x, LIGHTHOUSE.y, 90);
  }
  for (const boat of world.boats) hole(boat.x, boat.y, 26, 0.7);
  for (const pier of PIERS) hole(pier.x, PIER.top, 50, 0.8);
  ctx.drawImage(getShade(), 0, 0, VIEW.w, VIEW.h);

  if (!lampOn) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(LIGHTHOUSE.x, LIGHTHOUSE.y, 10, LIGHTHOUSE.x, LIGHTHOUSE.y, beamLength(world.beam, stats));
  const hot = world.beam.focused ? 0.34 : 0.22;
  glow.addColorStop(0, `rgba(255, 216, 120, ${hot})`);
  glow.addColorStop(1, 'rgba(255, 216, 120, 0)');
  ctx.fillStyle = glow;
  conePath(ctx, world, stats);
  ctx.fill();
  ctx.restore();
}

function drawReticle(ctx, world, t) {
  const b = world.beam;
  ctx.save();
  ctx.strokeStyle = b.focused ? PALETTE.lampHot : PALETTE.lamp;
  ctx.lineWidth = 2;
  const r = (b.focused ? 8 : 12) + Math.sin(t * 6) * 1.5;
  ctx.beginPath();
  ctx.arc(b.focusX, b.focusY, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + t;
    ctx.beginPath();
    ctx.moveTo(b.focusX + Math.cos(a) * (r + 3), b.focusY + Math.sin(a) * (r + 3));
    ctx.lineTo(b.focusX + Math.cos(a) * (r + 8), b.focusY + Math.sin(a) * (r + 8));
    ctx.stroke();
  }
  ctx.restore();
}

function drawRain(ctx, amount, t) {
  if (amount <= 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 210, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const n = Math.floor(RAIN.length * amount);
  for (let i = 0; i < n; i++) {
    const d = RAIN[i];
    const y = (d.y + t * d.speed) % VIEW.h;
    const x = (d.x - t * d.speed * 0.25 + VIEW.w * 4) % VIEW.w;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 14);
  }
  ctx.stroke();
  ctx.restore();
}

/** The fog bank: a cool veil plus soft banks drifting across the harbor, thick as world.fogLevel. */
function drawFog(ctx, level, t) {
  if (level <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(120, 140, 170, ${(0.07 * level).toFixed(3)})`;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const span = VIEW.w + 340;
  for (const p of FOG_PUFFS) {
    const x = ((p.x + t * p.speed) % span) - 170;
    const y = p.y + Math.sin(t * 0.4 + p.phase) * 10;
    // Stacked flat discs instead of a gradient: soft enough, and no dithering noise.
    ctx.fillStyle = `rgba(160, 178, 205, ${(0.045 * level).toFixed(3)})`;
    for (const k of [1, 0.72, 0.45]) {
      ctx.beginPath();
      ctx.ellipse(x, y, p.r * k, p.r * k * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Edge markers: a pulsing chevron where a boat is about to sail in, in its pier color. */
function drawIncoming(ctx, world, t) {
  for (const inc of world.incoming) {
    const b = inc.boat;
    const x = Math.min(Math.max(b.x, 18), VIEW.w - 18);
    const y = Math.min(Math.max(b.y, 62), SHORE_Y - 20);
    const grow = 1 - inc.warn / SPAWN_WARN;
    const pulse = 0.55 + 0.45 * Math.sin(t * 14);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(b.course);
    ctx.globalAlpha = (0.35 + 0.65 * grow) * pulse;
    ctx.fillStyle = BOAT_COLORS[b.color];
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const o = i * 9 - 4;
      ctx.beginPath();
      ctx.moveTo(o + 8, 0);
      ctx.lineTo(o - 4, -9);
      ctx.lineTo(o - 1, 0);
      ctx.lineTo(o - 4, 9);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawWorld(ctx, run, t, { reticle = false } = {}) {
  const world = run.world;
  drawSea(ctx, t, world.night.current);
  for (const pool of world.whirlpools) drawWhirlpool(ctx, pool);
  drawShore(ctx, t);
  for (const rock of world.rocks) drawRock(ctx, rock);
  for (const log of world.logs) drawLog(ctx, log);
  for (const boat of world.boats) drawBoat(ctx, boat, t);
  drawIslet(ctx, t);
  drawDarkness(ctx, world, run.stats, world.over !== 'lampOut');
  drawFog(ctx, world.fogLevel, t);
  drawRain(ctx, world.night.rain, t);
  drawIncoming(ctx, world, t);
  if (reticle) drawReticle(ctx, world, t);
}

export { beamHalfAngle };
