// The lighthouse beam: where it points, how wide it is, and which boats it lights.

import { LIGHTHOUSE } from './config.js';
import { angleDiff, clamp, TAU } from './mathutil.js';

export const MIN_REACH = 64;

export function createBeam() {
  return { angle: Math.PI / 2, reach: 180, focusX: LIGHTHOUSE.x, focusY: LIGHTHOUSE.y + 180, focused: false };
}

export function aimBeam(beam, cmd, stats) {
  const dx = cmd.aimX - LIGHTHOUSE.x;
  const dy = cmd.aimY - LIGHTHOUSE.y;
  if (dx * dx + dy * dy > 1) beam.angle = Math.atan2(dy, dx);
  beam.reach = clamp(Math.hypot(dx, dy), MIN_REACH, stats.beamLength);
  beam.focusX = LIGHTHOUSE.x + Math.cos(beam.angle) * beam.reach;
  beam.focusY = LIGHTHOUSE.y + Math.sin(beam.angle) * beam.reach;
  beam.focused = !!cmd.focus;
}

export function beamHalfAngle(beam, stats) {
  return beam.focused ? stats.beamHalfAngle * stats.focusNarrow : stats.beamHalfAngle;
}

export function isLit(beam, stats, x, y, radius = 0) {
  const dx = x - LIGHTHOUSE.x;
  const dy = y - LIGHTHOUSE.y;
  const d = Math.hypot(dx, dy);
  if (d < LIGHTHOUSE.radius || d > stats.beamLength + radius) return false;
  const slack = Math.atan2(radius, d);
  return Math.abs(angleDiff(beam.angle, Math.atan2(dy, dx))) <= beamHalfAngle(beam, stats) + slack;
}

export function beamArc(beam, stats, steps = 18) {
  const half = beamHalfAngle(beam, stats);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = beam.angle - half + (2 * half * i) / steps;
    pts.push({ x: LIGHTHOUSE.x + Math.cos(a) * stats.beamLength, y: LIGHTHOUSE.y + Math.sin(a) * stats.beamLength });
  }
  return pts;
}

export function normalizeAngle(a) {
  return ((a % TAU) + TAU) % TAU;
}
