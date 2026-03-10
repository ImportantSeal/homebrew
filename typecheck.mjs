import { gameData } from './js/gameData.js';

const SHOT_TOKENS = new Set(['Shot', 'Shotgun', 'Shot+Shotgun']);
const PENALTY_CALLS = new Set(['single', 'group']);

function fail(message) {
  throw new Error(message);
}

function ensure(condition, message) {
  if (!condition) fail(message);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isDrinkAmount(value) {
  return isPositiveInteger(value) || SHOT_TOKENS.has(value);
}

function assertCardBase(card, deckName, index) {
  ensure(card && typeof card === 'object', `${deckName}[${index}] must be an object`);
  ensure(typeof card.id === 'string' && card.id.trim() !== '', `${deckName}[${index}].id must be non-empty string`);
  ensure(typeof card.name === 'string' && card.name.trim() !== '', `${deckName}[${index}].name must be non-empty string`);
}

function assertNormalDeck() {
  ensure(Array.isArray(gameData.normalDeck) && gameData.normalDeck.length > 0, 'normalDeck must be a non-empty array');

  gameData.normalDeck.forEach((card, index) => {
    assertCardBase(card, 'normalDeck', index);
    ensure(card.type === 'plain', `normalDeck[${index}].type must be "plain"`);

    const hasDrink = card.drink !== undefined;
    const hasGive = card.give !== undefined;
    const hasPenaltyCall = card.penaltyCall !== undefined;

    ensure(hasDrink || hasGive || hasPenaltyCall, `normalDeck[${index}] must define drink, give or penaltyCall`);

    if (hasDrink) {
      ensure(card.drink && typeof card.drink === 'object', `normalDeck[${index}].drink must be an object`);
      ensure(isDrinkAmount(card.drink.amount), `normalDeck[${index}].drink.amount is invalid`);
      ensure(card.drink.scope === 'self' || card.drink.scope === 'all', `normalDeck[${index}].drink.scope must be "self" or "all"`);
    }

    if (hasGive) {
      ensure(card.give && typeof card.give === 'object', `normalDeck[${index}].give must be an object`);
      ensure(isPositiveInteger(card.give.amount), `normalDeck[${index}].give.amount must be positive integer`);
    }

    if (hasPenaltyCall) {
      ensure(PENALTY_CALLS.has(card.penaltyCall), `normalDeck[${index}].penaltyCall must be "single" or "group"`);
    }
  });
}

function assertPenaltyDeck() {
  ensure(Array.isArray(gameData.penaltyDeck) && gameData.penaltyDeck.length > 0, 'penaltyDeck must be a non-empty array');

  gameData.penaltyDeck.forEach((card, index) => {
    assertCardBase(card, 'penaltyDeck', index);
    ensure(card.type === 'penalty', `penaltyDeck[${index}].type must be "penalty"`);
    ensure(card.drink && typeof card.drink === 'object', `penaltyDeck[${index}].drink must be an object`);
    ensure(isDrinkAmount(card.drink.amount), `penaltyDeck[${index}].drink.amount is invalid`);
  });
}

function assertSpecialEffects() {
  const subcategories = gameData?.special?.subcategories;
  ensure(Array.isArray(subcategories) && subcategories.length > 0, 'special.subcategories must be a non-empty array');

  const effectCards = subcategories.filter((entry) => entry && typeof entry === 'object' && entry.effect);
  ensure(effectCards.length > 0, 'special.subcategories must include at least one effect card');

  effectCards.forEach((card, index) => {
    ensure(typeof card.name === 'string' && card.name.trim() !== '', `special effect card [${index}] must have name`);
    ensure(typeof card.effect.type === 'string' && card.effect.type.trim() !== '', `special effect card [${index}] must have effect.type`);
    ensure(isPositiveInteger(card.effect.turns), `special effect card [${index}] must have positive integer effect.turns`);
    if (card.effect.needsTarget !== undefined) {
      ensure(typeof card.effect.needsTarget === 'boolean', `special effect card [${index}].effect.needsTarget must be boolean`);
    }
  });
}

function assertItems() {
  ensure(Array.isArray(gameData.itemCards) && gameData.itemCards.length > 0, 'itemCards must be a non-empty array');
  gameData.itemCards.forEach((item, index) => {
    ensure(typeof item === 'string' && item.trim() !== '', `itemCards[${index}] must be non-empty string`);
  });
}

assertNormalDeck();
assertPenaltyDeck();
assertSpecialEffects();
assertItems();

console.log('Type checks passed: game data contracts are valid.');
