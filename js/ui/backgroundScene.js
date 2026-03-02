const PENALTY_SCENE_SOURCES = new Set([
  'deck',
  'card',
  'card_pending',
  'group',
  'group_pending',
  'redraw',
  'redraw_hold'
]);

function normalizeScene(scene) {
  if (scene === 'penalty') return 'penalty';
  if (scene === 'special') return 'special';
  return 'normal';
}

function resolveBaseScene(scene) {
  return scene === 'special' ? 'special' : 'normal';
}

export function applyBackgroundScene(scene = 'normal') {
  if (typeof document === 'undefined' || !document.body?.dataset) return;
  document.body.dataset.scene = normalizeScene(scene);
}

export function resolveBackgroundScene(state) {
  if (!state || typeof state !== 'object') return 'normal';

  const source = String(state.penaltySource || '').trim();
  if (state.penaltyShown || PENALTY_SCENE_SOURCES.has(source)) {
    return 'penalty';
  }

  return resolveBaseScene(state.backgroundScene);
}

export function syncBackgroundScene(state) {
  applyBackgroundScene(resolveBackgroundScene(state));
}

export function setBaseBackgroundScene(state, scene = 'normal') {
  if (!state || typeof state !== 'object') return;
  state.backgroundScene = resolveBaseScene(scene);
  syncBackgroundScene(state);
}
