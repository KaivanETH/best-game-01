// The game's screens as a state machine: title (with a self-playing demo), play, paused,
// nightClear (upgrade pick), gameOver and victory. Turns world events into sound and effects.

import { BOAT_COLORS, PALETTE, VIEW, LIGHTHOUSE } from './config.js';
import { createRun, startNight, updateWorld, isFinalNight } from './world.js';
import { createAutopilot, autopilotCommand } from './autopilot.js';
import { createAim, readPlayerCommand } from './controls.js';
import { applyUpgrade, offerUpgrades } from './upgrades.js';
import { nightBonus } from './scoring.js';
import { burst, clearFx, createFx, drawFlash, drawFx, flash, floatText, ring, shake, shakeOffset, updateFx } from './fx.js';
import { drawWorld } from './render.js';
import { drawControlsHint, drawHud } from './hud.js';
import * as ui from './ui.js';
import { loadBest, saveBest } from './storage.js';

const CRASH_WORDS = { rock: 'Wrecked on rocks!', islet: 'Hit the islet!', whirlpool: 'Swallowed!', log: 'Holed by driftwood!', shore: 'Ran aground!' };

export function createGame({ seed, persist, audio }) {
  const game = {
    seed, persist, audio,
    state: 'title', stateTime: 0, time: 0,
    run: null, aim: createAim(), pilot: createAutopilot(), autoplay: false,
    demo: null, demoPilot: createAutopilot(),
    fx: createFx(seed), best: loadBest(persist), newBest: false,
    showHowTo: false, buttons: [], hover: -1, offer: [], bonus: null, banner: null, reason: null, voyages: 0,
  };
  game.demo = createRun(seed + 1);
  game.demo.lives = 99;
  startNight(game.demo);
  setState(game, 'title');
  return game;
}

function setState(game, state, input) {
  game.state = state;
  game.stateTime = 0;
  game.hover = -1;
  if (input) input.flush();
  if (state === 'title') game.buttons = ui.titleButtons();
  else if (state === 'paused') game.buttons = ui.pauseButtons();
  else if (state === 'nightClear') game.buttons = ui.upgradeCards(game.offer);
  else if (state === 'gameOver' || state === 'victory') game.buttons = ui.endButtons();
  else game.buttons = [];
}

function nightBanner(game) {
  const night = game.run.world.night;
  game.banner = { title: `NIGHT ${game.run.nightIndex + 1} — ${night.name}`, sub: `Bring ${night.quota} boats home`, t: 2.6, total: 2.6 };
}

function startVoyage(game, input) {
  game.voyages += 1;
  game.run = createRun(game.seed + game.voyages * 101);
  startNight(game.run);
  game.aim = createAim();
  game.pilot = createAutopilot();
  game.newBest = false;
  clearFx(game.fx);
  nightBanner(game);
  setState(game, 'play', input);
}

function finishVoyage(game, state, input) {
  if (game.run.score > game.best) {
    game.best = game.run.score;
    game.newBest = true;
    saveBest(game.persist, game.best);
  }
  game.audio.play(state === 'victory' ? 'victory' : 'gameOver');
  setState(game, state, input);
}

function showEvents(game, events, audible) {
  const sfx = (name, arg) => audible && game.audio.play(name, arg);
  for (const e of events) {
    if (e.type === 'dock') {
      burst(game.fx, e.x, e.y, BOAT_COLORS[e.color], e.match ? 22 : 10);
      ring(game.fx, e.x, e.y, BOAT_COLORS[e.pier], 46);
      floatText(game.fx, e.x, e.y - 22, e.match ? `+${e.points}  ×${e.combo}` : `+${e.points} wrong pier`, e.match ? PALETTE.lampHot : PALETTE.dim, e.match ? 20 : 15);
      sfx(e.match ? 'dock' : 'wrongDock', e.combo);
    } else if (e.type === 'crash') {
      burst(game.fx, e.x, e.y, PALETTE.foam, 26, 140);
      ring(game.fx, e.x, e.y, PALETTE.danger, 50, 0.7, 4);
      floatText(game.fx, e.x, e.y - 20, CRASH_WORDS[e.cause] || 'Wrecked!', PALETTE.danger, 18);
      shake(game.fx, 9);
      flash(game.fx, PALETTE.danger, 0.18);
      sfx('crash');
    } else if (e.type === 'horn') {
      ring(game.fx, LIGHTHOUSE.x, LIGHTHOUSE.y, PALETTE.foam, 170, 1, 5);
      ring(game.fx, LIGHTHOUSE.x, LIGHTHOUSE.y, PALETTE.lamp, 120, 0.8, 3);
      shake(game.fx, 3);
      sfx('horn');
    } else if (e.type === 'catch') {
      ring(game.fx, e.x, e.y, PALETTE.lamp, 22, 0.4, 2);
      sfx('catch');
    } else if (e.type === 'spawn') {
      ring(game.fx, e.x, e.y, BOAT_COLORS[e.color], 30, 0.8, 2);
      sfx('spawn');
    } else if (e.type === 'lowOil') {
      floatText(game.fx, LIGHTHOUSE.x, LIGHTHOUSE.y - 50, 'Oil running low!', PALETTE.danger, 16);
      sfx('lowOil');
    } else if (e.type === 'hornDenied') {
      sfx('hornDenied');
    }
  }
}

