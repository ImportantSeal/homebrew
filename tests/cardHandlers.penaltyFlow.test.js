import test from 'node:test';
import assert from 'node:assert/strict';

import { createPenaltyFlow } from '../js/game/controller/cardHandlers/penaltyFlow.js';

function createHarness(stateOverrides = {}, dependencyOverrides = {}) {
  const state = {
    penaltyShown: false,
    penaltyConfirmArmed: false,
    penaltySource: null,
    penaltyHintShown: false,
    uiLocked: false,
    currentPlayerIndex: 0,
    players: [{ name: 'A' }],
    ...stateOverrides
  };

  const logs = [];
  const counts = {
    lockUI: 0,
    unlockUI: 0,
    unlockAfter: 0,
    nextPlayer: 0,
    renderEffectsPanel: 0,
    hidePenaltyCard: 0
  };
  const calls = {
    rollPenaltyCard: []
  };

  const flow = createPenaltyFlow({
    state,
    timing: {
      PENALTY_UNLOCK_MS: 0,
      REDRAW_REFRESH_MS: 0
    },
    log: (line) => logs.push(String(line)),
    currentPlayer: () => state.players[state.currentPlayerIndex],
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    nextPlayer: () => {
      counts.nextPlayer += 1;
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
    renderItems: () => {},
    resetCards: () => {},
    openActionScreen: () => {},
    applyDrinkEvent: () => {},
    rollPenaltyCard: dependencyOverrides.rollPenaltyCard ?? ((...args) => {
      calls.rollPenaltyCard.push(args);
    }),
    hidePenaltyCard: () => {
      counts.hidePenaltyCard += 1;
    },
    syncBackgroundScene: () => {}
  });

  return { state, logs, counts, calls, flow };
}

test('penalty flow confirms redraw penalties without ending turn', () => {
  const { counts, flow } = createHarness({
    penaltyShown: true,
    penaltyConfirmArmed: true,
    penaltySource: 'redraw'
  });

  flow.onPenaltyDeckClick();

  assert.equal(counts.lockUI, 1);
  assert.equal(counts.hidePenaltyCard, 1);
  assert.equal(counts.nextPlayer, 0);
  assert.equal(counts.unlockUI, 1);
  assert.equal(counts.renderEffectsPanel, 1);
  assert.equal(counts.unlockAfter, 0);
});

test('group penalty rolls the next queued player and waits for confirmation', () => {
  const rollCalls = [];
  const { state, counts, flow } = createHarness({
    penaltyShown: false,
    penaltyConfirmArmed: false,
    penaltySource: 'group_pending',
    penaltyGroup: { active: true, queue: [0, 1], cursor: 0, originPlayerIndex: 0 },
    players: [{ name: 'A' }, { name: 'B' }],
    currentPlayerIndex: 0
  }, {
    rollPenaltyCard: (innerState, log, source, applyDrinkEvent, options = {}) => {
      rollCalls.push({ source, options });
      innerState.penaltyShown = true;
      innerState.penaltyConfirmArmed = true;
      innerState.penaltySource = 'group';
    }
  });

  flow.onPenaltyDeckClick();

  assert.equal(counts.lockUI, 1);
  assert.equal(rollCalls.length, 1);
  assert.equal(rollCalls[0].source, 'group');
  assert.equal(rollCalls[0].options.targetPlayerIndex, 0);
  assert.equal(counts.unlockAfter, 1);
  assert.equal(counts.nextPlayer, 0);
});

test('group penalty confirmation ends turn after last queued penalty', () => {
  const { counts, flow } = createHarness({
    penaltyShown: true,
    penaltyConfirmArmed: true,
    penaltySource: 'group',
    penaltyGroup: { active: true, queue: [0], cursor: 0, originPlayerIndex: 0 },
    players: [{ name: 'A' }, { name: 'B' }],
    currentPlayerIndex: 0
  });

  flow.onPenaltyDeckClick();

  assert.equal(counts.hidePenaltyCard, 1);
  assert.equal(counts.nextPlayer, 1);
  assert.equal(counts.unlockUI, 1);
  assert.equal(counts.renderEffectsPanel, 1);
});
