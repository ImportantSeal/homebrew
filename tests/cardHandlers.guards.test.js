import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isChoiceSelectionActive,
  clearChoiceSelection,
  clearSharePenaltyState,
  isGroupPenaltyPending,
  guardPendingPlinko,
  guardPendingPenaltyRoll
} from '../js/game/controller/cardHandlers/guards.js';

test('guards manage choice and share penalty state', () => {
  const state = {
    choiceSelection: { active: true, pending: { type: 'choice' } },
    sharePenalty: { active: true },
    penaltySource: 'group_pending',
    penaltyGroup: { active: true }
  };

  assert.equal(isChoiceSelectionActive(state), true);
  clearChoiceSelection(state);
  assert.deepEqual(state.choiceSelection, { active: false, pending: null });

  clearSharePenaltyState(state);
  assert.equal(state.sharePenalty, null);
  assert.equal(isGroupPenaltyPending(state), true);
});

test('guardPendingPenaltyRoll logs hint for pending penalties', () => {
  const logs = [];
  const state = {
    penaltySource: 'card_pending',
    penaltyHintShown: false,
    penaltyGroup: null
  };

  const pending = guardPendingPenaltyRoll(state, (line) => logs.push(String(line)));
  assert.equal(pending, true);
  assert.equal(state.penaltyHintShown, true);
  assert.ok(logs.some((line) => line.includes('Roll the Penalty Deck to continue.')));

  const groupLogs = [];
  const groupState = {
    penaltySource: 'group_pending',
    penaltyHintShown: false,
    penaltyGroup: { active: true }
  };

  const groupPending = guardPendingPenaltyRoll(groupState, (line) => groupLogs.push(String(line)));
  assert.equal(groupPending, true);
  assert.ok(groupLogs.some((line) => line.includes('Group penalty is active. Roll the Penalty Deck to continue.')));
});

test('guardPendingPlinko blocks other turn actions until Plinko completes', () => {
  const logs = [];
  const state = { plinkoPending: { playerIndex: 0, cardName: 'One Ball Wonder' } };

  assert.equal(guardPendingPlinko(state, (line) => logs.push(String(line))), true);
  assert.deepEqual(logs, ["Complete the card's Plinko action first."]);

  state.plinkoPending = null;
  assert.equal(guardPendingPlinko(state, (line) => logs.push(String(line))), false);
  assert.equal(logs.length, 1);
});
