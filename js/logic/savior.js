// js/logic/savior.js
//
// Savior: a rare blessing that cancels a significant drink.
//
// 1) Plain cards: only Shot / Shotgun / Shot + Shotgun cards can be blessed.
//    - "Take a Shot" etc.            -> the drawing player does not drink.
//    - "Everybody takes a Shot" etc. -> NOBODY has to drink.
//    Basic "Drink N" / "Everybody drinks N" cards are never blessed.
//    Savior and Ditto are resolved from ONE roll so they can never both
//    trigger on the same card pick:
//      roll <  DITTO_CHANCE          -> Ditto   (16%)
//      roll >= 1 - SAVIOR_CHANCE     -> Savior  (eligible cards only)
//      otherwise                     -> normal card
//
// 2) "Everybody takes a Penalty card": each player in the queue gets their
//    own GROUP_PENALTY_SAVIOR_CHANCE roll. A blessed player skips their
//    penalty, everyone else still takes theirs.

export const SAVIOR_CHANCE = 0.07;
export const GROUP_PENALTY_SAVIOR_CHANCE = 0.05;
export const DITTO_CHANCE = 0.16;

export const DRAW_TWISTS = Object.freeze({
  NONE: 'none',
  DITTO: 'ditto',
  SAVIOR: 'savior'
});

const SIGNIFICANT_DRINK_RE = /^(Shot|Shotgun|Shot\+Shotgun)$/i;

function toRoll(value) {
  const roll = Number(value);
  return Number.isFinite(roll) ? roll : 0.5;
}

/**
 * True for Shot / Shotgun / Shot + Shotgun cards (self or everybody).
 * Drink N, Give, penalty calls and action cards are not eligible.
 */
export function isSaviorEligibleSpec(spec) {
  if (!spec || typeof spec !== 'object' || spec.penaltyCall) return false;
  const amount = spec.drink?.amount;
  return typeof amount === 'string' && SIGNIFICANT_DRINK_RE.test(amount.trim());
}

export function rollsSavior(roll, spec) {
  if (!isSaviorEligibleSpec(spec)) return false;
  return toRoll(roll) >= 1 - SAVIOR_CHANCE;
}

/**
 * Per-player Savior roll for a queued "Everybody takes a Penalty card".
 */
export function rollsGroupPenaltySavior(roll) {
  return toRoll(roll) >= 1 - GROUP_PENALTY_SAVIOR_CHANCE;
}

/**
 * Resolves the random "twist" for a plain card pick from a single roll.
 */
export function resolveDrawTwist(roll, spec, { allowDitto = true } = {}) {
  if (rollsSavior(roll, spec)) return DRAW_TWISTS.SAVIOR;
  if (allowDitto && toRoll(roll) < DITTO_CHANCE) return DRAW_TWISTS.DITTO;
  return DRAW_TWISTS.NONE;
}

/**
 * Human readable description of what the Savior cancelled, for logs/modal.
 */
export function describeSavedCard(spec, cardText = '') {
  const text = String(spec?.drink?.amount || '').trim();
  if (/^Shot\+Shotgun$/i.test(text)) return 'a Shot + Shotgun';
  if (/^Shotgun$/i.test(text)) return 'a Shotgun';
  if (/^Shot$/i.test(text)) return 'a Shot';
  return String(cardText || 'the card').trim();
}
