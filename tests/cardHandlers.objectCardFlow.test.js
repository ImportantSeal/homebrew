import test from 'node:test';
import assert from 'node:assert/strict';

import { createObjectCardFlow } from '../js/game/controller/cardHandlers/objectCardFlow.js';

function createHarness(event) {
  const state = {
    currentPlayerIndex: 0,
    players: [{ name: 'A', inventory: [] }],
    includeItems: true,
    penaltyDeck: ['Drink 1'],
    bags: {}
  };

  const logs = [];
  const actionScreens = [];
  const calls = {
    flipCardAnimation: [],
    renderEffectsPanel: 0,
    resetCards: 0
  };

  const flow = createObjectCardFlow({
    state,
    createBag: () => ({ next: () => event }),
    log: (line) => logs.push(String(line)),
    currentPlayer: () => state.players[state.currentPlayerIndex],
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    nextPlayer: () => {},
    renderEffectsPanel: () => {
      calls.renderEffectsPanel += 1;
    },
    resetCards: () => {
      calls.resetCards += 1;
    },
    openActionScreen: (title, message, options = {}) => {
      actionScreens.push({ title, message, options });
    },
    applyDrinkEvent: () => {},
    rollPenaltyCard: () => {},
    showPenaltyPreview: () => {},
    beginTargetedEffectSelection: () => {},
    addEffect: () => {},
    createEffect: () => ({}),
    startChoiceSelection: () => false,
    syncBackgroundScene: () => {},
    flipCardAnimation: (cardEl, text) => {
      calls.flipCardAnimation.push({ cardEl, text });
    }
  });

  return { state, logs, actionScreens, calls, flow };
}

test('object card flow logs and opens action screen for simple subcard', () => {
  const event = { name: 'Quick Test', instruction: 'Do something fun' };
  const { logs, actionScreens, calls, flow } = createHarness(event);

  const parentCard = { name: 'Special', subcategories: [event] };
  const cardEl = {};

  const endsTurn = flow.handleObjectCardDraw(cardEl, parentCard);

  assert.equal(endsTurn, true);
  assert.equal(actionScreens.length, 1);
  assert.equal(actionScreens[0].title, 'Quick Test');
  assert.equal(actionScreens[0].message, 'Do something fun');
  assert.equal(actionScreens[0].options.variant, 'normal');
  assert.equal(calls.flipCardAnimation.length, 1);
  assert.equal(calls.flipCardAnimation[0].text, 'Do something fun');
  assert.ok(logs.some((line) => line.includes('Quick Test - Do something fun')));
});
