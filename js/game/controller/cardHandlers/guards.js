export function isChoiceSelectionActive(state) {
  return Boolean(state.choiceSelection?.active && state.choiceSelection?.pending);
}

export function clearChoiceSelection(state) {
  state.choiceSelection = { active: false, pending: null };
}

export function clearSharePenaltyState(state) {
  state.sharePenalty = null;
}

export function isGroupPenaltyPending(state) {
  return state.penaltySource === "group_pending" && !!state.penaltyGroup?.active;
}

export function guardPendingPenaltyRoll(state, log) {
  if (state.penaltySource !== "card_pending" && !isGroupPenaltyPending(state)) {
    return false;
  }

  if (!state.penaltyHintShown) {
    log(state.penaltySource === "card_pending"
      ? "Roll the Penalty Deck to continue."
      : "Group penalty is active. Roll the Penalty Deck to continue.");
    state.penaltyHintShown = true;
  }

  return true;
}
