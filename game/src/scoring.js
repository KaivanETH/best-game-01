// Points: docking a boat, the color combo, and the end-of-night bonus.

import { BOAT_TYPES, SCORE } from './config.js';

const roundTo5 = (v) => Math.round(v / 5) * 5;

export function comboMultiplier(combo) {
  return 1 + Math.max(0, combo - 1) * SCORE.comboStep;
}

export function scoreDock(run, boat, pier) {
  const worth = BOAT_TYPES[boat.type].worth;
  const match = boat.color === pier.color;
  let points;
  if (match) {
    run.combo += 1;
    run.matched += 1;
    points = roundTo5(SCORE.dock * worth * comboMultiplier(run.combo));
  } else {
    if (!run.stats.keepCombo) run.combo = 0;
    points = roundTo5(SCORE.wrongDock * worth);
  }
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  run.score += points;
  return { points, match, combo: run.combo };
}

export function nightBonus(run) {
  const lives = run.lives * SCORE.lifeBonus;
  const oil = Math.floor(run.world.oil) * SCORE.oilBonus;
  return { lives, oil, total: lives + oil };
}
