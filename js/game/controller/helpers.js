import { getEffectTitle } from '../../logic/effectNames.js';

const ITEM_RELATED_SPECIAL_ACTIONS = new Set([
  "COLLECTOR",
  "MINIMALIST",
  "IMMUNITY_OR_SUFFER",
  "ITEM_BUYOUT"
]);
const ITEM_RELATED_TEXT = /\bitems?\b/i;

export function isDrawPenaltyCardText(txt) {
  return /^Draw a Penalty Card$/i.test(String(txt).trim());
}

export function shouldTriggerPenaltyPreview(subName, subInstruction, challengeText) {
  const text = `${String(subName || "")} ${String(subInstruction || "")} ${String(challengeText || "")}`.trim();
  if (!text) return false;

  // Auto-preview only when the instruction explicitly tells to reveal/roll immediately.
  if (/roll\s+the\s+penalty\s+deck/i.test(text)) return true;
  if (/reveal\s+(a\s+)?penalty\s+card(\s+now)?/i.test(text)) return true;
  if (/draw\s+(a\s+)?penalty\s+card\s+now/i.test(text)) return true;
  return false;
}

export function getBagKeyForObjectCard(state, cardData) {
  if (cardData === state.special) return state.includeItems ? "special:items-on" : "special:no-items";
  if (cardData === state.crowdChallenge) return "crowd";
  return `social:${cardData.name || "unknown"}`;
}

export function ensureBag(stateObj, key, items, createBag) {
  if (!stateObj.bags) stateObj.bags = {};
  if (!stateObj.bags[key]) stateObj.bags[key] = createBag(items);
  return stateObj.bags[key];
}

function isItemRelatedSpecialSubcategory(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.action && ITEM_RELATED_SPECIAL_ACTIONS.has(String(entry.action))) return true;

  const name = String(entry.name || "");
  const instruction = String(entry.instruction || "");
  return ITEM_RELATED_TEXT.test(name) || ITEM_RELATED_TEXT.test(instruction);
}

export function getObjectCardPool(state, cardData) {
  const source = Array.isArray(cardData?.subcategories) ? cardData.subcategories : [];
  if (cardData === state.special && !state.includeItems) {
    return source.filter(entry => !isItemRelatedSpecialSubcategory(entry));
  }
  return source;
}

export function parseDrinkFromText(text) {
  const t = String(text || "").trim();

  // Everybody take(s) a Shot + Shotgun
  if (/^Everybody\s+(take|takes)\s+(a\s+)?Shot\s*\+\s*Shotgun\b/i.test(t)) {
    return { scope: "all", amount: "Shot+Shotgun" };
  }

  // Everybody takes a Shot / Shotgun
  const allShot = t.match(/^Everybody\s+((take|takes)\s+)?(a\s+)?(Shotgun|Shot)\b/i);
  if (allShot) return { scope: "all", amount: allShot[4] };

  // Shot + Shotgun (self)
  if (/^(take\s+a\s+)?Shot\s*\+\s*Shotgun\b/i.test(t) || /^Shot\s*\+\s*Shotgun$/i.test(t)) {
    return { scope: "self", amount: "Shot+Shotgun" };
  }

  // Shot / Shotgun (self)
  if (/^(take\s+a\s+)?Shotgun\b/i.test(t) || /^Shotgun$/i.test(t)) return { scope: "self", amount: "Shotgun" };
  if (/^(take\s+a\s+)?Shot\b/i.test(t) || /^Shot$/i.test(t)) return { scope: "self", amount: "Shot" };

  // Everybody drinks N
  const all = t.match(/^Everybody drinks\s+(\d+)\b/i);
  if (all) return { scope: "all", amount: parseInt(all[1], 10) };

  // Drink N (also matches "Drink 2, Give 1")
  const self = t.match(/\bDrink\s+(\d+)\b/i);
  if (self) return { scope: "self", amount: parseInt(self[1], 10) };

  return null;
}

export function parseGiveFromText(text) {
  const t = String(text || "").trim();
  const self = t.match(/\bGive\s+(\d+)\b/i);
  if (!self) return null;
  return { amount: parseInt(self[1], 10) };
}

function isDirectDrinkOnlyText(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return Boolean(parseDrinkFromText(t) || parseGiveFromText(t));
}

export function shouldShowActionScreenForPlainCard(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (isDrawPenaltyCardText(t)) return false;
  return !isDirectDrinkOnlyText(t);
}

export function isRedrawLockedPenaltyOpen(state) {
  return state.penaltyShown && state.penaltySource === "redraw_hold";
}

export function effectLabelForLog(effect, fallback = "Effect") {
  if (!effect) return fallback;
  return getEffectTitle(effect.type, fallback);
}
