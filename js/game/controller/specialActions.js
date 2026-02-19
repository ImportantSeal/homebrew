function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function inventoryCount(player) {
  return Array.isArray(player?.inventory) ? player.inventory.length : 0;
}

function totalOtherItems(state, selfIndex) {
  return state.players.reduce((sum, p, idx) => {
    if (idx === selfIndex) return sum;
    return sum + inventoryCount(p);
  }, 0);
}

function maxItemsAnyPlayer(state) {
  return Math.max(0, ...state.players.map(p => inventoryCount(p)));
}

export function runSpecialAction(action, context) {
  const {
    state,
    currentPlayer,
    currentPlayerIndex,
    playerName,
    log,
    applyDrinkEvent
  } = context;

  const p = currentPlayer;
  const selfIndex = currentPlayerIndex;

  switch (action) {
    case "WHO_KNOWS_YOU": {
      const candidates = state.players
        .map((_, idx) => idx)
        .filter(idx => idx !== selfIndex);

      if (candidates.length === 0) {
        log("Who Knows You needs at least two players.");
        return;
      }

      const targetIndex = candidates[Math.floor(Math.random() * candidates.length)];
      const target = playerName(targetIndex);

      log(`Who Knows You target: ${target}.`);
      log(`${target} answers a question about ${p.name}. Wrong -> ${target} drinks 1. Correct -> ${p.name} drinks 1.`);
      return;
    }

    case "DOUBLE_OR_NOTHING_D6": {
      applyDrinkEvent(state, selfIndex, 4, "Double or Nothing", log);
      log(`${p.name} drinks 4 and rolls a d6 for Double or Nothing.`);

      const r = rollDie(6);
      log(`Double or Nothing roll (d6): ${r}`);

      if (r >= 4) {
        log(`${p.name} wins: give 8 drinks.`);
      } else {
        applyDrinkEvent(state, selfIndex, 8, "Double or Nothing fail", log);
      }

      return;
    }

    case "DRINK_AND_DRAW_AGAIN": {
      applyDrinkEvent(state, selfIndex, 1, "Drink and Draw Again", log);
      log(`${p.name} keeps their turn and draws new cards.`);
      return { endTurn: false, refreshCards: true };
    }

    case "RISKY_ADVICE_D20": {
      const r = rollDie(20);
      log(`Risky roll (d20): ${r}`);

      if (r === 1) {
        log("Critical fail: down your drink. (We treat this as Shotgun.)");
        applyDrinkEvent(state, selfIndex, "Shotgun", "Risky Advice: 1", log);
        return;
      }

      if (r === 20) {
        log("Natural 20: everyone else downs. (We treat this as Shotgun.)");
        state.players.forEach((_, idx) => {
          if (idx !== selfIndex) applyDrinkEvent(state, idx, "Shotgun", "Risky Advice: 20", log);
        });
        return;
      }

      log("Give a genuinely useful tip. Table votes: if it's BAD -> you drink 2. If it's GOOD -> you may give 2.");
      return;
    }

    case "COLLECTOR": {
      const myItems = inventoryCount(p);
      const maxItems = maxItemsAnyPlayer(state);

      if (maxItems <= 0) {
        log("The Collector: nobody has any items. Nothing happens.");
        return;
      }

      if (myItems === maxItems) {
        log(`The Collector: you have the most items (${myItems}). Drink ${myItems}.`);
        if (myItems > 0) applyDrinkEvent(state, selfIndex, myItems, "The Collector", log);
      } else {
        log(`The Collector: you do NOT have the most items (${myItems} vs max ${maxItems}). Safe... for now.`);
      }
      return;
    }

    case "MINIMALIST": {
      const myItems = inventoryCount(p);
      if (myItems !== 0) {
        log(`The Minimalist: you have ${myItems} item(s), so nothing happens.`);
        return;
      }

      const give = totalOtherItems(state, selfIndex);
      if (give <= 0) {
        log("The Minimalist: everyone is item-poor. Nothing happens.");
        return;
      }

      log(`The Minimalist: you have 0 items -> GIVE ${give} drinks (total items held by others).`);
      return;
    }

    default:
      return;
  }
}
