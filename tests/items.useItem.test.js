import test from 'node:test';
import assert from 'node:assert/strict';

import { useItem } from '../js/logic/items.js';
import { createMirrorState } from '../js/logic/mirror.js';

function createBaseState() {
  return {
    currentPlayerIndex: 0,
    hiddenIndex: null,
    revealed: [true, true, true],
    currentCards: ['Card A', 'Card B', 'Card C'],
    players: [{ name: 'A', inventory: [] }],
    mirror: createMirrorState()
  };
}

function createHarness(stateOverride = {}) {
  const state = { ...createBaseState(), ...stateOverride };
  const logs = [];
  const counts = {
    updateTurnOrder: 0,
    renderItemsBoard: 0,
    updateTurn: 0,
    revealHiddenCard: 0
  };

  const ui = {
    revealHiddenCard: (stateObj, index) => {
      counts.revealHiddenCard += 1;
      counts.revealHiddenCardIndex = index;
      counts.revealHiddenCardState = stateObj;
    }
  };

  return { state, logs, counts, ui };
}

test('useItem activates Shield and removes it from inventory', () => {
  const { state, logs, counts } = createHarness({
    players: [{ name: 'A', inventory: ['Shield'] }]
  });

  useItem(
    state,
    0,
    0,
    (line) => logs.push(String(line)),
    () => { counts.updateTurnOrder += 1; },
    () => { counts.renderItemsBoard += 1; },
    () => { counts.updateTurn += 1; }
  );

  assert.equal(state.players[0].shield, true);
  assert.deepEqual(state.players[0].inventory, []);
  assert.equal(counts.updateTurnOrder, 1);
  assert.equal(counts.renderItemsBoard, 1);
  assert.equal(counts.updateTurn, 0);
  assert.ok(logs.some((line) => line.includes('activated Shield')));
});

test('useItem reveals hidden card with Reveal Free', () => {
  const { state, logs, counts, ui } = createHarness({
    hiddenIndex: 1,
    revealed: [true, false, true],
    players: [{ name: 'A', inventory: ['Reveal Free'] }]
  });

  useItem(
    state,
    0,
    0,
    (line) => logs.push(String(line)),
    () => { counts.updateTurnOrder += 1; },
    () => { counts.renderItemsBoard += 1; },
    () => { counts.updateTurn += 1; },
    ui
  );

  assert.equal(state.revealed[1], true);
  assert.equal(counts.revealHiddenCard, 1);
  assert.equal(counts.revealHiddenCardIndex, 1);
  assert.equal(counts.revealHiddenCardState, state);
  assert.ok(logs.some((line) => line.includes('Reveal Free')));
});

test('useItem Skip Turn advances immediately for current player', () => {
  const { state, logs, counts } = createHarness({
    currentPlayerIndex: 0,
    players: [
      { name: 'A', inventory: ['Skip Turn'] },
      { name: 'B', inventory: [] }
    ]
  });

  useItem(
    state,
    0,
    0,
    (line) => logs.push(String(line)),
    () => { counts.updateTurnOrder += 1; },
    () => { counts.renderItemsBoard += 1; },
    () => { counts.updateTurn += 1; }
  );

  assert.equal(state.currentPlayerIndex, 1);
  assert.equal(counts.updateTurn, 1);
  assert.ok(logs.some((line) => line.includes('passes their turn')));
});

test('useItem Skip Turn marks next skip when used by non-current player', () => {
  const { state, logs, counts } = createHarness({
    currentPlayerIndex: 1,
    players: [
      { name: 'A', inventory: ['Skip Turn'] },
      { name: 'B', inventory: [] }
    ]
  });

  useItem(
    state,
    0,
    0,
    (line) => logs.push(String(line)),
    () => { counts.updateTurnOrder += 1; },
    () => { counts.renderItemsBoard += 1; },
    () => { counts.updateTurn += 1; }
  );

  assert.equal(state.players[0].skipNextTurn, true);
  assert.equal(counts.updateTurn, 0);
  assert.ok(logs.some((line) => line.includes('next turn will be skipped')));
});

test('useItem Mirror resets mirror state', () => {
  const { state, logs } = createHarness({
    players: [{ name: 'A', inventory: ['Mirror'] }],
    mirror: { active: true, sourceIndex: 1, selectedCardIndex: 2, parentName: 'X', subName: 'Y', subInstruction: 'Z', displayText: 'T' }
  });

  useItem(
    state,
    0,
    0,
    (line) => logs.push(String(line)),
    () => {},
    () => {},
    () => {}
  );

  assert.deepEqual(state.mirror, createMirrorState());
  assert.ok(logs.some((line) => line.includes('used Mirror')));
});
