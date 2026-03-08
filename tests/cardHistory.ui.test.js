import test from 'node:test';
import assert from 'node:assert/strict';

import { recordDrinkTaken } from '../js/stats.js';
import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function buildHistoryDom(document) {
  const historySection = document.createElement('section');
  historySection.className = 'history-section';
  historySection.scrollHeight = 480;

  const historyContainer = document.createElement('div');
  historyContainer.id = 'card-history';

  historySection.appendChild(historyContainer);
  document.body.appendChild(historySection);

  return { historySection, historyContainer };
}

test('card history renders latest entries, leaderboard actions, and clear state', async () => {
  const dom = installDom();

  try {
    const { addHistoryEntry, clearHistoryEntries, getLastHistoryEntry } = await importFresh(
      '../js/cardHistory.js',
      import.meta.url
    );
    const { historySection, historyContainer } = buildHistoryDom(dom.document);
    const state = {
      players: [{ name: 'Alice' }, { name: 'Bob' }],
      stats: { players: [], updatedAt: 0 },
      cardHistory: [],
      historyEntryCount: 0
    };

    recordDrinkTaken(state, 0, 1);
    recordDrinkTaken(state, 1, 4);

    const first = addHistoryEntry(state, 'Alice gives Bob 2 drinks.', {
      kind: 'give',
      leaderboardTopic: 'drinks_taken_max'
    });

    assert.equal(first, 'Alice gives Bob 2 drinks.');
    assert.equal(state.cardHistory.length, 1);
    assert.equal(historyContainer.childElementCount, 1);
    assert.equal(historyContainer.firstElementChild.dataset.kind, 'give');
    assert.equal(historyContainer.firstElementChild.dataset.rawText, 'Alice gives Bob 2 drinks.');
    assert.equal(historyContainer.querySelectorAll('.history-entry.is-latest').length, 1);
    assert.equal(historySection.scrollTop, 480);

    const button = historyContainer.querySelector('.history-entry__leaderboard-btn');
    assert.ok(button);
    dom.click(button);
    await dom.flush();

    assert.equal(historyContainer.childElementCount, 2);
    assert.match(
      getLastHistoryEntry(),
      /Leaderboard \(Most drinks taken\): Bob \(4\)\./
    );

    addHistoryEntry(state, 'Bob drinks 4.', { kind: 'drink' });
    assert.equal(historyContainer.childElementCount, 3);
    assert.equal(historyContainer.querySelectorAll('.history-entry.is-latest').length, 1);
    assert.equal(getLastHistoryEntry(), 'Bob drinks 4.');

    clearHistoryEntries(state);
    assert.equal(historyContainer.childElementCount, 0);
    assert.deepEqual(state.cardHistory, []);
    assert.equal(state.historyEntryCount, 0);
  } finally {
    dom.cleanup();
  }
});
