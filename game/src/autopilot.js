// A keeper that plays by itself: it drives the title-screen demo and can stand in for the
// player (window.tidelamp.setAutoplay) so screenshots and soak tests are reproducible.

import { LIGHTHOUSE, PIER, PIERS } from './config.js';
import { angleDiff, clamp, dist } from './mathutil.js';
import { beamHalfAngle } from './beam.js';
import { nearestHazard } from './hazards.js';

export function createAutopilot() {
  return { target: null, retarget: 0, aimX: LIGHTHOUSE.x, aimY: LIGHTHOUSE.y + 160, sweep: 0 };
}

function urgency(world, stats, boat) {
  if (boat.entering) return -1;
  const reach = dist(boat.x, boat.y, LIGHTHOUSE.x, LIGHTHOUSE.y);
  if (reach > stats.beamLength) return 0.001;
  const h = nearestHazard(world, boat.x, boat.y);
  return 1 / (Math.max(h.gap, 1) + 30) + (boat.lit ? 0.01 : 0);
}

function chooseTarget(pilot, world, stats) {
  let best = null;
  let bestScore = 0;
  for (const boat of world.boats) {
    let score = urgency(world, stats, boat);
    if (boat === pilot.target) score *= 1.6;
    if (score > bestScore) {
      bestScore = score;
      best = boat;
    }
  }
  pilot.target = best;
}

/** How risky it is to sail `len` along heading `a`: grows sharply as the path nears a hazard. */
function pathDanger(world, boat, a, len) {
  let danger = 0;
  for (let i = 1; i <= 4; i++) {
    const x = boat.x + Math.cos(a) * (len * i) / 4;
    const y = boat.y + Math.sin(a) * (len * i) / 4;
    const gap = nearestHazard(world, x, y).gap - boat.radius;
    if (gap < 26) danger += (26 - gap) * 0.5;
  }
  return danger;
}

function leadPoint(world, stats, boat) {
  const pier = PIERS.find((p) => p.color === boat.color);
  const goalX = pier.x;
  const goalY = PIER.top + 16;
  const toGoal = dist(boat.x, boat.y, goalX, goalY);
  if (toGoal < 90) return { x: goalX, y: goalY + 10, far: false };
  const direct = Math.atan2(goalY - boat.y, goalX - boat.x);
  let fx = boat.x;
  let fy = boat.y;
  let bestCost = Infinity;
  for (let k = -6; k <= 6; k++) {
    const a = direct + k * 0.26;
    const cost = Math.abs(k) * 0.4 + pathDanger(world, boat, a, 80);
    if (cost < bestCost) {
      bestCost = cost;
      fx = boat.x + Math.cos(a) * 80;
      fy = boat.y + Math.sin(a) * 80;
    }
  }
  const r = dist(fx, fy, LIGHTHOUSE.x, LIGHTHOUSE.y);
  if (r < 96) {
    fx = LIGHTHOUSE.x + ((fx - LIGHTHOUSE.x) / (r || 1)) * 96;
    fy = LIGHTHOUSE.y + ((fy - LIGHTHOUSE.y) / (r || 1)) * 96;
  }
  const aFocus = Math.atan2(fy - LIGHTHOUSE.y, fx - LIGHTHOUSE.x);
  const aBoat = Math.atan2(boat.y - LIGHTHOUSE.y, boat.x - LIGHTHOUSE.x);
  const off = angleDiff(aBoat, aFocus);
  const limit = beamHalfAngle(world.beam, stats) * 0.6;
  if (Math.abs(off) > limit) {
    const a = aBoat + Math.sign(off) * limit;
    const rr = clamp(dist(fx, fy, LIGHTHOUSE.x, LIGHTHOUSE.y), 96, stats.beamLength - 10);
    fx = LIGHTHOUSE.x + Math.cos(a) * rr;
    fy = LIGHTHOUSE.y + Math.sin(a) * rr;
  }
  return { x: fx, y: fy, far: toGoal > 160 };
}

export function autopilotCommand(pilot, run, dt) {
  const world = run.world;
  const stats = run.stats;
  pilot.retarget -= dt;
  if (!world.boats.includes(pilot.target) || pilot.retarget <= 0) {
    chooseTarget(pilot, world, stats);
    pilot.retarget = 1.2;
  }

  let wantX;
  let wantY;
  let focus = false;
  const boat = pilot.target;
  if (!boat) {
    pilot.sweep += dt * 0.6;
    wantX = LIGHTHOUSE.x + Math.cos(pilot.sweep - Math.PI / 2) * 240;
    wantY = LIGHTHOUSE.y + Math.sin(pilot.sweep - Math.PI / 2) * 240;
  } else if (!boat.lit) {
    wantX = boat.x;
    wantY = boat.y;
  } else {
    const lead = leadPoint(world, stats, boat);
    wantX = lead.x;
    wantY = lead.y;
    focus = lead.far && world.oil > stats.oilMax * 0.45;
  }

  const k = Math.min(1, dt * 9);
  pilot.aimX += (wantX - pilot.aimX) * k;
  pilot.aimY += (wantY - pilot.aimY) * k;

  let horn = false;
  if (world.hornCooldown <= 0) {
    horn = world.boats.some((b) => !b.entering && !b.lit && nearestHazard(world, b.x, b.y).gap < 16);
  }
  return { aimX: pilot.aimX, aimY: pilot.aimY, focus, horn };
}
