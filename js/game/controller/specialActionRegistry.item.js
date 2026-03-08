import { recordGiveDrinks } from '../../stats.js';
import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import {
  ensureInventory,
  inventoryCount,
  maxItemsAnyPlayer,
  totalOtherItems
} from './specialActionSupport.js';
import { actorNameFromContext, createChoiceResult } from './specialActionRegistry.shared.js';

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

export const itemSpecialActionHandlers = Object.freeze({
  [ACTION_CODES.IMMUNITY_OR_SUFFER]: handleImmunityOrSuffer,
  [ACTION_CODES.ITEM_BUYOUT]: handleItemBuyout,
  [ACTION_CODES.COLLECTOR]: handleCollector,
  [ACTION_CODES.MINIMALIST]: handleMinimalist
});
