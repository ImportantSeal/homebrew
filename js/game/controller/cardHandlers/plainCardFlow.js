import { getCardDisplayValue } from '../../../utils/cardDisplay.js';
import {
  isDrawPenaltyCardText,
  isDrawPenaltyForAllText,
  queueManualPenaltyDraw,
  queueManualPenaltyDrawForPlayers,
  parseDrinkFromText,
  parseGiveFromText,
  shouldShowActionScreenForPlainCard
} from '../helpers.js';
import { recordGiveDrinks } from '../../../stats.js';

export function createPlainCardFlow({
  state,
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
    const requiresActionScreen = shouldShowActionScreenForPlainCard(txt);

    // Penalty card (must confirm via penalty deck click).
    if (isDrawPenaltyCardText(txt)) {
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
    if (isDrawPenaltyForAllText(txt)) {
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
    if (Math.random() < 0.08) {
      const idx = parseInt(cardEl.dataset.index || "0", 10);
      activateDitto(state, cardEl, idx, log);

      onDittoActivated(state, state.currentPlayerIndex, log);
      replaceCardSelectionKind(state, state.currentPlayerIndex, selectedKind, 'ditto');
      setBaseBackgroundScene(state, 'ditto');

      unlockUI();
      renderEffectsPanel();
      return;
    }

    // Drink event hook (for Drink Buddy logging).
    const drink = parseDrinkFromText(txt);
    const give = parseGiveFromText(txt);
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
