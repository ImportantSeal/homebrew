import { recordGiveDrinks } from '../../stats.js';
import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import { queueManualPenaltyDraw, queueManualPenaltyDrawForPlayers } from './helpers.js';
import {
  inventoryCount,
  totalOtherItems,
  maxItemsAnyPlayer,
  createChoiceAction,
  applyEveryoneDrink,
  applyEveryoneElseDrink,
  ensureInventory,
  createTargetPlayerChoiceAction
} from './specialActions.js';

function createChoiceResult(config, log, failureMessage) {
  const choice = createChoiceAction(config);
  if (!choice) {
    log?.(failureMessage);
    return;
  }

  return {
    endTurn: false,
    choice
  };
}

function hasActiveTimedEffects(state) {
  return Array.isArray(state?.effects)
    && state.effects.some((effect) => (effect?.remainingTurns ?? 0) > 0);
}

function allPlayerIndexes(state) {
  return Array.isArray(state?.players) ? state.players.map((_, index) => index) : [];
}

function actorNameFromContext(context) {
  return context.currentPlayer?.name || 'Current player';
}

function handleWhoKnowsYou(context) {
  const { state, log } = context;
  const actorName = actorNameFromContext(context);

  if ((state.players?.length || 0) < 2) {
    log("Who Knows You needs at least two players.");
    return;
  }

  log(`${actorName} asks anyone a question about ${actorName}. Wrong answer -> responder drinks 3. Correct answer -> ${actorName} drinks 3.`);
}

function handleEverybodyDrinkClink(context) {
  const { state, log, applyDrinkEvent } = context;

  applyEveryoneDrink(state, 1, "Everybody Drink", log, applyDrinkEvent);
  log("Everybody drinks 1 and clinks glasses.");
}

function handleDoubleOrNothingD6(context) {
  const { state, currentPlayerIndex, log, applyDrinkEvent } = context;
  const actorName = actorNameFromContext(context);

  applyDrinkEvent(state, currentPlayerIndex, 4, "Double or Nothing", log);
  log(`${actorName} drinks 4 first. Roll a d6 manually: on 4-6 give 8 drinks total, on 1-3 drink 8 more.`);
}

function handleDrinkAndDrawAgain(context) {
  const { state, currentPlayerIndex, log, applyDrinkEvent } = context;
  const actorName = actorNameFromContext(context);

  applyDrinkEvent(state, currentPlayerIndex, 1, "Drink and Draw Again", log);
  log(`${actorName} keeps their turn and draws new cards.`);
  return { endTurn: false, refreshCards: true };
}

function handleChaosButton(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.CHAOS_BUTTON,
    title: "Chaos Button",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "everybody_drinks_3",
        label: "Everybody drinks 3 now",
        variant: "danger",
        run: ({ state, log, applyDrinkEvent }) => {
          log?.("Chaos Button choice: everybody drinks 3 now.");
          applyEveryoneDrink(state, 3, "Chaos Button", log, applyDrinkEvent);
          log?.("Everybody drinks 3.");
          return { endTurn: true };
        }
      },
      {
        id: "drink_1_draw_again",
        label: "Drink 1 and draw one extra card",
        variant: "primary",
        run: ({ state, currentPlayer, currentPlayerIndex, log, applyDrinkEvent }) => {
          const innerActorName = currentPlayer?.name || actorName;
          applyDrinkEvent(state, currentPlayerIndex, 1, "Chaos Button", log);
          log?.(`${innerActorName} keeps their turn and draws one extra card.`);
          return { endTurn: false, refreshCards: true };
        }
      }
    ]
  }, context.log, "Chaos Button choice setup failed. Skipping card action.");
}

