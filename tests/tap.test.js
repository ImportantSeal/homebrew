import test from 'node:test';
import assert from 'node:assert/strict';

import { bindTap } from '../js/utils/tap.js';
import { installDom } from './domHarness.js';

function createTouch(identifier, clientX, clientY) {
  return { identifier, clientX, clientY };
}

test('bindTap ignores the synthetic click that follows a touch interaction', () => {
  const dom = installDom();

  try {
    const button = dom.document.createElement('button');
    dom.document.body.appendChild(button);

    let callCount = 0;
    bindTap(button, () => {
      callCount += 1;
    });

    button.dispatchEvent({
      type: 'touchstart',
      bubbles: true,
      cancelable: true,
      changedTouches: [createTouch(7, 12, 20)]
    });

    button.dispatchEvent({
      type: 'touchend',
      bubbles: true,
      cancelable: true,
      changedTouches: [createTouch(7, 12, 20)]
    });

    button.dispatchEvent({
      type: 'click',
      bubbles: true,
      cancelable: true
    });

    assert.equal(callCount, 1);
  } finally {
    dom.cleanup();
  }
});

test('bindTap resets touch tracking when a touch ends without changedTouches', () => {
  const dom = installDom();

  try {
    const button = dom.document.createElement('button');
    dom.document.body.appendChild(button);

    let callCount = 0;
    bindTap(button, () => {
      callCount += 1;
    });

    button.dispatchEvent({
      type: 'touchstart',
      bubbles: true,
      cancelable: true,
      changedTouches: [createTouch(1, 4, 5)]
    });

    button.dispatchEvent({
      type: 'touchend',
      bubbles: true,
      cancelable: true
    });

    button.dispatchEvent({
      type: 'touchstart',
      bubbles: true,
      cancelable: true,
      changedTouches: [createTouch(2, 4, 5)]
    });

    button.dispatchEvent({
      type: 'touchend',
      bubbles: true,
      cancelable: true,
      changedTouches: [createTouch(2, 4, 5)]
    });

    assert.equal(callCount, 1);
  } finally {
    dom.cleanup();
  }
});
