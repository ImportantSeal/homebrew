import { getCardDisplayValue } from '../../../utils/cardDisplay.js';
import { getPlainCardSpec } from '../../../logic/cardSchema.js';
import {
  queueManualPenaltyDraw,
  queueManualPenaltyDrawForPlayers
} from '../helpers.js';
import { recordGiveDrinks } from '../../../stats.js';
import { resolveRng } from '../../../utils/rng.js';

export function createPlainCardFlow({
  state,
  rng,
  log,
  currentPlayer,
  nextPlayer,
  unlockUI,
  renderEffectsPanel,
  renderItems,
  renderTurnOrder,
  openActionScreen,
  applyDrinkEvent,
  activateDitto,
  onDittoActivated,
  replaceCardSelectionKind,
  setBaseBackgroundScene,
  flashElement,
  syncBackgroundScene
}) {
  function handlePlainCard(cardEl, cardData, selectedKind, triggerEvent = null) {
    const p = currentPlayer();
    const value = getCardDisplayValue(cardData);
    const txt = String(value).trim();
    const spec = getPlainCardSpec(cardData);
    const requiresActionScreen = spec.requiresActionScreen;

    // Penalty card (must confirm via penalty deck click).
    if (spec.penaltyCall === "single") {
      flashElement(cardEl, undefined, undefined, triggerEvent);
      queueManualPenaltyDraw(
        state,
        log,
        `${p.name} selected Draw a Penalty Card. Click the Penalty Deck to roll.`
      );
      unlockUI();
      renderEffectsPanel();
      syncBackgroundScene(state);
      return;
    }

    // Everybody penalty card (manual queue through penalty deck).
    if (spec.penaltyCall === "group") {
      flashElement(cardEl, undefined, undefined, triggerEvent);

      const allPlayers = Array.isArray(state.players)
        ? state.players.map((_, idx) => idx)
        : [];

      queueManualPenaltyDrawForPlayers(
        state,
        log,
        allPlayers,
        state.currentPlayerIndex,
        `${p.name} selected Everybody takes a Penalty card. Click the Penalty Deck to start.`
      );
      unlockUI();
      renderEffectsPanel();
      syncBackgroundScene(state);
      return;
    }

    // Item cards.
    if (state.includeItems && state.itemCards.includes(value)) {
      log(`${p.name} acquired item: ${value}`);
      p.inventory.push(value);

      flashElement(cardEl, undefined, undefined, triggerEvent);
      renderTurnOrder(state);
      renderItems();
      renderEffectsPanel();

      nextPlayer();
      unlockUI();
      return;
    }

    // Ditto activation chance.
    const activeRng = resolveRng(rng ?? state?.rng);
    if (activeRng.nextFloat() < 0.16) { //16% chance to activate Ditto on any plain card
      const idx = parseInt(cardEl.dataset.index || "0", 10);
      activateDitto(state, cardEl, idx, log, cardData);

      onDittoActivated(state, state.currentPlayerIndex, log);
      replaceCardSelectionKind(state, state.currentPlayerIndex, selectedKind, 'ditto');
      setBaseBackgroundScene(state, 'ditto');

      unlockUI();
      renderEffectsPanel();
      return;
    }

    // Drink event hook (for Drink Buddy logging).
    const drink = spec.drink;
    const give = spec.give;
    if (drink) {
      if (drink.scope === "all") {
        let everyoneAction = "";
        if (typeof drink.amount === "number") {
          everyoneAction = `drinks ${drink.amount}.`;
        } else if (/^Shot\+Shotgun$/i.test(drink.amount)) {
          everyoneAction = "takes a Shot and a Shotgun.";
        } else if (/^Shotgun$/i.test(drink.amount)) {
          everyoneAction = "takes a Shotgun.";
        } else {
          everyoneAction = "takes a Shot.";
        }
        log(`Everybody ${everyoneAction}`);
        state.players.forEach((_, idx) => {
          applyDrinkEvent(state, idx, drink.amount, "Everybody drinks", log, { suppressSelfLog: true });
        });
      } else {
        applyDrinkEvent(state, state.currentPlayerIndex, drink.amount, "Drink card", log);
      }
    }

    if (give) {
      recordGiveDrinks(state, state.currentPlayerIndex, give.amount);
      log(`${p.name} gives ${give.amount}.`);
    } else if (!drink && !requiresActionScreen) {
      log(`${p.name} selected ${value}`);
    }

    if (requiresActionScreen) {
      const actionMessage = `${p.name} action: ${txt}`;
      log(actionMessage);
      openActionScreen("Card Action", actionMessage, { variant: "normal" });
    }

    flashElement(cardEl, undefined, undefined, triggerEvent);

    nextPlayer();
    unlockUI();
    renderEffectsPanel();
  }

  return {
    handlePlainCard
  };
}
