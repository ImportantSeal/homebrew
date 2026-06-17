import { ACTION_CODES, EFFECT_TYPES } from '../logic/actionEffectRegistry.js';

const makePlainCard = (id, name, spec = {}) => Object.freeze({
  id,
  type: "plain",
  name,
  ...spec
});

const makeDrinkCard = (id, name, amount, scope = "self") =>
  makePlainCard(id, name, { drink: { scope, amount } });

const makeGiveCard = (id, name, amount) =>
  makePlainCard(id, name, { give: { amount } });

const makeMixCard = (id, name, drinkAmount, giveAmount) =>
  makePlainCard(id, name, {
    drink: { scope: "self", amount: drinkAmount },
    give: { amount: giveAmount }
  });

const makePenaltyCallCard = (id, name, penaltyCall) =>
  makePlainCard(id, name, { penaltyCall });

const makePenaltyCard = (id, name, amount) => Object.freeze({
  id,
  type: "penalty",
  name,
  drink: { amount }
});

// Set this to null to use the normal random deck.
// While testing, replace null with one card object, helper call, id, or card name.
//
// Example values:
// makeDrinkCard("drink_3", "Drink 3", 3)
// "drink_3"
// {
//   name: "Drink and Draw Again",
//   instruction: "Drink 1. Your turn does not pass; draw new cards.",
//   action: ACTION_CODES.DRINK_AND_DRAW_AGAIN
// }
export const testCard = null;

// Optional: use this when testCard is a parent deck like "Special Card".
// Example values:
// testCard: "Special Card"
// testSubcard: "Drink and Draw Again"
export const testSubcard = null;

export const testCardHelpers = Object.freeze({
  ACTION_CODES,
  EFFECT_TYPES,
  makePlainCard,
  makeDrinkCard,
  makeGiveCard,
  makeMixCard,
  makePenaltyCallCard,
  makePenaltyCard
});
