import test from 'node:test';
import assert from 'node:assert/strict';

import { importFresh, installDom } from './domHarness.js';

function append(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function buildTimerModalDom(document) {
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'timer-toggle';
  toggleBtn.setAttribute('aria-expanded', 'false');

  const modal = document.createElement('div');
  modal.id = 'timer-modal';
  modal.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'modal__panel';

  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('data-close-timer', '');

  const stopwatchMode = document.createElement('button');
  stopwatchMode.setAttribute('data-timer-mode', 'stopwatch');
  stopwatchMode.setAttribute('aria-pressed', 'true');

  const timerMode = document.createElement('button');
  timerMode.setAttribute('data-timer-mode', 'timer');
  timerMode.setAttribute('aria-pressed', 'false');

  const display = document.createElement('div');
  display.id = 'timer-display';

  const status = document.createElement('div');
  status.id = 'timer-status';

  const durationPanel = document.createElement('div');
  durationPanel.setAttribute('data-timer-duration-panel', '');
  durationPanel.hidden = true;

  const minutesInput = document.createElement('input');
  minutesInput.id = 'timer-minutes';
  minutesInput.value = '1';

  const secondsInput = document.createElement('input');
  secondsInput.id = 'timer-seconds';
  secondsInput.value = '0';

  append(durationPanel, minutesInput, secondsInput);

  const presetButton = document.createElement('button');
  presetButton.setAttribute('data-timer-duration', '30');

  const startBtn = document.createElement('button');
  startBtn.id = 'timer-start';

  const resetBtn = document.createElement('button');
  resetBtn.id = 'timer-reset';

  append(
    panel,
    closeBtn,
    stopwatchMode,
    timerMode,
    display,
    status,
    durationPanel,
    presetButton,
    startBtn,
    resetBtn
  );
  modal.appendChild(panel);
  append(document.body, toggleBtn, modal);

  return {
    toggleBtn,
    modal,
    panel,
    closeBtn,
    stopwatchMode,
    timerMode,
    display,
    status,
    durationPanel,
    minutesInput,
    secondsInput,
    presetButton,
    startBtn,
    resetBtn
  };
}

test('timer modal opens and closes while maintaining aria and scroll lock state', async () => {
  const dom = installDom();

  try {
    const { initTimerModal } = await importFresh('../js/ui/timerModal.js', import.meta.url);
    const refs = buildTimerModalDom(dom.document);

    initTimerModal();

    refs.toggleBtn.focus();
    dom.click(refs.toggleBtn);
    await dom.flush();

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
  } finally {
    dom.cleanup();
  }
});

test('timer modal supports stopwatch and countdown modes', async () => {
  const dom = installDom();
  const originalNow = Date.now;
  let fakeNow = 100000;

  try {
    Date.now = () => fakeNow;

    const { initTimerModal } = await importFresh('../js/ui/timerModal.js', import.meta.url);
    const refs = buildTimerModalDom(dom.document);

    initTimerModal();
    dom.click(refs.toggleBtn);
    await dom.flush();

    assert.equal(refs.display.textContent, '00:00:00');
    assert.equal(refs.status.textContent, 'Ready');

    dom.click(refs.startBtn);
    fakeNow += 65432;
    dom.click(refs.startBtn);

    assert.equal(refs.display.textContent, '01:05:43');
    assert.equal(refs.status.textContent, 'Paused');
    assert.equal(refs.startBtn.textContent, 'Start');

    dom.click(refs.resetBtn);
    assert.equal(refs.display.textContent, '00:00:00');

    dom.click(refs.timerMode);
    assert.equal(refs.timerMode.getAttribute('aria-pressed'), 'true');
    assert.equal(refs.stopwatchMode.getAttribute('aria-pressed'), 'false');
    assert.equal(refs.durationPanel.hidden, false);

    refs.minutesInput.value = '0';
    refs.secondsInput.value = '3';
    dom.click(refs.startBtn);
    fakeNow += 3100;
    dom.click(refs.startBtn);

    assert.equal(refs.display.textContent, '00:00:00');
    assert.equal(refs.status.textContent, 'Done');
    assert.equal(refs.modal.classList.contains('is-complete'), true);

    dom.click(refs.presetButton);
    assert.equal(refs.minutesInput.value, '0');
    assert.equal(refs.secondsInput.value, '30');
    assert.equal(refs.display.textContent, '00:30:00');
    assert.equal(refs.status.textContent, 'Ready');

    dom.click(refs.resetBtn);
  } finally {
    Date.now = originalNow;
    dom.cleanup();
  }
});
