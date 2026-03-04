import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../js/state.js';
import { createSeededRng } from '../js/utils/rng.js';
import { dealTurnCards } from '../js/logic/deck.js';

function snapshotDeal(state) {
  const cards = state.currentCards.map((card) => {
    if (card && typeof card === 'object') {
      return String(card.name || card.instruction || 'object');
    }
    return String(card);
  });

  return {
    cards,
    hiddenIndex: state.hiddenIndex,
    revealed: [...state.revealed]
  };
}

test('dealTurnCards uses state rng for deterministic deals', () => {
  const seed = 4242;
  const stateA = createInitialState();
  const stateB = createInitialState();

  stateA.rng = createSeededRng(seed);
  stateB.rng = createSeededRng(seed);
  stateA.includeItems = true;
  stateB.includeItems = true;

  const dealsA = [];
  const dealsB = [];

  for (let i = 0; i < 5; i += 1) {
    dealTurnCards(stateA);
    dealTurnCards(stateB);
    dealsA.push(snapshotDeal(stateA));
    dealsB.push(snapshotDeal(stateB));
  }

  assert.deepEqual(dealsA, dealsB);
});
