// Lost boats: how they enter the harbor, wander in the dark, and follow the light.

import { BOAT_TYPES, VIEW } from './config.js';
import { angleDiff } from './mathutil.js';
import { applyWhirlpools, nearestHazard } from './hazards.js';

const COLORS = ['amber', 'teal', 'rose'];
const CAUTION_RANGE = 48;
const LIT_CAUTION = 0.5;
const TRAIL_LENGTH = 10;
const EDGE_MARGIN = 50;

export function spawnBoat(world, rng) {
  const type = rng.pick(world.night.types);
  const color = rng.pick(COLORS);
  const side = rng.next();
  let x;
  let y;
  if (side < 0.6) {
    x = rng.range(80, VIEW.w - 80);
    y = -18;
  } else if (side < 0.8) {
    x = -18;
    y = rng.range(50, 300);
  } else {
    x = VIEW.w + 18;
    y = rng.range(50, 300);
  }
  const tx = rng.range(220, VIEW.w - 220);
  const ty = rng.range(120, 260);
  const course = Math.atan2(ty - y, tx - x);
  const spec = BOAT_TYPES[type];
  return {
    id: world.nextBoatId++,
    type,
    color,
    radius: spec.radius,
    x,
    y,
    vx: Math.cos(course) * spec.speed * 0.5,
    vy: Math.sin(course) * spec.speed * 0.5,
    course,
    facing: course,
    wanderRate: 0,
    wanderTimer: rng.range(1, 2.5),
    entering: true,
    lit: false,
    lastLitAt: -10,
    trail: [],
    trailTimer: 0,
    bob: rng.range(0, 6.28),
  };
}

/** Sailors see danger close by and shy away; how well drops as the storms grow. */
function shyAway(boat, world, strength, scale) {
  const h = nearestHazard(world, boat.x, boat.y);
  if (h.gap >= CAUTION_RANGE) return [0, 0, 0];
  const fear = world.night.caution * scale * (1 - h.gap / CAUTION_RANGE);
  return [h.ax * strength * fear, h.ay * strength * fear, fear];
}

function desiredVelocity(boat, world, stats, current, dt) {
  const spec = BOAT_TYPES[boat.type];
  if (boat.entering) {
    const s = spec.speed * 0.6;
    return [Math.cos(boat.course) * s, Math.sin(boat.course) * s];
  }
  if (boat.lit) {
    const beam = world.beam;
    const dx = beam.focusX - boat.x;
    const dy = beam.focusY - boat.y;
    const d = Math.hypot(dx, dy) || 1;
    const s = spec.speed * stats.lureSpeed * (beam.focused ? stats.focusBoost : 1) * Math.min(1, d / 40);
    const [ax, ay] = shyAway(boat, world, s, LIT_CAUTION);
    return [(dx / d) * s + current[0] * 0.5 + ax, (dy / d) * s + current[1] * 0.5 + ay];
  }
  boat.wanderTimer -= dt;
  if (boat.wanderTimer <= 0) {
    boat.wanderRate = world.driftRng.range(-0.6, 0.6);
    boat.wanderTimer = world.driftRng.range(1.2, 2.8);
  }
  boat.course += boat.wanderRate * dt;
  let ex = 0;
  let ey = 0;
  if (boat.x < EDGE_MARGIN) ex = 1;
  else if (boat.x > VIEW.w - EDGE_MARGIN) ex = -1;
  if (boat.y < EDGE_MARGIN) ey = 1;
  if (ex || ey) boat.course += angleDiff(boat.course, Math.atan2(ey, ex)) * Math.min(1, 2.5 * dt);
  const cruise = spec.speed * 0.38;
  const [ax, ay, fear] = shyAway(boat, world, cruise * 1.6, 1);
  if (fear > 0) boat.course += angleDiff(boat.course, Math.atan2(ay, ax)) * Math.min(1, 3 * fear * dt);
  return [Math.cos(boat.course) * cruise + current[0] + ax, Math.sin(boat.course) * cruise + current[1] + ay];
}

export function steerBoat(boat, world, stats, dt) {
  const spec = BOAT_TYPES[boat.type];
  const current = world.calm > 0 ? [0, 0] : world.night.current;
  if (boat.wasLit && !boat.lit) boat.course = boat.facing;
  boat.wasLit = boat.lit;

  const [dvx, dvy] = desiredVelocity(boat, world, stats, current, dt);
  const k = Math.min(1, spec.turn * dt);
  boat.vx += (dvx - boat.vx) * k;
  boat.vy += (dvy - boat.vy) * k;
  if (!boat.entering) applyWhirlpools(world, boat, dt);

  boat.x += boat.vx * dt;
  boat.y += boat.vy * dt;

  const r = boat.radius;
  if (boat.entering) {
    if (boat.x > r && boat.x < VIEW.w - r && boat.y > r) boat.entering = false;
  } else {
    if (boat.x < r) { boat.x = r; boat.vx = Math.abs(boat.vx); }
    if (boat.x > VIEW.w - r) { boat.x = VIEW.w - r; boat.vx = -Math.abs(boat.vx); }
    if (boat.y < r) { boat.y = r; boat.vy = Math.abs(boat.vy); }
  }

  const speed = Math.hypot(boat.vx, boat.vy);
  if (speed > 3) boat.facing += angleDiff(boat.facing, Math.atan2(boat.vy, boat.vx)) * Math.min(1, 8 * dt);

  boat.trailTimer -= dt;
  if (boat.trailTimer <= 0) {
    boat.trail.unshift({ x: boat.x, y: boat.y });
    if (boat.trail.length > TRAIL_LENGTH) boat.trail.pop();
    boat.trailTimer = 0.08;
  }
}

export function separateBoats(boats) {
  for (let i = 0; i < boats.length; i++) {
    for (let j = i + 1; j < boats.length; j++) {
      const a = boats[i];
      const b = boats[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const overlap = a.radius + b.radius + 4 - d;
      if (overlap <= 0) continue;
      const push = overlap / 2;
      a.x -= (dx / d) * push;
      a.y -= (dy / d) * push;
      b.x += (dx / d) * push;
      b.y += (dy / d) * push;
    }
  }
}
