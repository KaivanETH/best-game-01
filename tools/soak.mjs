// Headless soak test: the autopilot plays whole voyages in Node, no browser.
// Usage: node tools/soak.mjs [seedCount]
// Prints how far each seed got and checks the same seed replays byte-identically.

import { FIXED_DT } from '../game/src/config.js';
import { createRun, startNight, updateWorld, isFinalNight } from '../game/src/world.js';
import { createAutopilot, autopilotCommand } from '../game/src/autopilot.js';
import { offerUpgrades, applyUpgrade } from '../game/src/upgrades.js';
import { nightBonus } from '../game/src/scoring.js';

function playVoyage(seed, maxSeconds = 900) {
  const run = createRun(seed);
  startNight(run);
  const pilot = createAutopilot();
  const log = { causes: {}, nightTimes: [] };
  let nightStart = 0;
  for (let step = 0; step < maxSeconds / FIXED_DT; step++) {
    const events = updateWorld(run, autopilotCommand(pilot, run, FIXED_DT), FIXED_DT);
    for (const e of events) {
      if (e.type === 'crash') {
        const key = `${e.cause}${e.lit ? '*' : ''}`;
        log.causes[key] = (log.causes[key] || 0) + 1;
      }
      if (e.type === 'nightClear') {
        run.score += nightBonus(run).total;
        log.nightTimes.push(Math.round(run.time - nightStart));
        nightStart = run.time;
        if (isFinalNight(run)) return { run, log, end: 'dawn' };
        applyUpgrade(run, offerUpgrades(run)[0]);
        run.nightIndex += 1;
        startNight(run);
      }
      if (e.type === 'wrecked' || e.type === 'lampOut') return { run, log, end: e.type };
    }
  }
  return { run, log, end: 'timeout' };
}

const count = Number(process.argv[2] || 12);
const ends = {};
const cleared = [0, 0, 0, 0, 0];
for (let s = 1; s <= count; s++) {
  const { run, log, end } = playVoyage(s * 7919);
  ends[end] = (ends[end] || 0) + 1;
  for (let n = 0; n < log.nightTimes.length; n++) cleared[n] += 1;
  console.log(`seed ${String(s * 7919).padStart(6)}  ${end.padEnd(8)} night ${run.nightIndex + 1}  score ${String(run.score).padStart(6)}  home ${run.totalDelivered}  matched ${run.matched}  bestCombo ${run.bestCombo}  nights(s) ${log.nightTimes.join(',')}  wrecks ${JSON.stringify(log.causes)}`);
}
console.log('ends', JSON.stringify(ends));
console.log('nights cleared (of', count, 'seeds):', cleared.map((c, i) => `N${i + 1} ${c}`).join('  '));

const a = playVoyage(4242);
const b = playVoyage(4242);
const same = JSON.stringify([a.run.score, a.run.time, a.run.totalDelivered, a.end]) === JSON.stringify([b.run.score, b.run.time, b.run.totalDelivered, b.end]);
console.log('replay deterministic:', same);
if (!same) process.exit(1);
