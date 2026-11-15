// One voyage: the run across five nights, and the fixed-step simulation of a single night.
// Pure logic: it takes a command ({aimX, aimY, focus, horn}) and returns events for the
// scenes to turn into sound, particles and screens.

import { BASE_STATS, FOG, LIGHTHOUSE, NIGHTS, PIER, PIERS, SHORE_Y, SPAWN_WARN, START_LIVES } from './config.js';
import { createRng, mixSeed } from './rng.js';
import { aimBeam, createBeam, isLit } from './beam.js';
import { hazardHit, nearestHazard, placeLogs, placeRocks, placeWhirlpools, updateHazards } from './hazards.js';
import { separateBoats, spawnBoat, steerBoat } from './boats.js';
import { scoreDock } from './scoring.js';

const HORN_RANGE = 150;

export function createRun(seed) {
  return {
    seed,
    rng: createRng(mixSeed(seed, 77)),
    stats: { ...BASE_STATS },
    lives: START_LIVES,
    score: 0,
    combo: 0,
    bestCombo: 0,
    matched: 0,
    crashes: 0,
    totalDelivered: 0,
    nightIndex: 0,
    upgrades: [],
    time: 0,
    world: null,
  };
}

export function startNight(run) {
  const night = NIGHTS[run.nightIndex];
  const layoutRng = createRng(mixSeed(run.seed, run.nightIndex, 1));
  const rocks = placeRocks(layoutRng, night.rocks);
  const whirlpools = placeWhirlpools(layoutRng, night.whirlpools, rocks);
  const logs = placeLogs(layoutRng, night.logs);
  run.combo = run.stats.keepCombo ? run.combo : 0;
  run.world = {
    night,
    rocks,
    whirlpools,
    logs,
    boats: [],
    beam: createBeam(),
    spawnRng: createRng(mixSeed(run.seed, run.nightIndex, 2)),
    driftRng: createRng(mixSeed(run.seed, run.nightIndex, 3)),
    fog: planFog(run, night),
    fogLevel: 0,
    incoming: [],
    spawnTimer: 0.8,
    oil: run.stats.oilMax,
    hornCooldown: 0,
    calm: 0,
    delivered: 0,
    time: 0,
    nextBoatId: 1,
    cleared: false,
    over: null,
  };
  return run.world;
}

/** The night's fog bank: when it rolls in, from its own seeded stream so other rolls are untouched. */
function planFog(run, night) {
  if (!night.fog) return null;
  const rng = createRng(mixSeed(run.seed, run.nightIndex, 4));
  const at = rng.range(FOG.startMin, FOG.startMax);
  return { at, end: at + FOG.duration, phase: 'calm' };
}

/** 0 = clear water, 1 = thick fog; ramps in and out over FOG.ramp seconds. */
export function fogLevelAt(fog, time) {
  if (!fog) return 0;
  const t = time - fog.at;
  if (t <= 0 || t >= FOG.duration) return 0;
  return Math.min(1, t / FOG.ramp, (FOG.duration - t) / FOG.ramp);
}

/** Seconds of fog left (or until it lands, while warned), for the HUD readout. */
export function fogReadout(world) {
  const fog = world.fog;
  if (!fog) return null;
  if (fog.phase === 'warn') return { phase: 'warn', left: fog.at - world.time, frac: (fog.at - world.time) / FOG.warn };
  if (fog.phase === 'fog') return { phase: 'fog', left: fog.end - world.time, frac: (fog.end - world.time) / FOG.duration };
  return null;
}

function updateFog(world, events) {
  const fog = world.fog;
  if (!fog) return;
  const t = world.time;
  if (fog.phase === 'calm' && t >= fog.at - FOG.warn) {
    fog.phase = 'warn';
    events.push({ type: 'fogWarn' });
  }
  if (fog.phase === 'warn' && t >= fog.at) {
    fog.phase = 'fog';
    events.push({ type: 'fogIn' });
  }
  if (fog.phase === 'fog' && t >= fog.end) {
    fog.phase = 'gone';
    events.push({ type: 'fogOut' });
  }
  world.fogLevel = fogLevelAt(fog, t);
  world.beam.angleMul = 1 + (FOG.beamAngle - 1) * world.fogLevel;
  world.beam.lengthMul = 1 + (FOG.beamLength - 1) * world.fogLevel;
}

export const fogPays = (world) => world.fogLevel >= 0.5;

export const nightOf = (run) => NIGHTS[run.nightIndex];
export const isFinalNight = (run) => run.nightIndex >= NIGHTS.length - 1;
export const nightCount = () => NIGHTS.length;

function pierUnder(boat) {
  if (boat.y + boat.radius < PIER.top) return null;
  return PIERS.find((p) => Math.abs(boat.x - p.x) < PIER.dockHalfWidth) || null;
}

