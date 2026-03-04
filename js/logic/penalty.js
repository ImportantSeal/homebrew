import { flipCardAnimation } from '../animations.js';
import { randomFromArray } from '../utils/random.js';
import { resolveRng } from '../utils/rng.js';
import { getPenaltyDeckEl } from '../ui/uiFacade.js';
import { syncBackgroundScene, triggerPenaltyDangerFlash } from '../ui/backgroundScene.js';
import { recordPenaltyTaken } from '../stats.js';
import { getPenaltyDisplayValue, getPenaltySpec } from './penaltySchema.js';

/**
 * source:
 *  - "deck"   = user clicked penalty deck
 *  - "card"   = player selected "Draw a Penalty Card"
 *  - "group"  = penalty is part of a manual group queue
 *  - "redraw" = info/preview penalty (should NOT end turn on confirm)
 *  - "redraw_hold" = redraw penalty that stays open until card-action modal closes
 */
export function rollPenaltyCard(state, log, source = "deck", applyDrinkEvent, options = {}) {
  if (state.penaltyShown) return;

  const hasPendingPenaltyTarget = source === "card" && Number.isInteger(state.penaltyRollPlayerIndex);
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

    state.penaltyConfirmArmed = false;
    state.penaltySource = null;
    state.penaltyRollPlayerIndex = null;
    syncBackgroundScene(state);
    return;
  }

  const rng = resolveRng(state?.rng);
  const penalty = randomFromArray(state.penaltyDeck, rng);
  const penaltyLabel = getPenaltyDisplayValue(penalty);

  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;
  state.penaltySource = source;
  state.penaltyRollPlayerIndex = requestedIndex;
  if (source === "card" && state.sharePenalty?.active) {
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
  if (state.penaltyShown && state.penaltySource === "card") return;

  // Close any existing preview/deck penalty first (clean UI).
  if (state.penaltyShown) {
    hidePenaltyCard(state);
  }

  const rng = resolveRng(state?.rng);
  const penalty = randomFromArray(state.penaltyDeck, rng);
  const penaltyLabel = getPenaltyDisplayValue(penalty);

  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;

  // IMPORTANT: mark as "redraw" so penalty-deck click won't advance turn.
  state.penaltySource = "redraw";
  state.penaltyHintShown = false;
  state.penaltyRollPlayerIndex = null;
  syncBackgroundScene(state);
  triggerPenaltyDangerFlash();

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, penaltyLabel);

  if (label) log(`${label} -> ${penaltyLabel}`);
  return penalty;
}

export function hidePenaltyCard(state) {
  state.penaltyShown = false;
  state.penaltyCard = null;
  state.penaltyConfirmArmed = false;
  state.penaltySource = null;
  state.penaltyHintShown = false;
  state.penaltyRollPlayerIndex = null;
  syncBackgroundScene(state);

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}
