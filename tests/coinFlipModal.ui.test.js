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

  const historyContainer = document.createElement('div');
  historyContainer.id = 'card-history';
  historySection.appendChild(historyContainer);
  document.body.appendChild(historySection);
}

function buildCoinFlipModalDom(document) {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'coin-flip-toggle';
  toggleBtn.setAttribute('aria-expanded', 'false');

  const modal = document.createElement('div');
  modal.id = 'coin-flip-modal';
  modal.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'modal__panel';

  const backBtn = document.createElement('button');
  backBtn.setAttribute('data-back-menu', '');

  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('data-close-coin-flip', '');

  const shadow = document.createElement('div');
  shadow.id = 'coin-flip-shadow';

  const coin = document.createElement('div');
  coin.id = 'coin-flip-coin';

  const edge = document.createElement('div');
  edge.id = 'coin-flip-edge';
  coin.appendChild(edge);

  const flipBtn = document.createElement('button');
  flipBtn.id = 'coin-flip-button';

  const resultEl = document.createElement('div');
  resultEl.id = 'coin-flip-result';

  append(panel, backBtn, closeBtn, shadow, coin, flipBtn, resultEl);
  modal.appendChild(panel);
  append(document.body, toggleBtn, modal);

  return { toggleBtn, modal, panel, closeBtn, edge, coin, flipBtn, resultEl };
}

function createRng(values) {
  const queue = [...values];
  return {
    nextFloat() {
      return queue.length ? queue.shift() : 0;
    }
  };
}

function createState(rngValues = [0]) {
  return {
    players: [{ name: 'Alice' }],
    currentPlayerIndex: 0,
    cardHistory: [],
    historyEntryCount: 0,
    rng: createRng(rngValues)
  };
}

test('coin flip modal opens and closes with aria and scroll lock state', async () => {
  const dom = installDom();

  try {
    const { initCoinFlipModal } = await importFresh('../js/ui/coinFlipModal.js', import.meta.url);
    buildHistoryDom(dom.document);
    const refs = buildCoinFlipModalDom(dom.document);
    const state = createState();

    initCoinFlipModal({ state });

    dom.click(refs.toggleBtn);

    assert.equal(refs.modal.classList.contains('is-open'), true);
    assert.equal(refs.modal.getAttribute('aria-hidden'), 'false');
    assert.equal(refs.toggleBtn.getAttribute('aria-expanded'), 'true');
    assert.equal(dom.document.body.classList.contains('modal-open'), true);
    assert.equal(dom.document.activeElement, refs.panel);
    assert.equal(refs.edge.childElementCount, 36);

    dom.keydown(dom.document, 'Escape');

    assert.equal(refs.modal.classList.contains('is-open'), false);
    assert.equal(refs.modal.getAttribute('aria-hidden'), 'true');
    assert.equal(refs.toggleBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(dom.document.body.classList.contains('modal-open'), false);
    assert.equal(dom.document.activeElement, refs.toggleBtn);
  } finally {
    dom.cleanup();
  }
});

test('coin flip uses RNG result, lands on the matching side, and logs history', async () => {
  const dom = installDom();

  try {
    dom.window.matchMedia = (query) => ({
      matches: String(query).includes('prefers-reduced-motion'),
      media: String(query || ''),
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    });
    dom.window.crypto = {
      getRandomValues(values) {
        values[0] = 0x80000000;
        return values;
      }
    };

    const { initCoinFlipModal } = await importFresh('../js/ui/coinFlipModal.js', import.meta.url);
    buildHistoryDom(dom.document);
    const refs = buildCoinFlipModalDom(dom.document);
    const state = createState([0.75]);

    initCoinFlipModal({ state });
    dom.click(refs.toggleBtn);
    dom.click(refs.flipBtn);
    await dom.flush(2);

    assert.equal(refs.flipBtn.disabled, false);
    assert.equal(refs.resultEl.textContent, 'Tails');
    assert.equal(refs.coin.dataset.result, 'tails');
    assert.match(refs.coin.style.transform, /rotateY\(180deg\)/);
    assert.equal(state.cardHistory.length, 1);
    assert.match(getLastHistoryEntry(), /Coin Flip: Alice flipped Tails/);
  } finally {
    dom.cleanup();
  }
});
