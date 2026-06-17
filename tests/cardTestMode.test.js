import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../js/state.js';
import { dealTestCards, resolveTestCard } from '../js/dev/cardTestMode.js';

test('dealTestCards stays inactive when no test card is configured', () => {
  const state = createInitialState();

  const applied = dealTestCards(state, { testCard: null, testSubcard: null });

  assert.equal(applied, false);
  assert.deepEqual(state.currentCards, []);
});

test('dealTestCards fills all cards with the selected normal deck card', () => {
  const state = createInitialState();

  const applied = dealTestCards(state, { testCard: 'drink_3', testSubcard: null });

  assert.equal(applied, true);
  assert.deepEqual(
    state.currentCards.map((card) => card.id),
    ['drink_3', 'drink_3', 'drink_3']
  );
  assert.deepEqual(state.revealed, [true, true, true]);
  assert.equal(state.hiddenIndex, null);
  assert.deepEqual(state.dittoActive, [false, false, false]);
});

test('resolveTestCard can force one subcard inside a parent object deck', () => {
  const state = createInitialState();

  const card = resolveTestCard(state, {
    testCard: 'Special Card',
    testSubcard: 'Drink and Draw Again'
  });

  assert.equal(card.name, 'Special Card');
  assert.equal(card.testCardMode, true);
  assert.equal(card.subcategories.length, 1);
  assert.equal(card.subcategories[0].name, 'Drink and Draw Again');
});

test('resolveTestCard wraps a copied object subcard into a playable test card', () => {
  const state = createInitialState();
  const subcard = {
    name: 'Quick Test',
    instruction: 'Do something specific.'
  };

  const card = resolveTestCard(state, { testCard: subcard, testSubcard: null });

  assert.equal(card.name, 'Quick Test');
  assert.equal(card.testCardMode, true);
  assert.deepEqual(card.subcategories, [subcard]);
});
