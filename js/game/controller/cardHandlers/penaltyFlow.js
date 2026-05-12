import {
  isChoiceSelectionActive,
  clearSharePenaltyState,
  isGroupPenaltyPending
} from './guards.js';
import { isRedrawLockedPenaltyOpen } from '../helpers.js';
import {
  PENALTY_SOURCES,
  isCardPenaltyPending,
  isEffectSelectionActive,
  isPenaltyConfirmRequired,
  isPenaltySource
} from '../../../logic/flowMachine.js';
import { getPenaltyDisplayValue } from '../../../logic/penaltySchema.js';
import { createSharePenaltyFlow } from './penaltyFlowShare.js';
import { createPenaltyGroupQueueFlow } from './penaltyFlowGroupQueue.js';

export function createPenaltyFlow({
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
}) {
  const sharePenaltyFlow = createSharePenaltyFlow({
    state,
    log,
    playerName,
    nextPlayer,
    unlockUI,
    renderEffectsPanel,
    renderItems,
    openActionScreen,
    applyDrinkEvent,
    syncBackgroundScene
  });

  const penaltyGroupQueueFlow = createPenaltyGroupQueueFlow({
    state,
    log,
    playerName,
    syncBackgroundScene,
    rollPenaltyCard,
    applyDrinkEvent
  });

  function blockIfSelectionInProgress() {
    if (isChoiceSelectionActive(state)) {
      log('Resolve the current card choice first.');
      return true;
    }

    if (isEffectSelectionActive(state)) {
      log('Pick a target player from the player menu first.');
      return true;
    }

    return false;
  }

  function redrawGame() {
    rollPenaltyCard(state, log, PENALTY_SOURCES.REDRAW_HOLD);

    if (isRedrawLockedPenaltyOpen(state)) {
      const penaltyText = getPenaltyDisplayValue(state.penaltyCard);
      const message = penaltyText
        ? `Penalty: ${penaltyText}.`
        : 'Penalty rolled from Redraw.';
      openActionScreen('Redraw Penalty', message, {
        variant: 'penalty',
        fallbackMessage: '',
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
    if (blockIfSelectionInProgress()) return;

    if (state.penaltyShown) {
      if (isRedrawLockedPenaltyOpen(state)) {
        log('Close the Redraw penalty window first.');
      } else {
        log('Resolve the current penalty first.');
      }
      return;
    }

    const cardPending = isCardPenaltyPending(state);
    if (cardPending || isGroupPenaltyPending(state)) {
      if (!state.penaltyHintShown) {
        log(cardPending
          ? 'Roll the Penalty Deck to continue.'
          : 'Group penalty is active. Roll the Penalty Deck to continue.');
        state.penaltyHintShown = true;
      }
      return;
    }

    redrawGame();
    const p = currentPlayer();
    log(`${p.name} used Redraw to reveal penalty card and refresh cards.`);
    renderEffectsPanel();
  }

  function onPenaltyDeckClick() {
    if (blockIfSelectionInProgress()) return;
    if (state.uiLocked) return;

    if (isRedrawLockedPenaltyOpen(state)) {
      if (!state.penaltyHintShown) {
        log('Close the Redraw penalty window first.');
        state.penaltyHintShown = true;
      }
      return;
    }

    if (!state.penaltyShown && isCardPenaltyPending(state)) {
      lockUI();
      rollPenaltyCard(state, log, PENALTY_SOURCES.CARD, applyDrinkEvent);

      if (!state.penaltyShown) {
        if (state.sharePenalty?.active) {
          clearSharePenaltyState(state);
          log('Share Penalty ended because no penalty card was revealed.');
        }
        nextPlayer();
        unlockUI();
        renderEffectsPanel();
        return;
      }

      unlockAfter(timing.PENALTY_UNLOCK_MS);
      renderEffectsPanel();
      return;
    }

    if (!state.penaltyShown && isGroupPenaltyPending(state)) {
      lockUI();
      const groupStep = penaltyGroupQueueFlow.rollNextGroupPenaltyInQueue();
      if (groupStep.done) {
        nextPlayer();
        unlockUI();
        renderEffectsPanel();
        return;
      }

      if (groupStep.shown) {
        unlockAfter(timing.PENALTY_UNLOCK_MS);
      } else {
        unlockUI();
      }
      renderEffectsPanel();
      return;
    }

    if (state.penaltyShown && state.penaltyConfirmArmed) {
      lockUI();

      const sourceIsCard = isPenaltySource(state, PENALTY_SOURCES.CARD);
      const sourceIsGroup = isPenaltySource(state, PENALTY_SOURCES.GROUP);
      const sourceIsRedraw = isPenaltySource(state, PENALTY_SOURCES.REDRAW);
      const sharePenaltyActive = sourceIsCard && state.sharePenalty?.active;
      const sharePenaltyCard = sharePenaltyActive
        ? (state.sharePenalty?.penalty ?? state.penaltyCard)
        : null;
      hidePenaltyCard(state);

      if (sourceIsGroup) {
        const done = penaltyGroupQueueFlow.advanceGroupPenaltyQueue({ announceNext: false });
        if (done) {
          nextPlayer();
          unlockUI();
          renderEffectsPanel();
          return;
        }

        const groupStep = penaltyGroupQueueFlow.rollNextGroupPenaltyInQueue();
        if (groupStep.done) {
          nextPlayer();
          unlockUI();
          renderEffectsPanel();
          return;
        }

        if (groupStep.shown) {
          unlockAfter(timing.PENALTY_UNLOCK_MS);
        } else {
          unlockUI();
        }
        renderEffectsPanel();
        return;
      }

      if (sharePenaltyActive) {
        const selectionStarted = sharePenaltyFlow.startSharePenaltyTargetSelection(sharePenaltyCard);
        if (selectionStarted) {
          renderEffectsPanel();
          return;
        }
        clearSharePenaltyState(state);
      }

      if (!sourceIsRedraw) {
        nextPlayer();
      }

      unlockUI();
      renderEffectsPanel();
      return;
    }

    if (!state.penaltyShown) {
      lockUI();
      rollPenaltyCard(state, log, PENALTY_SOURCES.DECK, applyDrinkEvent);

      unlockAfter(timing.PENALTY_UNLOCK_MS);
      renderEffectsPanel();
      return;
    }

    hidePenaltyCard(state);
    renderEffectsPanel();
  }

  function onPenaltyRefreshClick() {
    if (blockIfSelectionInProgress()) return;
    if (state.uiLocked || !state.penaltyShown) return;

    if (isRedrawLockedPenaltyOpen(state)) {
      if (!state.penaltyHintShown) {
        log('Close the Redraw penalty window first.');
        state.penaltyHintShown = true;
      }
      return;
    }

    if (isPenaltyConfirmRequired(state)) {
      if (!state.penaltyHintShown) {
        log('Penalty is waiting: click the Penalty Deck to confirm.');
        state.penaltyHintShown = true;
      }
      return;
    }

    hidePenaltyCard(state);
    renderEffectsPanel();
  }

  return {
    onRedrawClick,
    onPenaltyDeckClick,
    onPenaltyRefreshClick
  };
}
