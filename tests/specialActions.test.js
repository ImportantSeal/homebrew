import test from 'node:test';
import assert from 'node:assert/strict';

import { runSpecialAction, runSpecialChoiceAction } from '../js/game/controller/specialActions.js';
import { applyDrinkEvent } from '../js/logic/effects.js';

function createState() {
  return {
    players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    effects: [],
    stats: { players: [], updatedAt: 0 }
  };
}

function createLogCollector() {
  const lines = [];
  return {
    lines,
    log: (line) => lines.push(String(line))
  };
}

function createContext(state, log) {
  return {
    state,
    currentPlayer: state.players[0],
    currentPlayerIndex: 0,
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    log,
    applyDrinkEvent,
    rollPenaltyCard: () => {}
  };
}

test('CHAOS_BUTTON returns reusable choice action payload', () => {
  const state = createState();
  const { log } = createLogCollector();
  const result = runSpecialAction('CHAOS_BUTTON', createContext(state, log));

  assert.equal(result?.endTurn, false);
  assert.equal(result?.choice?.type, 'choice');
  assert.equal(result?.choice?.key, 'CHAOS_BUTTON');
  assert.equal(Array.isArray(result?.choice?.options), true);
  assert.equal(result.choice.options.length, 2);
});

test('CHAOS_BUTTON option everybody drinks 3 affects all players', () => {
  const state = createState();
  const { lines, log } = createLogCollector();
  const actionResult = runSpecialAction('CHAOS_BUTTON', createContext(state, log));

  const choiceResult = runSpecialChoiceAction(
    actionResult.choice,
    'everybody_drinks_3',
    createContext(state, log)
  );

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.equal(state.stats.players[1].drinksTaken, 3);
  assert.equal(state.stats.players[2].drinksTaken, 3);
  assert.ok(lines.some((line) => line.includes('Chaos Button choice: everybody drinks 3 now.')));
  assert.ok(lines.some((line) => line.includes('Everybody drinks 3.')));
});

test('CHAOS_BUTTON option drink and draw again keeps turn and refreshes cards', () => {
  const state = createState();
  const { lines, log } = createLogCollector();
  const actionResult = runSpecialAction('CHAOS_BUTTON', createContext(state, log));

  const choiceResult = runSpecialChoiceAction(
    actionResult.choice,
    'drink_1_draw_again',
    createContext(state, log)
  );

  assert.deepEqual(choiceResult, { endTurn: false, refreshCards: true });
  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.equal(state.stats.players[1].drinksTaken, 0);
  assert.equal(state.stats.players[2].drinksTaken, 0);
  assert.ok(lines.some((line) => line.includes('A keeps their turn and draws one extra card.')));
});
