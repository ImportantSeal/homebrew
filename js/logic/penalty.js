import { flipCardAnimation } from '../animations.js';
import { randomFromArray } from '../utils/random.js';
import { resolveRng } from '../utils/rng.js';
import { getPenaltyDeckEl } from '../ui/uiFacade.js';
import { syncBackgroundScene, triggerPenaltyDangerFlash } from '../ui/backgroundScene.js';
import { recordPenaltyTaken } from '../stats.js';
import { getPenaltyDisplayValue, getPenaltySpec } from './penaltySchema.js';
import {
  FLOW_TRANSITIONS,
  PENALTY_SOURCES,
  transitionFlow,
  isPenaltySource
} from './flowMachine.js';

/**
 * source:
 *  - "deck"   = user clicked penalty deck
 *  - "card"   = player selected "Draw a Penalty Card"
 *  - "group"  = penalty is part of a manual group queue
 *  - "redraw" = info/preview penalty (should NOT end turn on confirm)
 *  - "redraw_hold" = redraw penalty that stays open until card-action modal closes
 */
export function rollPenaltyCard(state, log, source = PENALTY_SOURCES.DECK, applyDrinkEvent, options = {}) {
  if (state.penaltyShown) return;

  const hasPendingPenaltyTarget = source === PENALTY_SOURCES.CARD && Number.isInteger(state.penaltyRollPlayerIndex);
  const defaultIndex = hasPendingPenaltyTarget
    ? state.penaltyRollPlayerIndex
    : state.currentPlayerIndex;
  const requestedIndex = Number.isInteger(options?.targetPlayerIndex)
    ? options.targetPlayerIndex
    : defaultIndex;
  const currentPlayer = state.players[requestedIndex];
  if (!currentPlayer) return;

  // Reset hint spam guard on new penalty attempt
  state.penaltyHintShown = false;

  if (currentPlayer.shield) {
    log(`${currentPlayer.name}'s Shield protected against the penalty!`);
    delete currentPlayer.shield;

    const clearAction = source === PENALTY_SOURCES.CARD || source === PENALTY_SOURCES.GROUP
      ? FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY
      : FLOW_TRANSITIONS.HIDE_PENALTY;
    transitionFlow(state, clearAction);
    syncBackgroundScene(state);
    return;
  }

  const rng = resolveRng(state?.rng);
  const penalty = randomFromArray(state.penaltyDeck, rng);
  const penaltyLabel = getPenaltyDisplayValue(penalty);

  const showActionBySource = Object.freeze({
    [PENALTY_SOURCES.DECK]: FLOW_TRANSITIONS.SHOW_DECK_PENALTY,
    [PENALTY_SOURCES.CARD]: FLOW_TRANSITIONS.SHOW_CARD_PENALTY,
    [PENALTY_SOURCES.GROUP]: FLOW_TRANSITIONS.SHOW_GROUP_PENALTY,
    [PENALTY_SOURCES.REDRAW]: FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY,
    [PENALTY_SOURCES.REDRAW_HOLD]: FLOW_TRANSITIONS.SHOW_REDRAW_HOLD_PENALTY
  });
  const transition = transitionFlow(state, showActionBySource[source] || FLOW_TRANSITIONS.SHOW_DECK_PENALTY, {
    rollPlayerIndex: requestedIndex
  });
  if (!transition.ok) {
    return;
  }

  state.penaltyCard = penalty;
  if (source === PENALTY_SOURCES.CARD && state.sharePenalty?.active) {
    state.sharePenalty.penalty = penalty;
  }
  syncBackgroundScene(state);
  triggerPenaltyDangerFlash();

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, penaltyLabel);
  recordPenaltyTaken(state, requestedIndex);

  log(`${currentPlayer.name} rolled penalty card: ${penaltyLabel}`);

  // Route drink-like penalties through applyDrinkEvent (for Drink Buddy).
  if (typeof applyDrinkEvent !== "function") return;

  const penaltySpec = getPenaltySpec(penalty);
  if (penaltySpec?.drink) {
    applyDrinkEvent(state, requestedIndex, penaltySpec.drink.amount, "Penalty", log);
  }
}

/**
 * Shows a penalty as an INFO/PREVIEW (does not advance turn on confirm).
 * Used for Special/Crowd/Social sub-events that mention penalty deck/card.
 */
export function showPenaltyPreview(state, log, label = "Penalty") {
  // If we are forcing a confirm from a real "Draw a Penalty Card", don't override it.
  if (state.penaltyShown && isPenaltySource(state, PENALTY_SOURCES.CARD)) return;

  // Close any existing preview/deck penalty first (clean UI).
  if (state.penaltyShown) {
    hidePenaltyCard(state);
  }

  const rng = resolveRng(state?.rng);
  const penalty = randomFromArray(state.penaltyDeck, rng);
  const penaltyLabel = getPenaltyDisplayValue(penalty);

  const transition = transitionFlow(state, FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY, {
    rollPlayerIndex: null
  });
  if (!transition.ok) return null;

  state.penaltyCard = penalty;
  syncBackgroundScene(state);
  triggerPenaltyDangerFlash();

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, penaltyLabel);

  if (label) log(`${label} -> ${penaltyLabel}`);
  return penalty;
}

export function hidePenaltyCard(state) {
  transitionFlow(state, FLOW_TRANSITIONS.HIDE_PENALTY);
  syncBackgroundScene(state);

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}
