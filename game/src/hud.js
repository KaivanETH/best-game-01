// The in-play HUD: night, boats home against the quota, score and combo, lives, oil and foghorn.

import { BOAT_COLORS, FONT, PALETTE, VIEW } from './config.js';
import { comboMultiplier } from './scoring.js';
import { nightCount } from './world.js';

const BAR_H = 46;

function label(ctx, text, x, y, color = PALETTE.dim, size = 10, align = 'left') {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function meter(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
  ctx.fill();
}

function hullIcon(ctx, x, y, alive) {
  ctx.fillStyle = alive ? PALETTE.text : 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 3);
  ctx.lineTo(x + 9, y - 3);
  ctx.lineTo(x + 5, y + 4);
  ctx.lineTo(x - 5, y + 4);
  ctx.fill();
  if (alive) {
    ctx.fillStyle = BOAT_COLORS.amber;
    ctx.beginPath();
    ctx.moveTo(x, y - 13);
    ctx.lineTo(x, y - 4);
    ctx.lineTo(x + 7, y - 4);
    ctx.fill();
  }
}

export function drawHud(ctx, run, t) {
  const world = run.world;
  const stats = run.stats;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.w, BAR_H);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, BAR_H, VIEW.w, 1);

  label(ctx, `NIGHT ${run.nightIndex + 1} / ${nightCount()}`, 16, 18);
  label(ctx, world.night.name, 16, 37, PALETTE.text, 16);

  label(ctx, 'BOATS HOME', 180, 18);
  label(ctx, `${Math.min(world.delivered, world.night.quota)} / ${world.night.quota}`, 380, 18, PALETTE.text, 12, 'right');
  meter(ctx, 180, 26, 200, 10, world.delivered / world.night.quota, PALETTE.good);

  label(ctx, 'SCORE', VIEW.w / 2, 15, PALETTE.dim, 10, 'center');
  label(ctx, run.score.toLocaleString('en-US'), VIEW.w / 2, 39, PALETTE.lamp, 24, 'center');
  if (run.combo > 1) label(ctx, `COMBO ×${comboMultiplier(run.combo).toFixed(1)}`, VIEW.w / 2 + 62, 37, BOAT_COLORS.amber, 12);

  label(ctx, 'HULLS', 640, 18);
  for (let i = 0; i < stats.maxLives; i++) {
    if (i >= 3 && i >= run.lives) continue;
    hullIcon(ctx, 650 + i * 22, 36, i < run.lives);
  }

  const oilFrac = world.oil / stats.oilMax;
  const low = oilFrac < 0.25;
  label(ctx, 'LAMP OIL', 772, 18, low && Math.sin(t * 10) > 0 ? PALETTE.danger : PALETTE.dim);
  meter(ctx, 772, 26, 96, 10, oilFrac, low ? PALETTE.danger : PALETTE.lamp);

  const ready = world.hornCooldown <= 0;
  const cx = 914;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, 23, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = ready ? PALETTE.good : PALETTE.dim;
  ctx.beginPath();
  ctx.arc(cx, 23, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - world.hornCooldown / stats.hornCooldown));
  ctx.stroke();
  label(ctx, 'HORN', cx, 26, ready ? PALETTE.good : PALETTE.dim, 7, 'center');
  ctx.restore();
}

export function drawControlsHint(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(6, 13, 29, 0.7)';
  ctx.fillRect(VIEW.w / 2 - 330, VIEW.h - 30, 660, 22);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Mouse: aim the beam  ·  Hold click / Shift: focus  ·  Space / right-click: foghorn  ·  Esc: pause', VIEW.w / 2, VIEW.h - 14);
  ctx.restore();
}
