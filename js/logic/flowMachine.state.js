import {
  DEFAULT_CHOICE_SELECTION,
  DEFAULT_EFFECT_SELECTION,
  FLOW_PHASES,
  PENALTY_SOURCES
} from './flowMachine.constants.js';

export function createChoiceSelection() {
  return { ...DEFAULT_CHOICE_SELECTION };
}

export function createEffectSelection() {
  return { ...DEFAULT_EFFECT_SELECTION };
}

export function normalizePenaltySource(source) {
  const raw = typeof source === 'string' ? source.trim().toLowerCase() : '';
  if (Object.values(PENALTY_SOURCES).includes(raw)) return raw;
  return null;
}

function ensureChoiceSelectionSlice(state) {
  if (!state.choiceSelection || typeof state.choiceSelection !== 'object') {
    state.choiceSelection = createChoiceSelection();
    return;
  }

  state.choiceSelection.active = Boolean(state.choiceSelection.active);
  if (!state.choiceSelection.active) {
    state.choiceSelection.pending = null;
  } else if (state.choiceSelection.pending == null) {
    state.choiceSelection.active = false;
  }
}

function ensureEffectSelectionSlice(state) {
  if (!state.effectSelection || typeof state.effectSelection !== 'object') {
    state.effectSelection = createEffectSelection();
    return;
  }

  state.effectSelection.active = Boolean(state.effectSelection.active);
  if (!state.effectSelection.active) {
    state.effectSelection.pending = null;
    state.effectSelection.cleanup = null;
    state.effectSelection.ui = null;
    return;
  }

  if (state.effectSelection.pending == null) state.effectSelection.pending = null;
  if (state.effectSelection.cleanup == null) state.effectSelection.cleanup = null;
  if (state.effectSelection.ui == null) state.effectSelection.ui = null;
}

export function ensureFlowSlices(state) {
  if (!state || typeof state !== 'object') return;

  ensureChoiceSelectionSlice(state);
  ensureEffectSelectionSlice(state);

  if (!state.flow || typeof state.flow !== 'object') {
    state.flow = createFlowState();
  } else if (typeof state.flow.phase !== 'string' || !state.flow.phase.trim()) {
    state.flow.phase = FLOW_PHASES.IDLE;
  }
}

export function createFlowState() {
  return {
    phase: FLOW_PHASES.IDLE,
    lastTransition: null
  };
}

export function deriveFlowPhase(state) {
  const choiceActive = Boolean(state?.choiceSelection?.active && state?.choiceSelection?.pending);
  if (choiceActive) return FLOW_PHASES.CHOICE_SELECTION;

  const effectActive = Boolean(state?.effectSelection?.active);
  if (effectActive) return FLOW_PHASES.EFFECT_SELECTION;

  const normalizedSource = normalizePenaltySource(state?.penaltySource);
  if (state?.penaltyShown) {
    if (normalizedSource === PENALTY_SOURCES.CARD) return FLOW_PHASES.PENALTY_OPEN_CARD;
    if (normalizedSource === PENALTY_SOURCES.GROUP) return FLOW_PHASES.PENALTY_OPEN_GROUP;
    if (normalizedSource === PENALTY_SOURCES.REDRAW) return FLOW_PHASES.PENALTY_OPEN_REDRAW;
    if (normalizedSource === PENALTY_SOURCES.REDRAW_HOLD) return FLOW_PHASES.PENALTY_OPEN_REDRAW_HOLD;
    return FLOW_PHASES.PENALTY_OPEN_DECK;
  }

  if (normalizedSource === PENALTY_SOURCES.CARD_PENDING) {
    return FLOW_PHASES.PENALTY_PENDING_CARD;
  }

  if (normalizedSource === PENALTY_SOURCES.GROUP_PENDING && state?.penaltyGroup?.active) {
    return FLOW_PHASES.PENALTY_PENDING_GROUP;
  }

  return FLOW_PHASES.IDLE;
}

export function syncFlowPhase(state) {
  ensureFlowSlices(state);
  const phase = deriveFlowPhase(state);
  state.flow.phase = phase;
  return phase;
}
