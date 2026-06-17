import test from 'node:test';
import assert from 'node:assert/strict';

import { rollPenaltyCard } from '../js/logic/penalty.js';
import { createFlowState, PENALTY_SOURCES } from '../js/logic/flowMachine.js';

function withDocumentStub(run) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    body: {
      dataset: { reducedEffects: 'true' },
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      }
    },
    getElementById: () => null,
    dispatchEvent: () => {}
  };

  try {
    run();
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
}

test('shared penalty roll reveals one card and applies it to every unshielded target', () => {
  withDocumentStub(() => {
    const state = {
      flow: createFlowState(),
      currentPlayerIndex: 0,
      penaltyShown: false,
      penaltyConfirmArmed: false,
      penaltySource: PENALTY_SOURCES.CARD_PENDING,
      penaltyHintShown: false,
      penaltyRollPlayerIndex: 0,
      players: [
        { name: 'A', shield: true },
        { name: 'B' },
        { name: 'C' }
      ],
      penaltyDeck: [{ type: 'penalty', name: 'Drink 4', drink: { amount: 4 } }],
      stats: { players: [], updatedAt: 0 },
      rng: { nextFloat: () => 0 }
    };
    const logs = [];
    const drinks = [];

    const penalty = rollPenaltyCard(
      state,
      (line) => logs.push(String(line)),
      PENALTY_SOURCES.CARD,
      (innerState, playerIndex, amount, reason) => {
        drinks.push({ playerIndex, amount, reason });
      },
      { targetPlayerIndexes: [0, 1, 2], targetLabel: 'everyone' }
    );

    assert.equal(penalty.name, 'Drink 4');
    assert.equal(state.penaltyShown, true);
    assert.equal(state.penaltySource, PENALTY_SOURCES.CARD);
    assert.equal(state.players[0].shield, undefined);
    assert.deepEqual(drinks, [
      { playerIndex: 1, amount: 4, reason: 'Penalty' },
      { playerIndex: 2, amount: 4, reason: 'Penalty' }
    ]);
    assert.equal(state.stats.players[0].penaltiesTaken, 0);
    assert.equal(state.stats.players[1].penaltiesTaken, 1);
    assert.equal(state.stats.players[2].penaltiesTaken, 1);
    assert.ok(logs.some((line) => line.includes('rolled penalty card for everyone: Drink 4')));
    assert.ok(logs.some((line) => line.includes("A's Shield protected against the penalty!")));
    assert.ok(logs.some((line) => line.includes('Shared penalty applied to 2 players.')));
  });
});
