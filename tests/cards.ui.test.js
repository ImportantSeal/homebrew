import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function buildCard(document, id, index) {
  const card = document.createElement('div');
  card.id = id;
  card.className = 'card';
  card.dataset.index = String(index);
  card.setAttribute('tabindex', '0');

  const inner = document.createElement('div');
  inner.className = 'card__inner';

  const back = document.createElement('div');
  back.className = 'card__face card__back';

  const front = document.createElement('div');
  front.className = 'card__face card__front';

  inner.append(back, front);
  card.appendChild(inner);
  document.body.appendChild(card);

  return card;
}

function buildPenaltyDeck(document) {
  const deck = document.createElement('button');
  deck.id = 'penalty-deck';
  deck.className = 'penalty-deck';

  const inner = document.createElement('div');
  inner.className = 'card__inner';

  const back = document.createElement('div');
  back.className = 'card__face card__back';

  const front = document.createElement('div');
  front.className = 'card__face card__front';

  inner.append(back, front);
  deck.appendChild(inner);
  document.body.appendChild(deck);

  return deck;
}

function listenerCount(element, type) {
  return element._listeners?.get(type)?.length || 0;
}

test('cards init binds selection handlers once and renderCards avoids forced reflow', async () => {
  const dom = installDom();

  try {
    const card0 = buildCard(dom.document, 'card0', 0);
    const card1 = buildCard(dom.document, 'card1', 1);
    const card2 = buildCard(dom.document, 'card2', 2);
    buildPenaltyDeck(dom.document);

    let offsetWidthReads = 0;
    Object.defineProperty(card0, 'offsetWidth', {
      configurable: true,
      get() {
        offsetWidthReads += 1;
        return 160;
      }
    });

    const { initCards, renderCards } = await importFresh('../js/ui/cards.js', import.meta.url);

    const firstSelections = [];
    initCards((index) => firstSelections.push(index));

    const clickCount = listenerCount(card0, 'click');
    const keydownCount = listenerCount(card0, 'keydown');
    const pointerEnterCount = listenerCount(card0, 'pointerenter');
    const deckPointerEnterCount = listenerCount(dom.document.getElementById('penalty-deck'), 'pointerenter');

    const secondSelections = [];
    initCards((index) => secondSelections.push(index));

    assert.equal(listenerCount(card0, 'click'), clickCount);
    assert.equal(listenerCount(card0, 'keydown'), keydownCount);
    assert.equal(listenerCount(card0, 'pointerenter'), pointerEnterCount);
    assert.equal(listenerCount(dom.document.getElementById('penalty-deck'), 'pointerenter'), deckPointerEnterCount);

    renderCards({
      currentCards: ['Drink 1', 'Give 2', 'Drink 1, Give 1'],
      revealed: [false, false, false],
      itemCards: []
    });

    renderCards({
      currentCards: ['Give 1', 'Drink 2', 'Drink 1, Give 1'],
      revealed: [true, true, true],
      itemCards: []
    });

    await dom.flush(6);

    assert.equal(offsetWidthReads, 0);
    assert.equal(listenerCount(card0, 'click'), clickCount);
    assert.equal(listenerCount(card0, 'keydown'), keydownCount);
    assert.equal(listenerCount(card0, 'pointerenter'), pointerEnterCount);
    assert.equal(listenerCount(dom.document.getElementById('penalty-deck'), 'pointerenter'), deckPointerEnterCount);

    dom.click(card2);
    dom.keydown(card1, 'Enter');
    dom.keydown(card0, ' ');

    assert.deepEqual(firstSelections, []);
    assert.deepEqual(secondSelections, [2, 1, 0]);
    assert.equal(card0.dataset.kind, 'give');
    assert.equal(card1.dataset.kind, 'drink');
    assert.equal(card2.dataset.kind, 'mix');
    assert.equal(card0.classList.contains('show-front'), true);
    assert.equal(card0.querySelector('.card-front-text')?.textContent, 'Give 1');
  } finally {
    dom.cleanup();
  }
});

test('renderCards cancels pending impact flashes before reusing card elements', async () => {
  const dom = installDom();

  try {
    const card0 = buildCard(dom.document, 'card0', 0);
    const card1 = buildCard(dom.document, 'card1', 1);
    const card2 = buildCard(dom.document, 'card2', 2);
    buildPenaltyDeck(dom.document);

    const { flashElement } = await importFresh('../js/animations.js', import.meta.url);
    const { renderCards } = await importFresh('../js/ui/cards.js', import.meta.url);

    flashElement(card2);

    renderCards({
      currentCards: [
        'Drink 1',
        'Give 1',
        { name: 'Crowd Challenge', subcategories: ['Everyone gives 1'] }
      ],
      revealed: [true, true, true],
      itemCards: []
    });

    await dom.flush(6);

    assert.equal(card0.classList.contains('card-impact-flash'), false);
    assert.equal(card1.classList.contains('card-impact-flash'), false);
    assert.equal(card2.classList.contains('card-impact-flash'), false);
    assert.equal(card2.querySelector('.card-impact-burst'), null);
    assert.equal(card2.dataset.kind, 'crowd');
  } finally {
    dom.cleanup();
  }
});
