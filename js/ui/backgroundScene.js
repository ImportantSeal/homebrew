const PENALTY_SCENE_SOURCES = new Set([
  'deck',
  'card',
  'card_pending',
  'group',
  'group_pending',
  'redraw',
  'redraw_hold'
]);

const BASE_SCENES = new Set([
  'normal',
  'ditto'
]);
const SURGE_SCENES = new Set(['penalty', 'ditto']);
const SURGE_DURATION_MS = 460;
const DANGER_FLASH_CLASS = 'scene-danger-flash';
const DANGER_FLASH_DURATION_MS = 430;
let surgeTimeoutId = null;
let dangerFlashTimeoutId = null;

function normalizeScene(scene) {
  const normalized = String(scene || '').trim().toLowerCase();
  if (normalized === 'penalty') return 'penalty';
  if (BASE_SCENES.has(normalized)) return normalized;
  return 'normal';
}

function resolveBaseScene(scene) {
  const normalized = normalizeScene(scene);
  return normalized === 'penalty' ? 'normal' : normalized;
}

function applySceneSurge() {
  if (typeof document === 'undefined') return;

  const body = document.body;
  if (!body?.classList) return;

  body.classList.remove('scene-surge');
  void body.offsetWidth;
  body.classList.add('scene-surge');

  if (surgeTimeoutId) clearTimeout(surgeTimeoutId);
  surgeTimeoutId = setTimeout(() => {
    if (!document.body?.classList) return;
    document.body.classList.remove('scene-surge');
  }, SURGE_DURATION_MS);
}

function applyDangerFlash() {
  if (typeof document === 'undefined') return;

  const body = document.body;
  if (!body?.classList) return;

  body.classList.remove(DANGER_FLASH_CLASS);
  void body.offsetWidth;
  body.classList.add(DANGER_FLASH_CLASS);

  if (dangerFlashTimeoutId) clearTimeout(dangerFlashTimeoutId);
  dangerFlashTimeoutId = setTimeout(() => {
    if (!document.body?.classList) return;
    document.body.classList.remove(DANGER_FLASH_CLASS);
  }, DANGER_FLASH_DURATION_MS);
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
  const nextScene = resolveBackgroundScene(state);
  const previousScene = typeof document !== 'undefined' && document.body?.dataset
    ? normalizeScene(document.body.dataset.scene)
    : null;

  applyBackgroundScene(nextScene);

  if (previousScene !== nextScene && SURGE_SCENES.has(nextScene)) {
    applySceneSurge();
    if (nextScene === 'penalty') applyDangerFlash();
  }
}

export function triggerPenaltyDangerFlash() {
  applyDangerFlash();
}

export function setBaseBackgroundScene(state, scene = 'normal') {
  if (!state || typeof state !== 'object') return;
  state.backgroundScene = resolveBaseScene(scene);
  syncBackgroundScene(state);
}
