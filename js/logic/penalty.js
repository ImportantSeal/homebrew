import { flipCardAnimation } from '../animations.js';
import { randomFromArray } from '../utils/random.js';

export function rollPenaltyCard(state, log) {
  if (state.penaltyShown) return;

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (currentPlayer.shield) {
    log(`${currentPlayer.name}'s Shield protected against the penalty!`);
    delete currentPlayer.shield;
    state.penaltyConfirmArmed = false;
    return;
  }

  if (currentPlayer.immunity) {
    log(`${currentPlayer.name}'s Immunity prevented drinking from the penalty!`);
    delete currentPlayer.immunity;
    state.penaltyConfirmArmed = false;
    return;
  }

  const penalty = randomFromArray(state.penaltyDeck);
  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;

  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, penalty);
  log(`${currentPlayer.name} rolled penalty card: ${penalty}`);
}

export function hidePenaltyCard(state) {
  state.penaltyShown = false;
  state.penaltyCard = null;
  state.penaltyConfirmArmed = false;

  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}
