import test from 'node:test';
import assert from 'node:assert/strict';

import {
  drawObjectSubcard,
  getAvailableObjectParentCards
} from '../js/logic/objectCardCycle.js';

function makeState() {
  const challenge = {
    name: 'Challenge',
    subcategories: [
      { name: 'Challenge A', instruction: 'Do A.' },
      { name: 'Challenge B', instruction: 'Do B.' }
    ]
  };
  const crowdChallenge = {
    name: 'Crowd Challenge',
    subcategories: [
      { name: 'Crowd A', instruction: 'Do crowd A.' }
    ]
  };
  const special = {
    name: 'Special Card',
    subcategories: [
      { name: 'Special A', instruction: 'Do special A.' }
    ]
  };

  return {
    includeItems: true,
    socialCards: [challenge],
    crowdChallenge,
    special,
    objectCardCycle: { seenKeys: [] }
  };
}

function pickFirst(candidates) {
  return candidates[0];
}

test('object card cycle blocks repeats across challenge, crowd, and special pools', () => {
  const state = makeState();
  const challenge = state.socialCards[0];

  const first = drawObjectSubcard(state, challenge, pickFirst);
  const second = drawObjectSubcard(state, challenge, pickFirst);

  assert.equal(first.event.name, 'Challenge A');
  assert.equal(second.event.name, 'Challenge B');
  assert.notEqual(second.event.name, first.event.name);

  const availableNames = getAvailableObjectParentCards(state).map(card => card.name);
  assert.deepEqual(availableNames, ['Crowd Challenge', 'Special Card']);
});

test('exhausted requested category falls back to another unseen object category', () => {
  const state = makeState();
  const challenge = state.socialCards[0];

  drawObjectSubcard(state, challenge, pickFirst);
  drawObjectSubcard(state, challenge, pickFirst);

  const third = drawObjectSubcard(state, challenge, pickFirst);

  assert.equal(third.event.name, 'Crowd A');
  assert.equal(third.parentCard, state.crowdChallenge);
});

test('object card cycle resets only after all tracked object cards have appeared', () => {
  const state = makeState();
  const challenge = state.socialCards[0];

  drawObjectSubcard(state, challenge, pickFirst);
  drawObjectSubcard(state, challenge, pickFirst);
  drawObjectSubcard(state, state.crowdChallenge, pickFirst);
  drawObjectSubcard(state, state.special, pickFirst);

  assert.equal(state.objectCardCycle.seenKeys.length, 4);

  const availableNames = getAvailableObjectParentCards(state).map(card => card.name);

  assert.deepEqual(availableNames, ['Challenge', 'Crowd Challenge', 'Special Card']);
  assert.deepEqual(state.objectCardCycle.seenKeys, []);
});

test('object card cycle ignores item-only special cards when items are disabled', () => {
  const state = makeState();
  state.includeItems = false;
  state.special.subcategories = [
    { name: 'Regular Special', instruction: 'No bonus needed.' },
    { name: 'Shield Check', instruction: 'If you hold any item, give 2.', itemRelated: true }
  ];

  const draw = drawObjectSubcard(state, state.special, pickFirst);
  assert.equal(draw.event.name, 'Regular Special');

  drawObjectSubcard(state, state.socialCards[0], pickFirst);
  drawObjectSubcard(state, state.socialCards[0], pickFirst);
  drawObjectSubcard(state, state.crowdChallenge, pickFirst);

  const availableNames = getAvailableObjectParentCards(state).map(card => card.name);
  assert.deepEqual(availableNames, ['Challenge', 'Crowd Challenge', 'Special Card']);
});
