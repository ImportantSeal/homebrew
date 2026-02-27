import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEffect,
  tickEffects,
  applyDrinkEvent,
  onDittoActivated
} from '../js/logic/effects.js';

function createState() {
  return {
    players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    effects: [],
    stats: { players: [], updatedAt: 0 }
  };
}

function createLogCollector() {
  const lines = [];
  const log = (msg) => lines.push(String(msg));
  return { lines, log };
}

test('createEffect sets expected base fields', () => {
  const eff = createEffect('DRINK_BUDDY', 6, { sourceIndex: 0, targetIndex: 1 });
  assert.equal(eff.type, 'DRINK_BUDDY');
  assert.equal(eff.totalTurns, 6);
  assert.equal(eff.remainingTurns, 6);
  assert.equal(eff.sourceIndex, 0);
  assert.equal(eff.targetIndex, 1);
  assert.match(eff.id, /^eff_/);
});

test('tickEffects decrements timers and removes expired effects', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  state.effects.push(
    { id: 'e1', type: 'LEFT_HAND', remainingTurns: 1 },
    { id: 'e2', type: 'NO_NAMES', remainingTurns: 2 }
  );

  tickEffects(state, log);

  assert.equal(state.effects.length, 1);
  assert.equal(state.effects[0].id, 'e2');
  assert.equal(state.effects[0].remainingTurns, 1);
  assert.ok(lines.some((line) => line.includes('Effect ended: Left Hand Rule')));
});

test('newly activated effects do not lose duration on the same turn-end tick', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  state.effects.push(createEffect('LEFT_HAND', 2));

  tickEffects(state, log);
  assert.equal(state.effects.length, 1);
  assert.equal(state.effects[0].remainingTurns, 2);

  tickEffects(state, log);
  assert.equal(state.effects[0].remainingTurns, 1);

  tickEffects(state, log);
  assert.equal(state.effects.length, 0);
  assert.ok(lines.some((line) => line.includes('Effect ended: Left Hand Rule')));
});

test('applyDrinkEvent records drinks and logs self action', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  applyDrinkEvent(state, 0, 3, 'Drink card', log);

  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.ok(lines.some((line) => line.includes('A: Drink 3 (Drink card)')));
});

test('applyDrinkEvent supports Shot/Shotgun text amounts', () => {
  const state = createState();
  const { log } = createLogCollector();

  applyDrinkEvent(state, 0, 'Shot', 'Test', log);
  applyDrinkEvent(state, 0, 'Shotgun', 'Test', log);

  assert.equal(state.stats.players[0].drinksTaken, 3);
});

test('applyDrinkEvent triggers Drink Buddy for active effects', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  state.effects.push(
    createEffect('DRINK_BUDDY', 6, { sourceIndex: 0, targetIndex: 1 }),
    { id: 'expired', type: 'DRINK_BUDDY', sourceIndex: 0, targetIndex: 2, remainingTurns: 0 }
  );

  applyDrinkEvent(state, 0, 2, 'Drink card', log);

  assert.equal(state.stats.players[0].drinksTaken, 2);
  assert.ok(lines.some((line) => line.includes('B: Drink 2 (Drink Buddy with A)')));
  assert.ok(!lines.some((line) => line.includes('C: Drink 2 (Drink Buddy with A)')));
});

test('applyDrinkEvent skipBuddy and suppressSelfLog options work', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  state.effects.push(createEffect('DRINK_BUDDY', 6, { sourceIndex: 0, targetIndex: 1 }));

  applyDrinkEvent(state, 0, 1, 'Silent', log, { skipBuddy: true, suppressSelfLog: true });

  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.equal(lines.length, 0);
});

test('onDittoActivated applies shot and consumes magnet on trigger', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  onDittoActivated(state, 0, log);
  assert.equal(state.stats.players[0], undefined);

  state.effects.push(
    createEffect('DITTO_MAGNET', 5, { sourceIndex: 2, targetIndex: 0 }),
    createEffect('DITTO_MAGNET', 5, { sourceIndex: 1, targetIndex: 1 })
  );
  onDittoActivated(state, 0, log);

  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.equal(state.effects.some((e) => e?.type === 'DITTO_MAGNET' && e.targetIndex === 0), false);
  assert.equal(state.effects.some((e) => e?.type === 'DITTO_MAGNET' && e.targetIndex === 1), true);
  assert.ok(lines.some((line) => line.includes('A got Ditto while magnetized')));
  assert.ok(lines.some((line) => line.includes('A: Shot (Ditto Magnet)')));
  assert.ok(lines.some((line) => line.includes('Ditto Magnet ended for A.')));
});
