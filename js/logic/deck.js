// homebrew/js/logic/deck.js
import { randomFromArray } from '../utils/random.js';

// Helps reduce "this feels broken" moments:
// - Avoids dealing exact same "card" twice in the SAME 3-card turn (best-effort).
function cardKey(card) {
  if (card && typeof card === 'object') {
    return `obj:${card.name || 'unnamed'}`;
  }
  return `str:${String(card)}`;
}

export function dealTurnCards(state) {
  state.currentCards = [];
  state.dittoPending = [null, null, null];

  for (let i = 0; i < 3; i++) {
    let card = null;

    // Try a few times to avoid duplicates inside the same 3-card deal
    for (let attempt = 0; attempt < 10; attempt++) {
      card = pickBaseCard(state);

      // Item override chance (works same as before)
      const r = Math.random();
      if (r < 0.01) { 
        card = "Immunity";
      } else if (r < 0.02) {   
        const otherItems = state.itemCards.filter(item => item !== "Immunity");
        card = randomFromArray(otherItems);
      }

      const k = cardKey(card);
      const already = state.currentCards.some(c => cardKey(c) === k);
      if (!already) break;
    }

    state.currentCards.push(card);
  }

  state.hiddenIndex = Math.floor(Math.random() * 3);
  state.revealed = [true, true, true];
  state.revealed[state.hiddenIndex] = false;
  state.dittoActive = [false, false, false];
}

function pickBaseCard(state) {
  const cardTypeChance = Math.random();
  if (cardTypeChance < 0.3) { 
   
    return randomFromArray(state.socialCards);
  } else if (cardTypeChance < 0.4) {  
    return state.crowdChallenge;
  } else if (cardTypeChance < 0.6) { 
    return state.special;
  } else { 
    return randomFromArray(state.normalDeck);
  }
}
