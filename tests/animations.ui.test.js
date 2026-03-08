import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function buildCard(document) {
  const card = document.createElement('div');
  card.className = 'card';

  const inner = document.createElement('div');
  inner.className = 'card__inner';

  const back = document.createElement('div');
  back.className = 'card__face card__back';

  const front = document.createElement('div');
  front.className = 'card__face card__front';

  inner.append(back, front);
  card.appendChild(inner);
  document.body.appendChild(card);

  return { card, front };
}

test('flipCardAnimation renders card text without an extra open button', async () => {
  const dom = installDom();

  try {
    const { flipCardAnimation } = await importFresh('../js/animations.js', import.meta.url);
    const { card, front } = buildCard(dom.document);
    const longName = 'This is a deliberately long card title that used to get an Open button';

    flipCardAnimation(card, longName);
    await dom.flush();

    assert.equal(card.classList.contains('show-front'), true);
    assert.equal(front.querySelector('.card-front-text')?.textContent, longName);
    assert.equal(front.querySelector('.card-open-detail'), null);
  } finally {
    dom.cleanup();
  }
});