function handleSelfishSwitch(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.SELFISH_SWITCH,
    title: "Selfish Switch",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "drink_4",
        label: "Drink 4",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 4, "Selfish Switch", log);
          return { endTurn: true };
        }
      },
      {
        id: "give_6",
        label: "Give 6 drinks total",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 6);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 6 drinks total.`);
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Selfish Switch choice setup failed.");
}

function handleMercyCard(actionCode, context) {
  const cardTitle = actionCode === ACTION_CODES.MERCY_CLAUSE ? "Mercy Clause" : "Mercy or Mayhem";

  return createChoiceResult({
    key: actionCode,
    title: cardTitle,
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "everybody_drinks_1",
        label: "Everybody drinks 1",
        variant: "primary",
        run: ({ state, log, applyDrinkEvent }) => {
          applyEveryoneDrink(state, 1, cardTitle, log, applyDrinkEvent);
          log?.("Everybody drinks 1.");
          return { endTurn: true };
        }
      },
      {
        id: "pick_player_drinks_4",
        label: "Pick one player to drink 4",
        variant: "danger",
        run: ({ state, log }) => {
          const targetChoice = createTargetPlayerChoiceAction({
            key: `${actionCode}_TARGET`,
            title: cardTitle,
            message: "Pick one player (you can pick yourself) to drink 4.",
            state,
            optionVariant: "danger",
            onPick: ({ state, log, applyDrinkEvent }, targetIndex, targetName) => {
              applyDrinkEvent(state, targetIndex, 4, cardTitle, log);
              log?.(`${targetName} drinks 4 (${cardTitle}).`);
              return { endTurn: true };
            }
          });

          if (!targetChoice) {
            log?.(`${cardTitle} needs at least two players.`);
            return { endTurn: true };
          }

          return { endTurn: false, choice: targetChoice };
        }
      }
    ]
  }, context.log, `${cardTitle} choice setup failed.`);
}

function handleLastCallInsurance(context) {
  return createChoiceResult({
    key: ACTION_CODES.LAST_CALL_INSURANCE,
    title: "Last Call Insurance",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "take_shot",
        label: "Take a Shot",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, "Shot", "Last Call Insurance", log);
          return { endTurn: true };
        }
      },
      {
        id: "everybody_drinks_2",
        label: "Everybody drinks 2",
        variant: "primary",
        run: ({ state, log, applyDrinkEvent }) => {
          applyEveryoneDrink(state, 2, "Last Call Insurance", log, applyDrinkEvent);
          log?.("Everybody drinks 2.");
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Last Call Insurance choice setup failed.");
}

function handleChaosReferendumGroup(context) {
  return createChoiceResult({
    key: ACTION_CODES.CHAOS_REFERENDUM_GROUP,
    title: "Chaos Referendum",
    message: "Group vote: either everybody drinks 5 OR everybody takes a Penalty card.",
    variant: "choice",
    options: [
      {
        id: "everybody_drinks_5",
        label: "Everybody drinks 5",
        variant: "danger",
        run: ({ state, log, applyDrinkEvent }) => {
          applyEveryoneDrink(state, 5, "Chaos Referendum", log, applyDrinkEvent);
          log?.("Chaos Referendum result: everybody drinks 5.");
          return { endTurn: true };
        }
      },
      {
        id: "everybody_penalty_card",
        label: "Everybody takes a Penalty card",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log }) => {
          queueManualPenaltyDrawForPlayers(
            state,
            log,
            allPlayerIndexes(state),
            currentPlayerIndex,
            "Chaos Referendum: everybody takes a Penalty card."
          );
          return { endTurn: false };
        }
      }
    ]
  }, context.log, "Chaos Referendum choice setup failed.");
}

function handlePenaltyInsurance(context) {
  return createChoiceResult({
    key: ACTION_CODES.PENALTY_INSURANCE,
    title: "Penalty Insurance",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "draw_penalty",
        label: "Draw a Penalty card",
        variant: "danger",
        run: ({ state, log }) => {
          queueManualPenaltyDraw(
            state,
            log,
            "Penalty Insurance: click the Penalty Deck to roll and continue."
          );
          return { endTurn: false };
        }
      },
      {
        id: "drink_5_avoid",
        label: "Drink 5 to avoid the penalty",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 5, "Penalty Insurance", log);
          log?.("Penalty avoided.");
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Penalty Insurance choice setup failed.");
}

function handleDealWithDevil(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.DEAL_WITH_DEVIL,
    title: "Deal with Devil",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "penalty_then_give_6",
        label: "Draw a Penalty card, then give 6",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 6);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 6 drinks total.`);
          queueManualPenaltyDraw(
            state,
            log,
            "Deal with Devil: click the Penalty Deck to roll and continue."
          );
          return { endTurn: false };
        }
      },
      {
        id: "drink_4",
        label: "Drink 4",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 4, "Deal with Devil", log);
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Deal with Devil choice setup failed.");
}

