// Keeper's gifts: the upgrade picked between nights.

export const UPGRADES = [
  { id: 'wideLens', name: 'Wide Lens', text: 'Beam cone 25% wider', icon: 'cone', apply: (s) => { s.beamHalfAngle *= 1.25; } },
  { id: 'longReach', name: 'Long Reach', text: 'Beam shines 60 further', icon: 'reach', apply: (s) => { s.beamLength += 60; } },
  { id: 'deepReservoir', name: 'Deep Reservoir', text: '+30 oil, burns 15% slower', icon: 'oil', apply: (s) => { s.oilMax += 30; s.oilDrain *= 0.85; s.focusDrain *= 0.85; } },
  { id: 'brassHorn', name: 'Brass Horn', text: 'Foghorn recharges 30% faster', icon: 'horn', apply: (s) => { s.hornCooldown *= 0.7; s.hornPush *= 1.2; } },
  { id: 'spareHull', name: 'Spare Hull', text: 'Mend one wreck: +1 life', icon: 'hull', apply: (s, run) => { run.lives = Math.min(s.maxLives, run.lives + 1); }, available: (run) => run.lives < run.stats.maxLives },
  { id: 'brightWick', name: 'Bright Wick', text: 'Lit boats sail 20% faster', icon: 'wick', apply: (s) => { s.lureSpeed *= 1.2; } },
  { id: 'harborPilot', name: 'Harbor Pilot', text: 'Wrong piers keep your combo', icon: 'pilot', apply: (s) => { s.keepCombo = true; }, available: (run) => !run.stats.keepCombo },
];

export function offerUpgrades(run, count = 3) {
  const pool = UPGRADES.filter((u) => !u.available || u.available(run));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(run.rng.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function applyUpgrade(run, upgrade) {
  upgrade.apply(run.stats, run);
  run.upgrades.push(upgrade.id);
}

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id);
}