function updateDemo(game, dt) {
  const demo = game.demo;
  const events = updateWorld(demo, autopilotCommand(game.demoPilot, demo, dt), dt);
  showEvents(game, events, false);
  if (demo.world.cleared || demo.world.over) {
    demo.nightIndex = (demo.nightIndex + 1) % 5;
    demo.lives = 99;
    startNight(demo);
  }
}

function pointerMenu(game, input) {
  game.hover = ui.hitButton(game.buttons, input.pointer.x, input.pointer.y);
  const click = input.takeClick();
  if (!click) return null;
  const i = ui.hitButton(game.buttons, click.x, click.y);
  if (i < 0) return null;
  game.audio.play('click');
  return game.buttons[i];
}

function updatePlay(game, input, dt) {
  if (input.anyPressed('Escape', 'KeyP')) {
    game.audio.play('click');
    setState(game, 'paused', input);
    return;
  }
  const run = game.run;
  const cmd = game.autoplay ? autopilotCommand(game.pilot, run, dt) : readPlayerCommand(input, game.aim, dt);
  const events = updateWorld(run, cmd, dt);
  showEvents(game, events, true);
  if (game.banner) game.banner.t -= dt;
  for (const e of events) {
    if (e.type === 'nightClear') {
      game.bonus = nightBonus(run);
      run.score += game.bonus.total;
      if (isFinalNight(run)) {
        finishVoyage(game, 'victory', input);
      } else {
        game.audio.play('nightClear');
        game.offer = offerUpgrades(run);
        setState(game, 'nightClear', input);
      }
      return;
    }
    if (e.type === 'wrecked' || e.type === 'lampOut') {
      game.reason = e.type;
      finishVoyage(game, 'gameOver', input);
      return;
    }
  }
}

function pickUpgrade(game, upgrade, input) {
  const run = game.run;
  applyUpgrade(run, upgrade);
  run.nightIndex += 1;
  startNight(run);
  nightBanner(game);
  setState(game, 'play', input);
}

export function updateGame(game, input, dt) {
  game.time += dt;
  game.stateTime += dt;
  if (input.wasPressed('KeyM')) game.audio.toggleMute();
  updateFx(game.fx, dt);

  if (game.state === 'title') {
    updateDemo(game, dt);
    if (game.showHowTo) {
      if (input.anyPressed('KeyH', 'Escape', 'Enter') || input.takeClick()) {
        game.showHowTo = false;
        input.flush();
      }
      return;
    }
    const b = pointerMenu(game, input);
    if (input.anyPressed('Enter', 'Space') || b?.id === 'start') startVoyage(game, input);
    else if (input.wasPressed('KeyH') || b?.id === 'howto') game.showHowTo = true;
  } else if (game.state === 'play') {
    updatePlay(game, input, dt);
  } else if (game.state === 'paused') {
    const b = pointerMenu(game, input);
    if (input.anyPressed('Escape', 'KeyP') || b?.id === 'resume') setState(game, 'play', input);
    else if (input.wasPressed('KeyR') || b?.id === 'restart') startVoyage(game, input);
    else if (input.wasPressed('KeyQ') || b?.id === 'title') setState(game, 'title', input);
  } else if (game.state === 'nightClear') {
    if (game.stateTime < 0.7) return;
    const b = pointerMenu(game, input);
    const keyed = ['Digit1', 'Digit2', 'Digit3'].findIndex((k) => input.wasPressed(k));
    const card = b || game.buttons[keyed] || (game.autoplay && game.stateTime > 1.5 ? game.buttons[0] : null);
    if (card) pickUpgrade(game, card.upgrade, input);
  } else if (game.state === 'gameOver' || game.state === 'victory') {
    if (game.stateTime < 0.6) return;
    const b = pointerMenu(game, input);
    if (input.anyPressed('KeyR', 'Enter') || b?.id === 'restart') startVoyage(game, input);
    else if (input.wasPressed('Escape') || b?.id === 'title') setState(game, 'title', input);
  }
}

export function drawGame(ctx, game) {
  const off = shakeOffset(game.fx);
  ctx.save();
  ctx.translate(off.x, off.y);
  const run = game.state === 'title' ? game.demo : game.run;
  drawWorld(ctx, run, game.time, { reticle: game.state === 'play' });
  drawFx(ctx, game.fx);
  ctx.restore();
  drawFlash(ctx, game.fx, VIEW.w, VIEW.h);

  if (game.state === 'title') {
    ui.drawTitle(ctx, game);
    return;
  }
  drawHud(ctx, game.run, game.time);
  if (game.state === 'play') {
    ui.drawBanner(ctx, game.banner);
    if (game.run.nightIndex === 0) drawControlsHint(ctx, Math.min(1, 12 - game.run.world.time));
  } else if (game.state === 'paused') ui.drawPause(ctx, game);
  else if (game.state === 'nightClear') ui.drawNightClear(ctx, game);
  else if (game.state === 'gameOver') ui.drawGameOver(ctx, game);
  else if (game.state === 'victory') ui.drawVictory(ctx, game);
}
