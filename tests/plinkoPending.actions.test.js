import test from 'node:test';
import assert from 'node:assert/strict';

import { createItemsController } from '../js/game/controller/itemsController.js';
import { createPlayerRemovalController } from '../js/game/controller/playerRemoval.js';
import { createPenaltyFlow } from '../js/game/controller/cardHandlers/penaltyFlow.js';
import { installDom } from './domHarness.js';

function pendingPlinko() {
  return { playerIndex: 0, cardName: 'One Drop' };
}

function findButtonByText(root, text) {
  return root.querySelectorAll('button').find((button) => button.textContent === text);
}

test('pending Plinko blocks current-player items that could alter the turn', () => {
  const dom = installDom();

  try {
    const board = dom.document.createElement('div');
    board.id = 'items-board';
    dom.document.body.appendChild(board);

    const state = {
      includeItems: true,
      currentPlayerIndex: 0,
      players: [
        { name: 'A', inventory: ['Skip Turn', 'Shield'] },
        { name: 'B', inventory: [] }
      ],
      plinkoPending: pendingPlinko(),
      choiceSelection: { active: false, pending: null },
      effectSelection: { active: false, pending: null }
    };
    const logs = [];
    let updateTurnCount = 0;

    const controller = createItemsController({
      state,
      log: (line) => logs.push(String(line)),
      renderTurnHeader: () => {},
      renderEffectsPanel: () => {},
      updateTurn: () => {
        updateTurnCount += 1;
      }
    });

    controller.renderItems();
    dom.click(findButtonByText(board, 'Skip Turn'));
    dom.click(findButtonByText(board, 'Shield'));

    assert.equal(state.currentPlayerIndex, 0);
    assert.deepEqual(state.players[0].inventory, ['Skip Turn', 'Shield']);
    assert.equal(state.players[0].shield, undefined);
    assert.equal(updateTurnCount, 0);
    assert.equal(
      logs.filter((line) => line === "Complete the card's Plinko action first.").length,
      2
    );
  } finally {
    dom.cleanup();
  }
});

test('Immunity remains usable by any player while Plinko is pending', () => {
  const dom = installDom();

  try {
    const board = dom.document.createElement('div');
    board.id = 'items-board';
    dom.document.body.appendChild(board);

    const state = {
      includeItems: true,
      currentPlayerIndex: 0,
      players: [
        { name: 'A', inventory: [] },
        { name: 'B', inventory: ['Immunity'] }
      ],
      plinkoPending: pendingPlinko(),
      choiceSelection: { active: false, pending: null },
      effectSelection: { active: false, pending: null }
    };
    const logs = [];

    const controller = createItemsController({
      state,
      log: (line) => logs.push(String(line)),
      renderTurnHeader: () => {},
      renderEffectsPanel: () => {},
      updateTurn: () => {
        assert.fail('Immunity must not advance the turn');
      }
    });

    controller.renderItems();
    dom.click(findButtonByText(board, 'Immunity'));

    assert.equal(state.currentPlayerIndex, 0);
    assert.deepEqual(state.players[1].inventory, []);
    assert.ok(logs.some((line) => line.includes('B used Immunity')));
    assert.ok(!logs.some((line) => line.includes("Plinko action first")));
  } finally {
    dom.cleanup();
  }
});

test('pending Plinko blocks player removal before confirmation or state mutation', () => {
  const dom = installDom();

  try {
    const state = {
      currentPlayerIndex: 0,
      players: [
        { name: 'A', inventory: [] },
        { name: 'B', inventory: [] },
        { name: 'C', inventory: [] }
      ],
      plinkoPending: pendingPlinko(),
      choiceSelection: { active: false, pending: null },
      effectSelection: { active: false, pending: null },
      penaltySource: null,
      penaltyShown: false
    };
    const logs = [];
    let confirmCount = 0;
    let updateTurnCount = 0;
    dom.window.confirm = () => {
      confirmCount += 1;
      return true;
    };

    const controller = createPlayerRemovalController({
      state,
      log: (line) => logs.push(String(line)),
      playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
      renderTurnHeader: () => {},
      renderItems: () => {},
      renderEffectsPanel: () => {},
      updateTurn: () => {
        updateTurnCount += 1;
      },
      syncPenaltyDeckSizeToCards: () => {},
      isPenaltyFlowActive: () => false
    });

    controller.onTurnOrderPlayerRemoveClick(
      { dataset: { index: '0' } },
      { preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} }
    );

    assert.deepEqual(state.players.map((player) => player.name), ['A', 'B', 'C']);
    assert.equal(state.currentPlayerIndex, 0);
    assert.equal(confirmCount, 0);
    assert.equal(updateTurnCount, 0);
    assert.deepEqual(logs, ["Complete the card's Plinko action first."]);
  } finally {
    dom.cleanup();
  }
});

test('pending Plinko blocks Redraw without rolling a penalty or replacing cards', () => {
  const state = {
    currentPlayerIndex: 0,
    players: [{ name: 'A' }, { name: 'B' }],
    plinkoPending: pendingPlinko(),
    penaltyShown: false,
    penaltyConfirmArmed: false,
    penaltySource: null,
    penaltyHintShown: false,
    choiceSelection: { active: false, pending: null },
    effectSelection: { active: false, pending: null },
    uiLocked: true
  };
  const logs = [];
  let penaltyRollCount = 0;
  let resetCardsCount = 0;
  let actionScreenCount = 0;

  const flow = createPenaltyFlow({
    state,
    timing: { PENALTY_UNLOCK_MS: 0, REDRAW_REFRESH_MS: 0 },
    log: (line) => logs.push(String(line)),
    currentPlayer: () => state.players[state.currentPlayerIndex],
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    nextPlayer: () => {},
    lockUI: () => {},
    unlockUI: () => {},
    unlockAfter: () => {},
    renderEffectsPanel: () => {},
    renderItems: () => {},
    resetCards: () => {
      resetCardsCount += 1;
    },
    openActionScreen: () => {
      actionScreenCount += 1;
    },
    applyDrinkEvent: () => {},
    rollPenaltyCard: () => {
      penaltyRollCount += 1;
    },
    hidePenaltyCard: () => {},
    syncBackgroundScene: () => {}
  });

  flow.onRedrawClick();

  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(penaltyRollCount, 0);
  assert.equal(resetCardsCount, 0);
  assert.equal(actionScreenCount, 0);
  assert.deepEqual(logs, ["Complete the card's Plinko action first."]);
});
