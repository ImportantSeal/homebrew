import test from 'node:test';
import assert from 'node:assert/strict';

import {
  recordCardSelection,
  recordDrinkTaken,
  recordGiveDrinks,
  recordPenaltyTaken
} from '../js/stats.js';
import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function buildStatsModalDom(document) {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'stats-toggle';
  toggleBtn.setAttribute('aria-expanded', 'false');

  const modal = document.createElement('div');
  modal.id = 'stats-modal';
  modal.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'modal__panel';

  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('data-close-stats', '');

  const board = document.createElement('div');
  board.id = 'stats-board';

  const empty = document.createElement('div');
  empty.id = 'stats-empty';
  empty.hidden = true;

  append(panel, closeBtn, board, empty);
  modal.appendChild(panel);
  append(document.body, toggleBtn, modal);

  return { toggleBtn, modal, panel, closeBtn, board, empty };
}

function createState() {
  return {
    players: [{ name: 'Alice' }, { name: 'Bob' }],
    stats: { players: [], updatedAt: 0 }
  };
}

test('stats modal opens, renders overview, and closes through modal controls', async () => {
  const dom = installDom();

  try {
    const { initStatsModal } = await importFresh('../js/ui/statsModal.js', import.meta.url);
    const refs = buildStatsModalDom(dom.document);
    const state = createState();

    recordCardSelection(state, 0, { kind: 'drink' });
    recordCardSelection(state, 1, { kind: 'give', mystery: true });
    recordDrinkTaken(state, 1, 5);
    recordGiveDrinks(state, 0, 3);
    recordPenaltyTaken(state, 1);

    initStatsModal({ state });

    refs.toggleBtn.focus();
    dom.click(refs.toggleBtn);
    await dom.flush();

    assert.equal(refs.modal.classList.contains('is-open'), true);
    assert.equal(refs.modal.getAttribute('aria-hidden'), 'false');
    assert.equal(refs.toggleBtn.getAttribute('aria-expanded'), 'true');
    assert.equal(dom.document.body.classList.contains('modal-open'), true);
    assert.equal(dom.document.activeElement, refs.panel);
    assert.equal(refs.empty.hidden, true);
    assert.ok(refs.board.textContent.includes('Game Overview'));
    assert.ok(refs.board.textContent.includes('Players'));
    assert.ok(refs.board.textContent.includes('Alice'));
    assert.ok(refs.board.textContent.includes('Bob'));
    assert.equal(refs.board.querySelectorAll('.stats-player').length, 2);

    dom.click(refs.closeBtn);
    assert.equal(refs.modal.classList.contains('is-open'), false);
    assert.equal(refs.modal.getAttribute('aria-hidden'), 'true');
    assert.equal(refs.toggleBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(dom.document.body.classList.contains('modal-open'), false);
    assert.equal(dom.document.activeElement, refs.toggleBtn);
  } finally {
    dom.cleanup();
  }
});

test('stats modal refreshes open content when stats update events fire', async () => {
  const dom = installDom();

  try {
    const { initStatsModal } = await importFresh('../js/ui/statsModal.js', import.meta.url);
    const refs = buildStatsModalDom(dom.document);
    const state = createState();

    initStatsModal({ state });
    dom.click(refs.toggleBtn);
    await dom.flush();

    assert.ok(refs.board.textContent.includes('No picks yet'));
    assert.ok(!refs.board.textContent.includes('99'));

    recordDrinkTaken(state, 0, 99);
    await dom.flush();

    assert.ok(refs.board.textContent.includes('99'));
    assert.ok(refs.board.textContent.includes('Alice'));
  } finally {
    dom.cleanup();
  }
});
