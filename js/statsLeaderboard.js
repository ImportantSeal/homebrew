import { getStatsSnapshot } from './stats.js';

const TOPIC_DEFINITIONS = {
  drinks_taken_max: {
    label: 'Most drinks taken',
    buttonLabel: 'Show drinks leaderboard',
    mode: 'max',
    positiveOnly: true,
    valueOf: (entry) => Number(entry?.drinksTaken || 0)
  },
  drinks_taken_min: {
    label: 'Least drinks taken',
    buttonLabel: 'Show least-drinks leaderboard',
    mode: 'min',
    positiveOnly: false,
    valueOf: (entry) => Number(entry?.drinksTaken || 0)
  },
  drinks_given_max: {
    label: 'Most drinks given',
    buttonLabel: 'Show gives leaderboard',
    mode: 'max',
    positiveOnly: true,
    valueOf: (entry) => Number(entry?.drinksGiven || 0)
  },
  drinks_given_min: {
    label: 'Least drinks given',
    buttonLabel: 'Show least-gives leaderboard',
    mode: 'min',
    positiveOnly: false,
    valueOf: (entry) => Number(entry?.drinksGiven || 0)
  },
  penalties_max: {
    label: 'Most penalties',
    buttonLabel: 'Show penalties leaderboard',
    mode: 'max',
    positiveOnly: true,
    valueOf: (entry) => Number(entry?.penaltiesTaken || 0)
  },
  penalties_min: {
    label: 'Least penalties',
    buttonLabel: 'Show least-penalties leaderboard',
    mode: 'min',
    positiveOnly: false,
    valueOf: (entry) => Number(entry?.penaltiesTaken || 0)
  },
  mystery_picks_max: {
    label: 'Most mystery picks',
    buttonLabel: 'Show mystery leaderboard',
    mode: 'max',
    positiveOnly: true,
    valueOf: (entry) => Number(entry?.mysteryCardsSelected || 0)
  },
  mix_total_max: {
    label: 'Highest Drink + Give total',
    buttonLabel: 'Show mix leaderboard',
    mode: 'max',
    positiveOnly: true,
    valueOf: (entry) => Number(entry?.drinksTaken || 0) + Number(entry?.drinksGiven || 0)
  },
  stats_overview: {
    label: 'Stats quickboard',
    buttonLabel: 'Show stats quickboard'
  }
};

const VALID_TOPICS = new Set(Object.keys(TOPIC_DEFINITIONS));

function normalizeTopic(topic) {
  if (typeof topic !== 'string') return null;
  const normalized = topic.trim().toLowerCase();
  return VALID_TOPICS.has(normalized) ? normalized : null;
}

function formatValue(value) {
  return Number(value || 0).toLocaleString('fi-FI');
}

function joinNames(names = []) {
  return names.filter(Boolean).join(', ');
}

function pickLeaders(snapshot, config) {
  if (!Array.isArray(snapshot) || snapshot.length === 0) return null;
  if (!config || typeof config.valueOf !== 'function') return null;

  const mode = config.mode === 'min' ? 'min' : 'max';
  const positiveOnly = Boolean(config.positiveOnly);

  let bestValue = null;
  const playerNames = [];

  snapshot.forEach((entry) => {
    const value = Number(config.valueOf(entry));
    if (!Number.isFinite(value)) return;
    if (positiveOnly && value <= 0) return;

    if (bestValue === null) {
      bestValue = value;
      playerNames.length = 0;
      playerNames.push(String(entry?.playerName || ''));
      return;
    }

    if (mode === 'max' && value > bestValue) {
      bestValue = value;
      playerNames.length = 0;
      playerNames.push(String(entry?.playerName || ''));
      return;
    }

    if (mode === 'min' && value < bestValue) {
      bestValue = value;
      playerNames.length = 0;
      playerNames.push(String(entry?.playerName || ''));
      return;
    }

    if (value === bestValue) {
      playerNames.push(String(entry?.playerName || ''));
    }
  });

  if (bestValue === null || playerNames.length === 0) return null;
  return { playerNames, value: bestValue };
}

