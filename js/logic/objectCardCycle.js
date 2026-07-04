import { ACTION_CODES } from './actionEffectRegistry.js';

const ITEM_RELATED_SPECIAL_ACTIONS = new Set([
  ACTION_CODES.COLLECTOR,
  ACTION_CODES.MINIMALIST,
  ACTION_CODES.IMMUNITY_OR_SUFFER,
  ACTION_CODES.ITEM_BUYOUT
]);
const ITEM_RELATED_TEXT = /\bitems?\b/i;

export function createObjectCardCycleState() {
  return {
    seenKeys: []
  };
}

function normalizeKeyPart(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isObjectCard(card) {
  return Boolean(card && typeof card === 'object' && Array.isArray(card.subcategories));
}

function isItemRelatedSpecialSubcategory(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.itemRelated === 'boolean') return entry.itemRelated;
  if (entry.action && ITEM_RELATED_SPECIAL_ACTIONS.has(String(entry.action))) return true;

  const name = String(entry.name || '');
  const instruction = String(entry.instruction || '');
  return ITEM_RELATED_TEXT.test(name) || ITEM_RELATED_TEXT.test(instruction);
}

export function getObjectCardPool(state, cardData) {
  const source = Array.isArray(cardData?.subcategories) ? cardData.subcategories : [];
  if (cardData === state?.special && !state?.includeItems) {
    return source.filter(entry => !isItemRelatedSpecialSubcategory(entry));
  }
  return source;
}

function makeSubcardIdentity(entry) {
  if (entry && typeof entry === 'object') {
    if (entry.id) return `id:${normalizeKeyPart(entry.id)}`;

    const name = normalizeKeyPart(entry.name);
    const instruction = normalizeKeyPart(entry.instruction);
    const label = normalizeKeyPart(entry.label);
    const action = normalizeKeyPart(entry.action);
    const effect = normalizeKeyPart(entry.effect?.type);
    const turns = normalizeKeyPart(entry.effect?.turns);
    const parts = [
      name && `name:${name}`,
      instruction && `instruction:${instruction}`,
      label && `label:${label}`,
      action && `action:${action}`,
      effect && `effect:${effect}`,
      turns && `turns:${turns}`
    ].filter(Boolean);

    if (parts.length > 0) return parts.join('|');
    return `object:${normalizeKeyPart(JSON.stringify(entry))}`;
  }

  return `text:${normalizeKeyPart(entry)}`;
}

function makeCycleKey(parent, entry) {
  return `${parent.key}::${makeSubcardIdentity(entry)}`;
}

function addParent(parents, key, card, state) {
  if (!isObjectCard(card)) return;
  const pool = getObjectCardPool(state, card);
  if (pool.length === 0) return;
  parents.push({ key, card, pool });
}

export function getTrackedObjectCardParents(state) {
  const parents = [];
  const socialCards = Array.isArray(state?.socialCards) ? state.socialCards : [];

  socialCards.forEach((card, index) => {
    const name = normalizeKeyPart(card?.name || `social-${index}`);
    addParent(parents, `social:${index}:${name}`, card, state);
  });

  addParent(parents, 'crowd', state?.crowdChallenge, state);
  addParent(parents, 'special', state?.special, state);

  return parents;
}

function findTrackedParent(parents, card) {
  return parents.find(parent => parent.card === card) || null;
}

function ensureCycleState(state) {
  if (!state || typeof state !== 'object') return createObjectCardCycleState();

  if (!state.objectCardCycle || typeof state.objectCardCycle !== 'object') {
    state.objectCardCycle = createObjectCardCycleState();
  }

  if (!Array.isArray(state.objectCardCycle.seenKeys)) {
    state.objectCardCycle.seenKeys = [];
  }

  return state.objectCardCycle;
}

function getAllCycleKeys(parents) {
  const keys = [];
  const added = new Set();

  parents.forEach((parent) => {
    parent.pool.forEach((entry) => {
      const key = makeCycleKey(parent, entry);
      if (!added.has(key)) {
        added.add(key);
        keys.push(key);
      }
    });
  });

  return keys;
}

function prepareSeenSet(state, parents) {
  const cycle = ensureCycleState(state);
  const validKeys = new Set(getAllCycleKeys(parents));
  const seenKeys = [];
  const added = new Set();

  cycle.seenKeys.forEach((rawKey) => {
    const key = String(rawKey);
    if (validKeys.has(key) && !added.has(key)) {
      added.add(key);
      seenKeys.push(key);
    }
  });

  if (validKeys.size > 0 && seenKeys.length >= validKeys.size) {
    cycle.seenKeys = [];
    return new Set();
  }

  cycle.seenKeys = seenKeys;
  return new Set(seenKeys);
}

function getUnseenEntries(parent, seenSet) {
  return parent.pool.filter(entry => !seenSet.has(makeCycleKey(parent, entry)));
}

function markSeen(state, parent, entry) {
  const cycle = ensureCycleState(state);
  const key = makeCycleKey(parent, entry);
  if (!cycle.seenKeys.includes(key)) {
    cycle.seenKeys.push(key);
  }
  return key;
}

export function getAvailableObjectParentCards(state, preferredCards = null) {
  const parents = getTrackedObjectCardParents(state);
  const seenSet = prepareSeenSet(state, parents);
  const preferredSet = Array.isArray(preferredCards) ? new Set(preferredCards) : null;

  return parents
    .filter(parent => !preferredSet || preferredSet.has(parent.card))
    .filter(parent => getUnseenEntries(parent, seenSet).length > 0)
    .map(parent => parent.card);
}

function pickCandidate(candidates, pickFromCandidates) {
  if (typeof pickFromCandidates === 'function') {
    const picked = pickFromCandidates(candidates);
    if (picked !== undefined) return picked;
  }
  return candidates[0];
}

export function drawObjectSubcard(state, requestedParentCard, pickFromCandidates) {
  const parents = getTrackedObjectCardParents(state);
  let parent = findTrackedParent(parents, requestedParentCard);

  if (!parent) {
    const pool = getObjectCardPool(state, requestedParentCard);
    return {
      event: pickCandidate(pool, pickFromCandidates),
      parentCard: requestedParentCard,
      requestedParentCard,
      cycleKey: null
    };
  }

  let seenSet = prepareSeenSet(state, parents);
  let candidates = getUnseenEntries(parent, seenSet);

  if (candidates.length === 0) {
    const fallbackParent = parents.find(candidateParent =>
      getUnseenEntries(candidateParent, seenSet).length > 0
    );

    if (fallbackParent) {
      parent = fallbackParent;
      candidates = getUnseenEntries(parent, seenSet);
    } else {
      ensureCycleState(state).seenKeys = [];
      seenSet = new Set();
      candidates = getUnseenEntries(parent, seenSet);
    }
  }

  const event = pickCandidate(candidates, pickFromCandidates);
  const cycleKey = event === undefined ? null : markSeen(state, parent, event);

  return {
    event,
    parentCard: parent.card,
    requestedParentCard,
    cycleKey
  };
}
