import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlainCardFlow } from '../js/game/controller/cardHandlers/plainCardFlow.js';

function createHarness() {
  const state = {
    currentPlayerIndex: 0,
    players: [{ name: 'A', inventory: [] }],
    includeItems: true,
    itemCards: ['Gadget']
  };

  const logs = [];
  const counts = {
    nextPlayer: 0,
    unlockUI: 0,
    renderEffectsPanel: 0,
    renderItems: 0,
    renderTurnOrder: 0,
    flashElement: 0
  };

  const flow = createPlainCardFlow({
    state,
    log: (line) => logs.push(String(line)),
    currentPlayer: () => state.players[state.currentPlayerIndex],
    nextPlayer: () => {
      counts.nextPlayer += 1;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    },
    unlockUI: () => {
      counts.unlockUI += 1;
    },
    renderEffectsPanel: () => {
      counts.renderEffectsPanel += 1;
    },
    renderItems: () => {
      counts.renderItems += 1;
    },
    renderTurnOrder: () => {
      counts.renderTurnOrder += 1;
    },
    openActionScreen: () => {},
    applyDrinkEvent: () => {},
    activateDitto: () => {},
    onDittoActivated: () => {},
    replaceCardSelectionKind: () => {},
    setBaseBackgroundScene: () => {},
    flashElement: () => {
      counts.flashElement += 1;
    },
    syncBackgroundScene: () => {}
  });

  return { state, logs, counts, flow };
}

test('plain card flow handles item acquisition', () => {
  const { state, logs, counts, flow } = createHarness();

  const cardEl = {};
  flow.handlePlainCard(cardEl, 'Gadget', 'normal');

  assert.deepEqual(state.players[0].inventory, ['Gadget']);
  assert.ok(logs.some((line) => line.includes('A acquired item: Gadget')));
  assert.equal(counts.flashElement, 1);
  assert.equal(counts.renderTurnOrder, 1);
  assert.equal(counts.renderItems, 1);
  assert.equal(counts.renderEffectsPanel, 1);
  assert.equal(counts.nextPlayer, 1);
  assert.equal(counts.unlockUI, 1);
});
