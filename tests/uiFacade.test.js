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
