import {
  FLOW_TRANSITIONS,
  transitionFlow,
  isChoiceSelectionActive as isChoiceFlowActive,
  isCardPenaltyPending,
  isGroupPenaltyPending as isGroupPenaltyPendingFlow
} from '../../../logic/flowMachine.js';

export function isChoiceSelectionActive(state) {
  return isChoiceFlowActive(state);
}

export function clearChoiceSelection(state) {
  transitionFlow(state, FLOW_TRANSITIONS.CLEAR_CHOICE);
}

export function clearSharePenaltyState(state) {
  state.sharePenalty = null;
}

export function isGroupPenaltyPending(state) {
  return isGroupPenaltyPendingFlow(state);
}

export function guardPendingPenaltyRoll(state, log) {
  const cardPending = isCardPenaltyPending(state);
  const groupPending = isGroupPenaltyPendingFlow(state);
  if (!cardPending && !groupPending) {
    return false;
  }

  if (!state.penaltyHintShown) {
    log(cardPending
      ? "Roll the Penalty Deck to continue."
      : "Group penalty is active. Roll the Penalty Deck to continue.");
    state.penaltyHintShown = true;
  }

  return true;
}
