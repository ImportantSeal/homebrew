import { flipCardAnimation, flashElement } from '../../animations.js';

import { getCardDisplayValue } from '../../utils/cardDisplay.js';

import { rollPenaltyCard, hidePenaltyCard, showPenaltyPreview } from '../../logic/penalty.js';
import { activateDitto, runDittoEffect } from '../../logic/ditto.js';

import {
  addEffect,
  createEffect,
  beginTargetedEffectSelection,
  applyDrinkEvent,
  onDittoActivated
} from '../../logic/effects.js';

import { computeKind, getCardElements, setCardKind } from '../../ui/cards.js';

import {
  getBagKeyForObjectCard,
  ensureBag,
  getObjectCardPool,
  isDrawPenaltyCardText,
  shouldTriggerPenaltyPreview,
  parseDrinkFromText,
  parseGiveFromText,
  shouldShowActionScreenForPlainCard,
  isRedrawLockedPenaltyOpen
} from './helpers.js';

import { runSpecialAction, runSpecialChoiceAction } from './specialActions.js';
import { recordCardSelection, recordGiveDrinks } from '../../stats.js';
import { resolveStatsLeaderboardTopic } from '../../statsLeaderboard.js';

function activateNonTargetedEffect(state, effectDef, log, renderEffectsPanel) {
  if (effectDef.type === "LEFT_HAND") {
    addEffect(state, createEffect("LEFT_HAND", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Left Hand Rule (${effectDef.turns} turns).`);
  } else if (effectDef.type === "NO_NAMES") {
    addEffect(state, createEffect("NO_NAMES", effectDef.turns, { targetIndex: state.currentPlayerIndex }));
    log(`Effect activated: No Names (${effectDef.turns} turns).`);
  } else if (effectDef.type === "NO_SWEARING") {
    addEffect(state, createEffect("NO_SWEARING", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: No Swearing (${effectDef.turns} turns). Remove it after the first player swears.`);
  } else if (effectDef.type === "NO_PHONE_TOUCH") {
    addEffect(state, createEffect("NO_PHONE_TOUCH", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Hands Off Your Phone (${effectDef.turns} turns).`);
  } else if (effectDef.type === "DELAYED_REACTION") {
    addEffect(state, createEffect("DELAYED_REACTION", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Delayed Reaction (${effectDef.turns} turns).`);
  } else if (effectDef.type === "NAME_SWAP") {
    addEffect(state, createEffect("NAME_SWAP", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Name Swap (${effectDef.turns} turns). Choose two players and enforce the rule.`);
  } else if (effectDef.type === "GLASS_DOWN") {
    addEffect(state, createEffect("GLASS_DOWN", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Glass Down Rule (${effectDef.turns} turns).`);
  } else {
    addEffect(state, createEffect(effectDef.type, effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: ${effectDef.type} (${effectDef.turns} turns).`);
  }

  renderEffectsPanel();
}

export function createCardHandlers({
  state,
  timing,
  createBag,
  log,
  currentPlayer,
  playerName,
  nextPlayer,
  lockUI,
  unlockUI,
  unlockAfter,
  renderEffectsPanel,
  renderItems,
  renderTurnOrder,
  resetCards,
  openActionScreen
}) {
  function isChoiceSelectionActive() {
    return Boolean(state.choiceSelection?.active && state.choiceSelection?.pending);
  }

  function clearChoiceSelection() {
    state.choiceSelection = { active: false, pending: null };
  }

  function startChoiceSelection(choice, fallbackTitle = "Choose One", fallbackMessage = "") {
    if (!choice || choice.type !== "choice" || !Array.isArray(choice.options) || choice.options.length === 0) {
      log("Card choice setup failed.");
      return false;
    }

    state.choiceSelection = {
      active: true,
      pending: choice
    };

    const title = String(choice.title || fallbackTitle || "Choose One").trim() || "Choose One";
    const message = String(choice.message || fallbackMessage || "Choose one option to continue.").trim()
      || "Choose one option to continue.";
    const variant = String(choice.variant || "choice").trim() || "choice";

    openActionScreen(title, message, {
      variant,
      dismissible: false,
      actions: choice.options.map((option) => ({
        id: option.id,
        label: option.label,
        variant: option.variant || "primary"
      })),
      onAction: (selectedAction) => {
        if (!isChoiceSelectionActive()) return false;

        const pendingChoice = state.choiceSelection?.pending;
        const result = runSpecialChoiceAction(pendingChoice, selectedAction?.id, {
          state,
          currentPlayer: currentPlayer(),
          currentPlayerIndex: state.currentPlayerIndex,
          playerName,
          log,
          applyDrinkEvent,
          rollPenaltyCard
        });

        if (!result) {
          log("Invalid choice. Pick one of the listed options.");
          return false;
        }

        clearChoiceSelection();

        if (result.choice) {
          const chained = startChoiceSelection(
            result.choice,
            title,
            message
          );

          if (chained) {
            unlockUI();
            renderEffectsPanel();
            // Keep modal open because we immediately rendered the follow-up choice.
            return false;
          }

          log("Follow-up choice setup failed.");
        }

        if (result.refreshCards) {
          resetCards();
        }

        if (result.endTurn ?? true) {
          nextPlayer();
        }

        unlockUI();
        renderEffectsPanel();
        return true;
      }
    });

    return true;
  }

  function redrawGame() {
    rollPenaltyCard(state, log, "redraw_hold");

    if (isRedrawLockedPenaltyOpen(state)) {
      const penaltyText = String(state.penaltyCard || "").trim();
      const message = penaltyText
        ? `Penalty: ${penaltyText}. Close this window to continue.`
        : "Penalty rolled from Redraw. Close this window to continue.";

      openActionScreen("Redraw Penalty", message, {
        variant: "penalty",
        fallbackMessage: "Close this window to continue.",
        onClose: () => {
          if (isRedrawLockedPenaltyOpen(state)) {
            hidePenaltyCard(state);
            renderEffectsPanel();
          }
        }
      });
    }

    setTimeout(() => {
      resetCards({ keepPenaltyOpen: isRedrawLockedPenaltyOpen(state) });
    }, timing.REDRAW_REFRESH_MS);
  }

  function onRedrawClick() {
    if (isChoiceSelectionActive()) {
      log("Resolve the current card choice first.");
      return;
    }

    if (state.effectSelection?.active) {
      log("Pick a target player first (effect selection is active).");
      return;
    }

    if (state.penaltyShown) {
      if (isRedrawLockedPenaltyOpen(state)) {
        log("Close the Redraw penalty window first.");
      } else {
        log("Resolve the current penalty first.");
      }
      return;
    }

    redrawGame();
    const p = currentPlayer();
    log(`${p.name} used Redraw to reveal penalty card and refresh cards.`);
    renderEffectsPanel();
  }

  function onPenaltyDeckClick() {
    if (isChoiceSelectionActive()) {
      log("Resolve the current card choice first.");
      return;
    }

    if (state.effectSelection?.active) {
      log("Pick a target player first (effect selection is active).");
      return;
    }

    if (state.uiLocked) return;

    if (isRedrawLockedPenaltyOpen(state)) {
      if (!state.penaltyHintShown) {
        log("Close the Redraw penalty window first.");
        state.penaltyHintShown = true;
      }
      return;
    }

    // If penalty is showing, clicking confirms/hides depending on source.
    if (state.penaltyShown && state.penaltyConfirmArmed) {
      lockUI();

      const source = state.penaltySource;
      hidePenaltyCard(state);

      // "redraw" = preview/info penalty, does not end turn.
      if (source !== "redraw") {
        nextPlayer();
      }

      unlockUI();
      renderEffectsPanel();
      return;
    }

    // Otherwise reveal penalty deck normally.
    if (!state.penaltyShown) {
      lockUI();
      rollPenaltyCard(state, log, "deck", applyDrinkEvent);

      unlockAfter(timing.PENALTY_UNLOCK_MS);
      renderEffectsPanel();
      return;
    }

    hidePenaltyCard(state);
    renderEffectsPanel();
  }

  function onPenaltyRefreshClick() {
    if (isChoiceSelectionActive()) {
      log("Resolve the current card choice first.");
      return;
    }

    if (state.effectSelection?.active) {
      log("Pick a target player first (effect selection is active).");
      return;
    }

    if (state.uiLocked || !state.penaltyShown) return;

    if (isRedrawLockedPenaltyOpen(state)) {
      if (!state.penaltyHintShown) {
        log("Close the Redraw penalty window first.");
        state.penaltyHintShown = true;
      }
      return;
    }

    // Preserve mandatory confirm flow for "Draw a Penalty Card".
    if (state.penaltySource === "card") {
      if (!state.penaltyHintShown) {
        log("Penalty is waiting: click the Penalty Deck to confirm.");
        state.penaltyHintShown = true;
      }
      return;
    }

    hidePenaltyCard(state);
    renderEffectsPanel();
  }

  function handleObjectCardDraw(cardEl, parentCard) {
    const pool = getObjectCardPool(state, parentCard);
    if (pool.length === 0) {
      log("No valid cards available in this deck.");
      return true;
    }

    const bagKey = getBagKeyForObjectCard(state, parentCard);
    const bag = ensureBag(state, bagKey, pool, createBag);
    const event = bag.next();

    let subName = "";
    let subInstruction = "";
    let shownText = "";
    let effectDef = null;
    let action = null;

    if (typeof event === "object") {
      subName = event.name || "";
      subInstruction = event.instruction || "";
      shownText = subInstruction || subName;

      if (event.effect && typeof event.effect === "object") {
        effectDef = event.effect;
      }
      if (event.action) {
        action = event.action;
      }
    } else {
      subName = String(event);
      shownText = subName;
    }

    flipCardAnimation(cardEl, shownText);

    const parentName = getCardDisplayValue(parentCard);
    const actionTitle = subName || parentName || "Card Action";
    const drawMessage = (subInstruction && subName)
      ? `${subName} - ${subInstruction}`
      : (subInstruction || subName);
    const actionMessage = subInstruction || shownText || subName || "";
    const leaderboardTopic = resolveStatsLeaderboardTopic(subName, subInstruction);

    if (drawMessage) {
      if (leaderboardTopic) {
        log(drawMessage, { leaderboardTopic });
      } else {
        log(drawMessage);
      }
    }

    const actionResolvesFlow = Boolean(action);

    // If the subevent mentions penalty, also flip penalty deck (preview only).
    if (!actionResolvesFlow && shouldTriggerPenaltyPreview(subName, subInstruction, shownText)) {
      const label = `${parentName}${subName ? `: ${subName}` : ""}`;
      showPenaltyPreview(state, log, label);
    }

    // Timed effect cards.
    if (effectDef && effectDef.type && effectDef.turns) {
      // Targeted effect: enter pick mode, do not end turn yet.
      if (effectDef.needsTarget) {
        beginTargetedEffectSelection(
          state,
          { type: effectDef.type, turns: effectDef.turns },
          state.currentPlayerIndex,
          log,
          () => {
            renderEffectsPanel();
            nextPlayer();
          }
        );

        openActionScreen(actionTitle, actionMessage || drawMessage, { variant: "normal" });
        renderEffectsPanel();
        return false;
      }

      activateNonTargetedEffect(state, effectDef, log, renderEffectsPanel);
    }

    let actionResult = null;
    if (action) {
      actionResult = runSpecialAction(action, {
        state,
        currentPlayer: currentPlayer(),
        currentPlayerIndex: state.currentPlayerIndex,
        playerName,
        log,
        applyDrinkEvent,
        rollPenaltyCard
      });
      renderEffectsPanel();
    }

    if (actionResult?.choice) {
      const started = startChoiceSelection(
        actionResult.choice,
        actionTitle,
        actionMessage || drawMessage
      );
      if (started) {
        renderEffectsPanel();
        return false;
      }

      log("Card choice could not be started. Turn continues.");
      return true;
    }

    openActionScreen(actionTitle, actionMessage || drawMessage, { variant: "normal" });

    if (actionResult?.refreshCards) {
      resetCards();
      renderEffectsPanel();
    }

    return actionResult?.endTurn ?? true;
  }

  function handlePlainCard(cardEl, cardData) {
    const p = currentPlayer();
    const value = getCardDisplayValue(cardData);
    const txt = String(value).trim();
    const requiresActionScreen = shouldShowActionScreenForPlainCard(txt);

    // Penalty card (must confirm via penalty deck click).
    if (isDrawPenaltyCardText(txt)) {
      flashElement(cardEl);

      rollPenaltyCard(state, log, "card", applyDrinkEvent);

      // If blocked by Shield, penalty won't show -> turn ends normally.
      if (!state.penaltyShown) {
        nextPlayer();
        unlockUI();
        renderEffectsPanel();
        return;
      }

      unlockAfter(timing.PENALTY_UNLOCK_MS);
      renderEffectsPanel();
      return;
    }

    // Item cards.
    if (state.includeItems && state.itemCards.includes(value)) {
      log(`${p.name} acquired item: ${value}`);
      p.inventory.push(value);

      flashElement(cardEl);
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

    flashElement(cardEl);

    nextPlayer();
    unlockUI();
    renderEffectsPanel();
  }

  function onCardClick(index) {
    if (state.uiLocked) return;

    if (isChoiceSelectionActive()) {
      log("Resolve the current card choice first.");
      return;
    }

    // Block card clicks while an effect is waiting for target pick.
    if (state.effectSelection?.active) {
      log("Pick the target player in the turn order first.");
      return;
    }

    lockUI();

    // If penalty is open, handle it first.
    if (state.penaltyShown) {
      // If penalty came from selecting the penalty card, confirm via penalty deck click.
      if (state.penaltySource === "card") {
        if (!state.penaltyHintShown) {
          log("Penalty is waiting: click the Penalty Deck to confirm.");
          state.penaltyHintShown = true;
        }
        unlockUI();
        return;
      }

      if (state.penaltySource === "redraw_hold") {
        if (!state.penaltyHintShown) {
          log("Close the Redraw penalty window first.");
          state.penaltyHintShown = true;
        }
        unlockUI();
        return;
      }

      // Otherwise, clicking cards hides preview/deck penalty (no turn advance).
      hidePenaltyCard(state);
    }

    const cards = getCardElements();
    const cardEl = cards[index];

    // 1) Mystery reveal: first click only reveals.
    if (!state.revealed[index]) {
      state.revealed[index] = true;

      setCardKind(state, cardEl, state.currentCards[index], false);
      flipCardAnimation(cardEl, getCardDisplayValue(state.currentCards[index]));

      unlockAfter(timing.MYSTERY_REVEAL_UNLOCK_MS);
      return;
    }

    const cardData = state.currentCards[index];
    const selectedKind = state.dittoActive[index]
      ? "ditto"
      : computeKind(state, cardData);
    const previousHistoryLogKind = state.historyLogKind ?? null;
    state.historyLogKind = selectedKind;

    try {
      // 2) Ditto confirm flow.
      if (state.dittoActive[index]) {
        const activationTime = parseInt(cardEl.dataset.dittoTime || "0", 10);
        if (Date.now() - activationTime < timing.DITTO_DOUBLECLICK_GUARD_MS) {
          unlockUI();
          return;
        }

        const p = currentPlayer();
        log(`${p.name} confirmed Ditto card.`);

        // Pass applyDrinkEvent so Ditto drink outcomes can trigger Drink Buddy too.
        const dittoInfo = runDittoEffect(
          state,
          index,
          log,
          () => renderTurnOrder(state),
          renderItems,
          applyDrinkEvent
        );
        if (dittoInfo?.message) {
          openActionScreen(dittoInfo.title || "Ditto", dittoInfo.message, { variant: "ditto" });
        }

        state.dittoActive[index] = false;
        state.dittoPending[index] = null;

        nextPlayer();
        unlockUI();
        renderEffectsPanel();
        return;
      }

      recordCardSelection(state, state.currentPlayerIndex, {
        kind: selectedKind,
        mystery: index === state.hiddenIndex
      });

      // 3) Object card (Special/Crowd/Social) draw.
      if (typeof cardData === "object" && cardData.subcategories) {
        const endsTurnNow = handleObjectCardDraw(cardEl, cardData);

        // If we started a target-pick effect, do not end turn yet.
        if (endsTurnNow) {
          nextPlayer();
        }

        unlockUI();
        renderEffectsPanel();
        return;
      }

      // 4) Plain cards / items / drink/give.
      handlePlainCard(cardEl, cardData);
    } finally {
      state.historyLogKind = previousHistoryLogKind;
    }
  }

  return {
    onRedrawClick,
    onPenaltyRefreshClick,
    onPenaltyDeckClick,
    onCardClick
  };
}
