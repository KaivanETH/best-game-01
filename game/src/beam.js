// The lighthouse beam: where it points, how wide it is, and which boats it lights.
// The lamp housing is heavy: the beam swings toward the aim on a damped spring (BEAM_FEEL),
// so it sways a touch past fast flicks and settles. Fog (beam.angleMul / lengthMul) shrinks it.

import { BEAM_FEEL, LIGHTHOUSE } from './config.js';
import { angleDiff, clamp, TAU } from './mathutil.js';

export const MIN_REACH = 64;

export function createBeam() {
  return {
    angle: Math.PI / 2,
    spin: 0,
    reach: 180,
    focusX: LIGHTHOUSE.x,
    focusY: LIGHTHOUSE.y + 180,
    focused: false,
    angleMul: 1,
    lengthMul: 1,
  };
}

export function beamLength(beam, stats) {
  return stats.beamLength * beam.lengthMul;
}

export function aimBeam(beam, cmd, stats, dt) {
  const dx = cmd.aimX - LIGHTHOUSE.x;
  const dy = cmd.aimY - LIGHTHOUSE.y;
  if (dx * dx + dy * dy > 1) {
    const pull = angleDiff(beam.angle, Math.atan2(dy, dx));
    beam.spin += (pull * BEAM_FEEL.stiffness - beam.spin * BEAM_FEEL.damping) * dt;
  } else {
    beam.spin -= beam.spin * Math.min(1, BEAM_FEEL.damping * dt);
  }
  beam.angle = normalizeAngle(beam.angle + beam.spin * dt);
  const wantReach = clamp(Math.hypot(dx, dy), MIN_REACH, beamLength(beam, stats));
  beam.reach += (wantReach - beam.reach) * Math.min(1, BEAM_FEEL.reachFollow * dt);
  beam.reach = clamp(beam.reach, MIN_REACH, beamLength(beam, stats));
  beam.focusX = LIGHTHOUSE.x + Math.cos(beam.angle) * beam.reach;
  beam.focusY = LIGHTHOUSE.y + Math.sin(beam.angle) * beam.reach;
  beam.focused = !!cmd.focus;
}

export function beamHalfAngle(beam, stats) {
  const base = stats.beamHalfAngle * beam.angleMul;
  return beam.focused ? base * stats.focusNarrow : base;
}

export function isLit(beam, stats, x, y, radius = 0) {
  const dx = x - LIGHTHOUSE.x;
  const dy = y - LIGHTHOUSE.y;
  const d = Math.hypot(dx, dy);
  if (d < LIGHTHOUSE.radius || d > beamLength(beam, stats) + radius) return false;
  const slack = Math.atan2(radius, d);
  return Math.abs(angleDiff(beam.angle, Math.atan2(dy, dx))) <= beamHalfAngle(beam, stats) + slack;
}

export function beamArc(beam, stats, steps = 18) {
  const half = beamHalfAngle(beam, stats);
  const len = beamLength(beam, stats);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = beam.angle - half + (2 * half * i) / steps;
    pts.push({ x: LIGHTHOUSE.x + Math.cos(a) * len, y: LIGHTHOUSE.y + Math.sin(a) * len });
  }
  return pts;
}

export function normalizeAngle(a) {
  return ((a % TAU) + TAU) % TAU;
}
