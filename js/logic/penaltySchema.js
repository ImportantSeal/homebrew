import { getCardDisplayValue } from '../utils/cardDisplay.js';
import { getPlainCardSpec } from './cardSchema.js';

function normalizeDrinkSpec(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'amount')) {
      return { amount: value.amount };
    }
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return { amount: value };
  }
  return null;
}

export function getPenaltySpec(card) {
  if (card && typeof card === 'object') {
    const drink = normalizeDrinkSpec(card.drink ?? card.penalty?.drink);
    return {
      label: getCardDisplayValue(card),
      drink
    };
  }

  const spec = getPlainCardSpec(card);
  return {
    label: getCardDisplayValue(card),
    drink: spec.drink ? { amount: spec.drink.amount } : null
  };
}

export function getPenaltyDisplayValue(card) {
  return getPenaltySpec(card).label;
}
