const CARD_KIND_ORDER = [
  'drink',
  'mix',
  'give',
  'penaltycall',
  'item',
  'social',
  'crowd',
  'special',
  'ditto',
  'normal'
];

const CARD_KIND_SET = new Set(CARD_KIND_ORDER);

const CARD_KIND_LABELS = {
  normal: 'Normal',
  drink: 'Drink',
  give: 'Give',
  mix: 'Drink + Give',
  penaltycall: 'Penalty Call',
  item: 'Item',
  social: 'Challenge',
  crowd: 'Crowd',
  special: 'Special',
  ditto: 'Ditto'
};

const STATS_UPDATED_EVENT = 'homebrew:stats-updated';

function dispatchStatsUpdated() {
  if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
  document.dispatchEvent(new CustomEvent(STATS_UPDATED_EVENT));
}

function createKindCounter() {
  const counter = {};
  CARD_KIND_ORDER.forEach((kind) => {
    counter[kind] = 0;
  });
  return counter;
}

function createPlayerStats(name = '', index = 0) {
  return {
    playerName: String(name || `Player ${index + 1}`),
    cardsSelected: 0,
    mysteryCardsSelected: 0,
    drinksTaken: 0,
    drinksGiven: 0,
    penaltiesTaken: 0,
    kindCounts: createKindCounter()
  };
}

function normalizeKind(kind) {
  if (typeof kind !== 'string') return null;
  const normalized = kind.trim().toLowerCase();
  return CARD_KIND_SET.has(normalized) ? normalized : null;
}

