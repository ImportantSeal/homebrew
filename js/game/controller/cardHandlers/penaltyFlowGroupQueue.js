import {
  FLOW_TRANSITIONS,
  PENALTY_SOURCES,
  transitionFlow,
  isGroupPenaltyPending
} from '../../../logic/flowMachine.js';
import { DRAW_TWISTS, rollsGroupPenaltySavior } from '../../../logic/savior.js';
import { resolveRng } from '../../../utils/rng.js';
import { getForcedDrawTwist } from '../../../dev/cardTestMode.js';

function clearGroupPending(state) {
  const clearPending = transitionFlow(state, FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY);
  if (!clearPending.ok) {
    transitionFlow(state, FLOW_TRANSITIONS.HIDE_PENALTY);
  }
}

export function createPenaltyGroupQueueFlow({
  state,
  log,
  playerName,
  syncBackgroundScene,
  rollPenaltyCard,
  applyDrinkEvent,
  openActionScreen = null,
  onSaviorTriggered = null
}) {
  function rollGroupPenaltySavior() {
    const roll = resolveRng(state?.rng).nextFloat();
    if (getForcedDrawTwist() === DRAW_TWISTS.SAVIOR) return true;
    return rollsGroupPenaltySavior(roll);
  }

  function blessPlayer(targetIndex) {
    const name = playerName(targetIndex);
    log(`Savior! ${name} is saved and skips their Penalty card.`, { kind: 'savior' });

    if (typeof onSaviorTriggered === 'function') {
      onSaviorTriggered({ playerIndex: targetIndex, everybody: false, cardData: 'Penalty Card' });
    }
    if (typeof openActionScreen === 'function') {
      openActionScreen(
        'Savior',
        `An angel descends! ${name} is saved and does not have to take a Penalty card. Everybody else still takes theirs.`,
        { variant: 'savior', closeLabel: 'Amen' }
      );
    }
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
      clearGroupPending(state);
      syncBackgroundScene(state);
      return true;
    }

    group.cursor = (Number.isInteger(group.cursor) ? group.cursor : 0) + 1;
    const nextTargetIndex = currentGroupPenaltyTargetIndex();
    if (Number.isInteger(nextTargetIndex)) {
      transitionFlow(state, FLOW_TRANSITIONS.QUEUE_GROUP_PENALTY, {
        queue: group.queue,
        cursor: group.cursor,
        originPlayerIndex: group.originPlayerIndex
      });
      if (announceNext) {
        const nextName = playerName(nextTargetIndex);
        log(`Group penalty: ${nextName} rolls next. Click the Penalty Deck to continue.`);
      }
      syncBackgroundScene(state);
      return false;
    }

    state.penaltyGroup = null;
    clearGroupPending(state);
    if (Number.isInteger(group.originPlayerIndex)
      && group.originPlayerIndex >= 0
      && group.originPlayerIndex < (state.players?.length || 0)) {
      state.currentPlayerIndex = group.originPlayerIndex;
    }
    log('Group penalties resolved.');
    syncBackgroundScene(state);
    return true;
  }

  function rollNextGroupPenaltyInQueue() {
    while (!state.penaltyShown && isGroupPenaltyPending(state)) {
      const targetIndex = currentGroupPenaltyTargetIndex();
      if (!Number.isInteger(targetIndex)) {
        const done = advanceGroupPenaltyQueue({ announceNext: false });
        if (done) return { done: true, shown: false };
        continue;
      }

      // Savior: this player skips their own penalty, the rest of the queue continues.
      if (rollGroupPenaltySavior()) {
        blessPlayer(targetIndex);
        // Same path as a Shield block: leave pending, then queue the next player.
        clearGroupPending(state);
        const done = advanceGroupPenaltyQueue({ announceNext: false });
        if (done) return { done: true, shown: false };
        continue;
      }

      rollPenaltyCard(state, log, PENALTY_SOURCES.GROUP, applyDrinkEvent, { targetPlayerIndex: targetIndex });
      if (state.penaltyShown) {
        return { done: false, shown: true };
      }

      // Shield blocked -> advance and keep going in the same click.
      const done = advanceGroupPenaltyQueue({ announceNext: false });
      if (done) return { done: true, shown: false };
    }

    return { done: !isGroupPenaltyPending(state), shown: state.penaltyShown };
  }

  return {
    advanceGroupPenaltyQueue,
    rollNextGroupPenaltyInQueue
  };
}
