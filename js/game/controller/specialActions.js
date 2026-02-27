import { recordGiveDrinks } from '../../stats.js';

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

function normalizeChoiceText(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeChoiceOptions(options) {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      if (!option || typeof option !== 'object') return null;

      const id = normalizeChoiceText(option.id, `choice_${index + 1}`);
      const label = normalizeChoiceText(option.label, '');
      if (!label) return null;
      if (typeof option.run !== 'function') return null;

      return {
        id,
        label,
        variant: normalizeChoiceText(option.variant, 'primary').toLowerCase(),
        run: option.run
      };
    })
    .filter(Boolean);
}

function createChoiceAction({
  key = '',
  title = 'Choose One',
  message = 'Choose one option to continue.',
  variant = 'choice',
  options = []
} = {}) {
  const normalizedOptions = normalizeChoiceOptions(options);
  if (normalizedOptions.length === 0) return null;

  return {
    type: 'choice',
    key: normalizeChoiceText(key, ''),
    title: normalizeChoiceText(title, 'Choose One'),
    message: normalizeChoiceText(message, 'Choose one option to continue.'),
    variant: normalizeChoiceText(variant, 'choice').toLowerCase(),
    options: normalizedOptions
  };
}

function applyEveryoneDrink(state, amount, reason, log, applyDrinkEvent) {
  if (!Array.isArray(state?.players) || typeof applyDrinkEvent !== 'function') return;

  state.players.forEach((_, idx) => {
    applyDrinkEvent(state, idx, amount, reason, log, { suppressSelfLog: true });
  });
}

export function runSpecialChoiceAction(choiceAction, optionId, context) {
  if (!choiceAction || choiceAction.type !== 'choice') return null;

  const options = Array.isArray(choiceAction.options) ? choiceAction.options : [];
  if (options.length === 0) return null;

  const selectedId = String(optionId ?? '').trim();
  const selected = options.find(option => String(option.id).trim() === selectedId);
  if (!selected || typeof selected.run !== 'function') return null;

  const result = selected.run(context);
  return result && typeof result === 'object' ? result : {};
}

export function runSpecialAction(action, context) {
  const {
    state,
    currentPlayer,
    currentPlayerIndex,
    log,
    applyDrinkEvent,
    rollPenaltyCard
  } = context;

  const p = currentPlayer || { name: 'Current player' };
  const selfIndex = currentPlayerIndex;

  switch (action) {
    case "WHO_KNOWS_YOU": {
      if ((state.players?.length || 0) < 2) {
        log("Who Knows You needs at least two players.");
        return;
      }

      log(`${p.name} asks anyone a question about ${p.name}. Wrong answer -> responder takes a Penalty card. Correct answer -> ${p.name} takes a Penalty card.`);
      return;
    }

    case "DOUBLE_OR_NOTHING_D6": {
      applyDrinkEvent(state, selfIndex, 4, "Double or Nothing", log);
      log(`${p.name} drinks 4 and rolls a d6 for Double or Nothing.`);

      const r = rollDie(6);
      log(`Double or Nothing roll (d6): ${r}`);

      if (r >= 4) {
        log(`${p.name} wins: give 8 drinks.`);
        recordGiveDrinks(state, selfIndex, 8);
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

    case "CHAOS_BUTTON": {
      const choice = createChoiceAction({
        key: "CHAOS_BUTTON",
        title: "Chaos Button",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "everybody_drinks_3",
            label: "Everybody drinks 3 now",
            variant: "danger",
            run: ({ state: innerState, log: innerLog, applyDrinkEvent: applyInnerDrinkEvent }) => {
              innerLog?.("Chaos Button choice: everybody drinks 3 now.");
              applyEveryoneDrink(innerState, 3, "Chaos Button", innerLog, applyInnerDrinkEvent);
              innerLog?.("Everybody drinks 3.");
              return { endTurn: true };
            }
          },
          {
            id: "drink_1_draw_again",
            label: "Drink 1 and draw one extra card",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayer: innerPlayer,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              const actorName = innerPlayer?.name || p.name;
              applyInnerDrinkEvent(innerState, innerIndex, 1, "Chaos Button", innerLog);
              innerLog?.(`${actorName} keeps their turn and draws one extra card.`);
              return { endTurn: false, refreshCards: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Chaos Button choice setup failed. Skipping card action.");
        return;
      }

      return {
        endTurn: false,
        choice
      };
    }

    case "RISKY_ROLL_D20": {
      const r = rollDie(20);
      log(`Risky roll (d20): ${r}`);

      if (r === 1) {
        log("Critical fail: you down your drink. (We treat this as Shotgun.)");
        applyDrinkEvent(state, selfIndex, "Shotgun", "Risky Roll: 1", log);
        return;
      }

      if (r === 20) {
        log("Natural 20: everyone else downs. (We treat this as Shotgun.)");
        state.players.forEach((_, idx) => {
          if (idx !== selfIndex) applyDrinkEvent(state, idx, "Shotgun", "Risky Roll: 20", log);
        });
        return;
      }

      log("Risky Roll: nothing happens.");
      return;
    }

    case "SHARE_PENALTY_LOCKED": {
      if (typeof rollPenaltyCard !== "function") {
        log("Share Penalty could not roll the penalty deck.");
        return;
      }

      if (state.penaltyShown) {
        log("Resolve the current penalty first.");
        return { endTurn: false };
      }

      rollPenaltyCard(state, log, "card", applyDrinkEvent);

      if (!state.penaltyShown) {
        log("Share Penalty was blocked by Shield.");
        return;
      }

      const rolled = String(state.penaltyCard || "Penalty");
      log(`Share Penalty active: apply "${rolled}" to one other player, then click the Penalty Deck to continue.`);
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
      recordGiveDrinks(state, selfIndex, give);
      return;
    }

    default:
      return;
  }
}
