import test from 'node:test';
import assert from 'node:assert/strict';

import { gameData } from '../js/gameData.js';
import {
  parseDrinkFromText,
  parseGiveFromText,
  isDrawPenaltyCardText
} from '../js/game/controller/helpers.js';

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isPenaltyDrinkLike(value) {
  const t = String(value || '').trim();
  if (/^Drink\s+\d+$/i.test(t)) return true;
  if (/^Shot$/i.test(t)) return true;
  if (/^Shotgun$/i.test(t)) return true;
  return false;
}

test('normalDeck entries stay compatible with plain-card parser rules', () => {
  assert.ok(Array.isArray(gameData.normalDeck));
  assert.ok(gameData.normalDeck.length > 0);

  for (const entry of gameData.normalDeck) {
    const text = String(entry || '').trim();
    const isDrink = Boolean(parseDrinkFromText(text));
    const isGive = Boolean(parseGiveFromText(text));
    const isPenaltyCall = isDrawPenaltyCardText(text);
    assert.ok(
      isDrink || isGive || isPenaltyCall,
      `Unsupported normalDeck entry for parser flow: "${text}"`
    );
  }
});

test('penaltyDeck values stay compatible with penalty drink handling', () => {
  assert.ok(Array.isArray(gameData.penaltyDeck));
  assert.ok(gameData.penaltyDeck.length > 0);

  for (const entry of gameData.penaltyDeck) {
    assert.ok(
      isPenaltyDrinkLike(entry),
      `Unsupported penaltyDeck entry for rollPenaltyCard(): "${entry}"`
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
