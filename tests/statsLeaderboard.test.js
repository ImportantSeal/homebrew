import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStatsLeaderboardMessage,
  resolveStatsLeaderboardTopic
} from '../js/statsLeaderboard.js';

function createMockState() {
  return {
    players: [
      { name: 'Aino' },
      { name: 'Beni' },
      { name: 'Caro' }
    ],
    stats: {
      players: [
        {
          playerName: 'Aino',
          cardsSelected: 8,
          mysteryCardsSelected: 1,
          drinksTaken: 5,
          drinksGiven: 2,
          penaltiesTaken: 1,
          kindCounts: {}
        },
        {
          playerName: 'Beni',
          cardsSelected: 9,
          mysteryCardsSelected: 4,
          drinksTaken: 2,
          drinksGiven: 7,
          penaltiesTaken: 2,
          kindCounts: {}
        },
        {
          playerName: 'Caro',
          cardsSelected: 6,
          mysteryCardsSelected: 0,
          drinksTaken: 0,
          drinksGiven: 1,
          penaltiesTaken: 5,
          kindCounts: {}
        }
      ],
      updatedAt: 0
    }
  };
}

test('resolveStatsLeaderboardTopic maps known stats cards and mystery pick wording', () => {
  assert.equal(
    resolveStatsLeaderboardTopic(
      'Most Drinks Guess',
      'Everyone guesses who has taken the most drinks. Check Stats.'
    ),
    'drinks_taken_max'
  );
  assert.equal(
    resolveStatsLeaderboardTopic(
      'Untouched Tank',
      'Check the Stats page. If your Drinks taken is 0, drink 9.'
    ),
    'drinks_taken_min'
  );
  assert.equal(
    resolveStatsLeaderboardTopic(
      'Mystery Hunter',
      'Player with most mystery picks gives 2.'
    ),
    'mystery_picks_max'
  );
  assert.equal(
    resolveStatsLeaderboardTopic(
      'Clean Sheet Punishment',
      'If your Penalties are 0, draw a Penalty Card.'
    ),
    'penalties_min'
  );
  assert.equal(resolveStatsLeaderboardTopic('Random Card', 'Everyone drinks 1.'), null);
});

test('buildStatsLeaderboardMessage prints related leaders', () => {
  const state = createMockState();

  const mystery = buildStatsLeaderboardMessage(state, 'mystery_picks_max');
  assert.match(mystery, /^Leaderboard \(Most mystery picks\): Beni \(4\)\.$/);

  const leastTaken = buildStatsLeaderboardMessage(state, 'drinks_taken_min');
  assert.match(leastTaken, /^Leaderboard \(Least drinks taken\): Caro \(0\)\.$/);

  const mix = buildStatsLeaderboardMessage(state, 'mix_total_max');
  assert.match(mix, /^Leaderboard \(Highest Drink \+ Give total\): Beni \(9\)\.$/);
});

test('buildStatsLeaderboardMessage supports quickboard fallback', () => {
  const state = createMockState();
  const overview = buildStatsLeaderboardMessage(state, 'stats_overview');

  assert.match(overview, /^Stats quickboard:/);
  assert.match(overview, /Most drinks taken: Aino \(5\)/);
  assert.match(overview, /Most mystery picks: Beni \(4\)/);
  assert.match(overview, /Most penalties: Caro \(5\)/);
});
