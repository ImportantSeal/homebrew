const PENALTY_SINGLE_RE = /^Draw a Penalty Card$/i;
const PENALTY_GROUP_RE = /^Everybody takes a Penalty Card$/i;
const PENALTY_GROUP_ALT_RE = /^Penalty for All$/i;

const CACHE = new Map();

function normalizeText(value) {
  return String(value ?? "").trim();
}

function parseDrink(text) {
  const t = normalizeText(text);
  if (!t) return null;

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

function parseGive(text) {
  const t = normalizeText(text);
  const self = t.match(/\bGive\s+(\d+)\b/i);
  if (!self) return null;
  return { amount: parseInt(self[1], 10) };
}

function freezeSpec(spec) {
  if (spec.drink) Object.freeze(spec.drink);
  if (spec.give) Object.freeze(spec.give);
  return Object.freeze(spec);
}

export function getPlainCardSpec(value) {
  const text = normalizeText(value);
  const cached = CACHE.get(text);
  if (cached) return cached;

  const spec = {
    text,
    kind: "normal",
    penaltyCall: null,
    drink: null,
    give: null,
    requiresActionScreen: false
  };

  if (!text) {
    const frozen = freezeSpec(spec);
    CACHE.set(text, frozen);
    return frozen;
  }

  if (PENALTY_SINGLE_RE.test(text)) {
    spec.kind = "penaltycall";
    spec.penaltyCall = "single";
    const frozen = freezeSpec(spec);
    CACHE.set(text, frozen);
    return frozen;
  }

  if (PENALTY_GROUP_RE.test(text) || PENALTY_GROUP_ALT_RE.test(text)) {
    spec.kind = "penaltycall";
    spec.penaltyCall = "group";
    const frozen = freezeSpec(spec);
    CACHE.set(text, frozen);
    return frozen;
  }

  spec.drink = parseDrink(text);
  spec.give = parseGive(text);

  if (spec.drink && spec.give) spec.kind = "mix";
  else if (spec.drink) spec.kind = "drink";
  else if (spec.give) spec.kind = "give";

  spec.requiresActionScreen = !(spec.drink || spec.give);

  const frozen = freezeSpec(spec);
  CACHE.set(text, frozen);
  return frozen;
}

export function getPlainCardKind(value) {
  return getPlainCardSpec(value).kind;
}

export function isPenaltyCallText(value) {
  return getPlainCardSpec(value).penaltyCall !== null;
}

export function getPenaltyCallType(value) {
  return getPlainCardSpec(value).penaltyCall;
}

export function getDrinkSpec(value) {
  return getPlainCardSpec(value).drink;
}

export function getGiveSpec(value) {
  return getPlainCardSpec(value).give;
}

export function shouldShowPlainCardActionScreen(value) {
  return getPlainCardSpec(value).requiresActionScreen;
}
