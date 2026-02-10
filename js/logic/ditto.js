// js/ditto/effects.js

import { randomFromArray } from '../utils/random.js';

export function getDittoEventPool() {
  return [
    { type: 'LOSE_ONE_ITEM_ALL' },
    { type: 'STEAL_RANDOM_ITEM' },
    { type: 'DRINK_3' },
    { type: 'WATERFALL' },
    { type: 'SHOT' },
    { type: 'RANDOM_CHALLENGE' },
    { type: 'PENALTY_ALL' }
  ];
}

export function activateDitto(state, cardElement, cardIndex, log) {
  state.dittoActive[cardIndex] = true;
  cardElement.dataset.value = "Ditto";

  // mark kind for CSS (badge + strip + ditto image)
  cardElement.dataset.kind = "ditto";

  // keep DOM clean: no inline background-image; CSS handles the visual
  const front = cardElement.querySelector('.card__front');
  if (front) {
    front.textContent = "";
    front.removeAttribute('style');
  }

  // ensure it's showing front
  cardElement.classList.add('show-front');

  log("Ditto effect activated! Click again to confirm.");

  cardElement.dataset.dittoTime = Date.now();
  state.dittoPending[cardIndex] = randomFromArray(getDittoEventPool());
}

/**
 * applyDrinkEvent(playerIndex, amount, reason) is injected from controller,
 * so Ditto drink effects can trigger "Drink Buddy" etc.
 */
export function runDittoEffect(state, cardIndex, log, updateTurnOrder, renderItemsBoard, applyDrinkEvent) {
  const ev = state.dittoPending?.[cardIndex];
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (!ev) {
    log("Ditto had no stored effect (unexpected).");
    return;
  }

  switch (ev.type) {
    case 'LOSE_ONE_ITEM_ALL': {
      log("Ditto caused chaos! All players lose one item.");
      state.players.forEach(p => {
        if (p.inventory && p.inventory.length > 0) p.inventory.pop();
      });
      updateTurnOrder();
      renderItemsBoard();
      return;
    }

    case 'STEAL_RANDOM_ITEM': {
      const others = state.players.filter((_, i) => i !== state.currentPlayerIndex);
      const target = randomFromArray(others);
      if (target && target.inventory && target.inventory.length > 0) {
        const stolen = target.inventory.pop();
        currentPlayer.inventory.push(stolen);
        log(`Ditto stole ${stolen} from ${target.name}!`);
      } else {
        log("Ditto tried to steal, but the target player had no items.");
      }
      updateTurnOrder();
      renderItemsBoard();
      return;
    }

    case 'DRINK_3': {
      log("Ditto says: Drink 3!");
      applyDrinkEvent?.(state.currentPlayerIndex, 3, "Ditto: Drink 3");
      return;
    }

    case 'WATERFALL': {
      log("Ditto started a Waterfall!");
      return;
    }

    case 'SHOT': {
      log("Ditto ordered a Shot! Take a shot now.");
      applyDrinkEvent?.(state.currentPlayerIndex, 1, "Ditto: Shot");
      return;
    }

    case 'RANDOM_CHALLENGE': {
      log("Ditto started a challenge! Prepare for a random challenge.");
      const challenges = [
        "Challenge: Truth or Drink",
        "Challenge: Dare",
        "Challenge: Mini King",
        "Categories"
      ];
      log(randomFromArray(challenges));
      return;
    }

    case 'PENALTY_ALL': {
      const penalty = randomFromArray(state.penaltyDeck);
      log(`Ditto rolled a penalty for everyone: ${penalty}`);

      state.players.forEach((p, idx) => {
        if (p.shield) {
          delete p.shield;
          log(`${p.name}'s Shield blocked the penalty.`);
        } else {
          log(`${p.name} takes penalty: ${penalty}`);
          // if it's Drink X / Shot etc, trigger drink event
          const m = String(penalty).match(/Drink\s+(\d+)/i);
          if (m) applyDrinkEvent?.(idx, parseInt(m[1], 10), "Ditto penalty all");
          else if (/^Shotgun$/i.test(String(penalty))) applyDrinkEvent?.(idx, 2, "Ditto penalty all: Shotgun");
          else if (/^Shot$/i.test(String(penalty))) applyDrinkEvent?.(idx, 1, "Ditto penalty all: Shot");
        }
      });

      updateTurnOrder();
      renderItemsBoard();
      return;
    }

    default:
      log("Unknown Ditto effect.");
      return;
  }
}