function handleImmunityOrSuffer(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.IMMUNITY_OR_SUFFER,
    title: "Immunity or Suffer",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "gain_immunity_drink_5",
        label: "Gain Immunity and drink 5",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          if (!state.includeItems) {
            log?.("Items are disabled. Immunity cannot be gained.");
            applyDrinkEvent(state, currentPlayerIndex, 5, "Immunity or Suffer", log);
            return { endTurn: true };
          }

          const player = state.players?.[currentPlayerIndex];
          ensureInventory(player).push("Immunity");

          applyDrinkEvent(state, currentPlayerIndex, 5, "Immunity or Suffer", log);
          log?.(`${player?.name || actorName} gained item: Immunity.`);
          return { endTurn: true };
        }
      },
      {
        id: "skip_item_drink_2",
        label: "Skip item and drink 2",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 2, "Immunity or Suffer", log);
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Immunity or Suffer choice setup failed.");
}

function handleItemBuyout(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.ITEM_BUYOUT,
    title: "Item Buyout",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "discard_1_give_8",
        label: "Discard 1 item and give 8",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          if (!state.includeItems) {
            log?.("Items are disabled. Item Buyout falls back to Drink 3.");
            applyDrinkEvent(state, currentPlayerIndex, 3, "Item Buyout", log);
            return { endTurn: true };
          }

          const player = state.players?.[currentPlayerIndex];
          const inventory = ensureInventory(player);
          if (inventory.length <= 0) {
            log?.("You have no item to discard. Drink 3 instead.");
            applyDrinkEvent(state, currentPlayerIndex, 3, "Item Buyout", log);
            return { endTurn: true };
          }

          const removedItem = inventory.shift();
          recordGiveDrinks(state, currentPlayerIndex, 8);
          log?.(`${player?.name || actorName} discarded ${removedItem} and gives 8 drinks total.`);
          return { endTurn: true };
        }
      },
      {
        id: "keep_items_drink_3",
        label: "Keep items and drink 3",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 3, "Item Buyout", log);
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Item Buyout choice setup failed.");
}

function handleFinalOffer(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.FINAL_OFFER,
    title: "Final Offer",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "shot_end_turn",
        label: "Take a Shot and end turn",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, "Shot", "Final Offer", log);
          return { endTurn: true };
        }
      },
      {
        id: "drink_5_draw_again",
        label: "Drink 5 and draw one extra card",
        variant: "primary",
        run: ({ state, currentPlayer, currentPlayerIndex, log, applyDrinkEvent }) => {
          const innerActorName = currentPlayer?.name || actorName;
          applyDrinkEvent(state, currentPlayerIndex, 5, "Final Offer", log);
          log?.(`${innerActorName} keeps their turn and draws one extra card.`);
          return { endTurn: false, refreshCards: true };
        }
      }
    ]
  }, context.log, "Final Offer choice setup failed.");
}

function handleColdExit(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.COLD_EXIT,
    title: "Cold Exit",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "drink_4_end_turn",
        label: "Drink 4 and end turn",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 4, "Cold Exit", log);
          return { endTurn: true };
        }
      },
      {
        id: "give_2_redraw",
        label: "Give 2 and redraw cards",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 2);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 2 and redraws cards.`);
          return { endTurn: false, refreshCards: true };
        }
      }
    ]
  }, context.log, "Cold Exit choice setup failed.");
}

function handleAllInTax(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.ALL_IN_TAX,
    title: "All-In Tax",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "drink_3",
        label: "Drink 3",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 3, "All-In Tax", log);
          return { endTurn: true };
        }
      },
      {
        id: "give_3_draw_penalty",
        label: "Give 3 and draw a Penalty card",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 3);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 3 and draws a penalty.`);
          queueManualPenaltyDraw(
            state,
            log,
            "All-In Tax: click the Penalty Deck to roll and continue."
          );
          return { endTurn: false };
        }
      }
    ]
  }, context.log, "All-In Tax choice setup failed.");
}

