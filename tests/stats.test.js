import test from 'node:test';
import assert from 'node:assert/strict';

import { getStatsSnapshot, recordCardSelection, replaceCardSelectionKind } from '../js/stats.js';

function createState() {
  return {
    players: [{ name: 'A' }],
    stats: { players: [], updatedAt: 0 }
  };
}

test('mix card selection increments mix, drink, and give kind counters', () => {
  const state = createState();

  recordCardSelection(state, 0, { kind: 'mix', mystery: false });

  const snapshot = getStatsSnapshot(state);
  assert.equal(snapshot[0].cardsSelected, 1);
  assert.equal(snapshot[0].kindCounts.mix, 1);
  assert.equal(snapshot[0].kindCounts.drink, 1);
  assert.equal(snapshot[0].kindCounts.give, 1);
});

test('replaceCardSelectionKind can reclassify a selection to ditto without changing card count', () => {
  const state = createState();

  recordCardSelection(state, 0, { kind: 'mix', mystery: true });
  replaceCardSelectionKind(state, 0, 'mix', 'ditto');

  const snapshot = getStatsSnapshot(state);
  assert.equal(snapshot[0].cardsSelected, 1);
  assert.equal(snapshot[0].mysteryCardsSelected, 1);
  assert.equal(snapshot[0].kindCounts.mix, 0);
  assert.equal(snapshot[0].kindCounts.drink, 0);
  assert.equal(snapshot[0].kindCounts.give, 0);
  assert.equal(snapshot[0].kindCounts.ditto, 1);
});
