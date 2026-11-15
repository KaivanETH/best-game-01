// Player controls: turns mouse and keyboard into the world's command
// ({aimX, aimY, focus, horn}). The mouse aims directly; keys rotate and extend the aim.

import { LIGHTHOUSE } from './config.js';
import { clamp } from './mathutil.js';

const TURN_SPEED = 2.4;
const REACH_SPEED = 260;

export function createAim() {
  return { x: LIGHTHOUSE.x, y: LIGHTHOUSE.y + 170 };
}

export function readPlayerCommand(input, aim, dt) {
  if (input.pointer.moved) {
    aim.x = input.pointer.x;
    aim.y = input.pointer.y;
  }
  const turn = (input.isDown('ArrowRight') || input.isDown('KeyD') ? 1 : 0) - (input.isDown('ArrowLeft') || input.isDown('KeyA') ? 1 : 0);
  const extend = (input.isDown('ArrowUp') || input.isDown('KeyW') ? 1 : 0) - (input.isDown('ArrowDown') || input.isDown('KeyS') ? 1 : 0);
  if (turn || extend) {
    const dx = aim.x - LIGHTHOUSE.x;
    const dy = aim.y - LIGHTHOUSE.y;
    const angle = Math.atan2(dy, dx) + turn * TURN_SPEED * dt;
    const reach = clamp(Math.hypot(dx, dy) + extend * REACH_SPEED * dt, 70, 470);
    aim.x = LIGHTHOUSE.x + Math.cos(angle) * reach;
    aim.y = LIGHTHOUSE.y + Math.sin(angle) * reach;
  }
  const focus = input.pointer.down || input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const horn = input.wasPressed('Space') || input.takeRightClick();
  return { aimX: aim.x, aimY: aim.y, focus, horn };
}
