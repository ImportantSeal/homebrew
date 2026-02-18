import { flipCardAnimation } from '../animations.js';
import { randomFromArray } from '../utils/random.js';
import { getPenaltyDeckEl } from '../ui/uiFacade.js';

/**
 * source:
 *  - "deck"   = user clicked penalty deck
 *  - "card"   = player selected "Draw a Penalty Card"
 *  - "redraw" = info/preview penalty (should NOT end turn on confirm)
 *  - "redraw_hold" = redraw penalty that stays open until card-action modal closes
 */
export function rollPenaltyCard(state, log, source = "deck", applyDrinkEvent) {
  if (state.penaltyShown) return;

  const currentPlayer = state.players[state.currentPlayerIndex];

  // Reset hint spam guard on new penalty attempt
  state.penaltyHintShown = false;

  if (currentPlayer.shield) {
    log(`${currentPlayer.name}'s Shield protected against the penalty!`);
    delete currentPlayer.shield;

    state.penaltyConfirmArmed = false;
    state.penaltySource = null;
    return;
  }

  const penalty = randomFromArray(state.penaltyDeck);

  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;
  state.penaltySource = source;

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, penalty);

  log(`${currentPlayer.name} rolled penalty card: ${penalty}`);

  // ✅ NEW: route drink-like penalties through applyDrinkEvent (for Drink Buddy)
  const s = String(penalty || "").trim();
  const m = s.match(/^Drink\s+(\d+)/i);
  if (m && applyDrinkEvent) {
    applyDrinkEvent(state.currentPlayerIndex, parseInt(m[1], 10) || 1, "Penalty");
  } else if (/^Shotgun$/i.test(s) && applyDrinkEvent) {
    applyDrinkEvent(state.currentPlayerIndex, 2, "Penalty: Shotgun");
  } else if (/^Shot$/i.test(s) && applyDrinkEvent) {
    applyDrinkEvent(state.currentPlayerIndex, 1, "Penalty: Shot");
  }
}

/**
 * Shows a penalty as an INFO/PREVIEW (does not advance turn on confirm).
 * Used for Special/Crowd/Social sub-events that mention penalty deck/card.
 */
export function showPenaltyPreview(state, log, label = "Penalty") {
  // If we are forcing a confirm from a real "Draw a Penalty Card", don't override it.
  if (state.penaltyShown && state.penaltySource === "card") return;

  // Close any existing preview/deck penalty first (clean UI)
  if (state.penaltyShown) {
    hidePenaltyCard(state);
  }

  const penalty = randomFromArray(state.penaltyDeck);

  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;

  // IMPORTANT: mark as "redraw" so penalty-deck click won't advance turn
  state.penaltySource = "redraw";
  state.penaltyHintShown = false;

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, penalty);

  if (label) log(`${label} → ${penalty}`);
  return penalty;
}

export function hidePenaltyCard(state) {
  state.penaltyShown = false;
  state.penaltyCard = null;
  state.penaltyConfirmArmed = false;
  state.penaltySource = null;
  state.penaltyHintShown = false;

  const penaltyDeckEl = getPenaltyDeckEl();
  if (penaltyDeckEl) flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}
