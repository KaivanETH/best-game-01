// Tidelamp tuning: every number the game is balanced on lives here.

export const VIEW = { w: 960, h: 600 };
export const FIXED_DT = 1 / 60;
export const DEFAULT_SEED = 20261115;

export const LIGHTHOUSE = { x: 480, y: 286, radius: 34 };
export const SHORE_Y = 552;
export const PIER = { top: 500, halfWidth: 20, dockHalfWidth: 30 };
export const PIERS = [
  { x: 200, color: 'amber' },
  { x: 480, color: 'teal' },
  { x: 760, color: 'rose' },
];

export const PALETTE = {
  abyss: '#060d1d',
  sea: '#0e2445',
  seaLight: '#1a3d6b',
  wave: 'rgba(160, 205, 255, 0.16)',
  foam: '#d7ecff',
  sand: '#2b2a33',
  shoreRock: '#3b3a48',
  wood: '#7a5a3c',
  woodDark: '#4d3826',
  rock: '#2a3040',
  rockLight: '#4a556e',
  lamp: '#ffd878',
  lampHot: '#fff4cf',
  tower: '#efe6d2',
  towerBand: '#c0503f',
  text: '#f6eedb',
  dim: '#93a8c8',
  ink: '#0a1426',
  panel: 'rgba(8, 18, 38, 0.86)',
  panelEdge: 'rgba(255, 216, 120, 0.45)',
  danger: '#ff5d5d',
  good: '#8ef0a7',
};

export const BOAT_COLORS = { amber: '#ffb347', teal: '#3fd6c2', rose: '#ff6f91' };

export const BOAT_TYPES = {
  skiff: { name: 'Skiff', speed: 64, turn: 2.6, radius: 8, worth: 1, hull: '#eadcbf' },
  trawler: { name: 'Trawler', speed: 46, turn: 1.5, radius: 11, worth: 1.5, hull: '#b8a184' },
  courier: { name: 'Courier', speed: 86, turn: 3.4, radius: 7, worth: 1.25, hull: '#f4f4f4' },
};

export const BASE_STATS = {
  beamLength: 390,
  beamHalfAngle: 0.27,
  focusNarrow: 0.55,
  focusBoost: 1.7,
  lureSpeed: 1,
  oilMax: 100,
  oilDrain: 1.1,
  focusDrain: 8,
  oilPerDock: 9,
  hornCooldown: 9,
  hornPush: 150,
  hornCalm: 2.5,
  maxLives: 5,
  keepCombo: false,
};

export const START_LIVES = 3;

export const SCORE = { dock: 100, wrongDock: 40, comboStep: 0.5, lifeBonus: 150, oilBonus: 4 };

export const NIGHTS = [
  { name: 'Still Water', quota: 6, spawnEvery: 3.4, maxBoats: 3, current: [0, 7], rocks: 5, whirlpools: 0, logs: 0, types: ['skiff', 'skiff', 'trawler'], dark: 0.5, rain: 0, caution: 1 },
  { name: 'Crosscurrent', quota: 8, spawnEvery: 3.0, maxBoats: 4, current: [11, 9], rocks: 6, whirlpools: 0, logs: 0, types: ['skiff', 'trawler', 'courier'], dark: 0.56, rain: 0, caution: 0.8 },
  { name: 'The Maelstrom', quota: 10, spawnEvery: 2.7, maxBoats: 4, current: [-12, 10], rocks: 6, whirlpools: 1, logs: 0, types: ['skiff', 'trawler', 'courier'], dark: 0.6, rain: 0.25, caution: 0.65 },
  { name: 'Driftwood Run', quota: 12, spawnEvery: 2.4, maxBoats: 5, current: [14, 11], rocks: 7, whirlpools: 1, logs: 2, types: ['skiff', 'trawler', 'courier', 'courier'], dark: 0.64, rain: 0.5, caution: 0.5 },
  { name: 'The Long Storm', quota: 14, spawnEvery: 2.2, maxBoats: 6, current: [-16, 13], rocks: 7, whirlpools: 2, logs: 3, types: ['skiff', 'trawler', 'courier', 'courier'], dark: 0.72, rain: 1, caution: 0.42 },
];

export const FONT = '"Trebuchet MS", "Segoe UI", "DejaVu Sans", system-ui, sans-serif';
