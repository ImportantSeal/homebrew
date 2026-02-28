import test from 'node:test';
import assert from 'node:assert/strict';

import { runDittoEffect } from '../js/logic/ditto.js';

function createBaseState() {
  return {
    includeItems: false,
    players: [{ name: 'A' }, { name: 'B' }],
    currentPlayerIndex: 0,
    penaltyDeck: ['Drink 4'],
    stats: { players: [], updatedAt: 0 },
    dittoPending: [{ type: 'DRINK_3' }]
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
