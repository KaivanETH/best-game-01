// Small geometry helpers shared by the simulation and the renderer.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a, b, t) => a + (b - a) * t;

export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

export function angleDiff(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function closestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}

export function distToSegment(px, py, ax, ay, bx, by) {
  const c = closestOnSegment(px, py, ax, ay, bx, by);
  return dist(px, py, c.x, c.y);
}
