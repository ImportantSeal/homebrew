import { getCardDisplayValue } from '../../../utils/cardDisplay.js';
import { getPlainCardSpec } from '../../../logic/cardSchema.js';
import {
  queueManualPenaltyDraw,
  queueManualPenaltyDrawForPlayers
} from '../helpers.js';
import { recordGiveDrinks } from '../../../stats.js';
import { resolveRng } from '../../../utils/rng.js';
import {
  DRAW_TWISTS,
  describeSavedCard,
  resolveDrawTwist,
  rollsSavior
} from '../../../logic/savior.js';
import { getForcedDrawTwist } from '../../../dev/cardTestMode.js';

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
  onDittoTriggered = null,
  onSaviorTriggered = null,
  replaceCardSelectionKind,
  setBaseBackgroundScene,
  flashElement,
  syncBackgroundScene
}) {
  function rollTwist(activeRng, spec, options = {}) {
    const roll = activeRng.nextFloat();
    const forced = getForcedDrawTwist();
    if (forced === DRAW_TWISTS.SAVIOR && rollsSavior(1, spec)) return DRAW_TWISTS.SAVIOR;
    if (forced === DRAW_TWISTS.DITTO && options.allowDitto !== false) return DRAW_TWISTS.DITTO;
    return resolveDrawTwist(roll, spec, options);
  }

  function openSaviorScreen(message) {
    openActionScreen("Savior", message, { variant: "savior", closeLabel: "Amen" });
  }

  /**
   * Savior on a Shot / Shotgun / Shot + Shotgun card.
   * - self card: the drawing player does not drink.
   * - everybody card: nobody drinks.
   * The turn advances exactly once, same as the normal card.
   */
  function resolveSavior(cardEl, spec, value, triggerEvent) {
    const p = currentPlayer();
    const playerIndex = state.currentPlayerIndex;
    const savedText = describeSavedCard(spec, value);
    const everybody = spec.drink?.scope === "all";
    const messageParts = [everybody
      ? `An angel descends! Nobody has to take ${savedText}.`
      : `An angel descends! ${p.name} is saved and does not have to take ${savedText}.`];

    log(everybody
      ? `Savior! Everybody is saved from ${savedText}.`
      : `Savior! ${p.name} is saved from ${savedText}.`, { kind: "savior" });
    flashElement(cardEl, undefined, undefined, triggerEvent);

    if (typeof onSaviorTriggered === "function") {
      onSaviorTriggered({ playerIndex: everybody ? null : playerIndex, everybody, cardData: value });
    }

    // Drink + Give: the blessing only cancels the drinking part.
    if (spec.give) {
      recordGiveDrinks(state, playerIndex, spec.give.amount);
      log(`${p.name} gives ${spec.give.amount}.`);
      messageParts.push(`${p.name} still gives ${spec.give.amount}.`);
    }

    openSaviorScreen(messageParts.join(" "));

    nextPlayer();
    unlockUI();
    renderEffectsPanel();
  }

  function handlePlainCard(cardEl, cardData, selectedKind, triggerEvent = null) {
    const p = currentPlayer();
    const value = getCardDisplayValue(cardData);
    const txt = String(value).trim();
    const spec = getPlainCardSpec(cardData);
    const requiresActionScreen = spec.requiresActionScreen;
    const activeRng = resolveRng(rng ?? state?.rng);

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

    // Savior (Shot / Shotgun / combo cards only) and Ditto (any plain card)
    // are resolved from the same roll, so they can never both trigger.
    const twist = rollTwist(activeRng, spec);
    if (twist === DRAW_TWISTS.SAVIOR) {
      resolveSavior(cardEl, spec, txt, triggerEvent);
      return;
    }

    if (twist === DRAW_TWISTS.DITTO) {
      const idx = parseInt(cardEl.dataset.index || "0", 10);
      activateDitto(state, cardEl, idx, log, cardData);
      if (typeof onDittoTriggered === 'function') {
        onDittoTriggered({ cardIndex: idx, cardData });
      }

      const dittoNotes = onDittoActivated(state, state.currentPlayerIndex, log);
      if (Array.isArray(dittoNotes) && dittoNotes.length > 0 && state.dittoPending?.[idx]) {
        state.dittoPending[idx] = { ...state.dittoPending[idx], notes: dittoNotes };
      }
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
