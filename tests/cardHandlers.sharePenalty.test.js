import test from 'node:test';
import assert from 'node:assert/strict';

import { createCardHandlers } from '../js/game/controller/cardHandlers.js';
import { createInitialState } from '../js/state.js';

function createClassList() {
  const classes = new Set();
  return {
    add: (...tokens) => tokens.forEach((token) => classes.add(token)),
    remove: (...tokens) => tokens.forEach((token) => classes.delete(token)),
    contains: (token) => classes.has(token)
  };
}

function withMockDom(fn) {
  const previousDocument = globalThis.document;
  const previousCustomEvent = globalThis.CustomEvent;

  globalThis.document = {
    body: {
      dataset: {},
      classList: createClassList(),
      offsetWidth: 0
    },
    getElementById: () => null,
    dispatchEvent: () => {}
  };

  if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, detail) {
        this.type = type;
        this.detail = detail;
      }
    };
  }

  try {
    return fn();
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }

    if (previousCustomEvent === undefined) {
      delete globalThis.CustomEvent;
    } else {
      globalThis.CustomEvent = previousCustomEvent;
    }
  }
}

function createHarness(stateOverrides = {}) {
  const state = createInitialState();
  state.players = [
    { name: 'A', inventory: [] },
    { name: 'B', inventory: [] },
    { name: 'C', inventory: [] }
  ];
  state.currentPlayerIndex = 0;
  state.penaltyDeck = ['Drink 3', 'Drink 5', 'Shot', 'Shotgun'];
  state.stats = { players: [], updatedAt: 0 };

  Object.assign(state, stateOverrides);

  const logs = [];
  const actionScreens = [];
  const counts = {
    lockUI: 0,
    unlockUI: 0,
    unlockAfter: 0,
    nextPlayer: 0,
    renderEffectsPanel: 0,
    renderItems: 0,
    renderTurnOrder: 0,
    resetCards: 0
  };

  const handlers = createCardHandlers({
    state,
    timing: {
      MYSTERY_REVEAL_UNLOCK_MS: 0,
      DITTO_DOUBLECLICK_GUARD_MS: 0,
      PENALTY_UNLOCK_MS: 0,
      REDRAW_REFRESH_MS: 0
    },
    createBag: () => ({ next: () => null }),
    log: (line) => logs.push(String(line)),
    currentPlayer: () => state.players[state.currentPlayerIndex],
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    nextPlayer: () => {
      counts.nextPlayer += 1;
      if (state.players.length > 0) {
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      }
    },
    lockUI: () => {
      counts.lockUI += 1;
      state.uiLocked = true;
    },
    unlockUI: () => {
      counts.unlockUI += 1;
      state.uiLocked = false;
    },
    unlockAfter: () => {
      counts.unlockAfter += 1;
      state.uiLocked = false;
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
    resetCards: () => {
      counts.resetCards += 1;
    },
    openActionScreen: (title, message, options = {}) => {
      actionScreens.push({ title, message, options });
    }
  });

  return { state, handlers, logs, actionScreens, counts };
}

test('Share Penalty confirm flow opens target choice and applies shared drink penalty', () => {
  withMockDom(() => {
    const { state, handlers, logs, actionScreens, counts } = createHarness({
      penaltyShown: true,
      penaltyCard: 'Drink 5',
      penaltyConfirmArmed: true,
      penaltySource: 'card',
      sharePenalty: {
        active: true,
        sourcePlayerIndex: 0,
        penalty: 'Drink 5'
      }
    });

    handlers.onPenaltyDeckClick();

    assert.equal(counts.lockUI, 1);
    assert.equal(counts.nextPlayer, 0);
    assert.equal(counts.unlockUI, 0);
    assert.equal(actionScreens.length, 1);

    const modal = actionScreens[0];
    assert.equal(modal.title, 'Share Penalty');
    assert.equal(modal.options.variant, 'penalty');
    assert.equal(modal.options.dismissible, false);
    assert.deepEqual(modal.options.actions.map((entry) => entry.id), ['share_penalty_1', 'share_penalty_2']);
    assert.equal(state.choiceSelection.active, true);

    const invalidSelfTarget = modal.options.onAction({ id: 'share_penalty_0' });
    assert.equal(invalidSelfTarget, false);
    assert.ok(logs.some((line) => line.includes('Pick one other player (not yourself).')));

    const success = modal.options.onAction({ id: 'share_penalty_2' });
    assert.equal(success, true);
    assert.equal(state.sharePenalty, null);
    assert.equal(state.choiceSelection.active, false);
    assert.equal(state.stats.players[2].drinksTaken, 5);
    assert.equal(counts.nextPlayer, 1);
    assert.equal(counts.unlockUI, 1);
    assert.equal(counts.renderItems, 1);
    assert.ok(logs.some((line) => line.includes('C shares penalty: Drink 5.')));
  });
});

test('Share Penalty target flow falls back to manual resolution for unsupported penalty text', () => {
  withMockDom(() => {
    const { state, handlers, logs, actionScreens, counts } = createHarness({
      penaltyShown: true,
      penaltyCard: 'Do 20 push-ups',
      penaltyConfirmArmed: true,
      penaltySource: 'card',
      sharePenalty: {
        active: true,
        sourcePlayerIndex: 0,
        penalty: 'Do 20 push-ups'
      }
    });

    handlers.onPenaltyDeckClick();
    const modal = actionScreens[0];
    const success = modal.options.onAction({ id: 'share_penalty_1' });

    assert.equal(success, true);
    assert.equal(state.stats.players[1]?.drinksTaken || 0, 0);
    assert.equal(counts.nextPlayer, 1);
    assert.equal(counts.unlockUI, 1);
    assert.ok(logs.some((line) => line.includes('B shares penalty: Do 20 push-ups.')));
    assert.ok(logs.some((line) => line.includes('Shared penalty could not be auto-applied (Do 20 push-ups). Resolve it manually.')));
  });
});

test('Share Penalty target can be shielded and shared penalty does not apply drinks', () => {
  withMockDom(() => {
    const { state, handlers, logs, actionScreens, counts } = createHarness({
      penaltyShown: true,
      penaltyCard: 'Shot',
      penaltyConfirmArmed: true,
      penaltySource: 'card',
      sharePenalty: {
        active: true,
        sourcePlayerIndex: 0,
        penalty: 'Shot'
      }
    });
    state.players[1].shield = true;

    handlers.onPenaltyDeckClick();
    const modal = actionScreens[0];
    const success = modal.options.onAction({ id: 'share_penalty_1' });

    assert.equal(success, true);
    assert.equal(state.players[1].shield, undefined);
    assert.equal(state.stats.players[1]?.drinksTaken || 0, 0);
    assert.equal(counts.nextPlayer, 1);
    assert.equal(counts.unlockUI, 1);
    assert.ok(logs.some((line) => line.includes("B's Shield protected against the shared penalty!")));
    assert.ok(!logs.some((line) => line.includes('Shared penalty could not be auto-applied')));
  });
});

test('Share Penalty pending roll is cleared when shield blocks penalty reveal', () => {
  withMockDom(() => {
    const { state, handlers, logs, actionScreens, counts } = createHarness({
      penaltyShown: false,
      penaltyConfirmArmed: false,
      penaltySource: 'card_pending',
      sharePenalty: {
        active: true,
        sourcePlayerIndex: 0,
        penalty: null
      }
    });
    state.players[0].shield = true;

    handlers.onPenaltyDeckClick();

    assert.equal(actionScreens.length, 0);
    assert.equal(state.penaltyShown, false);
    assert.equal(state.sharePenalty, null);
    assert.equal(state.players[0].shield, undefined);
    assert.equal(counts.lockUI, 1);
    assert.equal(counts.nextPlayer, 1);
    assert.equal(counts.unlockUI, 1);
    assert.ok(logs.some((line) => line.includes("A's Shield protected against the penalty!")));
    assert.ok(logs.some((line) => line.includes('Share Penalty ended because no penalty card was revealed.')));
  });
});
