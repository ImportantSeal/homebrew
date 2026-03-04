import {
  isChoiceSelectionActive,
  clearChoiceSelection,
  clearSharePenaltyState,
  isGroupPenaltyPending
} from './guards.js';
import { isRedrawLockedPenaltyOpen } from '../helpers.js';
import { recordPenaltyTaken } from '../../../stats.js';
import { getPenaltyDisplayValue, getPenaltySpec } from '../../../logic/penaltySchema.js';

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
  function applySharedPenaltyToTarget(targetIndex, penaltyCard) {
    const targetPlayer = state.players?.[targetIndex];
    if (!targetPlayer) return false;

    if (targetPlayer.shield) {
      delete targetPlayer.shield;
      log(`${targetPlayer.name}'s Shield protected against the shared penalty!`);
      return true;
    }

    const penaltySpec = getPenaltySpec(penaltyCard);
    if (!penaltySpec?.label) return false;

    recordPenaltyTaken(state, targetIndex);

    if (penaltySpec.drink) {
      applyDrinkEvent(state, targetIndex, penaltySpec.drink.amount, "Shared Penalty", log);
      return true;
    }

    return false;
  }

  function startSharePenaltyTargetSelection(penaltyCard) {
    const share = state.sharePenalty;
    if (!share?.active) return false;

    const resolvedPenalty = getPenaltyDisplayValue(penaltyCard ?? share.penalty);
    if (!resolvedPenalty) {
      clearSharePenaltyState(state);
      log("Share Penalty could not continue because no penalty card was available.");
      return false;
    }

    const sourcePlayerIndex = Number.isInteger(share.sourcePlayerIndex)
      ? share.sourcePlayerIndex
      : state.currentPlayerIndex;

    const candidates = Array.isArray(state.players)
      ? state.players
        .map((_, idx) => ({ idx, name: playerName(idx) }))
        .filter((entry) => entry.idx !== sourcePlayerIndex)
      : [];

    if (candidates.length === 0) {
      clearSharePenaltyState(state);
      log("Share Penalty needs at least one other player.");
      return false;
    }

    state.choiceSelection = {
      active: true,
      pending: {
        type: "share_penalty_target",
        penalty: penaltyCard ?? share.penalty,
        penaltyLabel: resolvedPenalty,
        sourcePlayerIndex
      }
    };

    openActionScreen(
      "Share Penalty",
      `Pick one other player to share penalty: ${resolvedPenalty}.`,
      {
        variant: "penalty",
        dismissible: false,
        actions: candidates.map((entry) => ({
          id: `share_penalty_${entry.idx}`,
          label: entry.name,
          variant: "danger"
        })),
        onAction: (selectedAction) => {
          if (!isChoiceSelectionActive(state)) return false;

          const selectedId = String(selectedAction?.id || "");
          const match = selectedId.match(/^share_penalty_(\d+)$/);
          if (!match) {
            log("Invalid share target. Pick one of the listed players.");
            return false;
          }

          const targetIndex = Number.parseInt(match[1], 10);
          const playerCount = state.players?.length || 0;
          if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= playerCount) {
            log("Invalid share target. Pick one of the listed players.");
            return false;
          }

          const pending = state.choiceSelection?.pending;
          if (targetIndex === pending?.sourcePlayerIndex) {
            log("Pick one other player (not yourself).");
            return false;
          }

          const targetName = playerName(targetIndex);
          const penaltyCardToApply = pending?.penalty ?? penaltyCard;
          const penaltyLabel = pending?.penaltyLabel || resolvedPenalty;
          log(`${targetName} shares penalty: ${penaltyLabel}.`);

          const applied = applySharedPenaltyToTarget(targetIndex, penaltyCardToApply);
          if (!applied) {
            log(`Shared penalty could not be auto-applied (${penaltyLabel}). Resolve it manually.`);
          }

          clearChoiceSelection(state);
          clearSharePenaltyState(state);
          syncBackgroundScene(state);
          renderItems();
          nextPlayer();
          unlockUI();
          renderEffectsPanel();
          return true;
        }
      }
    );

    return true;
  }

  function currentGroupPenaltyTargetIndex() {
    const group = state.penaltyGroup;
    if (!group?.active || !Array.isArray(group.queue)) return null;

    if (!Number.isInteger(group.cursor) || group.cursor < 0) group.cursor = 0;
    while (group.cursor < group.queue.length) {
      const idx = group.queue[group.cursor];
      if (Number.isInteger(idx) && idx >= 0 && idx < (state.players?.length || 0)) {
        return idx;
      }
      group.cursor += 1;
    }

    return null;
  }

  function advanceGroupPenaltyQueue(options = {}) {
    const announceNext = options.announceNext !== false;
    const group = state.penaltyGroup;
    if (!group?.active || !Array.isArray(group.queue)) {
      state.penaltyGroup = null;
      state.penaltySource = null;
      state.penaltyHintShown = false;
      syncBackgroundScene(state);
      return true;
    }

    group.cursor = (Number.isInteger(group.cursor) ? group.cursor : 0) + 1;
    const nextTargetIndex = currentGroupPenaltyTargetIndex();
    if (Number.isInteger(nextTargetIndex)) {
      state.penaltySource = "group_pending";
      state.penaltyHintShown = false;
      if (announceNext) {
        const nextName = playerName(nextTargetIndex);
        log(`Group penalty: ${nextName} rolls next. Click the Penalty Deck to continue.`);
      }
      syncBackgroundScene(state);
      return false;
    }

    state.penaltyGroup = null;
    state.penaltySource = null;
    state.penaltyHintShown = false;
    if (Number.isInteger(group.originPlayerIndex)
      && group.originPlayerIndex >= 0
      && group.originPlayerIndex < (state.players?.length || 0)) {
      state.currentPlayerIndex = group.originPlayerIndex;
    }
    log("Group penalties resolved.");
    syncBackgroundScene(state);
    return true;
  }

  // Rolls queued group penalties until one is visible for confirm, or the queue finishes.
  function rollNextGroupPenaltyInQueue() {
    while (!state.penaltyShown && isGroupPenaltyPending(state)) {
      const targetIndex = currentGroupPenaltyTargetIndex();
      if (!Number.isInteger(targetIndex)) {
        const done = advanceGroupPenaltyQueue({ announceNext: false });
        if (done) return { done: true, shown: false };
        continue;
      }

      rollPenaltyCard(state, log, "group", applyDrinkEvent, { targetPlayerIndex: targetIndex });
      if (state.penaltyShown) {
        return { done: false, shown: true };
      }

      // Shield blocked -> advance and keep going in the same click.
      const done = advanceGroupPenaltyQueue({ announceNext: false });
      if (done) return { done: true, shown: false };
    }

    return { done: !isGroupPenaltyPending(state), shown: state.penaltyShown };
  }

  function redrawGame() {
    rollPenaltyCard(state, log, "redraw_hold");

    if (isRedrawLockedPenaltyOpen(state)) {
      const penaltyText = getPenaltyDisplayValue(state.penaltyCard);
      const message = penaltyText
        ? `Penalty: ${penaltyText}.`
        : "Penalty rolled from Redraw.";

      openActionScreen("Redraw Penalty", message, {
        variant: "penalty",
        fallbackMessage: "",
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
    if (isChoiceSelectionActive(state)) {
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

    if (state.penaltySource === "card_pending" || isGroupPenaltyPending(state)) {
      if (!state.penaltyHintShown) {
        log(state.penaltySource === "card_pending"
          ? "Roll the Penalty Deck to continue."
          : "Group penalty is active. Roll the Penalty Deck to continue.");
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
    if (isChoiceSelectionActive(state)) {
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

    // Pending object-card flow that requires a manual penalty deck flip.
    if (!state.penaltyShown && state.penaltySource === "card_pending") {
      lockUI();
      rollPenaltyCard(state, log, "card", applyDrinkEvent);

      // Shield blocked -> no penalty shown, continue turn flow.
      if (!state.penaltyShown) {
        if (state.sharePenalty?.active) {
          clearSharePenaltyState(state);
          log("Share Penalty ended because no penalty card was revealed.");
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

    // Pending group penalty flow (each player rolls manually in queue order).
    if (!state.penaltyShown && isGroupPenaltyPending(state)) {
      lockUI();
      const groupStep = rollNextGroupPenaltyInQueue();
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

    // If penalty is showing, clicking confirms/hides depending on source.
    if (state.penaltyShown && state.penaltyConfirmArmed) {
      lockUI();

      const source = state.penaltySource;
      const sharePenaltyActive = source === "card" && state.sharePenalty?.active;
      const sharePenaltyCard = sharePenaltyActive
        ? (state.sharePenalty?.penalty ?? state.penaltyCard)
        : null;
      hidePenaltyCard(state);

      if (source === "group") {
        const done = advanceGroupPenaltyQueue({ announceNext: false });
        if (done) {
          nextPlayer();
          unlockUI();
          renderEffectsPanel();
          return;
        }

        const groupStep = rollNextGroupPenaltyInQueue();
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
        const selectionStarted = startSharePenaltyTargetSelection(sharePenaltyCard);
        if (selectionStarted) {
          renderEffectsPanel();
          return;
        }
        clearSharePenaltyState(state);
      }

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
    if (isChoiceSelectionActive(state)) {
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

    // Preserve mandatory confirm flow for "Draw a Penalty Card" and group queue penalties.
    if (state.penaltySource === "card" || state.penaltySource === "group") {
      if (!state.penaltyHintShown) {
        log("Penalty is waiting: click the Penalty Deck to confirm.");
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
