import { flipCardAnimation } from '../animations.js';
import { randomFromArray } from '../utils/random.js';

/**
 * source:
 *  - "deck"   = user clicked penalty deck
 *  - "card"   = player selected "Draw a Penalty Card"
 *  - "redraw" = redraw revealed penalty (should NOT end turn on confirm)
 */
export function rollPenaltyCard(state, log, source = "deck") {
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

  if (currentPlayer.immunity) {
    log(`${currentPlayer.name}'s Immunity prevented drinking from the penalty!`);
    delete currentPlayer.immunity;

    state.penaltyConfirmArmed = false;
    state.penaltySource = null;
    return;
  }

  const penalty = randomFromArray(state.penaltyDeck);
  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;
  state.penaltySource = source;

  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, penalty);
  log(`${currentPlayer.name} rolled penalty card: ${penalty}`);
}

export function hidePenaltyCard(state) {
  state.penaltyShown = false;
  state.penaltyCard = null;
  state.penaltyConfirmArmed = false;
  state.penaltySource = null;
  state.penaltyHintShown = false;

  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}
