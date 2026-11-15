// Visual feedback: splashes, sparkles, expanding rings, floating score text and screen shake.
// Seeded so screenshots of the same moment always look the same.

import { createRng } from './rng.js';
import { FONT } from './config.js';

export function createFx(seed) {
  return { rng: createRng(seed ^ 0xf00d), parts: [], rings: [], texts: [], shake: 0, flash: 0, flashColor: '#ffffff' };
}

export function clearFx(fx) {
  fx.parts.length = 0;
  fx.rings.length = 0;
  fx.texts.length = 0;
  fx.shake = 0;
  fx.flash = 0;
}

export function burst(fx, x, y, color, count = 14, speed = 90) {
  for (let i = 0; i < count; i++) {
    const a = fx.rng.range(0, Math.PI * 2);
    const s = fx.rng.range(speed * 0.3, speed);
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: fx.rng.range(0.4, 0.9), age: 0, size: fx.rng.range(1.5, 3.5), color });
  }
}

export function ring(fx, x, y, color, maxR = 40, life = 0.6, width = 3) {
  fx.rings.push({ x, y, color, maxR, life, width, age: 0 });
}

export function floatText(fx, x, y, text, color, size = 18) {
  fx.texts.push({ x, y, text, color, size, age: 0, life: 1.2 });
}

export function shake(fx, amount) {
  fx.shake = Math.max(fx.shake, amount);
}

export function flash(fx, color, alpha) {
  fx.flashColor = color;
  fx.flash = Math.max(fx.flash, alpha);
}

export function shakeOffset(fx) {
  if (fx.shake <= 0.1) return { x: 0, y: 0 };
  return { x: fx.rng.range(-fx.shake, fx.shake), y: fx.rng.range(-fx.shake, fx.shake) };
}

export function updateFx(fx, dt) {
  for (const p of fx.parts) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.5 * dt;
    p.vy *= 1 - 2.5 * dt;
  }
  for (const r of fx.rings) r.age += dt;
  for (const t of fx.texts) {
    t.age += dt;
    t.y -= 28 * dt;
  }
  fx.parts = fx.parts.filter((p) => p.age < p.life);
  fx.rings = fx.rings.filter((r) => r.age < r.life);
  fx.texts = fx.texts.filter((t) => t.age < t.life);
  fx.shake = Math.max(0, fx.shake - 30 * dt);
  fx.flash = Math.max(0, fx.flash - 1.8 * dt);
}

export function drawFx(ctx, fx) {
  ctx.save();
  for (const r of fx.rings) {
    const k = r.age / r.life;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width * (1 - k) + 0.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.maxR * k + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const p of fx.parts) {
    ctx.globalAlpha = 1 - p.age / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.min(1, 2.5 * (1 - t.age / t.life));
    ctx.font = `bold ${t.size}px ${FONT}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(6, 13, 29, 0.85)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

export function drawFlash(ctx, fx, w, h) {
  if (fx.flash <= 0) return;
  ctx.save();
  ctx.globalAlpha = fx.flash;
  ctx.fillStyle = fx.flashColor;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