function applyKindCountDelta(kindCounts, kind, delta) {
  const normalizedKind = normalizeKind(kind);
  if (!normalizedKind || !kindCounts || typeof kindCounts !== 'object') return false;

  const nextValue = Number(kindCounts[normalizedKind] || 0) + Number(delta || 0);
  kindCounts[normalizedKind] = Math.max(0, nextValue);

  if (normalizedKind === 'mix') {
    const drinkValue = Number(kindCounts.drink || 0) + Number(delta || 0);
    const giveValue = Number(kindCounts.give || 0) + Number(delta || 0);
    kindCounts.drink = Math.max(0, drinkValue);
    kindCounts.give = Math.max(0, giveValue);
  }

  return true;
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function ensureStatsRoot(stateObj) {
  if (!stateObj || typeof stateObj !== 'object') return null;

  if (!stateObj.stats || typeof stateObj.stats !== 'object') {
    stateObj.stats = { players: [], updatedAt: 0 };
  }

  if (!Array.isArray(stateObj.stats.players)) {
    stateObj.stats.players = [];
  }

  if (!Number.isFinite(stateObj.stats.updatedAt)) {
    stateObj.stats.updatedAt = 0;
  }

  return stateObj.stats;
}

function ensurePlayerStats(stateObj, playerIndex) {
  if (!Number.isInteger(playerIndex) || playerIndex < 0) return null;

  const statsRoot = ensureStatsRoot(stateObj);
  if (!statsRoot) return null;

  const players = Array.isArray(stateObj.players) ? stateObj.players : [];
  while (statsRoot.players.length < players.length) {
    const idx = statsRoot.players.length;
    const playerName = players[idx]?.name || `Player ${idx + 1}`;
    statsRoot.players.push(createPlayerStats(playerName, idx));
  }

  if (!statsRoot.players[playerIndex]) {
    const playerName = players[playerIndex]?.name || `Player ${playerIndex + 1}`;
    statsRoot.players[playerIndex] = createPlayerStats(playerName, playerIndex);
  }

  const playerStats = statsRoot.players[playerIndex];
  if (!playerStats.kindCounts || typeof playerStats.kindCounts !== 'object') {
    playerStats.kindCounts = createKindCounter();
  }

  CARD_KIND_ORDER.forEach((kind) => {
    if (!Number.isFinite(playerStats.kindCounts[kind])) {
      playerStats.kindCounts[kind] = 0;
    }
  });

  const expectedName = players[playerIndex]?.name || `Player ${playerIndex + 1}`;
  playerStats.playerName = String(expectedName);

  return playerStats;
}

function markUpdated(stateObj) {
  const statsRoot = ensureStatsRoot(stateObj);
  if (!statsRoot) return;

  statsRoot.updatedAt = Date.now();
  dispatchStatsUpdated();
}

function getTopKind(kindCounts) {
  let bestKind = null;
  let bestCount = 0;

  CARD_KIND_ORDER.forEach((kind) => {
    const count = Number(kindCounts?.[kind] || 0);
    if (count > bestCount) {
      bestCount = count;
      bestKind = kind;
    }
  });

  if (!bestKind || bestCount <= 0) return null;
  return {
    kind: bestKind,
    label: CARD_KIND_LABELS[bestKind] || bestKind,
    count: bestCount
  };
}

export function resetStats(stateObj) {
  const statsRoot = ensureStatsRoot(stateObj);
  if (!statsRoot) return;

  const players = Array.isArray(stateObj.players) ? stateObj.players : [];
  statsRoot.players = players.map((player, index) => createPlayerStats(player?.name, index));
  markUpdated(stateObj);
}

export function recordCardSelection(stateObj, playerIndex, options = {}) {
  const playerStats = ensurePlayerStats(stateObj, playerIndex);
  if (!playerStats) return;

  playerStats.cardsSelected += 1;
  if (options?.mystery) {
    playerStats.mysteryCardsSelected += 1;
  }

  const kind = normalizeKind(options?.kind);
  if (kind) {
    applyKindCountDelta(playerStats.kindCounts, kind, 1);
  }

  markUpdated(stateObj);
}

export function replaceCardSelectionKind(stateObj, playerIndex, fromKind, toKind) {
  const playerStats = ensurePlayerStats(stateObj, playerIndex);
  if (!playerStats) return;

  const normalizedTo = normalizeKind(toKind);
  if (!normalizedTo) return;

  const normalizedFrom = normalizeKind(fromKind);
  if (normalizedFrom === normalizedTo) return;

  if (normalizedFrom) {
    applyKindCountDelta(playerStats.kindCounts, normalizedFrom, -1);
  }
  applyKindCountDelta(playerStats.kindCounts, normalizedTo, 1);

  markUpdated(stateObj);
}

export function recordDrinkTaken(stateObj, playerIndex, amount) {
  const playerStats = ensurePlayerStats(stateObj, playerIndex);
  if (!playerStats) return;

  const safeAmount = toPositiveNumber(amount);
  if (safeAmount <= 0) return;

  playerStats.drinksTaken += safeAmount;
  markUpdated(stateObj);
}

export function recordGiveDrinks(stateObj, playerIndex, amount) {
  const playerStats = ensurePlayerStats(stateObj, playerIndex);
  if (!playerStats) return;

  const safeAmount = toPositiveNumber(amount);
  if (safeAmount <= 0) return;

  playerStats.drinksGiven += safeAmount;
  markUpdated(stateObj);
}

export function recordPenaltyTaken(stateObj, playerIndex) {
  const playerStats = ensurePlayerStats(stateObj, playerIndex);
  if (!playerStats) return;

  playerStats.penaltiesTaken += 1;
  markUpdated(stateObj);
}

export function getStatsSnapshot(stateObj) {
  const statsRoot = ensureStatsRoot(stateObj);
  if (!statsRoot) return [];

  const players = Array.isArray(stateObj.players) ? stateObj.players : [];
  players.forEach((_, index) => {
    ensurePlayerStats(stateObj, index);
  });

  return statsRoot.players.map((playerStats, index) => {
    const kindCounts = { ...createKindCounter(), ...(playerStats.kindCounts || {}) };
    return {
      playerIndex: index,
      playerName: String(playerStats.playerName || `Player ${index + 1}`),
      cardsSelected: Number(playerStats.cardsSelected || 0),
      mysteryCardsSelected: Number(playerStats.mysteryCardsSelected || 0),
      drinksTaken: Number(playerStats.drinksTaken || 0),
      drinksGiven: Number(playerStats.drinksGiven || 0),
      penaltiesTaken: Number(playerStats.penaltiesTaken || 0),
      kindCounts,
      topKind: getTopKind(kindCounts)
    };
  });
}

export { CARD_KIND_ORDER, CARD_KIND_LABELS, STATS_UPDATED_EVENT };