function soundHorn(world, stats) {
  world.hornCooldown = stats.hornCooldown;
  world.calm = stats.hornCalm;
  for (const boat of world.boats) {
    if (boat.entering) continue;
    const h = nearestHazard(world, boat.x, boat.y);
    if (h.gap > HORN_RANGE) continue;
    const shove = stats.hornPush * (1 - (0.5 * h.gap) / HORN_RANGE);
    boat.vx += h.ax * shove;
    boat.vy += h.ay * shove;
    boat.course = Math.atan2(h.ay, h.ax);
  }
}

function spawnBoats(world, events, dt) {
  for (let i = world.incoming.length - 1; i >= 0; i--) {
    const inc = world.incoming[i];
    inc.warn -= dt;
    if (inc.warn > 0) continue;
    world.incoming.splice(i, 1);
    world.boats.push(inc.boat);
    events.push({ type: 'spawn', x: Math.min(Math.max(inc.boat.x, 14), 946), y: Math.max(inc.boat.y, 14), color: inc.boat.color });
  }
  const afloat = world.boats.length + world.incoming.length;
  world.spawnTimer -= dt;
  if (afloat === 0 && world.spawnTimer > 1.2) world.spawnTimer = 1.2;
  if (world.spawnTimer > 0) return;
  if (afloat >= world.night.maxBoats) {
    world.spawnTimer = 0.5;
    return;
  }
  // The boat is rolled now but waits off-screen for SPAWN_WARN seconds behind an edge marker.
  const boat = spawnBoat(world, world.spawnRng);
  world.incoming.push({ boat, warn: SPAWN_WARN });
  world.spawnTimer = world.night.spawnEvery * world.spawnRng.range(0.8, 1.2);
  events.push({ type: 'incoming', color: boat.color });
}

function resolveBoats(run, world, events) {
  const stats = run.stats;
  for (let i = world.boats.length - 1; i >= 0; i--) {
    const boat = world.boats[i];
    if (boat.entering) continue;
    const pier = pierUnder(boat);
    if (pier) {
      const fogPay = fogPays(world);
      const result = scoreDock(run, boat, pier, fogPay ? FOG.pay : 1);
      world.delivered += 1;
      run.totalDelivered += 1;
      world.oil = Math.min(stats.oilMax, world.oil + stats.oilPerDock * (result.match ? 1.5 : 1));
      events.push({ type: 'dock', x: boat.x, y: boat.y, color: boat.color, pier: pier.color, fogPay, ...result });
      world.boats.splice(i, 1);
      continue;
    }
    const cause = hazardHit(world, boat) || (boat.y + boat.radius * 0.6 > SHORE_Y ? 'shore' : null);
    if (cause) {
      run.lives -= 1;
      run.crashes += 1;
      run.combo = 0;
      events.push({ type: 'crash', x: boat.x, y: boat.y, color: boat.color, cause, lit: boat.lit });
      world.boats.splice(i, 1);
    }
  }
}

export function updateWorld(run, cmd, dt) {
  const world = run.world;
  const events = [];
  if (!world || world.cleared || world.over) return events;
  const stats = run.stats;
  world.time += dt;
  run.time += dt;

  updateFog(world, events);
  aimBeam(world.beam, cmd, stats, dt);

  const oilBefore = world.oil;
  const burn = world.night.oilBurn * (1 + (FOG.oilBurn - 1) * world.fogLevel);
  world.oil = Math.max(0, world.oil - (stats.oilDrain + (world.beam.focused ? stats.focusDrain : 0)) * burn * dt);
  const lowLine = stats.oilMax * 0.25;
  if (oilBefore >= lowLine && world.oil < lowLine) events.push({ type: 'lowOil' });

  world.hornCooldown = Math.max(0, world.hornCooldown - dt);
  world.calm = Math.max(0, world.calm - dt);
  if (cmd.horn) {
    if (world.hornCooldown <= 0) {
      soundHorn(world, stats);
      events.push({ type: 'horn', x: LIGHTHOUSE.x, y: LIGHTHOUSE.y });
    } else {
      events.push({ type: 'hornDenied' });
    }
  }

  spawnBoats(world, events, dt);
  updateHazards(world, dt);

  for (const boat of world.boats) {
    boat.lit = !boat.entering && isLit(world.beam, stats, boat.x, boat.y, boat.radius);
    if (boat.lit) {
      if (world.time - boat.lastLitAt > 1) events.push({ type: 'catch', x: boat.x, y: boat.y, color: boat.color });
      boat.lastLitAt = world.time;
    }
    steerBoat(boat, world, stats, dt);
  }
  separateBoats(world.boats);
  resolveBoats(run, world, events);

  if (run.lives <= 0) {
    world.over = 'wrecked';
    events.push({ type: 'wrecked' });
  } else if (world.oil <= 0) {
    world.over = 'lampOut';
    events.push({ type: 'lampOut' });
  } else if (world.delivered >= world.night.quota) {
    world.cleared = true;
    events.push({ type: 'nightClear' });
  }
  return events;
}
