// Best score, kept in localStorage when the page allows it (never in frozen screenshot mode).

const KEY = 'tidelamp.best.v1';

export function loadBest(enabled) {
  if (!enabled) return 0;
  try {
    return Number(window.localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(enabled, score) {
  if (!enabled) return;
  try {
    window.localStorage.setItem(KEY, String(score));
  } catch {
    // storage blocked: the best score lives for this visit only
  }
}
