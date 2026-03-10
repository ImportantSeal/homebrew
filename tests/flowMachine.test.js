import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFlowState,
  FLOW_PHASES,
  FLOW_TRANSITIONS,
  PENALTY_SOURCES,
  transitionFlow,
  syncFlowPhase
} from '../js/logic/flowMachine.js';

function createState(overrides = {}) {
  return {
    flow: createFlowState(),
    currentPlayerIndex: 0,
    choiceSelection: { active: false, pending: null },
    effectSelection: { active: false, pending: null, cleanup: null, ui: null },
    penaltyShown: false,
    penaltyCard: null,
    penaltyConfirmArmed: false,
    penaltySource: null,
    penaltyHintShown: false,
    penaltyRollPlayerIndex: null,
    penaltyGroup: null,
    ...overrides
  };
}

function assertBlocked(result) {
  assert.equal(result.ok, false);
  assert.ok(typeof result.reason === 'string' && result.reason.length > 0);
}

test('START_CHOICE transition succeeds from idle and blocks from penalty pending', () => {
  const successState = createState();
  const success = transitionFlow(successState, FLOW_TRANSITIONS.START_CHOICE, {
    pendingChoice: { type: 'choice', options: [{ id: 'a', label: 'A' }] }
  });
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.CHOICE_SELECTION);
  assert.equal(successState.choiceSelection.active, true);

  const blockedState = createState({
    penaltySource: PENALTY_SOURCES.CARD_PENDING
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.START_CHOICE, {
    pendingChoice: { type: 'choice', options: [{ id: 'a', label: 'A' }] }
  });
  assertBlocked(blocked);
});

test('CLEAR_CHOICE transition succeeds from choice selection and blocks from idle', () => {
  const successState = createState({
    choiceSelection: { active: true, pending: { type: 'choice', options: [{ id: 'a', label: 'A' }] } }
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.CLEAR_CHOICE);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.IDLE);
  assert.deepEqual(successState.choiceSelection, { active: false, pending: null });

  const blockedState = createState();
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.CLEAR_CHOICE);
  assertBlocked(blocked);
});

test('START_EFFECT transition succeeds from idle and blocks from choice selection', () => {
  const successState = createState();
  const success = transitionFlow(successState, FLOW_TRANSITIONS.START_EFFECT, {
    pendingEffect: { type: 'DRINK_BUDDY', turns: 2, sourceIndex: 0 }
  });
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.EFFECT_SELECTION);
  assert.equal(successState.effectSelection.active, true);

  const blockedState = createState({
    choiceSelection: { active: true, pending: { type: 'choice', options: [{ id: 'a', label: 'A' }] } }
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.START_EFFECT, {
    pendingEffect: { type: 'DRINK_BUDDY', turns: 2, sourceIndex: 0 }
  });
  assertBlocked(blocked);
});

test('CLEAR_EFFECT transition succeeds from effect selection and blocks from idle', () => {
  const successState = createState({
    effectSelection: { active: true, pending: { type: 'DRINK_BUDDY' }, cleanup: null, ui: null }
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.CLEAR_EFFECT);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.IDLE);
  assert.deepEqual(successState.effectSelection, { active: false, pending: null, cleanup: null, ui: null });

  const blockedState = createState();
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.CLEAR_EFFECT);
  assertBlocked(blocked);
});

test('QUEUE_CARD_PENALTY transition succeeds from idle/choice and blocks from effect selection', () => {
  const successState = createState({ currentPlayerIndex: 2 });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.QUEUE_CARD_PENALTY);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_PENDING_CARD);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.CARD_PENDING);
  assert.equal(successState.penaltyRollPlayerIndex, 2);

  const choiceState = createState({
    currentPlayerIndex: 1,
    choiceSelection: { active: true, pending: { type: 'choice', options: [{ id: 'a', label: 'A' }] } }
  });
  const choiceSuccess = transitionFlow(choiceState, FLOW_TRANSITIONS.QUEUE_CARD_PENALTY);
  assert.equal(choiceSuccess.ok, true);
  assert.equal(syncFlowPhase(choiceState), FLOW_PHASES.PENALTY_PENDING_CARD);
  assert.deepEqual(choiceState.choiceSelection, { active: false, pending: null });

  const blockedState = createState({
    effectSelection: { active: true, pending: { type: 'DRINK_BUDDY' }, cleanup: null, ui: null }
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.QUEUE_CARD_PENALTY);
  assertBlocked(blocked);
});

test('QUEUE_GROUP_PENALTY transition succeeds with valid queue and blocks on empty queue', () => {
  const successState = createState({ currentPlayerIndex: 1 });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.QUEUE_GROUP_PENALTY, {
    queue: [0, 1, 2],
    cursor: 0,
    originPlayerIndex: 1
  });
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_PENDING_GROUP);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.GROUP_PENDING);
  assert.deepEqual(successState.penaltyGroup, {
    active: true,
    queue: [0, 1, 2],
    cursor: 0,
    originPlayerIndex: 1
  });

  const blockedState = createState();
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.QUEUE_GROUP_PENALTY, {
    queue: []
  });
  assertBlocked(blocked);
});

