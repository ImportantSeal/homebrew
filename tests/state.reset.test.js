import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, resetStateForNewGame } from '../js/state.js';

test('resetStateForNewGame recreates fresh runtime state for a new game', () => {
  const rng = { nextFloat: () => 0.25 };
  const state = createInitialState();
  const previousBags = {
    special: { next: () => 'stale-bag' }
  };

  state.players = [
    {
      name: 'Alice',
      color: '#ff0055',
      inventory: ['Shield'],
      shield: true,
      extraLife: true
    },
    {
      name: 'Bob',
      inventory: ['Skip Turn'],
      skipNextTurn: true
    }
  ];
  state.includeItems = true;
  state.currentPlayerIndex = 1;
  state.bags = previousBags;
  state.uiLocked = true;
  state.historyLogKind = 'special';
  state.backgroundScene = 'penalty';
  state.penaltyConfirmArmed = true;
  state.penaltySource = 'group_pending';
  state.penaltyHintShown = true;
  state.penaltyRollPlayerIndex = 1;
  state.penaltyGroup = { active: true, queue: [0, 1], cursor: 1, originPlayerIndex: 0 };
  state.sharePenalty = { active: true, sourcePlayerIndex: 0, penalty: 'Drink 3' };
  state.dittoPending = ['a', 'b', 'c'];
  state.dittoActive = [true, true, true];
  state.effects = [{ id: 'eff_1', type: 'TEST', remainingTurns: 3 }];
  state.effectSelection = { active: true, pending: { type: 'TEST' }, cleanup: () => {} };
  state.choiceSelection = { active: true, pending: { id: 'choice' } };
  state.currentCards = ['card'];
  state.revealed = [false, true, false];
  state.hiddenIndex = 2;
  state.redrawUsed = true;
  state.cardHistory = ['old entry'];
  state.historyEntryCount = 9;
  state.penaltyCard = 'Drink 5';
  state.penaltyShown = true;
  state.stats = {
    players: [{ playerName: 'Alice', cardsSelected: 99 }],
    updatedAt: 1234
  };
  state.mirror.active = true;
  state.rng = rng;

  const returnedState = resetStateForNewGame(state);

  assert.equal(returnedState, state);
  assert.equal(state.includeItems, true);
  assert.equal(state.currentPlayerIndex, 0);
  assert.equal(state.rng, rng);

  assert.notEqual(state.bags, previousBags);
  assert.deepEqual(state.bags, {});
  assert.equal(state.uiLocked, false);
  assert.equal(state.historyLogKind, null);
  assert.equal(state.backgroundScene, 'normal');
  assert.equal(state.penaltyConfirmArmed, false);
  assert.equal(state.penaltySource, null);
  assert.equal(state.penaltyHintShown, false);
  assert.equal(state.penaltyRollPlayerIndex, null);
  assert.equal(state.penaltyGroup, null);
  assert.equal(state.sharePenalty, null);
  assert.deepEqual(state.dittoPending, [null, null, null]);
  assert.deepEqual(state.dittoActive, [false, false, false]);
  assert.deepEqual(state.effects, []);
  assert.deepEqual(state.effectSelection, { active: false, pending: null, cleanup: null });
  assert.deepEqual(state.choiceSelection, { active: false, pending: null });
  assert.deepEqual(state.currentCards, []);
  assert.deepEqual(state.revealed, [true, true, true]);
  assert.equal(state.hiddenIndex, null);
  assert.equal(state.redrawUsed, false);
  assert.deepEqual(state.cardHistory, []);
  assert.equal(state.historyEntryCount, 0);
  assert.equal(state.penaltyCard, null);
  assert.equal(state.penaltyShown, false);
  assert.deepEqual(state.stats, { players: [], updatedAt: 0 });
  assert.deepEqual(state.mirror, {
    active: false,
    sourceIndex: null,
    selectedCardIndex: null,
    parentName: '',
    subName: '',
    subInstruction: '',
    displayText: ''
  });

  assert.deepEqual(state.players, [
    {
      name: 'Alice',
      color: '#ff0055',
      inventory: []
    },
    {
      name: 'Bob',
      inventory: []
    }
  ]);
  assert.equal('shield' in state.players[0], false);
  assert.equal('extraLife' in state.players[0], false);
  assert.equal('skipNextTurn' in state.players[1], false);
});
