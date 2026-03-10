import { FLOW_PHASES } from './flowMachine.constants.js';
import { normalizePenaltySource, syncFlowPhase } from './flowMachine.state.js';

function isPhase(state, phase) {
  return syncFlowPhase(state) === phase;
}

function isOneOfPhases(state, phases) {
  const phase = syncFlowPhase(state);
  return phases.includes(phase);
}

export function isChoiceSelectionActive(state) {
  return isPhase(state, FLOW_PHASES.CHOICE_SELECTION);
}

export function isEffectSelectionActive(state) {
  return isPhase(state, FLOW_PHASES.EFFECT_SELECTION);
}

export function isPendingPenaltyRoll(state) {
  return isOneOfPhases(state, [
    FLOW_PHASES.PENALTY_PENDING_CARD,
    FLOW_PHASES.PENALTY_PENDING_GROUP
  ]);
}

export function isCardPenaltyPending(state) {
  return isPhase(state, FLOW_PHASES.PENALTY_PENDING_CARD);
}

export function isGroupPenaltyPending(state) {
  return isPhase(state, FLOW_PHASES.PENALTY_PENDING_GROUP);
}

export function isPenaltyConfirmRequired(state) {
  return isOneOfPhases(state, [
    FLOW_PHASES.PENALTY_OPEN_CARD,
    FLOW_PHASES.PENALTY_OPEN_GROUP
  ]);
}

export function isPenaltyOpen(state) {
  return isOneOfPhases(state, [
    FLOW_PHASES.PENALTY_OPEN_DECK,
    FLOW_PHASES.PENALTY_OPEN_CARD,
    FLOW_PHASES.PENALTY_OPEN_GROUP,
    FLOW_PHASES.PENALTY_OPEN_REDRAW,
    FLOW_PHASES.PENALTY_OPEN_REDRAW_HOLD
  ]);
}

export function isRedrawHoldPenaltyOpen(state) {
  return isPhase(state, FLOW_PHASES.PENALTY_OPEN_REDRAW_HOLD);
}

export function isPenaltyFlowActive(state) {
  return isPendingPenaltyRoll(state) || isPenaltyOpen(state);
}

export function isPenaltySource(state, source) {
  const expected = normalizePenaltySource(source);
  return expected !== null && normalizePenaltySource(state?.penaltySource) === expected;
}
