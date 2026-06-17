import { testCard, testSubcard } from './testCard.js';

const TEST_CARD_COUNT = 3;
const TEST_PARENT_ID = "__test_card_mode_parent__";
const DEFAULT_CONFIG = Object.freeze({ testCard, testSubcard });

function isConfigured(value) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

function normalizeRef(value) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesReference(entry, reference) {
  const ref = normalizeRef(reference);
  if (!ref) return false;

  if (typeof entry === "string") {
    return normalizeRef(entry) === ref;
  }

  if (!entry || typeof entry !== "object") return false;

  return ["id", "name", "label", "title", "text"].some((key) =>
    normalizeRef(entry[key]) === ref
  );
}

function getObjectParentCards(state) {
  const parents = [];

  if (state?.special) parents.push(state.special);
  if (state?.crowdChallenge) parents.push(state.crowdChallenge);
  if (Array.isArray(state?.socialCards)) {
    parents.push(...state.socialCards);
  }

  return parents.filter((card) => card && typeof card === "object");
}

function findParentAlias(state, reference) {
  const ref = normalizeRef(reference);
  if (!ref) return null;

  if (ref === "special") return state?.special ?? null;
  if (ref === "crowd") return state?.crowdChallenge ?? null;
  if (ref === "challenge" && Array.isArray(state?.socialCards)) {
    return state.socialCards.find((card) => matchesReference(card, "Challenge")) ?? null;
  }

  return null;
}

function findTopLevelCard(state, reference) {
  const alias = findParentAlias(state, reference);
  if (alias) return alias;

  const deckCards = [
    ...(Array.isArray(state?.normalDeck) ? state.normalDeck : []),
    ...(Array.isArray(state?.penaltyDeck) ? state.penaltyDeck : []),
    ...(Array.isArray(state?.itemCards) ? state.itemCards : []),
    ...getObjectParentCards(state)
  ];

  return deckCards.find((card) => matchesReference(card, reference)) ?? null;
}

function findSubcard(state, reference, preferredParent = null) {
  const parents = [];
  if (preferredParent && typeof preferredParent === "object") {
    parents.push(preferredParent);
  }
  parents.push(...getObjectParentCards(state));

  for (const parent of parents) {
    const subcategories = Array.isArray(parent?.subcategories)
      ? parent.subcategories
      : [];
    const match = subcategories.find((entry) => matchesReference(entry, reference));
    if (match) return { parent, subcard: match };
  }

  return null;
}

function looksLikeObjectSubcard(card) {
  if (!card || typeof card !== "object" || Array.isArray(card)) return false;
  if (Array.isArray(card.subcategories)) return false;
  if (card.type || card.drink || card.give || card.penaltyCall) return false;

  return Boolean(
    card.instruction ||
    card.action ||
    card.effect ||
    card.leaderboardTopic ||
    card.statsTopic ||
    card.statsLeaderboardTopic ||
    card.itemRelated ||
    card.penalty
  );
}

function buildParentForSubcard(subcard, parent = null) {
  const parentBase = parent && typeof parent === "object"
    ? { ...parent }
    : {};

  return {
    ...parentBase,
    id: parentBase.id || TEST_PARENT_ID,
    name: parentBase.name || subcard?.name || "Test Card",
    subcategories: [subcard],
    testCardMode: true
  };
}

function resolveSubcardReference(state, reference, preferredParent = null) {
  if (!isConfigured(reference)) return null;
  if (reference && typeof reference === "object") return reference;

  const found = findSubcard(state, reference, preferredParent);
  return found?.subcard ?? null;
}

export function resolveTestCard(state, config = DEFAULT_CONFIG) {
  const cardConfig = config?.testCard;
  const subcardConfig = config?.testSubcard;

  if (!isConfigured(cardConfig) && !isConfigured(subcardConfig)) return null;

  if (!isConfigured(cardConfig) && isConfigured(subcardConfig)) {
    const subcard = resolveSubcardReference(state, subcardConfig);
    return subcard ? buildParentForSubcard(subcard) : null;
  }

  let resolvedCard = null;

  if (cardConfig && typeof cardConfig === "object") {
    resolvedCard = looksLikeObjectSubcard(cardConfig)
      ? buildParentForSubcard(cardConfig)
      : cardConfig;
  } else {
    resolvedCard = findTopLevelCard(state, cardConfig);
    if (!resolvedCard) {
      const found = findSubcard(state, cardConfig);
      if (found) {
        resolvedCard = buildParentForSubcard(found.subcard, found.parent);
      }
    }
  }

  if (!resolvedCard) return null;

  if (isConfigured(subcardConfig)) {
    const forcedSubcard = resolveSubcardReference(state, subcardConfig, resolvedCard);
    return forcedSubcard
      ? buildParentForSubcard(forcedSubcard, resolvedCard)
      : null;
  }

  return resolvedCard;
}

export function dealTestCards(state, config = DEFAULT_CONFIG) {
  if (!state || typeof state !== "object") return false;

  const card = resolveTestCard(state, config);
  if (!card) return false;

  state.currentCards = Array.from({ length: TEST_CARD_COUNT }, () => card);
  state.dittoPending = [null, null, null];
  state.hiddenIndex = null;
  state.revealed = [true, true, true];
  state.dittoActive = [false, false, false];

  return true;
}
