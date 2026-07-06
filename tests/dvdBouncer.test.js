import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function setMatchMedia(window, matchesByQuery = {}) {
  window.matchMedia = (query) => ({
    matches: Boolean(matchesByQuery[String(query)]),
    media: String(query || ''),
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  });
}

test('DVD bouncer is available on pointer/hover desktop environments', async () => {
  const dom = installDom();

  try {
    setMatchMedia(dom.window, {
      '(pointer: fine)': true,
      '(hover: hover)': true
    });
    dom.window.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    const { isDvdBouncerAvailable } = await importFresh('../js/ui/dvdBouncer.js', import.meta.url);

    assert.equal(isDvdBouncerAvailable(), true);
  } finally {
    dom.cleanup();
  }
});

test('DVD bouncer is unavailable on mobile touch environments', async () => {
  const dom = installDom();

  try {
    setMatchMedia(dom.window, {
      '(pointer: coarse)': true,
      '(hover: none)': true
    });
    dom.window.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148';
    dom.window.navigator.maxTouchPoints = 5;

    const { createDvdBouncer, isDvdBouncerAvailable } = await importFresh('../js/ui/dvdBouncer.js', import.meta.url);
    const container = dom.document.createElement('div');
    container.id = 'game-container';
    dom.document.body.appendChild(container);

    createDvdBouncer({ containerId: 'game-container' }).start();

    assert.equal(isDvdBouncerAvailable(), false);
    assert.equal(container.querySelector('.dvd-bouncer'), null);
  } finally {
    dom.cleanup();
  }
});
