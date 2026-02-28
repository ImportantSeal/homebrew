import { randomFromArray } from '../../utils/random.js';
import { recordGiveDrinks, recordPenaltyTaken } from '../../stats.js';

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

function applyEveryoneElseDrink(state, selfIndex, amount, reason, log, applyDrinkEvent) {
  if (!Array.isArray(state?.players) || typeof applyDrinkEvent !== 'function') return;

  state.players.forEach((_, idx) => {
    if (idx === selfIndex) return;
    applyDrinkEvent(state, idx, amount, reason, log, { suppressSelfLog: true });
  });
}

function applyPenaltyCardToPlayer(state, playerIndex, reason, log, applyDrinkEvent) {
  const player = state.players?.[playerIndex];
  if (!player) return;

  if (player.shield) {
    log?.(`${player.name}'s Shield protected against the penalty!`);
    delete player.shield;
    return;
  }

  const deck = Array.isArray(state?.penaltyDeck) && state.penaltyDeck.length > 0
    ? state.penaltyDeck
    : ["Drink 3"];
  const penalty = randomFromArray(deck);

  recordPenaltyTaken(state, playerIndex);
  log?.(`${player.name} rolled penalty card: ${penalty}${reason ? ` (${reason})` : ''}`);

  if (typeof applyDrinkEvent !== 'function') return;

  const s = String(penalty || '').trim();
  const m = s.match(/^Drink\s+(\d+)/i);
  if (m) {
    applyDrinkEvent(state, playerIndex, parseInt(m[1], 10) || 1, "Penalty", log);
  } else if (/^Shotgun$/i.test(s)) {
    applyDrinkEvent(state, playerIndex, "Shotgun", "Penalty: Shotgun", log);
  } else if (/^Shot$/i.test(s)) {
    applyDrinkEvent(state, playerIndex, "Shot", "Penalty: Shot", log);
  }
}

function ensureInventory(player) {
  if (!player || typeof player !== 'object') return [];
  if (!Array.isArray(player.inventory)) player.inventory = [];
  return player.inventory;
}

