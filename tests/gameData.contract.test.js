import test from 'node:test';
import assert from 'node:assert/strict';

import { gameData } from '../js/gameData.js';
import {
  parseDrinkFromText,
  parseGiveFromText,
  isPenaltyCardInstructionText
} from '../js/game/controller/helpers.js';
import { getPenaltySpec } from '../js/logic/penaltySchema.js';

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

test('normalDeck entries stay compatible with plain-card parser rules', () => {
  assert.ok(Array.isArray(gameData.normalDeck));
  assert.ok(gameData.normalDeck.length > 0);

  for (const entry of gameData.normalDeck) {
    const isDrink = Boolean(parseDrinkFromText(entry));
    const isGive = Boolean(parseGiveFromText(entry));
    const isPenaltyCall = isPenaltyCardInstructionText(entry);
    assert.ok(
      isDrink || isGive || isPenaltyCall,
      `Unsupported normalDeck entry for parser flow: "${entry?.name ?? entry}"`
    );
  }
});

test('penaltyDeck values stay compatible with penalty drink handling', () => {
  assert.ok(Array.isArray(gameData.penaltyDeck));
  assert.ok(gameData.penaltyDeck.length > 0);

  for (const entry of gameData.penaltyDeck) {
    const spec = getPenaltySpec(entry);
    assert.ok(
      Boolean(spec?.drink?.amount),
      `Unsupported penaltyDeck entry for rollPenaltyCard(): "${entry?.name ?? entry}"`
    );
  }
});

test('special effect cards use valid effect schema', () => {
  const specialCards = Array.isArray(gameData?.special?.subcategories)
    ? gameData.special.subcategories
    : [];

  const effectCards = specialCards.filter((entry) => entry && typeof entry === 'object' && entry.effect);
  assert.ok(effectCards.length > 0, 'Expected at least one effect card in special.subcategories');

  for (const card of effectCards) {
    const effect = card.effect;
    assert.equal(typeof effect.type, 'string', `Missing effect.type in "${card.name}"`);
    assert.ok(effect.type.trim().length > 0, `Empty effect.type in "${card.name}"`);
    assert.ok(isPositiveInteger(effect.turns), `Invalid effect.turns in "${card.name}"`);

    if (effect.needsTarget !== undefined) {
      assert.equal(
        typeof effect.needsTarget,
        'boolean',
        `effect.needsTarget must be boolean in "${card.name}"`
      );
    }
  }
});
