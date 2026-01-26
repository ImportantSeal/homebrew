import { randomFromArray } from '../utils/random.js';

export function dealTurnCards(state) {
  state.currentCards = [];
  state.dittoPending = [null, null, null];

  for (let i = 0; i < 3; i++) {
    let card;
    const cardTypeChance = Math.random();

    if (cardTypeChance < 0.2) {
      card = randomFromArray(state.socialCards);
    } else if (cardTypeChance < 0.3) {
      card = state.crowdChallenge;
    } else if (cardTypeChance < 0.4) {
      card = state.special;
    } else {
      card = randomFromArray(state.normalDeck);
    }

    const r = Math.random();
    if (r < 0.04) {
      card = "Immunity";
    } else if (r < 0.06) {
      const otherItems = state.itemCards.filter(item => item !== "Immunity");
      card = randomFromArray(otherItems);
    }

    state.currentCards.push(card);
  }

  state.hiddenIndex = Math.floor(Math.random() * 3);
  state.revealed = [true, true, true];
  state.revealed[state.hiddenIndex] = false;
  state.dittoActive = [false, false, false];
}