function createTargetPlayerChoiceAction({
  key = 'TARGET_PICK',
  title = 'Pick a Player',
  message = 'Pick one player to continue.',
  state,
  selfIndex,
  optionVariant = 'danger',
  onPick
} = {}) {
  const players = Array.isArray(state?.players) ? state.players : [];
  const options = players
    .map((player, idx) => ({
      idx,
      name: normalizeChoiceText(player?.name, `Player ${idx + 1}`)
    }))
    .filter(player => player.idx !== selfIndex)
    .map(({ idx, name }) => ({
      id: `target_${idx}`,
      label: name,
      variant: optionVariant,
      run: (context) => {
        if (typeof onPick !== 'function') return {};
        const result = onPick(context, idx, name);
        return result && typeof result === 'object' ? result : {};
      }
    }));

  if (options.length === 0) return null;

  return createChoiceAction({
    key,
    title,
    message,
    variant: 'choice',
    options
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

    case "SELFISH_SWITCH": {
      const choice = createChoiceAction({
        key: "SELFISH_SWITCH",
        title: "Selfish Switch",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "drink_4",
            label: "Drink 4",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 4, "Selfish Switch", innerLog);
              return { endTurn: true };
            }
          },
          {
            id: "give_6",
            label: "Give 6 drinks total",
            variant: "primary",
            run: ({ state: innerState, currentPlayerIndex: innerIndex, log: innerLog }) => {
              recordGiveDrinks(innerState, innerIndex, 6);
              innerLog?.(`${innerState.players?.[innerIndex]?.name || p.name} gives 6 drinks total.`);
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Selfish Switch choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "MERCY_OR_MAYHEM":
    case "MERCY_CLAUSE": {
      const cardTitle = action === "MERCY_CLAUSE" ? "Mercy Clause" : "Mercy or Mayhem";

      const choice = createChoiceAction({
        key: action,
        title: cardTitle,
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "everybody_drinks_1",
            label: "Everybody drinks 1",
            variant: "primary",
            run: ({ state: innerState, log: innerLog, applyDrinkEvent: applyInnerDrinkEvent }) => {
              applyEveryoneDrink(innerState, 1, cardTitle, innerLog, applyInnerDrinkEvent);
              innerLog?.("Everybody drinks 1.");
              return { endTurn: true };
            }
          },
          {
            id: "pick_player_drinks_4",
            label: "Pick one player to drink 4",
            variant: "danger",
            run: ({ state: innerState, currentPlayerIndex: innerIndex, log: innerLog }) => {
              const targetChoice = createTargetPlayerChoiceAction({
                key: `${action}_TARGET`,
                title: cardTitle,
                message: "Pick one player to drink 4.",
                state: innerState,
                selfIndex: innerIndex,
                optionVariant: "danger",
                onPick: ({
                  state: targetState,
                  log: targetLog,
                  applyDrinkEvent: applyTargetDrinkEvent
                }, targetIndex, targetName) => {
                  applyTargetDrinkEvent(targetState, targetIndex, 4, cardTitle, targetLog);
                  targetLog?.(`${targetName} drinks 4 (${cardTitle}).`);
                  return { endTurn: true };
                }
              });

              if (!targetChoice) {
                innerLog?.(`${cardTitle} needs at least two players.`);
                return { endTurn: true };
              }

              return { endTurn: false, choice: targetChoice };
            }
          }
        ]
      });

      if (!choice) {
        log(`${cardTitle} choice setup failed.`);
        return;
      }

      return { endTurn: false, choice };
    }

    case "LAST_CALL_INSURANCE": {
      const choice = createChoiceAction({
        key: "LAST_CALL_INSURANCE",
        title: "Last Call Insurance",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "take_shot",
            label: "Take a Shot",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, "Shot", "Last Call Insurance", innerLog);
              return { endTurn: true };
            }
          },
          {
            id: "everybody_drinks_2",
            label: "Everybody drinks 2",
            variant: "primary",
            run: ({ state: innerState, log: innerLog, applyDrinkEvent: applyInnerDrinkEvent }) => {
              applyEveryoneDrink(innerState, 2, "Last Call Insurance", innerLog, applyInnerDrinkEvent);
              innerLog?.("Everybody drinks 2.");
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Last Call Insurance choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "CHAOS_REFERENDUM_GROUP": {
      const choice = createChoiceAction({
        key: "CHAOS_REFERENDUM_GROUP",
        title: "Chaos Referendum",
        message: "Group vote: either everybody drinks 5 OR everybody takes a Penalty card.",
        variant: "choice",
        options: [
          {
            id: "everybody_drinks_5",
            label: "Everybody drinks 5",
            variant: "danger",
            run: ({ state: innerState, log: innerLog, applyDrinkEvent: applyInnerDrinkEvent }) => {
              applyEveryoneDrink(innerState, 5, "Chaos Referendum", innerLog, applyInnerDrinkEvent);
              innerLog?.("Chaos Referendum result: everybody drinks 5.");
              return { endTurn: true };
            }
          },
          {
            id: "everybody_penalty_card",
            label: "Everybody takes a Penalty card",
            variant: "primary",
            run: ({ state: innerState, log: innerLog, applyDrinkEvent: applyInnerDrinkEvent }) => {
              innerLog?.("Chaos Referendum result: everybody takes a Penalty card.");
              innerState.players.forEach((_, idx) => {
                applyPenaltyCardToPlayer(innerState, idx, "Chaos Referendum", innerLog, applyInnerDrinkEvent);
              });
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Chaos Referendum choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "PENALTY_INSURANCE": {
      const choice = createChoiceAction({
        key: "PENALTY_INSURANCE",
        title: "Penalty Insurance",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "draw_penalty",
            label: "Draw a Penalty card",
            variant: "danger",
            run: ({
              state: innerState,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent,
              rollPenaltyCard: rollInnerPenaltyCard
            }) => {
              if (innerState.penaltyShown) {
                innerLog?.("Resolve the current penalty first.");
                return { endTurn: false };
              }

              if (typeof rollInnerPenaltyCard !== "function") {
                innerLog?.("Penalty Insurance could not roll the penalty deck.");
                return { endTurn: true };
              }

              rollInnerPenaltyCard(innerState, innerLog, "card", applyInnerDrinkEvent);

              if (!innerState.penaltyShown) {
                innerLog?.("Penalty Insurance: penalty was blocked by Shield.");
                return { endTurn: true };
              }

              innerLog?.("Penalty Insurance: click the Penalty Deck to confirm and continue.");
              return { endTurn: false };
            }
          },
          {
            id: "drink_5_avoid",
            label: "Drink 5 to avoid the penalty",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 5, "Penalty Insurance", innerLog);
              innerLog?.("Penalty avoided.");
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Penalty Insurance choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "DEAL_WITH_DEVIL": {
      const choice = createChoiceAction({
        key: "DEAL_WITH_DEVIL",
        title: "Deal with Devil",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "penalty_then_give_6",
            label: "Draw a Penalty card, then give 6",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent,
              rollPenaltyCard: rollInnerPenaltyCard
            }) => {
              recordGiveDrinks(innerState, innerIndex, 6);
              innerLog?.(`${innerState.players?.[innerIndex]?.name || p.name} gives 6 drinks total.`);

              if (innerState.penaltyShown) {
                innerLog?.("Resolve the current penalty first.");
                return { endTurn: false };
              }

              if (typeof rollInnerPenaltyCard !== "function") {
                innerLog?.("Deal with Devil could not roll the penalty deck.");
                return { endTurn: true };
              }

              rollInnerPenaltyCard(innerState, innerLog, "card", applyInnerDrinkEvent);

              if (!innerState.penaltyShown) {
                innerLog?.("Deal with Devil: penalty was blocked by Shield.");
                return { endTurn: true };
              }

              innerLog?.("Deal with Devil: click the Penalty Deck to confirm and continue.");
              return { endTurn: false };
            }
          },
          {
            id: "drink_4",
            label: "Drink 4",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 4, "Deal with Devil", innerLog);
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Deal with Devil choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "IMMUNITY_OR_SUFFER": {
      const choice = createChoiceAction({
        key: "IMMUNITY_OR_SUFFER",
        title: "Immunity or Suffer",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "gain_immunity_drink_5",
            label: "Gain Immunity and drink 5",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              if (!innerState.includeItems) {
                innerLog?.("Items are disabled. Immunity cannot be gained.");
                applyInnerDrinkEvent(innerState, innerIndex, 5, "Immunity or Suffer", innerLog);
                return { endTurn: true };
              }

              const player = innerState.players?.[innerIndex];
              const inventory = ensureInventory(player);
              inventory.push("Immunity");

              applyInnerDrinkEvent(innerState, innerIndex, 5, "Immunity or Suffer", innerLog);
              innerLog?.(`${player?.name || p.name} gained item: Immunity.`);
              return { endTurn: true };
            }
          },
          {
            id: "skip_item_drink_2",
            label: "Skip item and drink 2",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 2, "Immunity or Suffer", innerLog);
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Immunity or Suffer choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "ITEM_BUYOUT": {
      const choice = createChoiceAction({
        key: "ITEM_BUYOUT",
        title: "Item Buyout",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "discard_1_give_8",
            label: "Discard 1 item and give 8",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              if (!innerState.includeItems) {
                innerLog?.("Items are disabled. Item Buyout falls back to Drink 3.");
                applyInnerDrinkEvent(innerState, innerIndex, 3, "Item Buyout", innerLog);
                return { endTurn: true };
              }

              const player = innerState.players?.[innerIndex];
              const inventory = ensureInventory(player);
              if (inventory.length <= 0) {
                innerLog?.("You have no item to discard. Drink 3 instead.");
                applyInnerDrinkEvent(innerState, innerIndex, 3, "Item Buyout", innerLog);
                return { endTurn: true };
              }

              const removed = inventory.shift();
              recordGiveDrinks(innerState, innerIndex, 8);
              innerLog?.(`${player?.name || p.name} discarded ${removed} and gives 8 drinks total.`);
              return { endTurn: true };
            }
          },
          {
            id: "keep_items_drink_3",
            label: "Keep items and drink 3",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 3, "Item Buyout", innerLog);
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Item Buyout choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "FINAL_OFFER": {
      const choice = createChoiceAction({
        key: "FINAL_OFFER",
        title: "Final Offer",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "shot_end_turn",
            label: "Take a Shot and end turn",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, "Shot", "Final Offer", innerLog);
              return { endTurn: true };
            }
          },
          {
            id: "drink_5_draw_again",
            label: "Drink 5 and draw one extra card",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayer: innerPlayer,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              const actorName = innerPlayer?.name || p.name;
              applyInnerDrinkEvent(innerState, innerIndex, 5, "Final Offer", innerLog);
              innerLog?.(`${actorName} keeps their turn and draws one extra card.`);
              return { endTurn: false, refreshCards: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Final Offer choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "COLD_EXIT": {
      const choice = createChoiceAction({
        key: "COLD_EXIT",
        title: "Cold Exit",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "drink_4_end_turn",
            label: "Drink 4 and end turn",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 4, "Cold Exit", innerLog);
              return { endTurn: true };
            }
          },
          {
            id: "give_2_redraw",
            label: "Give 2 and redraw cards",
            variant: "primary",
            run: ({ state: innerState, currentPlayerIndex: innerIndex, log: innerLog }) => {
              recordGiveDrinks(innerState, innerIndex, 2);
              innerLog?.(`${innerState.players?.[innerIndex]?.name || p.name} gives 2 and redraws cards.`);
              return { endTurn: false, refreshCards: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Cold Exit choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "ALL_IN_TAX": {
      const choice = createChoiceAction({
        key: "ALL_IN_TAX",
        title: "All-In Tax",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "drink_3",
            label: "Drink 3",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyInnerDrinkEvent(innerState, innerIndex, 3, "All-In Tax", innerLog);
              return { endTurn: true };
            }
          },
          {
            id: "give_3_draw_penalty",
            label: "Give 3 and draw a Penalty card",
            variant: "danger",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent,
              rollPenaltyCard: rollInnerPenaltyCard
            }) => {
              recordGiveDrinks(innerState, innerIndex, 3);
              innerLog?.(`${innerState.players?.[innerIndex]?.name || p.name} gives 3 and draws a penalty.`);

              if (innerState.penaltyShown) {
                innerLog?.("Resolve the current penalty first.");
                return { endTurn: false };
              }

              if (typeof rollInnerPenaltyCard !== "function") {
                innerLog?.("All-In Tax could not roll the penalty deck.");
                return { endTurn: true };
              }

              rollInnerPenaltyCard(innerState, innerLog, "card", applyInnerDrinkEvent);

              if (!innerState.penaltyShown) {
                innerLog?.("All-In Tax: penalty was blocked by Shield.");
                return { endTurn: true };
              }

              innerLog?.("All-In Tax: click the Penalty Deck to confirm and continue.");
              return { endTurn: false };
            }
          }
        ]
      });

      if (!choice) {
        log("All-In Tax choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
    }

    case "IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3": {
      const hasActiveEffects = Array.isArray(state.effects)
        && state.effects.some((effect) => (effect?.remainingTurns ?? 0) > 0);

      if (!hasActiveEffects) {
        log("Effect Surge: no active timed effects, so nothing happens.");
        return;
      }

      applyEveryoneDrink(state, 3, "Effect Surge", log, applyDrinkEvent);
      log("Effect Surge: active effect found. Everybody drinks 3.");
      return;
    }

    case "IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3": {
      const hasActiveEffects = Array.isArray(state.effects)
        && state.effects.some((effect) => (effect?.remainingTurns ?? 0) > 0);

      if (hasActiveEffects) {
        log("Calm Table Tax: active timed effects found, so nothing happens.");
        return;
      }

      applyEveryoneDrink(state, 3, "Calm Table Tax", log, applyDrinkEvent);
      log("Calm Table Tax: no active effects. Everybody drinks 3.");
      return;
    }

    case "MUTUAL_DAMAGE": {
      const choice = createChoiceAction({
        key: "MUTUAL_DAMAGE",
        title: "Mutual Damage",
        message: "Choose one option to continue.",
        variant: "choice",
        options: [
          {
            id: "you_and_target_drink_3",
            label: "You and one player both drink 3",
            variant: "danger",
            run: ({ state: innerState, currentPlayerIndex: innerIndex, log: innerLog }) => {
              const targetChoice = createTargetPlayerChoiceAction({
                key: "MUTUAL_DAMAGE_TARGET",
                title: "Mutual Damage",
                message: "Pick one player. You both drink 3.",
                state: innerState,
                selfIndex: innerIndex,
                optionVariant: "danger",
                onPick: ({
                  state: targetState,
                  currentPlayerIndex: actorIndex,
                  log: targetLog,
                  applyDrinkEvent: applyTargetDrinkEvent
                }, targetIndex, targetName) => {
                  const actorName = targetState.players?.[actorIndex]?.name || p.name;
                  applyTargetDrinkEvent(targetState, actorIndex, 3, "Mutual Damage", targetLog);
                  applyTargetDrinkEvent(targetState, targetIndex, 3, "Mutual Damage", targetLog);
                  targetLog?.(`${actorName} and ${targetName} both drink 3.`);
                  return { endTurn: true };
                }
              });

              if (!targetChoice) {
                innerLog?.("Mutual Damage needs at least two players.");
                return { endTurn: true };
              }

              return { endTurn: false, choice: targetChoice };
            }
          },
          {
            id: "everybody_else_drinks_1",
            label: "Everybody else drinks 1",
            variant: "primary",
            run: ({
              state: innerState,
              currentPlayerIndex: innerIndex,
              log: innerLog,
              applyDrinkEvent: applyInnerDrinkEvent
            }) => {
              applyEveryoneElseDrink(innerState, innerIndex, 1, "Mutual Damage", innerLog, applyInnerDrinkEvent);
              innerLog?.("Everybody else drinks 1.");
              return { endTurn: true };
            }
          }
        ]
      });

      if (!choice) {
        log("Mutual Damage choice setup failed.");
        return;
      }

      return { endTurn: false, choice };
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