function formatLeaderResult(snapshot, topicKey) {
  const definition = TOPIC_DEFINITIONS[topicKey];
  if (!definition || !definition.valueOf) return null;

  const leaders = pickLeaders(snapshot, definition);
  if (!leaders) return `Leaderboard (${definition.label}): no data yet.`;

  return `Leaderboard (${definition.label}): ${joinNames(leaders.playerNames)} (${formatValue(leaders.value)}).`;
}

function buildOverviewMessage(snapshot) {
  const drinksTaken = pickLeaders(snapshot, TOPIC_DEFINITIONS.drinks_taken_max);
  const drinksGiven = pickLeaders(snapshot, TOPIC_DEFINITIONS.drinks_given_max);
  const mysteryPicks = pickLeaders(snapshot, TOPIC_DEFINITIONS.mystery_picks_max);
  const penalties = pickLeaders(snapshot, TOPIC_DEFINITIONS.penalties_max);

  const parts = [
    drinksTaken
      ? `Most drinks taken: ${joinNames(drinksTaken.playerNames)} (${formatValue(drinksTaken.value)})`
      : 'Most drinks taken: -',
    drinksGiven
      ? `Most drinks given: ${joinNames(drinksGiven.playerNames)} (${formatValue(drinksGiven.value)})`
      : 'Most drinks given: -',
    mysteryPicks
      ? `Most mystery picks: ${joinNames(mysteryPicks.playerNames)} (${formatValue(mysteryPicks.value)})`
      : 'Most mystery picks: -',
    penalties
      ? `Most penalties: ${joinNames(penalties.playerNames)} (${formatValue(penalties.value)})`
      : 'Most penalties: -'
  ];

  return `Stats quickboard: ${parts.join(' | ')}.`;
}

export function normalizeStatsLeaderboardTopic(topic) {
  return normalizeTopic(topic);
}

export function getStatsLeaderboardButtonLabel(topic) {
  const normalized = normalizeTopic(topic);
  if (!normalized) return 'Show leaderboard';
  return TOPIC_DEFINITIONS[normalized].buttonLabel || 'Show leaderboard';
}

export function buildStatsLeaderboardMessage(stateObj, topic) {
  const normalized = normalizeTopic(topic);
  if (!normalized) return null;

  const snapshot = getStatsSnapshot(stateObj);
  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    return `Leaderboard (${TOPIC_DEFINITIONS[normalized].label}): no players yet.`;
  }

  if (normalized === 'stats_overview') {
    return buildOverviewMessage(snapshot);
  }

  return formatLeaderResult(snapshot, normalized);
}

export function resolveStatsLeaderboardTopic(cardName = '', instruction = '') {
  const name = String(cardName || '').toLowerCase();
  const text = `${name} ${String(instruction || '').toLowerCase()}`.trim();
  if (!text) return null;

  if (/mystery/.test(text) && /(pick|picked|select|selected)/.test(text)) {
    return 'mystery_picks_max';
  }

  if (/drink\s*\+\s*give|mix master|highest\s+drink\s*\+\s*give/.test(text)) {
    return 'mix_total_max';
  }

  if (/least\s+drinks?\s+taken|fewest\s+drinks?|untouched\s+tank|drinks?\s+taken\s+is\s+0/.test(text)) {
    return 'drinks_taken_min';
  }

  if (/most\s+drinks?\s+taken|drunkest|tank reward|most drinks guess/.test(text)) {
    return 'drinks_taken_max';
  }

  if (/least\s+drinks?\s+given|no-show\s+giver|quiet hands|drinks?\s+given\s+is\s+0/.test(text)) {
    return 'drinks_given_min';
  }

  if (/most\s+drinks?\s+given|generous\s+leader/.test(text)) {
    return 'drinks_given_max';
  }

  if (/least\s+penalties?|clean sheet punishment|penalties\s+are\s+0/.test(text)) {
    return 'penalties_min';
  }

  if (/most\s+penalties?|penalty veteran/.test(text)) {
    return 'penalties_max';
  }

  if (/\bcheck\s+stats\b|\bstats\s+page\b/.test(text)) {
    return 'stats_overview';
  }

  return null;
}
