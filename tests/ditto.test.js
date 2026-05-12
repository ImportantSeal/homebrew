import test from 'node:test';
import assert from 'node:assert/strict';

import { activateDitto, runDittoEffect } from '../js/logic/ditto.js';

function createBaseState() {
  return {
    includeItems: false,
    players: [{ name: 'A' }, { name: 'B' }],
    currentPlayerIndex: 0,
    currentCards: [],
    penaltyDeck: [{ type: 'penalty', name: 'Drink 4', drink: { amount: 4 } }],
    stats: { players: [], updatedAt: 0 },
    dittoPending: [{ type: 'DRINK_3' }],
    dittoActive: [false]
  };
}

function captureDrinkEvents(events) {
  return (state, playerIndex, amount, reason, log, opts = {}) => {
    events.push({ playerIndex, amount, reason, opts });
  };
}

test('RANDOM_CHALLENGE mini king uses king-cup wording', () => {
  const state = createBaseState();
  state.dittoPending[0] = { type: 'RANDOM_CHALLENGE' };

  const originalRandom = Math.random;
  Math.random = () => 0.6; // picks challenge index 2 (Mini King)
  try {
    const info = runDittoEffect(state, 0, () => {}, () => {}, () => {}, () => {});
    assert.match(info.message, /Mini King/i);
    assert.match(info.message, /Everyone adds to the King's Cup\./i);
    assert.doesNotMatch(info.message, /interrupting you drinks 2/i);
  } finally {
    Math.random = originalRandom;
  }
});

test('PENALTY_ALL summary omits shield mention when items are disabled', () => {
  const state = createBaseState();
  state.includeItems = false;
  state.dittoPending[0] = { type: 'PENALTY_ALL' };

  const info = runDittoEffect(state, 0, () => {}, () => {}, () => {}, () => {});
  assert.match(info.message, /^Penalty for everyone: Drink 4\./);
  assert.match(info.message, /Affected: 2\./);
  assert.doesNotMatch(info.message, /Shield/i);
});

test('PENALTY_ALL summary includes blocked shield count when relevant', () => {
  const state = createBaseState();
  state.includeItems = true;
  state.players[0].shield = true;
  state.dittoPending[0] = { type: 'PENALTY_ALL' };

  const info = runDittoEffect(state, 0, () => {}, () => {}, () => {}, () => {});
  assert.match(info.message, /Affected: 1\./);
  assert.match(info.message, /Blocked by Shield: 1\./);
});

test('activateDitto stores source card for trap effects', () => {
  const state = createBaseState();
  state.rng = { nextFloat: () => 0.99 };
  const sourceCard = { type: 'plain', name: 'Give 2', give: { amount: 2 } };
  const front = { textContent: 'Give 2', removeAttribute: () => {} };
  const cardEl = {
    dataset: { value: 'Give 2', kind: 'give' },
    querySelector: () => front,
    classList: { add: () => {} }
  };

  activateDitto(state, cardEl, 0, () => {}, sourceCard);

  assert.equal(state.dittoPending[0].type, 'TRAP_CARD');
  assert.equal(state.dittoPending[0].sourceCard, sourceCard);
  assert.equal(cardEl.dataset.value, 'Ditto');
  assert.equal(cardEl.dataset.kind, 'ditto');
});

test('TRAP_CARD turns Give into a drink for current player', () => {
  const state = createBaseState();
  const events = [];
  state.dittoPending[0] = {
    type: 'TRAP_CARD',
    sourceCard: { type: 'plain', name: 'Give 2', give: { amount: 2 } }
  };

  const info = runDittoEffect(state, 0, () => {}, () => {}, () => {}, captureDrinkEvents(events));

  assert.equal(info.message, 'The Give backfires. Drink 2.');
  assert.deepEqual(events, [
    { playerIndex: 0, amount: 2, reason: 'Ditto trap', opts: {} }
  ]);
});

test('TRAP_CARD spreads self Drink to everyone', () => {
  const state = createBaseState();
  const events = [];
  state.players.push({ name: 'C' });
  state.dittoPending[0] = {
    type: 'TRAP_CARD',
    sourceCard: { type: 'plain', name: 'Drink 2', drink: { scope: 'self', amount: 2 } }
  };

  const info = runDittoEffect(state, 0, () => {}, () => {}, () => {}, captureDrinkEvents(events));

  assert.equal(info.message, 'The Drink spreads. Everybody drinks 2.');
  assert.deepEqual(events, [
    { playerIndex: 0, amount: 2, reason: 'Ditto trap', opts: { suppressSelfLog: true } },
    { playerIndex: 1, amount: 2, reason: 'Ditto trap', opts: { suppressSelfLog: true } },
    { playerIndex: 2, amount: 2, reason: 'Ditto trap', opts: { suppressSelfLog: true } }
  ]);
});

test('TRAP_CARD turns mix Give value into extra self drink', () => {
  const state = createBaseState();
  const events = [];
  state.dittoPending[0] = {
    type: 'TRAP_CARD',
    sourceCard: {
      type: 'plain',
      name: 'Drink 3, Give 2',
      drink: { scope: 'self', amount: 3 },
      give: { amount: 2 }
    }
  };

  const info = runDittoEffect(state, 0, () => {}, () => {}, () => {}, captureDrinkEvents(events));

  assert.equal(info.message, 'The Give backfires. Drink 5.');
  assert.deepEqual(events, [
    { playerIndex: 0, amount: 5, reason: 'Ditto trap', opts: {} }
  ]);
});
