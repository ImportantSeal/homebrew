import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import { getEffectTitle } from '../../logic/effectNames.js';
import {
  getDrinkSpec,
  getGiveSpec,
  getPenaltyCallType,
  getPlainCardSpec
} from '../../logic/cardSchema.js';

const ITEM_RELATED_SPECIAL_ACTIONS = new Set([
  ACTION_CODES.COLLECTOR,
  ACTION_CODES.MINIMALIST,
  ACTION_CODES.IMMUNITY_OR_SUFFER,
  ACTION_CODES.ITEM_BUYOUT
]);
const ITEM_RELATED_TEXT = /\bitems?\b/i;

export function isDrawPenaltyCardText(txt) {
  return getPenaltyCallType(txt) === "single";
}

export function isDrawPenaltyForAllText(txt) {
  return getPenaltyCallType(txt) === "group";
}

export function isPenaltyCardInstructionText(txt) {
  return getPenaltyCallType(txt) !== null;
}

function normalizePenaltyPlayerName(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function queueManualPenaltyDraw(
  state,
  log,
  prompt = "Click the Penalty Deck to roll and continue."
) {
  if (state.penaltyShown) {
    log?.("Resolve the current penalty first.");
    return false;
  }

  const targetPlayerIndex = Number.isInteger(state.currentPlayerIndex)
    ? state.currentPlayerIndex
    : null;

  state.penaltySource = "card_pending";
  state.penaltyRollPlayerIndex = targetPlayerIndex;
  state.penaltyHintShown = false;
  log?.(prompt);
  return true;
}

export function queueManualPenaltyDrawForPlayers(
  state,
  log,
  playerIndexes,
  originPlayerIndex,
  prompt = "Group penalty active: click the Penalty Deck to roll and continue."
) {
  if (state.penaltyShown) {
    log?.("Resolve the current penalty first.");
    return false;
  }

  const players = Array.isArray(state?.players) ? state.players : [];
  const queue = Array.isArray(playerIndexes)
    ? playerIndexes.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < players.length)
    : [];

  if (queue.length === 0) {
    log?.("No valid players available for group penalty.");
    return false;
  }

  state.penaltyGroup = {
    active: true,
    queue,
    cursor: 0,
    originPlayerIndex: Number.isInteger(originPlayerIndex) ? originPlayerIndex : state.currentPlayerIndex
  };
  state.penaltyRollPlayerIndex = null;
  state.penaltySource = "group_pending";
  state.penaltyHintShown = false;

  const firstPlayerIndex = queue[0];
  const firstPlayerName = normalizePenaltyPlayerName(
    players[firstPlayerIndex]?.name,
    `Player ${firstPlayerIndex + 1}`
  );
  log?.(`${prompt} ${firstPlayerName} rolls first.`);
  return true;
}

export function shouldTriggerPenaltyPreview(subName, subInstruction, challengeText) {
  const text = `${String(subName || "")} ${String(subInstruction || "")} ${String(challengeText || "")}`.trim();
  if (!text) return false;

  // Auto-preview when instruction explicitly says to reveal/roll now.
  if (/reveal\s+(a\s+)?penalty\s+card(\s+now)?/i.test(text)) return true;
  if (/draw\s+(a\s+)?penalty\s+card\s+now/i.test(text)) return true;
  if (/roll\s+the\s+penalty\s+deck/i.test(text)) return true;
  return false;
}

export function shouldWaitForPenaltyDeckRoll(subName, subInstruction, challengeText) {
  const text = `${String(subName || "")} ${String(subInstruction || "")} ${String(challengeText || "")}`.trim();
  if (!text) return false;
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
  return getDrinkSpec(text);
}

export function parseGiveFromText(text) {
  return getGiveSpec(text);
}

export function shouldShowActionScreenForPlainCard(text) {
  if (!String(text || "").trim()) return false;
  const spec = getPlainCardSpec(text);
  if (spec.penaltyCall) return false;
  return spec.requiresActionScreen;
}

export function isRedrawLockedPenaltyOpen(state) {
  return state.penaltyShown && state.penaltySource === "redraw_hold";
}

export function effectLabelForLog(effect, fallback = "Effect") {
  if (!effect) return fallback;
  return getEffectTitle(effect.type, fallback);
}
