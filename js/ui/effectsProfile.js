const MOBILE_WIDTH_QUERY = '(max-width: 900px)';
const COARSE_POINTER_QUERY = '(pointer: coarse)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let mediaBindings = null;

function canUseMediaQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function resolveReducedEffects() {
  if (!canUseMediaQuery()) return false;

  const isMobileWidth = window.matchMedia(MOBILE_WIDTH_QUERY).matches;
  const coarsePointer = window.matchMedia(COARSE_POINTER_QUERY).matches;
  const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

  return prefersReducedMotion || isMobileWidth || coarsePointer;
}

function applyReducedEffectsState(state, enabled) {
  const reduced = Boolean(enabled);

  if (state && typeof state === 'object') {
    state.reducedEffects = reduced;
  }

  if (typeof document !== 'undefined' && document.body?.dataset) {
    document.body.dataset.reducedEffects = reduced ? 'true' : 'false';

    const penaltyDeck = document.getElementById('penalty-deck');
    if (penaltyDeck?.classList) {
      const shouldAnimatePenaltyDeck = document.body.dataset.scene === 'penalty' && !reduced;
      penaltyDeck.classList.toggle('penalty-deck--animating', shouldAnimatePenaltyDeck);
    }
  }
}

export function isReducedEffectsEnabled() {
  if (typeof document !== 'undefined' && document.body?.dataset) {
    return document.body.dataset.reducedEffects === 'true';
  }
  return resolveReducedEffects();
}

export function initReducedEffects(state) {
  const apply = () => {
    applyReducedEffectsState(state, resolveReducedEffects());
  };

  apply();

  if (!canUseMediaQuery()) return;
  if (mediaBindings) return;

  const queries = [
    window.matchMedia(MOBILE_WIDTH_QUERY),
    window.matchMedia(COARSE_POINTER_QUERY),
    window.matchMedia(REDUCED_MOTION_QUERY)
  ];

  const onChange = () => apply();

  queries.forEach((query) => {
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return;
    }
    if (typeof query.addListener === 'function') {
      query.addListener(onChange);
    }
  });

  mediaBindings = { queries, onChange };
}
