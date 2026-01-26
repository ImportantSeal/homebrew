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
  cardElement.textContent = "";
  cardElement.style.borderColor = "purple";
  cardElement.style.backgroundColor = "#E6E6FA";
  cardElement.style.backgroundImage = "url('images/ditto.png')";
  cardElement.style.backgroundSize = "cover";
  cardElement.style.backgroundPosition = "center";
  log("Ditto effect activated! Click again to confirm.");

  cardElement.dataset.dittoTime = Date.now();
  state.dittoPending[cardIndex] = randomFromArray(getDittoEventPool());
}

export function runDittoEffect(state, cardIndex, log, updateTurnOrder, renderItemsBoard) {
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
      if (currentPlayer.immunity) {
        delete currentPlayer.immunity;
        log(`${currentPlayer.name}'s Immunity prevented 'Drink 3!'`);
      } else {
        log("Ditto says: Drink 3!");
      }
      return;
    }

    case 'WATERFALL': {
      log("Ditto started a Waterfall!");
      return;
    }

    case 'SHOT': {
      log("Ditto ordered a Shot! Take a shot now.");
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

      state.players.forEach(p => {
        if (p.shield) {
          delete p.shield;
          log(`${p.name}'s Shield blocked the penalty.`);
        } else if (p.immunity) {
          delete p.immunity;
          log(`${p.name}'s Immunity prevented the penalty.`);
        } else {
          log(`${p.name} takes penalty: ${penalty}`);
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
