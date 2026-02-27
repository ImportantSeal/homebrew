const EFFECT_TITLES = Object.freeze({
  DRINK_BUDDY: "Drink Buddy",
  LEFT_HAND: "Left Hand Rule",
  NO_NAMES: "No Names",
  NO_SWEARING: "No Swearing",
  NO_PHONE_TOUCH: "Hands Off Your Phone",
  DITTO_MAGNET: "Ditto Magnet",
  KINGS_TAX: "King's Tax"
});

export function getEffectTitle(type, fallback = "Effect") {
  const key = String(type || "").trim();
  if (!key) return fallback;
  return EFFECT_TITLES[key] || key;
}

