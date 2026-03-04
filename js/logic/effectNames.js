import { EFFECT_TYPES } from './actionEffectRegistry.js';

const EFFECT_TITLES = Object.freeze({
  [EFFECT_TYPES.DRINK_BUDDY]: "Drink Buddy",
  [EFFECT_TYPES.LEFT_HAND]: "Left Hand Rule",
  [EFFECT_TYPES.NO_NAMES]: "No Names",
  [EFFECT_TYPES.NO_SWEARING]: "No Swearing",
  [EFFECT_TYPES.NO_PHONE_TOUCH]: "Hands Off Your Phone",
  [EFFECT_TYPES.DITTO_MAGNET]: "Ditto Magnet",
  [EFFECT_TYPES.KINGS_TAX]: "King's Tax",
  [EFFECT_TYPES.LIE_MODE]: "Lie Mode",
  [EFFECT_TYPES.DELAYED_REACTION]: "Delayed Reaction",
  [EFFECT_TYPES.NAME_SWAP]: "Name Swap",
  [EFFECT_TYPES.GLASS_DOWN]: "Glass Down Rule",
  [EFFECT_TYPES.DOMINO_CURSE]: "Domino Curse",
  [EFFECT_TYPES.NEMESIS_MARK]: "Nemesis Mark",
  [EFFECT_TYPES.FORBIDDEN_WORD]: "Forbidden Word",
  [EFFECT_TYPES.QUESTION_MASTER]: "Question Master",
  [EFFECT_TYPES.NOTIFICATION_CURSE]: "Notification Curse"
});

export function getEffectTitle(type, fallback = "Effect") {
  const key = String(type || "").trim();
  if (!key) return fallback;
  return EFFECT_TITLES[key] || key;
}
