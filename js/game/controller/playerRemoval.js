import { removePlayerStats } from '../../stats.js';
import { cancelTargetedEffectSelection } from '../../logic/effects.js';
import { resetMirrorState } from '../../logic/mirror.js';
import { ensurePlayerColors } from '../../utils/playerColors.js';

function remapPlayerIndexAfterRemoval(index, removedIndex) {
  if (!Number.isInteger(index)) return index;
  if (index === removedIndex) return null;
  return index > removedIndex ? index - 1 : index;
}

function normalizeStateAfterPlayerRemoval(state, removedIndex) {
  let removedEffects = 0;

  if (Array.isArray(state.effects)) {
    state.effects = state.effects
      .map((effect) => {
        if (!effect || typeof effect !== 'object') return null;

        const hasSource = Number.isInteger(effect.sourceIndex);
        const hasTarget = Number.isInteger(effect.targetIndex);
        const nextSource = remapPlayerIndexAfterRemoval(effect.sourceIndex, removedIndex);
        const nextTarget = remapPlayerIndexAfterRemoval(effect.targetIndex, removedIndex);

        if ((hasSource && nextSource === null) || (hasTarget && nextTarget === null)) {
          removedEffects += 1;
          return null;
        }

        if (hasSource) effect.sourceIndex = nextSource;
        if (hasTarget) effect.targetIndex = nextTarget;
        return effect;
      })
      .filter(Boolean);
  }

  if (state.effectSelection?.active) {
    cancelTargetedEffectSelection(state);
  } else if (state.effectSelection?.pending) {
    const nextSource = remapPlayerIndexAfterRemoval(state.effectSelection.pending.sourceIndex, removedIndex);
    if (nextSource === null) {
      state.effectSelection = { active: false, pending: null, cleanup: null, ui: null };
    } else {
      state.effectSelection.pending.sourceIndex = nextSource;
    }
  }

  if (state.mirror && typeof state.mirror === 'object') {
    const nextSource = remapPlayerIndexAfterRemoval(state.mirror.sourceIndex, removedIndex);
    if (nextSource === null) {
      resetMirrorState(state);
    } else {
      state.mirror.sourceIndex = nextSource;
    }
  }

  const nextPenaltyRollPlayerIndex = remapPlayerIndexAfterRemoval(state.penaltyRollPlayerIndex, removedIndex);
  state.penaltyRollPlayerIndex = Number.isInteger(nextPenaltyRollPlayerIndex)
    ? nextPenaltyRollPlayerIndex
    : null;

  if (state.penaltyGroup && typeof state.penaltyGroup === 'object') {
    const group = state.penaltyGroup;

    if (Array.isArray(group.queue)) {
      const playerCount = state.players?.length || 0;
      const rawCursor = Number.isInteger(group.cursor) && group.cursor >= 0 ? group.cursor : 0;
      let remappedCursor = rawCursor;
      const remappedQueue = [];

      group.queue.forEach((queueIndex, position) => {
        const remappedIndex = remapPlayerIndexAfterRemoval(queueIndex, removedIndex);
        if (remappedIndex === null) {
          if (position < rawCursor) remappedCursor -= 1;
          return;
        }

        if (Number.isInteger(remappedIndex) && remappedIndex >= 0 && remappedIndex < playerCount) {
          remappedQueue.push(remappedIndex);
        }
      });

      group.queue = remappedQueue;
      group.cursor = Math.max(0, Math.min(remappedCursor, remappedQueue.length));
    }

    const remappedOrigin = remapPlayerIndexAfterRemoval(group.originPlayerIndex, removedIndex);
    group.originPlayerIndex = Number.isInteger(remappedOrigin)
      ? remappedOrigin
      : state.currentPlayerIndex;

    if (!Array.isArray(group.queue) || group.queue.length === 0) {
      state.penaltyGroup = null;
      if (state.penaltySource === "group_pending") {
        state.penaltySource = null;
        state.penaltyHintShown = false;
      }
    }
  }

  return removedEffects;
}

export function createPlayerRemovalController({
  state,
  log,
  playerName,
  renderTurnHeader,
  renderItems,
  renderEffectsPanel,
  updateTurn,
  syncPenaltyDeckSizeToCards,
  isPenaltyFlowActive,
  minPlayers = 2
}) {
  function removePlayerFromGame(targetIndex) {
    const playerCount = state.players.length;
    if (playerCount <= minPlayers) {
      log(`At least ${minPlayers} players must remain.`);
      return false;
    }

    const targetPlayer = state.players[targetIndex];
    if (!targetPlayer) return false;

    const wasCurrentPlayer = targetIndex === state.currentPlayerIndex;
    const removedName = targetPlayer.name || playerName(targetIndex);
    state.players.splice(targetIndex, 1);
    removePlayerStats(state, targetIndex);

    if (wasCurrentPlayer) {
      if (state.currentPlayerIndex >= state.players.length) {
        state.currentPlayerIndex = 0;
      }
    } else if (targetIndex < state.currentPlayerIndex) {
      state.currentPlayerIndex = Math.max(0, state.currentPlayerIndex - 1);
    }

    const removedEffects = normalizeStateAfterPlayerRemoval(state, targetIndex);
    ensurePlayerColors(state.players);

    log(`${removedName} was removed from the game.`);
    if (removedEffects > 0) {
      log(`${removedEffects} effect${removedEffects === 1 ? '' : 's'} ended because of player removal.`);
    }

    if (wasCurrentPlayer) {
      updateTurn();
    } else {
      renderTurnHeader();
      renderItems();
      renderEffectsPanel();
      requestAnimationFrame(syncPenaltyDeckSizeToCards);
    }

    return true;
  }

  function onTurnOrderPlayerRemoveClick(removeBtn, event) {
    if (event?.preventDefault) event.preventDefault();
    if (event?.stopPropagation) event.stopPropagation();
    if (event?.stopImmediatePropagation) event.stopImmediatePropagation();

    if (state.choiceSelection?.active) {
      log("Resolve the current card choice before removing a player.");
      return;
    }

    if (state.effectSelection?.active) {
      log("Pick a target player first (effect selection is active).");
      return;
    }

    if (isPenaltyFlowActive()) {
      log("Resolve the current penalty before removing a player.");
      return;
    }

    if (state.players.length <= minPlayers) {
      log(`At least ${minPlayers} players are required to continue.`);
      return;
    }

    const targetIndex = Number(removeBtn?.dataset?.index);
    if (!Number.isInteger(targetIndex)) return;
    const target = state.players?.[targetIndex];
    if (!target) return;

    const confirmed = window.confirm(`Remove ${target.name} from the game?`);
    if (!confirmed) return;

    removePlayerFromGame(targetIndex);
  }

  return {
    onTurnOrderPlayerRemoveClick,
    removePlayerFromGame
  };
}
