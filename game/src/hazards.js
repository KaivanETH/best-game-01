// Rocks, whirlpools and driftwood: where each night places them, how they move,
// and how close a boat is to being wrecked by one.

import { LIGHTHOUSE, PIERS, PIER, SHORE_Y, VIEW } from './config.js';
import { closestOnSegment, dist, TAU } from './mathutil.js';

const inPierLane = (x, y) => y > 400 && PIERS.some((p) => Math.abs(x - p.x) < 64);
const clearOf = (x, y, list, gap) => list.every((o) => dist(x, y, o.x, o.y) > gap);

export function placeRocks(rng, count) {
  const rocks = [];
  for (let tries = 0; rocks.length < count && tries < 600; tries++) {
    const r = rng.range(14, 24);
    const x = rng.range(70, VIEW.w - 70);
    const y = rng.range(90, SHORE_Y - 80);
    if (dist(x, y, LIGHTHOUSE.x, LIGHTHOUSE.y) < LIGHTHOUSE.radius + r + 76) continue;
    if (inPierLane(x, y) || !clearOf(x, y, rocks, r + 84)) continue;
    const corners = [];
    const n = rng.int(7, 10);
    for (let i = 0; i < n; i++) corners.push(rng.range(0.74, 1.14));
    rocks.push({ x, y, r, corners, tilt: rng.range(0, TAU) });
  }
  return rocks;
}

export function placeWhirlpools(rng, count, rocks) {
  const pools = [];
  for (let tries = 0; pools.length < count && tries < 600; tries++) {
    const x = rng.range(130, VIEW.w - 130);
    const y = rng.range(130, SHORE_Y - 130);
    if (dist(x, y, LIGHTHOUSE.x, LIGHTHOUSE.y) < 190) continue;
    if (!clearOf(x, y, rocks, 100) || !clearOf(x, y, pools, 240)) continue;
    pools.push({ x, y, radius: 88, core: 13, spin: rng.range(0, TAU), dir: rng.chance(0.5) ? 1 : -1 });
  }
  return pools;
}

export function placeLogs(rng, count) {
  const logs = [];
  for (let tries = 0; logs.length < count && tries < 400; tries++) {
    const y = rng.range(120, SHORE_Y - 90);
    if (Math.abs(y - LIGHTHOUSE.y) < 70 || logs.some((l) => Math.abs(l.y - y) < 70)) continue;
    const dir = rng.chance(0.5) ? 1 : -1;
    logs.push({ x: rng.range(0, VIEW.w), y, len: rng.range(58, 82), tilt: rng.range(-0.35, 0.35), speed: rng.range(26, 42) * dir, roll: rng.range(0, TAU) });
  }
  return logs;
}

export function logEnds(log) {
  const hx = (Math.cos(log.tilt) * log.len) / 2;
  const hy = (Math.sin(log.tilt) * log.len) / 2;
  return { ax: log.x - hx, ay: log.y - hy, bx: log.x + hx, by: log.y + hy };
}

export function updateHazards(world, dt) {
  for (const pool of world.whirlpools) pool.spin += pool.dir * dt * (world.calm > 0 ? 0.6 : 2.2);
  for (const log of world.logs) {
    log.x += log.speed * dt;
    log.roll += dt;
    if (log.speed > 0 && log.x - log.len > VIEW.w + 20) log.x = -log.len - 20;
    if (log.speed < 0 && log.x + log.len < -20) log.x = VIEW.w + log.len + 20;
  }
}

export function applyWhirlpools(world, boat, dt) {
  if (world.calm > 0) return;
  for (const pool of world.whirlpools) {
    const dx = pool.x - boat.x;
    const dy = pool.y - boat.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > pool.radius) continue;
    const grip = 1 - d / pool.radius;
    const pull = 30 + 120 * grip;
    const swirl = 70 * grip * pool.dir;
    boat.vx += ((dx / d) * pull - (dy / d) * swirl) * dt;
    boat.vy += ((dy / d) * pull + (dx / d) * swirl) * dt;
  }
}

/** The closest danger to a point: how far its edge is and a unit vector pointing away from it. */
export function nearestHazard(world, x, y) {
  let best = { gap: Infinity, ax: 0, ay: -1, kind: null };
  const consider = (gap, fromX, fromY, kind) => {
    if (gap >= best.gap) return;
    const dx = x - fromX;
    const dy = y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    best = { gap, ax: dx / d, ay: dy / d, kind };
  };
  for (const rock of world.rocks) consider(dist(x, y, rock.x, rock.y) - rock.r, rock.x, rock.y, 'rock');
  consider(dist(x, y, LIGHTHOUSE.x, LIGHTHOUSE.y) - LIGHTHOUSE.radius, LIGHTHOUSE.x, LIGHTHOUSE.y, 'islet');
  if (world.calm <= 0) {
    for (const pool of world.whirlpools) consider(dist(x, y, pool.x, pool.y) - pool.radius * 0.45, pool.x, pool.y, 'whirlpool');
  }
  for (const log of world.logs) {
    const e = logEnds(log);
    const c = closestOnSegment(x, y, e.ax, e.ay, e.bx, e.by);
    consider(dist(x, y, c.x, c.y) - 5, c.x, c.y, 'log');
  }
  const atPier = PIERS.some((p) => Math.abs(x - p.x) < PIER.dockHalfWidth);
  if (!atPier && SHORE_Y - y < best.gap) best = { gap: SHORE_Y - y, ax: 0, ay: -1, kind: 'shore' };
  return best;
}

/** What wrecks this boat right now, or null. Shore and piers are checked by the world. */
export function hazardHit(world, boat) {
  const reach = boat.radius * 0.8;
  for (const rock of world.rocks) if (dist(boat.x, boat.y, rock.x, rock.y) < rock.r + reach) return 'rock';
  if (dist(boat.x, boat.y, LIGHTHOUSE.x, LIGHTHOUSE.y) < LIGHTHOUSE.radius + reach) return 'islet';
  for (const pool of world.whirlpools) if (dist(boat.x, boat.y, pool.x, pool.y) < pool.core + reach) return 'whirlpool';
  for (const log of world.logs) {
    const e = logEnds(log);
    const c = closestOnSegment(boat.x, boat.y, e.ax, e.ay, e.bx, e.by);
    if (dist(boat.x, boat.y, c.x, c.y) < 5 + reach) return 'log';
  }
  return null;
}