function handleEffectSurge(context) {
  const { state, log, applyDrinkEvent } = context;

  if (!hasActiveTimedEffects(state)) {
    log("Effect Surge: no active timed effects, so nothing happens.");
    return;
  }

  applyEveryoneDrink(state, 3, "Effect Surge", log, applyDrinkEvent);
  log("Effect Surge: active effect found. Everybody drinks 3.");
}

function handleCalmTableTax(context) {
  const { state, log, applyDrinkEvent } = context;

  if (hasActiveTimedEffects(state)) {
    log("Calm Table Tax: active timed effects found, so nothing happens.");
    return;
  }

  applyEveryoneDrink(state, 3, "Calm Table Tax", log, applyDrinkEvent);
  log("Calm Table Tax: no active effects. Everybody drinks 3.");
}

function handleMutualDamage(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.MUTUAL_DAMAGE,
    title: "Mutual Damage",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "you_and_target_drink_3",
        label: "You and one player both drink 3",
        variant: "danger",
        run: ({ state, log }) => {
          const targetChoice = createTargetPlayerChoiceAction({
            key: "MUTUAL_DAMAGE_TARGET",
            title: "Mutual Damage",
            message: "Pick one player. You both drink 3.",
            state,
            optionVariant: "danger",
            onPick: ({ state, currentPlayerIndex, log, applyDrinkEvent }, targetIndex, targetName) => {
              const currentActorName = state.players?.[currentPlayerIndex]?.name || actorName;
              if (targetIndex === currentPlayerIndex) {
                applyDrinkEvent(state, currentPlayerIndex, 3, "Mutual Damage", log);
                log?.(`${currentActorName} picked themselves and drinks 3.`);
                return { endTurn: true };
              }

              applyDrinkEvent(state, currentPlayerIndex, 3, "Mutual Damage", log);
              applyDrinkEvent(state, targetIndex, 3, "Mutual Damage", log);
              log?.(`${currentActorName} and ${targetName} both drink 3.`);
              return { endTurn: true };
            }
          });

          if (!targetChoice) {
            log?.("Mutual Damage needs at least two players.");
            return { endTurn: true };
          }

          return { endTurn: false, choice: targetChoice };
        }
      },
      {
        id: "everybody_else_drinks_1",
        label: "Everybody else drinks 1",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyEveryoneElseDrink(state, currentPlayerIndex, 1, "Mutual Damage", log, applyDrinkEvent);
          log?.("Everybody else drinks 1.");
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Mutual Damage choice setup failed.");
}

function handleRiskyRollD20(context) {
  context.log("Risky Roll (d20): roll manually now. On 1 you down your drink, on 20 everyone else downs, on 2-19 nothing happens.");
}

function handlePenaltyAllManual(context) {
  const { state, currentPlayerIndex, log } = context;

  queueManualPenaltyDrawForPlayers(
    state,
    log,
    allPlayerIndexes(state),
    currentPlayerIndex,
    "Fun for whole family: everybody takes a Penalty card."
  );
  return { endTurn: false };
}

function handleSharePenaltyLocked(context) {
  const { state, currentPlayerIndex, log } = context;

  const queued = queueManualPenaltyDraw(
    state,
    log,
    "Share Penalty active: roll the Penalty Deck, then apply the same penalty to one other player."
  );
  if (!queued) {
    state.sharePenalty = null;
    return;
  }

  state.sharePenalty = {
    active: true,
    sourcePlayerIndex: currentPlayerIndex,
    penalty: null
  };

  return { endTurn: false };
}

