import test from 'node:test';
import assert from 'node:assert/strict';

import { getLastHistoryEntry } from '../js/cardHistory.js';
import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function buildHistoryDom(document) {
  const historySection = document.createElement('section');
  historySection.className = 'history-section';
  historySection.scrollHeight = 320;

  const historyContainer = document.createElement('div');
  historyContainer.id = 'card-history';
  historySection.appendChild(historyContainer);
  document.body.appendChild(historySection);

  return { historySection, historyContainer };
}

function buildDiceModalDom(document) {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'dice-toggle';
  toggleBtn.setAttribute('aria-expanded', 'false');

  const modal = document.createElement('div');
  modal.id = 'dice-modal';
  modal.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'modal__panel';

  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('data-close', '');

  const sidesSelect = document.createElement('select');
  sidesSelect.id = 'dice-sides';
  sidesSelect.value = '20';

  const qtyInput = document.createElement('input');
  qtyInput.id = 'dice-qty';
  qtyInput.value = '1';

  const modInput = document.createElement('input');
  modInput.id = 'dice-mod';
  modInput.value = '0';

  const rollBtn = document.createElement('button');
  rollBtn.id = 'dice-roll';

  const resultEl = document.createElement('div');
  resultEl.id = 'dice-result';
  resultEl.textContent = '-';

  const tray = document.createElement('div');
  tray.id = 'dice-box';
  tray.setBoundingClientRect({ width: 200, height: 200 });

  const quickBtn = document.createElement('button');
  quickBtn.className = 'dice-chip';
  quickBtn.setAttribute('data-sides', '6');
  quickBtn.setAttribute('data-qty', '2');

  append(panel, closeBtn, sidesSelect, qtyInput, modInput, rollBtn, resultEl, tray, quickBtn);
  modal.appendChild(panel);
  append(document.body, toggleBtn, modal);

  return { toggleBtn, modal, panel, closeBtn, sidesSelect, qtyInput, modInput, rollBtn, resultEl, quickBtn };
}

function createRng(values) {
  const queue = [...values];
  return {
    nextFloat() {
      return queue.length ? queue.shift() : 0;
    }
  };
}

function createState() {
  return {
    players: [{ name: 'Alice' }, { name: 'Bob' }],
    currentPlayerIndex: 0,
    cardHistory: [],
    historyEntryCount: 0,
    rng: createRng([0.0, 0.5, 0.25, 0.75])
  };
}

test('dice modal opens and closes while maintaining aria and scroll lock state', async () => {
  const dom = installDom();
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  try {
    console.error = () => {};
    console.warn = () => {};
    const { initDiceModal } = await importFresh('../js/ui/diceModal.js', import.meta.url);
    buildHistoryDom(dom.document);
    const refs = buildDiceModalDom(dom.document);
    const state = createState();

    initDiceModal({ state });

    dom.click(refs.toggleBtn);
    await dom.flush(6);

    assert.equal(refs.modal.classList.contains('is-open'), true);
    assert.equal(refs.modal.getAttribute('aria-hidden'), 'false');
    assert.equal(refs.toggleBtn.getAttribute('aria-expanded'), 'true');
    assert.equal(dom.document.body.classList.contains('modal-open'), true);
    assert.equal(dom.document.activeElement, refs.panel);

    dom.keydown(dom.document, 'Escape');

    assert.equal(refs.modal.classList.contains('is-open'), false);
    assert.equal(refs.modal.getAttribute('aria-hidden'), 'true');
    assert.equal(refs.toggleBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(dom.document.body.classList.contains('modal-open'), false);
    assert.equal(dom.document.activeElement, refs.toggleBtn);
    assert.equal(refs.resultEl.textContent, '-');
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    dom.cleanup();
  }
});

test('dice modal quick roll falls back to RNG, syncs UI fields, and logs history', async () => {
  const dom = installDom();
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  try {
    console.error = () => {};
    console.warn = () => {};
    const { initDiceModal } = await importFresh('../js/ui/diceModal.js', import.meta.url);
    buildHistoryDom(dom.document);
    const refs = buildDiceModalDom(dom.document);
    const state = createState();

    initDiceModal({ state });
    dom.click(refs.toggleBtn);
    await dom.flush(6);

    refs.modInput.value = '2';
    dom.click(refs.quickBtn);
    await dom.flush(10);

    assert.equal(refs.sidesSelect.value, '6');
    assert.equal(refs.qtyInput.value, '2');
    assert.equal(refs.modInput.value, '2');
    assert.equal(refs.rollBtn.disabled, false);
    assert.match(refs.resultEl.textContent, /2d6\+2 -> 7/);
    assert.ok(refs.resultEl.textContent.includes('[fallback]'));
    assert.equal(state.cardHistory.length, 1);
    assert.match(getLastHistoryEntry(), /Dice: Alice rolled 2d6\+2: 7/);
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    dom.cleanup();
  }
});
