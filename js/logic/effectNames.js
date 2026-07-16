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
  [EFFECT_TYPES.NOTIFICATION_CURSE]: "Notification Curse",
  [EFFECT_TYPES.DOUBLE_DRINKS]: "Double Drinks",
  [EFFECT_TYPES.THIRD_PERSON]: "Third Person",
  [EFFECT_TYPES.WHISPER_MODE]: "Whisper Mode",
  [EFFECT_TYPES.NO_POINTING]: "No Pointing",
  [EFFECT_TYPES.ONE_WORD_ANSWERS]: "One-Word Answers",
  [EFFECT_TYPES.ROYAL_WE]: "Royal We",
  [EFFECT_TYPES.EYE_CONTACT_RULE]: "Eye Contact Rule",
  [EFFECT_TYPES.INVISIBLE_MICROPHONE]: "Invisible Microphone",
  [EFFECT_TYPES.SLOW_MOTION]: "Slow Motion",
  [EFFECT_TYPES.PINKY_RULE]: "Pinky Rule"
});

export function getEffectTitle(type, fallback = "Effect") {
  const key = String(type || "").trim();
  if (!key) return fallback;
  return EFFECT_TITLES[key] || key;
}
