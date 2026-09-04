import test from 'node:test';
import assert from 'node:assert/strict';

import { createCardHandlers } from '../js/game/controller/cardHandlers.js';
import { installDom } from './domHarness.js';

function buildCard(document) {
  const card = document.createElement('div');
  card.id = 'card0';
  document.body.appendChild(card);
  return card;
}

function createHarness(state, event) {
  const counts = {
    lockUI: 0,
    unlockUI: 0,
    nextPlayer: 0,
    activations: 0
  };
  let activationDetail = null;

  window.addEventListener('plinko-card-activated', (activationEvent) => {
    counts.activations += 1;
    activationDetail = activationEvent.detail;
  });

  const handlers = createCardHandlers({
    state,
    timing: {
      PENALTY_UNLOCK_MS: 0,
      MYSTERY_REVEAL_UNLOCK_MS: 0,
      DITTO_DOUBLECLICK_GUARD_MS: 0,
      REDRAW_REFRESH_MS: 0
    },
    createBag: () => ({ next: () => event }),
    log: () => {},
    currentPlayer: () => state.players[state.currentPlayerIndex],
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    nextPlayer: () => {
      counts.nextPlayer += 1;
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    },
    lockUI: () => {
      counts.lockUI += 1;
      state.uiLocked = true;
    },
    unlockUI: () => {
      counts.unlockUI += 1;
      state.uiLocked = false;
    },
    unlockAfter: () => {},
    renderEffectsPanel: () => {},
    renderItems: () => {},
    renderTurnOrder: () => {},
    resetCards: () => {},
    openActionScreen: () => {}
  });

  return {
    counts,
    handlers,
    getActivationDetail: () => activationDetail
  };
}

test('Plinko card keeps its player turn pending until completion and completes only once', () => {
  const dom = installDom();

  try {
    const plinkoEvent = {
      name: 'One Ball Wonder',
      instruction: 'Open Plinko and drop exactly one ball.',
      plinko: { mode: 'one', dropLimit: 1 }
    };
    const parentCard = {
      name: 'Special Card',
      subcategories: [plinkoEvent]
    };
    const state = {
      currentPlayerIndex: 0,
      players: [
        { name: 'A', inventory: [] },
        { name: 'B', inventory: [] }
      ],
      currentCards: [parentCard],
      revealed: [true],
      dittoActive: [false],
      dittoPending: [null],
      hiddenIndex: -1,
      itemCards: [],
      includeItems: true,
      penaltyShown: false,
      penaltySource: null,
      penaltyGroup: null,
      choiceSelection: { active: false, pending: null },
      effectSelection: { active: false, pending: null },
      uiLocked: false,
      bags: {}
    };
    buildCard(dom.document);
    const { counts, handlers, getActivationDetail } = createHarness(state, plinkoEvent);

    handlers.onCardClick(0);

    const detail = getActivationDetail();
    assert.equal(counts.activations, 1);
    assert.equal(detail?.playerIndex, 0);
    assert.equal(detail?.playerName, 'A');
    assert.equal(typeof detail?.onComplete, 'function');
    assert.ok(state.plinkoPending);
    assert.equal(state.currentPlayerIndex, 0);
    assert.equal(state.uiLocked, true);
    assert.equal(counts.lockUI, 1);
    assert.equal(counts.unlockUI, 0);
    assert.equal(counts.nextPlayer, 0);

    handlers.onCardClick(0);

    assert.equal(counts.activations, 1);
    assert.equal(counts.lockUI, 1);
    assert.equal(counts.unlockUI, 0);
    assert.equal(counts.nextPlayer, 0);

    detail.onComplete();

    assert.equal(Boolean(state.plinkoPending), false);
    assert.equal(state.currentPlayerIndex, 1);
    assert.equal(state.uiLocked, false);
    assert.equal(counts.unlockUI, 1);
    assert.equal(counts.nextPlayer, 1);

    detail.onComplete();

    assert.equal(state.currentPlayerIndex, 1);
    assert.equal(state.uiLocked, false);
    assert.equal(counts.unlockUI, 1);
    assert.equal(counts.nextPlayer, 1);
  } finally {
    dom.cleanup();
  }
});
