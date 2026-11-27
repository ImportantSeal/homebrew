import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../js/state.js';
import { createPlainCardFlow } from '../js/game/controller/cardHandlers/plainCardFlow.js';
import { createPenaltyGroupQueueFlow } from '../js/game/controller/cardHandlers/penaltyFlowGroupQueue.js';
import { queueManualPenaltyDrawForPlayers } from '../js/game/controller/helpers.js';
import { getPlainCardSpec } from '../js/logic/cardSchema.js';
import {
  DITTO_CHANCE,
  DRAW_TWISTS,
  SAVIOR_CHANCE,
  isSaviorEligibleSpec,
  resolveDrawTwist
} from '../js/logic/savior.js';
import { isCardPenaltyPending, isGroupPenaltyPending } from '../js/logic/flowMachine.js';

const SAVIOR_ROLL = 0.995;
const DITTO_ROLL = 0.05;
const NORMAL_ROLL = 0.5;

function createPlayers(count) {
  return Array.from({ length: count }, (_, idx) => ({
    name: String.fromCharCode(65 + idx),
    inventory: []
  }));
}

function createHarness(roll, playerCount = 3) {
  const state = createInitialState();
  state.players = createPlayers(playerCount);
  state.currentPlayerIndex = 0;
  state.includeItems = false;
  state.itemCards = [];

  const logs = [];
  const drinks = [];
  const screens = [];
  const saviorCalls = [];
  const counts = { nextPlayer: 0, unlockUI: 0, activateDitto: 0 };

  const flow = createPlainCardFlow({
    state,
    rng: { nextFloat: () => roll },
    log: (line, opts) => logs.push({ line: String(line), kind: opts?.kind ?? null }),
    currentPlayer: () => state.players[state.currentPlayerIndex],
    nextPlayer: () => {
      counts.nextPlayer += 1;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    },
    unlockUI: () => { counts.unlockUI += 1; },
    renderEffectsPanel: () => {},
    renderItems: () => {},
    renderTurnOrder: () => {},
    openActionScreen: (title, message, opts) => screens.push({ title, message, variant: opts?.variant }),
    applyDrinkEvent: (_state, idx, amount) => drinks.push({ idx, amount }),
    activateDitto: () => { counts.activateDitto += 1; },
    onDittoActivated: () => {},
    onSaviorTriggered: (info) => saviorCalls.push(info),
    replaceCardSelectionKind: () => {},
    setBaseBackgroundScene: () => {},
    flashElement: () => {},
    syncBackgroundScene: () => {}
  });

  const cardEl = { dataset: { index: '0' } };
  return { state, logs, drinks, screens, saviorCalls, counts, flow, cardEl };
}

test('resolveDrawTwist never returns Savior and Ditto from the same roll', () => {
  const shotSpec = getPlainCardSpec('Take a Shot');
  for (let i = 0; i < 1000; i++) {
    const roll = i / 1000;
    const twist = resolveDrawTwist(roll, shotSpec);
    if (roll < DITTO_CHANCE) assert.equal(twist, DRAW_TWISTS.DITTO);
    else if (roll >= 1 - SAVIOR_CHANCE) assert.equal(twist, DRAW_TWISTS.SAVIOR);
    else assert.equal(twist, DRAW_TWISTS.NONE);
  }
});

test('Savior is only eligible for Shot, Shotgun and Shot + Shotgun cards', () => {
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Take a Shot')), true);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Shotgun')), true);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Shot + Shotgun')), true);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Everybody takes a Shot')), true);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Everybody takes a Shot + Shotgun')), true);

  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Drink 3')), false);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Drink 2, Give 1')), false);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Everybody drinks 2')), false);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Give 3')), false);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Draw a Penalty Card')), false);
  assert.equal(isSaviorEligibleSpec(getPlainCardSpec('Everybody takes a Penalty Card')), false);
});