test('SHOW_DECK_PENALTY transition succeeds from idle and blocks from pending card', () => {
  const successState = createState();
  const success = transitionFlow(successState, FLOW_TRANSITIONS.SHOW_DECK_PENALTY, {
    rollPlayerIndex: 0
  });
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_OPEN_DECK);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.DECK);
  assert.equal(successState.penaltyShown, true);

  const blockedState = createState({
    penaltySource: PENALTY_SOURCES.CARD_PENDING
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.SHOW_DECK_PENALTY, {
    rollPlayerIndex: 0
  });
  assertBlocked(blocked);
});

test('SHOW_CARD_PENALTY transition succeeds from pending card and blocks from idle', () => {
  const successState = createState({
    penaltySource: PENALTY_SOURCES.CARD_PENDING
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.SHOW_CARD_PENALTY, {
    rollPlayerIndex: 0
  });
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_OPEN_CARD);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.CARD);

  const blockedState = createState();
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.SHOW_CARD_PENALTY, {
    rollPlayerIndex: 0
  });
  assertBlocked(blocked);
});

test('SHOW_GROUP_PENALTY transition succeeds from pending group and blocks from pending card', () => {
  const successState = createState({
    penaltySource: PENALTY_SOURCES.GROUP_PENDING,
    penaltyGroup: { active: true, queue: [0], cursor: 0, originPlayerIndex: 0 }
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.SHOW_GROUP_PENALTY, {
    rollPlayerIndex: 0
  });
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_OPEN_GROUP);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.GROUP);

  const blockedState = createState({
    penaltySource: PENALTY_SOURCES.CARD_PENDING
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.SHOW_GROUP_PENALTY, {
    rollPlayerIndex: 0
  });
  assertBlocked(blocked);
});

test('SHOW_REDRAW_PENALTY transition succeeds from idle and blocks from pending group', () => {
  const successState = createState();
  const success = transitionFlow(successState, FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_OPEN_REDRAW);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.REDRAW);

  const blockedState = createState({
    penaltySource: PENALTY_SOURCES.GROUP_PENDING,
    penaltyGroup: { active: true, queue: [0], cursor: 0, originPlayerIndex: 0 }
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY);
  assertBlocked(blocked);
});

test('SHOW_REDRAW_HOLD_PENALTY transition succeeds from idle and blocks from pending group', () => {
  const successState = createState();
  const success = transitionFlow(successState, FLOW_TRANSITIONS.SHOW_REDRAW_HOLD_PENALTY);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_OPEN_REDRAW_HOLD);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.REDRAW_HOLD);

  const blockedState = createState({
    penaltySource: PENALTY_SOURCES.GROUP_PENDING,
    penaltyGroup: { active: true, queue: [0], cursor: 0, originPlayerIndex: 0 }
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.SHOW_REDRAW_HOLD_PENALTY);
  assertBlocked(blocked);
});

test('HIDE_PENALTY transition succeeds from open penalty and blocks from choice selection', () => {
  const successState = createState({
    penaltyShown: true,
    penaltySource: PENALTY_SOURCES.DECK,
    penaltyCard: { name: 'Drink 4' },
    penaltyConfirmArmed: true
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.HIDE_PENALTY);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.IDLE);
  assert.equal(successState.penaltyShown, false);
  assert.equal(successState.penaltySource, null);

  const blockedState = createState({
    choiceSelection: { active: true, pending: { type: 'choice', options: [{ id: 'a', label: 'A' }] } }
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.HIDE_PENALTY);
  assertBlocked(blocked);
});

test('CLEAR_PENDING_PENALTY transition succeeds from pending card and blocks from idle', () => {
  const successState = createState({
    penaltySource: PENALTY_SOURCES.CARD_PENDING,
    penaltyRollPlayerIndex: 1
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.IDLE);
  assert.equal(successState.penaltySource, null);
  assert.equal(successState.penaltyRollPlayerIndex, null);

  const blockedState = createState();
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY);
  assertBlocked(blocked);
});

test('RESUME_GROUP_PENDING transition succeeds from open group and blocks from pending card', () => {
  const successState = createState({
    penaltyShown: true,
    penaltySource: PENALTY_SOURCES.GROUP,
    penaltyGroup: { active: true, queue: [0], cursor: 0, originPlayerIndex: 0 },
    penaltyCard: { name: 'Drink 2' },
    penaltyConfirmArmed: true
  });
  const success = transitionFlow(successState, FLOW_TRANSITIONS.RESUME_GROUP_PENDING);
  assert.equal(success.ok, true);
  assert.equal(syncFlowPhase(successState), FLOW_PHASES.PENALTY_PENDING_GROUP);
  assert.equal(successState.penaltySource, PENALTY_SOURCES.GROUP_PENDING);

  const blockedState = createState({
    penaltySource: PENALTY_SOURCES.CARD_PENDING
  });
  const blocked = transitionFlow(blockedState, FLOW_TRANSITIONS.RESUME_GROUP_PENDING);
  assertBlocked(blocked);
});
