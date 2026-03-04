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
  recordCardSelection,
  replaceCardSelectionKind
} from '../../stats.js';
import {
  setBaseBackgroundScene,
  syncBackgroundScene
} from '../../ui/backgroundScene.js';

import { createChoiceFlow } from './cardHandlers/choiceFlow.js';
import { createPenaltyFlow } from './cardHandlers/penaltyFlow.js';
import { createObjectCardFlow } from './cardHandlers/objectCardFlow.js';
import { createPlainCardFlow } from './cardHandlers/plainCardFlow.js';
import { isChoiceSelectionActive, isGroupPenaltyPending } from './cardHandlers/guards.js';

function baseSceneForKind(kind) {
  return kind === 'ditto' ? 'ditto' : 'normal';
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
  const { startChoiceSelection } = createChoiceFlow({
    state,
    currentPlayer,
    playerName,
    log,
    applyDrinkEvent,
    rollPenaltyCard,
    openActionScreen,
    resetCards,
    nextPlayer,
    unlockUI,
    renderEffectsPanel,
    syncBackgroundScene
  });

  const { onRedrawClick, onPenaltyRefreshClick, onPenaltyDeckClick } = createPenaltyFlow({
    state,
    timing,
    log,
    currentPlayer,
    playerName,
    nextPlayer,
    lockUI,
    unlockUI,
    unlockAfter,
    renderEffectsPanel,
    renderItems,
    resetCards,
    openActionScreen,
    applyDrinkEvent,
    rollPenaltyCard,
    hidePenaltyCard,
    syncBackgroundScene
  });

  const { handleObjectCardDraw } = createObjectCardFlow({
    state,
    createBag,
    log,
    currentPlayer,
    playerName,
    nextPlayer,
    renderEffectsPanel,
    resetCards,
    openActionScreen,
    applyDrinkEvent,
    rollPenaltyCard,
    showPenaltyPreview,
    beginTargetedEffectSelection,
    addEffect,
    createEffect,
    startChoiceSelection,
    syncBackgroundScene,
    flipCardAnimation
  });

  const { handlePlainCard } = createPlainCardFlow({
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
  });

  function onCardClick(index, triggerEvent = null) {
    if (state.uiLocked) return;

    if (isChoiceSelectionActive(state)) {
      log("Resolve the current card choice first.");
      return;
    }

    // Block card clicks while an effect is waiting for target pick.
    if (state.effectSelection?.active) {
      log("Pick the target player in the turn order first.");
      return;
    }

    if (state.penaltySource === "card_pending" || isGroupPenaltyPending(state)) {
      if (!state.penaltyHintShown) {
        log(state.penaltySource === "card_pending"
          ? "Roll the Penalty Deck to continue."
          : "Group penalty is active. Roll the Penalty Deck to continue.");
        state.penaltyHintShown = true;
      }
      return;
    }

    lockUI();

    // If penalty is open, handle it first.
    if (state.penaltyShown) {
      // If penalty came from selecting the penalty card, confirm via penalty deck click.
      if (state.penaltySource === "card" || state.penaltySource === "group") {
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
    const selectedScene = baseSceneForKind(selectedKind);
    setBaseBackgroundScene(state, selectedScene);
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
      handlePlainCard(cardEl, cardData, selectedKind, triggerEvent);
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