test('Savior on a Shot card skips the drink and advances the turn exactly once', () => {
  const { state, drinks, screens, saviorCalls, counts, flow, cardEl, logs } = createHarness(SAVIOR_ROLL);

  flow.handlePlainCard(cardEl, 'Take a Shot', 'drink');

  assert.deepEqual(drinks, []);
  assert.equal(saviorCalls.length, 1);
  assert.equal(counts.activateDitto, 0);
  assert.equal(counts.nextPlayer, 1);
  assert.equal(state.currentPlayerIndex, 1);
  assert.equal(screens.at(-1).variant, 'savior');
  assert.ok(logs.some(({ kind }) => kind === 'savior'));
});

test('Savior on Everybody takes a Shot means nobody drinks', () => {
  const { drinks, saviorCalls, counts, flow, cardEl } = createHarness(SAVIOR_ROLL);

  flow.handlePlainCard(cardEl, 'Everybody takes a Shot', 'drink');

  assert.deepEqual(drinks, []);
  assert.equal(saviorCalls[0].everybody, true);
  assert.equal(counts.nextPlayer, 1);
});

test('basic Drink card is never blessed, even on a high roll', () => {
  const { drinks, saviorCalls, counts, flow, cardEl } = createHarness(SAVIOR_ROLL);

  flow.handlePlainCard(cardEl, 'Drink 3', 'drink');

  assert.deepEqual(drinks, [{ idx: 0, amount: 3 }]);
  assert.equal(saviorCalls.length, 0);
  assert.equal(counts.nextPlayer, 1);
});

test('Ditto roll on a Shot card does not trigger Savior', () => {
  const { drinks, saviorCalls, counts, flow, cardEl } = createHarness(DITTO_ROLL);

  flow.handlePlainCard(cardEl, 'Take a Shot', 'drink');

  assert.equal(counts.activateDitto, 1);
  assert.equal(saviorCalls.length, 0);
  assert.equal(counts.nextPlayer, 0);
  assert.deepEqual(drinks, []);
});

test('normal roll on a Shot card drinks normally', () => {
  const { drinks, saviorCalls, flow, cardEl } = createHarness(NORMAL_ROLL);

  flow.handlePlainCard(cardEl, 'Take a Shot', 'drink');

  assert.deepEqual(drinks, [{ idx: 0, amount: 'Shot' }]);
  assert.equal(saviorCalls.length, 0);
});

test('Draw a Penalty Card is not blessed on the card pick', () => {
  const { state, saviorCalls, counts, flow, cardEl } = createHarness(SAVIOR_ROLL);

  flow.handlePlainCard(cardEl, 'Draw a Penalty Card', 'penaltycall');

  assert.equal(isCardPenaltyPending(state), true);
  assert.equal(saviorCalls.length, 0);
  assert.equal(counts.nextPlayer, 0);
});

test('Everybody Penalty: a blessed player skips their penalty, the rest still roll', () => {
  const state = createInitialState();
  state.players = createPlayers(3);
  state.currentPlayerIndex = 1;
  const rolls = [0.99, 0.1, 0.1];
  state.rng = { nextFloat: () => rolls.shift() ?? 0.1 };

  const rolled = [];
  const saviorCalls = [];
  const flow = createPenaltyGroupQueueFlow({
    state,
    log: () => {},
    playerName: (idx) => state.players[idx]?.name,
    syncBackgroundScene: () => {},
    rollPenaltyCard: (_state, _log, _source, _apply, opts) => {
      rolled.push(opts.targetPlayerIndex);
      state.penaltyShown = true;
    },
    applyDrinkEvent: () => {},
    openActionScreen: () => {},
    onSaviorTriggered: (info) => saviorCalls.push(info)
  });

  queueManualPenaltyDrawForPlayers(state, () => {}, [0, 1, 2], 1, 'Everybody takes a Penalty card.');
  assert.equal(isGroupPenaltyPending(state), true);

  const step = flow.rollNextGroupPenaltyInQueue();

  assert.deepEqual(step, { done: false, shown: true });
  assert.deepEqual(saviorCalls.map((call) => call.playerIndex), [0]);
  assert.deepEqual(rolled, [1]);
  assert.equal(state.penaltyGroup.cursor, 1);
  assert.equal(state.penaltyGroup.originPlayerIndex, 1);
});
