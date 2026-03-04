const ACTION_CODES = Object.freeze({
  CHAOS_REFERENDUM_GROUP: "CHAOS_REFERENDUM_GROUP",
  EVERYBODY_DRINK_CLINK: "EVERYBODY_DRINK_CLINK",
  SHARE_PENALTY_LOCKED: "SHARE_PENALTY_LOCKED",
  PENALTY_ALL_MANUAL: "PENALTY_ALL_MANUAL",
  WHO_KNOWS_YOU: "WHO_KNOWS_YOU",
  DOUBLE_OR_NOTHING_D6: "DOUBLE_OR_NOTHING_D6",
  RISKY_ROLL_D20: "RISKY_ROLL_D20",
  COLLECTOR: "COLLECTOR",
  MINIMALIST: "MINIMALIST",
  DRINK_AND_DRAW_AGAIN: "DRINK_AND_DRAW_AGAIN",
  CHAOS_BUTTON: "CHAOS_BUTTON",
  SELFISH_SWITCH: "SELFISH_SWITCH",
  MERCY_OR_MAYHEM: "MERCY_OR_MAYHEM",
  MERCY_CLAUSE: "MERCY_CLAUSE",
  LAST_CALL_INSURANCE: "LAST_CALL_INSURANCE",
  PENALTY_INSURANCE: "PENALTY_INSURANCE",
  DEAL_WITH_DEVIL: "DEAL_WITH_DEVIL",
  IMMUNITY_OR_SUFFER: "IMMUNITY_OR_SUFFER",
  ITEM_BUYOUT: "ITEM_BUYOUT",
  FINAL_OFFER: "FINAL_OFFER",
  COLD_EXIT: "COLD_EXIT",
  ALL_IN_TAX: "ALL_IN_TAX",
  IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3: "IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3",
  IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3: "IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3",
  MUTUAL_DAMAGE: "MUTUAL_DAMAGE"
});

const EFFECT_TYPES = Object.freeze({
  NOTIFICATION_CURSE: "NOTIFICATION_CURSE",
  LIE_MODE: "LIE_MODE",
  DOMINO_CURSE: "DOMINO_CURSE",
  NEMESIS_MARK: "NEMESIS_MARK",
  FORBIDDEN_WORD: "FORBIDDEN_WORD",
  QUESTION_MASTER: "QUESTION_MASTER",
  KINGS_TAX: "KINGS_TAX",
  DELAYED_REACTION: "DELAYED_REACTION",
  NAME_SWAP: "NAME_SWAP",
  GLASS_DOWN: "GLASS_DOWN",
  LEFT_HAND: "LEFT_HAND",
  NO_NAMES: "NO_NAMES",
  NO_SWEARING: "NO_SWEARING",
  NO_PHONE_TOUCH: "NO_PHONE_TOUCH",
  DRINK_BUDDY: "DRINK_BUDDY",
  DITTO_MAGNET: "DITTO_MAGNET"
});

const ACTION_SET = new Set(Object.values(ACTION_CODES));
const EFFECT_SET = new Set(Object.values(EFFECT_TYPES));

function normalizeCode(value) {
  return String(value ?? "").trim();
}

function describeEntry(entry, path) {
  const name = entry?.name ? ` ("${entry.name}")` : "";
  return `${path}${name}`;
}

function scanGameData(gameData) {
  const unknownActions = [];
  const unknownEffects = [];
  const visited = new WeakSet();

  function scan(node, path) {
    if (Array.isArray(node)) {
      node.forEach((child, idx) => scan(child, `${path}[${idx}]`));
      return;
    }

    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);

    if (Object.prototype.hasOwnProperty.call(node, "action")) {
      const action = normalizeCode(node.action);
      if (!action) {
        unknownActions.push(`Missing action code in ${describeEntry(node, path)}`);
      } else if (!ACTION_SET.has(action)) {
        unknownActions.push(`Unknown action code "${action}" in ${describeEntry(node, path)}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(node, "effect")) {
      const effect = node.effect;
      if (effect && typeof effect === "object") {
        const type = normalizeCode(effect.type);
        if (!type) {
          unknownEffects.push(`Missing effect type in ${describeEntry(node, path)}`);
        } else if (!EFFECT_SET.has(type)) {
          unknownEffects.push(`Unknown effect code "${type}" in ${describeEntry(node, path)}`);
        }
      } else if (effect != null) {
        unknownEffects.push(`Invalid effect entry in ${describeEntry(node, path)} (expected object)`);
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "effect") continue;
      scan(value, path ? `${path}.${key}` : key);
    }
  }

  scan(gameData, "gameData");
  return { unknownActions, unknownEffects };
}

export function isKnownAction(action) {
  return ACTION_SET.has(normalizeCode(action));
}

export function isKnownEffect(effectType) {
  return EFFECT_SET.has(normalizeCode(effectType));
}

export function validateGameDataActionEffectCodes(gameData) {
  const { unknownActions, unknownEffects } = scanGameData(gameData);
  if (unknownActions.length === 0 && unknownEffects.length === 0) return;

  const lines = ["Invalid action/effect code(s) in gameData:"];
  unknownActions.forEach((entry) => lines.push(`- ${entry}`));
  unknownEffects.forEach((entry) => lines.push(`- ${entry}`));
  throw new Error(lines.join("\n"));
}

export { ACTION_CODES, EFFECT_TYPES };
