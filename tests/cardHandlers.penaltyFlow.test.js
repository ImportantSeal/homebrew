import test from 'node:test';
import assert from 'node:assert/strict';

import { createPenaltyFlow } from '../js/game/controller/cardHandlers/penaltyFlow.js';

function createHarness(stateOverrides = {}) {
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
    rollPenaltyCard: () => {},
    hidePenaltyCard: () => {
      counts.hidePenaltyCard += 1;
    },
    syncBackgroundScene: () => {}
  });

  return { state, logs, counts, flow };
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
