// Boot: sizes the canvas, runs the fixed-step loop and exposes a small hook for screenshots.
// ?seed=N picks the sea; ?frozen stops the clock so window.tidelamp.advance(frames) drives it.

import { DEFAULT_SEED, FIXED_DT, VIEW } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createGame, drawGame, updateGame } from './scenes.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed')) || DEFAULT_SEED;
const frozen = params.has('frozen');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const game = createGame({ seed, persist: !frozen, audio });
let scale = 1;

function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.style.width = `${Math.floor(VIEW.w * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.h * scale)}px`;
  canvas.width = Math.floor(VIEW.w * scale * dpr);
  canvas.height = Math.floor(VIEW.h * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function step() {
  updateGame(game, input, FIXED_DT);
  input.endStep();
}

function render() {
  canvas.style.cursor = game.state === 'play' ? 'none' : 'default';
  drawGame(ctx, game);
}

let last = null;
let pending = 0;
function frame(now) {
  if (!frozen) {
    if (last !== null) pending += Math.min(0.1, (now - last) / 1000);
    while (pending >= FIXED_DT) {
      step();
      pending -= FIXED_DT;
    }
  }
  last = now;
  render();
  window.requestAnimationFrame(frame);
}

window.addEventListener('resize', fitCanvas);
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());
fitCanvas();
canvas.focus();
window.requestAnimationFrame(frame);

window.tidelamp = {
  game,
  advance(frames = 1) {
    for (let i = 0; i < frames; i++) step();
    render();
  },
  press(code) {
    input.press(code);
  },
  setAutoplay(on) {
    game.autoplay = !!on;
  },
  state: () => ({ state: game.state, score: game.run?.score ?? 0, night: (game.run?.nightIndex ?? 0) + 1 }),
};