function handleCollector(context) {
  const { state, currentPlayer, currentPlayerIndex, log, applyDrinkEvent } = context;
  const myItems = inventoryCount(currentPlayer);
  const maxItems = maxItemsAnyPlayer(state);

  if (maxItems <= 0) {
    log("The Collector: nobody has any items. Nothing happens.");
    return;
  }

  if (myItems === maxItems) {
    log(`The Collector: you have the most items (${myItems}). Drink ${myItems}.`);
    if (myItems > 0) {
      applyDrinkEvent(state, currentPlayerIndex, myItems, "The Collector", log);
    }
    return;
  }

  log(`The Collector: you do NOT have the most items (${myItems} vs max ${maxItems}). Safe... for now.`);
}

function handleMinimalist(context) {
  const { state, currentPlayer, currentPlayerIndex, log } = context;
  const myItems = inventoryCount(currentPlayer);

  if (myItems !== 0) {
    log(`The Minimalist: you have ${myItems} item(s), so nothing happens.`);
    return;
  }

  const give = totalOtherItems(state, currentPlayerIndex);
  if (give <= 0) {
    log("The Minimalist: everyone is item-poor. Nothing happens.");
    return;
  }

  log(`The Minimalist: you have 0 items -> GIVE ${give} drinks (total items held by others).`);
  recordGiveDrinks(state, currentPlayerIndex, give);
}

const SPECIAL_ACTION_HANDLERS = Object.freeze({
  [ACTION_CODES.WHO_KNOWS_YOU]: handleWhoKnowsYou,
  [ACTION_CODES.EVERYBODY_DRINK_CLINK]: handleEverybodyDrinkClink,
  [ACTION_CODES.DOUBLE_OR_NOTHING_D6]: handleDoubleOrNothingD6,
  [ACTION_CODES.DRINK_AND_DRAW_AGAIN]: handleDrinkAndDrawAgain,
  [ACTION_CODES.CHAOS_BUTTON]: handleChaosButton,
  [ACTION_CODES.SELFISH_SWITCH]: handleSelfishSwitch,
  [ACTION_CODES.MERCY_OR_MAYHEM]: (context) => handleMercyCard(ACTION_CODES.MERCY_OR_MAYHEM, context),
  [ACTION_CODES.MERCY_CLAUSE]: (context) => handleMercyCard(ACTION_CODES.MERCY_CLAUSE, context),
  [ACTION_CODES.LAST_CALL_INSURANCE]: handleLastCallInsurance,
  [ACTION_CODES.CHAOS_REFERENDUM_GROUP]: handleChaosReferendumGroup,
  [ACTION_CODES.PENALTY_INSURANCE]: handlePenaltyInsurance,
  [ACTION_CODES.DEAL_WITH_DEVIL]: handleDealWithDevil,
  [ACTION_CODES.IMMUNITY_OR_SUFFER]: handleImmunityOrSuffer,
  [ACTION_CODES.ITEM_BUYOUT]: handleItemBuyout,
  [ACTION_CODES.FINAL_OFFER]: handleFinalOffer,
  [ACTION_CODES.COLD_EXIT]: handleColdExit,
  [ACTION_CODES.ALL_IN_TAX]: handleAllInTax,
  [ACTION_CODES.IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3]: handleEffectSurge,
  [ACTION_CODES.IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3]: handleCalmTableTax,
  [ACTION_CODES.MUTUAL_DAMAGE]: handleMutualDamage,
  [ACTION_CODES.RISKY_ROLL_D20]: handleRiskyRollD20,
  [ACTION_CODES.PENALTY_ALL_MANUAL]: handlePenaltyAllManual,
  [ACTION_CODES.SHARE_PENALTY_LOCKED]: handleSharePenaltyLocked,
  [ACTION_CODES.COLLECTOR]: handleCollector,
  [ACTION_CODES.MINIMALIST]: handleMinimalist
});

export function runSpecialActionFromRegistry(action, context) {
  const normalizedAction = String(action ?? '').trim();
  if (!normalizedAction) return;

  const handler = SPECIAL_ACTION_HANDLERS[normalizedAction];
  if (typeof handler !== 'function') return;

  return handler(context);
}
