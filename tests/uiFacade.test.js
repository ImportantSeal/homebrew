import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function buildPenaltyDrawIndicator(document) {
  const indicator = document.createElement('div');
  indicator.id = 'penalty-draw-indicator';
  indicator.className = 'penalty-draw-indicator';
  indicator.hidden = true;

  const meta = document.createElement('span');
  meta.className = 'penalty-draw-indicator__meta';

  const name = document.createElement('strong');
  name.className = 'penalty-draw-indicator__name';

  indicator.append(meta, name);
  document.body.appendChild(indicator);

  return { indicator, meta, name };
}

function buildNextActionNotification(document) {
  const notification = document.createElement('div');
  notification.id = 'next-action-notification';
  notification.className = 'next-action-notification';
  notification.hidden = true;

  const meta = document.createElement('span');
  meta.className = 'next-action-notification__meta';

  const message = document.createElement('strong');
  message.className = 'next-action-notification__message';

  notification.append(meta, message);
  document.body.appendChild(notification);

  return { notification, meta, message };
}

test('penalty draw indicator shows the active group penalty player and hides cleanly', async () => {
  const dom = installDom();

  try {
    const refs = buildPenaltyDrawIndicator(dom.document);
    const { setPenaltyDrawIndicator } = await importFresh('../js/ui/uiFacade.js', import.meta.url);

    setPenaltyDrawIndicator({
      name: 'B',
      color: '#68ABEE',
      position: 2,
      total: 3
    });

    assert.equal(refs.indicator.hidden, false);
    assert.equal(refs.meta.textContent, 'Penalty 2/3');
    assert.equal(refs.name.textContent, 'B draws now');
    assert.equal(refs.indicator.getAttribute('aria-label'), 'B draws penalty card now. Penalty 2 of 3.');
    assert.equal(refs.indicator.style.getPropertyValue('--player-color'), '#68ABEE');

    setPenaltyDrawIndicator(null);

    assert.equal(refs.indicator.hidden, true);
    assert.equal(refs.indicator.getAttribute('aria-label'), null);
    assert.equal(refs.indicator.style.getPropertyValue('--player-color'), '');
  } finally {
    dom.cleanup();
  }
});

test('next action notification shows a flow prompt and hides cleanly', async () => {
  const dom = installDom();

  try {
    const refs = buildNextActionNotification(dom.document);
    const { setNextActionNotification } = await importFresh('../js/ui/uiFacade.js', import.meta.url);

    setNextActionNotification({
      meta: 'Penalty 2/3',
      message: "Click the Penalty Deck to roll B's penalty card.",
      variant: 'penalty'
    });

    assert.equal(refs.notification.hidden, false);
    assert.equal(refs.notification.dataset.variant, 'penalty');
    assert.equal(refs.meta.textContent, 'Penalty 2/3');
    assert.equal(refs.message.textContent, "Click the Penalty Deck to roll B's penalty card.");
    assert.equal(
      refs.notification.getAttribute('aria-label'),
      "Penalty 2/3: Click the Penalty Deck to roll B's penalty card."
    );

    setNextActionNotification(null);

    assert.equal(refs.notification.hidden, true);
    assert.equal(refs.notification.getAttribute('aria-label'), null);
    assert.equal(refs.notification.dataset.variant, undefined);
  } finally {
    dom.cleanup();
  }
});
