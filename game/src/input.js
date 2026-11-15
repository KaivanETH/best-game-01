// Raw keyboard and mouse state, in the game's 960x600 coordinates.
// Presses and clicks are latched until the next fixed simulation step reads them.

import { VIEW } from './config.js';

const BLOCKED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const clicks = [];
  const pointer = { x: VIEW.w / 2, y: VIEW.h / 2, down: false, moved: false, rightClicked: false, inside: false };
  const listeners = [];

  const toView = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * VIEW.w;
    pointer.y = ((e.clientY - rect.top) / rect.height) * VIEW.h;
  };
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    listeners.push(() => target.removeEventListener(type, fn, opts));
  };

  on(window, 'keydown', (e) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
  });
  on(window, 'keyup', (e) => held.delete(e.code));
  on(window, 'blur', () => {
    held.clear();
    pointer.down = false;
  });
  on(canvas, 'pointermove', (e) => {
    toView(e);
    pointer.moved = true;
    pointer.inside = true;
  });
  on(canvas, 'pointerleave', () => { pointer.inside = false; });
  on(canvas, 'pointerdown', (e) => {
    toView(e);
    pointer.moved = true;
    canvas.focus();
    if (e.button === 2) {
      pointer.rightClicked = true;
      return;
    }
    if (e.button !== 0) return;
    pointer.down = true;
    clicks.push({ x: pointer.x, y: pointer.y });
  });
  on(window, 'pointerup', (e) => {
    if (e.button === 0) pointer.down = false;
  });
  on(canvas, 'contextmenu', (e) => e.preventDefault());

  return {
    pointer,
    isDown: (code) => held.has(code),
    wasPressed: (code) => pressed.has(code),
    anyPressed: (...codes) => codes.some((c) => pressed.has(c)),
    takeClick: () => clicks.shift() || null,
    takeRightClick: () => {
      const r = pointer.rightClicked;
      pointer.rightClicked = false;
      return r;
    },
    /** Forget latched presses and clicks, e.g. when a screen changes. */
    flush: () => {
      pressed.clear();
      clicks.length = 0;
      pointer.rightClicked = false;
    },
    /** Called after every simulation step. */
    endStep: () => {
      pressed.clear();
      clicks.length = 0;
      pointer.moved = false;
      pointer.rightClicked = false;
    },
    press: (code) => pressed.add(code),
    dispose: () => listeners.forEach((off) => off()),
  };
}
