// Menus and overlay screens: title, how-to-play, pause, night cleared with upgrade cards,
// game over and dawn (victory). Each screen lays out buttons that scenes.js hit-tests.

import { BOAT_COLORS, FONT, PALETTE, VIEW } from './config.js';
import { nightCount } from './world.js';

const CX = VIEW.w / 2;

function text(ctx, str, x, y, { size = 16, color = PALETTE.text, align = 'center', weight = 'normal', glow = 0 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 9, 22, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

export function button(id, label, x, y, w = 240, h = 44, key = '') {
  return { id, label, x: x - w / 2, y, w, h, key };
}

export function hitButton(buttons, px, py) {
  return buttons.findIndex((b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
}

function drawButton(ctx, b, hovered) {
  ctx.fillStyle = hovered ? 'rgba(255, 216, 120, 0.22)' : 'rgba(14, 36, 69, 0.92)';
  ctx.strokeStyle = hovered ? PALETTE.lamp : PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.stroke();
  text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, { size: 18, weight: 'bold', color: hovered ? PALETTE.lampHot : PALETTE.text });
  if (b.key) text(ctx, b.key, b.x + b.w - 12, b.y + b.h / 2, { size: 11, color: PALETTE.dim, align: 'right' });
}

export function drawButtons(ctx, buttons, hover) {
  buttons.forEach((b, i) => drawButton(ctx, b, i === hover));
}

// ---------------------------------------------------------------- title

export function titleButtons() {
  return [button('start', 'Start Voyage', CX, 318, 260, 48, 'Enter'), button('howto', 'How to Play', CX, 378, 260, 44, 'H')];
}

export function drawTitle(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, 'rgba(4, 9, 22, 0.82)');
  g.addColorStop(0.6, 'rgba(4, 9, 22, 0.45)');
  g.addColorStop(1, 'rgba(4, 9, 22, 0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.letterSpacing = '14px';
  text(ctx, 'TIDELAMP', CX + 7, 150, { size: 86, weight: 'bold', color: PALETTE.lamp, glow: 28 });
  ctx.letterSpacing = '0px';
  text(ctx, 'Keep the light. Guide every lost boat home through the storm.', CX, 222, { size: 19, color: PALETTE.text });
  text(ctx, 'Five nights · three piers · one lamp', CX, 252, { size: 14, color: PALETTE.dim });
  drawButtons(ctx, game.buttons, game.hover);
  const blink = 0.55 + 0.45 * Math.sin(game.time * 3);
  text(ctx, 'Press ENTER or click to start', CX, 452, { size: 20, weight: 'bold', color: `rgba(255, 244, 207, ${blink.toFixed(3)})` });
  text(ctx, game.best > 0 ? `Best score  ${game.best.toLocaleString('en-US')}` : 'No voyages yet — set the first record', CX, 488, { size: 15, color: PALETTE.dim });
  text(ctx, `M: sound ${game.audio.muted ? 'off' : 'on'}`, VIEW.w - 20, VIEW.h - 18, { size: 12, color: PALETTE.dim, align: 'right' });
  if (game.showHowTo) drawHowTo(ctx);
}

export function drawHowTo(ctx) {
  veil(ctx, 0.6);
  panel(ctx, 150, 70, 660, 460);
  text(ctx, 'HOW TO KEEP THE LAMP', CX, 105, { size: 24, weight: 'bold', color: PALETTE.lamp });
  const lines = [
    ['Mouse', 'Aim the beam. Boats caught in it sail toward your cursor.'],
    ['Hold click / Shift', 'Focus: narrow beam, faster pull, burns oil quickly.'],
    ['Space / right-click', 'Foghorn: shoves nearby boats away from danger, calms whirlpools.'],
    ['A D / ← →, W S', 'Rotate and extend the beam from the keyboard.'],
    ['Piers', 'Dock a boat at the pier of its own color to grow your combo.'],
    ['Danger', 'Rocks, whirlpools, driftwood and the shore wreck boats.'],
    ['Lose', '3 wrecks sink the harbor; an empty oil lamp goes dark.'],
    ['Win', 'Bring each night\'s quota home for five nights to see dawn.'],
  ];
  lines.forEach(([k, v], i) => {
    text(ctx, k, 330, 158 + i * 40, { size: 15, weight: 'bold', color: PALETTE.lamp, align: 'right' });
    text(ctx, v, 348, 158 + i * 40, { size: 15, align: 'left' });
  });
  ['amber', 'teal', 'rose'].forEach((c, i) => {
    ctx.fillStyle = BOAT_COLORS[c];
    ctx.fillRect(CX - 75 + i * 55, 478, 40, 8);
  });
  text(ctx, 'Click or press H to close', CX, 508, { size: 13, color: PALETTE.dim });
}

// ---------------------------------------------------------------- pause

export function pauseButtons() {
  return [button('resume', 'Resume', CX, 250, 240, 44, 'Esc'), button('restart', 'Restart Voyage', CX, 306, 240, 44, 'R'), button('title', 'Title Screen', CX, 362, 240, 44, 'Q')];
}

export function drawPause(ctx, game) {
  veil(ctx, 0.55);
  text(ctx, 'PAUSED', CX, 190, { size: 44, weight: 'bold', color: PALETTE.lamp, glow: 16 });
  drawButtons(ctx, game.buttons, game.hover);
}

// ---------------------------------------------------------------- night cleared

export function upgradeCards(offer) {
  return offer.map((u, i) => ({ ...button(u.id, u.name, CX + (i - 1) * 230, 300, 210, 150, String(i + 1)), upgrade: u }));
}

function drawIcon(ctx, icon, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PALETTE.lamp;
  ctx.fillStyle = PALETTE.lamp;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (icon === 'cone') { ctx.moveTo(-16, 10); ctx.lineTo(16, -12); ctx.lineTo(16, 12); ctx.closePath(); ctx.fill(); }
  else if (icon === 'reach') { ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(10, -8); ctx.lineTo(18, 0); ctx.lineTo(10, 8); ctx.stroke(); }
  else if (icon === 'oil') { ctx.moveTo(0, -16); ctx.quadraticCurveTo(14, 4, 0, 14); ctx.quadraticCurveTo(-14, 4, 0, -16); ctx.fill(); }
  else if (icon === 'horn') { ctx.moveTo(-14, -5); ctx.lineTo(4, -14); ctx.lineTo(4, 14); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(8, 0, 10, -0.8, 0.8); ctx.stroke(); }
  else if (icon === 'hull') { ctx.moveTo(-16, -2); ctx.lineTo(16, -2); ctx.lineTo(10, 10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill(); }
  else if (icon === 'wick') { ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); } ctx.stroke(); }
  else { ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke(); }
  ctx.restore();
}

export function drawNightClear(ctx, game) {
  const run = game.run;
  veil(ctx, 0.5);
  text(ctx, `NIGHT ${run.nightIndex + 1} CLEARED`, CX, 110, { size: 40, weight: 'bold', color: PALETTE.good, glow: 14 });
  text(ctx, run.world.night.name, CX, 150, { size: 18, color: PALETTE.dim });
  const b = game.bonus;
  text(ctx, `Hull bonus +${b.lives}   ·   Oil bonus +${b.oil}   ·   Score ${run.score.toLocaleString('en-US')}`, CX, 196, { size: 17 });
  if (game.stateTime < 0.7) return;
  text(ctx, 'Choose a keeper\'s gift for the next night', CX, 262, { size: 18, color: PALETTE.lamp });
  game.buttons.forEach((card, i) => {
    const hovered = i === game.hover;
    ctx.fillStyle = hovered ? 'rgba(255, 216, 120, 0.2)' : PALETTE.panel;
    ctx.strokeStyle = hovered ? PALETTE.lamp : PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.w, card.h, 12);
    ctx.fill();
    ctx.stroke();
    drawIcon(ctx, card.upgrade.icon, card.x + card.w / 2, card.y + 38);
    text(ctx, card.upgrade.name, card.x + card.w / 2, card.y + 82, { size: 18, weight: 'bold' });
    text(ctx, card.upgrade.text, card.x + card.w / 2, card.y + 110, { size: 13, color: PALETTE.dim });
    text(ctx, `[${card.key}]`, card.x + card.w / 2, card.y + 135, { size: 12, color: PALETTE.lamp });
  });
}

// ---------------------------------------------------------------- game over and dawn

export function endButtons() {
  return [button('restart', 'Sail Again', CX - 130, 452, 230, 48, 'R'), button('title', 'Title Screen', CX + 130, 452, 230, 48, 'Esc')];
}

function drawResults(ctx, game, y) {
  const run = game.run;
  panel(ctx, CX - 250, y, 500, 170);
  text(ctx, run.score.toLocaleString('en-US'), CX, y + 42, { size: 44, weight: 'bold', color: PALETTE.lamp });
  text(ctx, game.newBest ? 'NEW BEST SCORE!' : `Best ${game.best.toLocaleString('en-US')}`, CX, y + 80, { size: 14, color: game.newBest ? PALETTE.good : PALETTE.dim, weight: 'bold' });
  const stats = [
    ['Nights', `${run.nightIndex + (game.state === 'victory' ? 1 : 0)} / ${nightCount()}`],
    ['Boats home', String(run.totalDelivered)],
    ['Right pier', String(run.matched)],
    ['Best combo', String(run.bestCombo)],
  ];
  stats.forEach(([k, v], i) => {
    const x = CX - 180 + i * 120;
    text(ctx, v, x, y + 118, { size: 20, weight: 'bold' });
    text(ctx, k, x, y + 142, { size: 12, color: PALETTE.dim });
  });
}

export function drawGameOver(ctx, game) {
  veil(ctx, 0.62);
  const headline = game.reason === 'lampOut' ? 'THE LAMP BURNED OUT' : 'THE HARBOR GOES DARK';
  const sub = game.reason === 'lampOut' ? 'Out of oil — the boats are lost in the night.' : 'Three boats wrecked on your watch.';
  text(ctx, headline, CX, 130, { size: 46, weight: 'bold', color: PALETTE.danger, glow: 18 });
  text(ctx, sub, CX, 178, { size: 18, color: PALETTE.dim });
  drawResults(ctx, game, 230);
  drawButtons(ctx, game.buttons, game.hover);
}

export function drawVictory(ctx, game) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, 'rgba(255, 170, 110, 0.55)');
  g.addColorStop(0.5, 'rgba(255, 120, 140, 0.3)');
  g.addColorStop(1, 'rgba(20, 30, 70, 0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'DAWN OVER THE HARBOR', CX, 130, { size: 46, weight: 'bold', color: PALETTE.lampHot, glow: 22 });
  text(ctx, 'Five nights kept. Every pier lit. The sea is calm.', CX, 178, { size: 18, color: PALETTE.text });
  drawResults(ctx, game, 230);
  drawButtons(ctx, game.buttons, game.hover);
}

export function drawBanner(ctx, banner) {
  if (!banner || banner.t <= 0) return;
  const a = Math.min(1, banner.t / 0.5, (banner.total - banner.t) / 0.3 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  text(ctx, banner.title, CX, 200, { size: 40, weight: 'bold', color: PALETTE.lamp, glow: 16 });
  text(ctx, banner.sub, CX, 240, { size: 18, color: PALETTE.text });
  ctx.restore();
}
