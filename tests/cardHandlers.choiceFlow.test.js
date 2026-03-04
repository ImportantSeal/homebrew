import test from 'node:test';
import assert from 'node:assert/strict';

import { createChoiceFlow } from '../js/game/controller/cardHandlers/choiceFlow.js';

function createHarness() {
  const state = {
    choiceSelection: { active: false, pending: null },
    currentPlayerIndex: 0,
    players: [{ name: 'A' }]
  };

  const logs = [];
  const actionScreens = [];
  const counts = {
    nextPlayer: 0,
    unlockUI: 0,
    renderEffectsPanel: 0,
    resetCards: 0,
    syncBackgroundScene: 0
  };

  const flow = createChoiceFlow({
    state,
    currentPlayer: () => state.players[state.currentPlayerIndex],
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    log: (line) => logs.push(String(line)),
    applyDrinkEvent: () => {},
    rollPenaltyCard: () => {},
    openActionScreen: (title, message, options = {}) => {
      actionScreens.push({ title, message, options });
    },
    resetCards: () => {
      counts.resetCards += 1;
    },
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
    syncBackgroundScene: () => {
      counts.syncBackgroundScene += 1;
    }
  });

  return { state, logs, actionScreens, counts, flow };
}

test('choice flow runs selection and advances turn', () => {
  const { state, actionScreens, counts, flow } = createHarness();

  const choice = {
    type: 'choice',
    title: 'Pick One',
    message: 'Choose',
    variant: 'choice',
    options: [
      {
        id: 'opt_a',
        label: 'Do it',
        variant: 'primary',
        run: () => ({ endTurn: true })
      }
    ]
  };

  const started = flow.startChoiceSelection(choice);
  assert.equal(started, true);
  assert.equal(state.choiceSelection.active, true);
  assert.equal(actionScreens.length, 1);

  const success = actionScreens[0].options.onAction({ id: 'opt_a' });
  assert.equal(success, true);
  assert.equal(state.choiceSelection.active, false);
  assert.equal(counts.nextPlayer, 1);
  assert.equal(counts.unlockUI, 1);
  assert.equal(counts.renderEffectsPanel, 1);
  assert.equal(counts.syncBackgroundScene, 1);
});
