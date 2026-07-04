import { bindTap } from '../utils/tap.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { openGameMenu } from './settingsMenu.js';

const IDS = {
  toggle: 'timer-toggle',
  modal: 'timer-modal',
  display: 'timer-display',
  status: 'timer-status',
  start: 'timer-start',
  reset: 'timer-reset',
  minutes: 'timer-minutes',
  seconds: 'timer-seconds',
  panel: '.modal__panel'
};

const MODES = {
  stopwatch: 'stopwatch',
  timer: 'timer'
};

const TIMER_TICK_MS = 50;
const MIN_TIMER_SECONDS = 1;
const MAX_TIMER_SECONDS = (599 * 60) + 59;

let initialized = false;
let returnFocusEl = null;
let mode = MODES.stopwatch;
let intervalId = null;
let running = false;
let startedAt = 0;
let stopwatchElapsedMs = 0;
let countdownDurationMs = 60 * 1000;
let countdownStartedRemainingMs = countdownDurationMs;
let countdownRemainingMs = countdownDurationMs;

function refs() {
  const modal = document.getElementById(IDS.modal);
  return {
    toggleBtn: document.getElementById(IDS.toggle),
    modal,
    panel: modal?.querySelector(IDS.panel) || null,
    backBtn: modal?.querySelector('[data-back-menu]') || null,
    display: document.getElementById(IDS.display),
    status: document.getElementById(IDS.status),
    startBtn: document.getElementById(IDS.start),
    resetBtn: document.getElementById(IDS.reset),
    minutesInput: document.getElementById(IDS.minutes),
    secondsInput: document.getElementById(IDS.seconds),
    modeButtons: Array.from(document.querySelectorAll('[data-timer-mode]')),
    durationPanels: Array.from(document.querySelectorAll('[data-timer-duration-panel]')),
    presetButtons: Array.from(document.querySelectorAll('[data-timer-duration]'))
  };
}

function now() {
  return Date.now();
}

function isModalOpen(modal) {
  return Boolean(modal?.classList.contains('is-open'));
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatClock(ms, { ceil = false } = {}) {
  const normalized = Math.max(0, Number.isFinite(ms) ? ms : 0);
  const totalCentiseconds = ceil ? Math.ceil(normalized / 10) : Math.floor(normalized / 10);
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = totalCentiseconds % 100;
  return `${pad2(minutes)}:${pad2(seconds)}:${pad2(centiseconds)}`;
}

function setStatus(text) {
  const { status } = refs();
  if (status) status.textContent = text;
}

function setStartLabel(text) {
  const { startBtn } = refs();
  if (startBtn) startBtn.textContent = text;
}

function setCompleteState(complete) {
  const { modal } = refs();
  modal?.classList.toggle('is-complete', Boolean(complete));
}

function setDisplay(text) {
  const { display } = refs();
  if (display) display.textContent = text;
}

function readDurationMs({ commit = false } = {}) {
  const { minutesInput, secondsInput } = refs();
  const minutes = clampInt(minutesInput?.value, 0, 599, 1);
  const seconds = clampInt(secondsInput?.value, 0, 59, 0);
  let totalSeconds = (minutes * 60) + seconds;

  totalSeconds = Math.min(MAX_TIMER_SECONDS, Math.max(MIN_TIMER_SECONDS, totalSeconds));

  if (commit) {
    const finalMinutes = Math.floor(totalSeconds / 60);
    const finalSeconds = totalSeconds % 60;
    if (minutesInput) minutesInput.value = String(finalMinutes);
    if (secondsInput) secondsInput.value = String(finalSeconds);
  }

  return totalSeconds * 1000;
}

function syncDurationFromInputs() {
  countdownDurationMs = readDurationMs({ commit: true });
  countdownRemainingMs = countdownDurationMs;
  countdownStartedRemainingMs = countdownDurationMs;
}

function updateModeUI() {
  const { modeButtons, durationPanels } = refs();
  modeButtons.forEach((button) => {
    const pressed = button.dataset.timerMode === mode;
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  });

  durationPanels.forEach((panel) => {
    panel.hidden = mode !== MODES.timer;
  });
}

function currentElapsedMs() {
  if (!running || mode !== MODES.stopwatch) return stopwatchElapsedMs;
  return stopwatchElapsedMs + Math.max(0, now() - startedAt);
}

function currentRemainingMs() {
  if (!running || mode !== MODES.timer) return countdownRemainingMs;
  return Math.max(0, countdownStartedRemainingMs - Math.max(0, now() - startedAt));
}

function stopInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function render() {
  if (mode === MODES.timer) {
    const remaining = currentRemainingMs();
    setDisplay(formatClock(remaining, { ceil: true }));

    if (running && remaining <= 0) {
      countdownRemainingMs = 0;
      running = false;
      stopInterval();
      setStartLabel('Start');
      setStatus('Done');
      setCompleteState(true);
    } else {
      setCompleteState(remaining <= 0);
    }
    return;
  }

  setCompleteState(false);
  setDisplay(formatClock(currentElapsedMs()));
}

function startInterval() {
  stopInterval();
  intervalId = setInterval(render, TIMER_TICK_MS);
}

function startCurrentMode() {
  if (running) return;

  if (mode === MODES.timer) {
    if (countdownRemainingMs <= 0) {
      syncDurationFromInputs();
    }
    countdownStartedRemainingMs = countdownRemainingMs;
  }

  startedAt = now();
  running = true;
  setStartLabel('Pause');
  setStatus('Running');
  setCompleteState(false);
  render();
  startInterval();
}

function pauseCurrentMode() {
  if (!running) return;

  if (mode === MODES.timer) {
    countdownRemainingMs = currentRemainingMs();
  } else {
    stopwatchElapsedMs = currentElapsedMs();
  }

  running = false;
  stopInterval();
  render();
  setStartLabel('Start');

  if (mode === MODES.timer && countdownRemainingMs <= 0) {
    setStatus('Done');
    setCompleteState(true);
  } else {
    setStatus('Paused');
  }
}

function resetCurrentMode() {
  running = false;
  stopInterval();
  setStartLabel('Start');
  setStatus('Ready');
  setCompleteState(false);

  if (mode === MODES.timer) {
    syncDurationFromInputs();
  } else {
    stopwatchElapsedMs = 0;
  }

  render();
}

function setMode(nextMode) {
  if (!Object.values(MODES).includes(nextMode)) return;
  if (mode === nextMode) return;

  pauseCurrentMode();
  mode = nextMode;
  updateModeUI();
  setStatus(running ? 'Running' : 'Ready');
  setStartLabel(running ? 'Pause' : 'Start');
  render();
}

function setPresetDuration(totalSeconds) {
  const safeSeconds = clampInt(totalSeconds, MIN_TIMER_SECONDS, MAX_TIMER_SECONDS, 60);
  const { minutesInput, secondsInput } = refs();

  pauseCurrentMode();
  mode = MODES.timer;

  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (minutesInput) minutesInput.value = String(minutes);
  if (secondsInput) secondsInput.value = String(seconds);

  syncDurationFromInputs();
  updateModeUI();
  setStatus('Ready');
  setStartLabel('Start');
  render();
}

function openModal() {
  const { modal, panel, toggleBtn } = refs();
  if (!modal || !toggleBtn || isModalOpen(modal)) return;

  returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  toggleBtn.setAttribute('aria-expanded', 'true');
  lockModalScroll();
  updateModeUI();
  render();
  panel?.focus?.();
}

function closeModal(restoreFocus = true) {
  const { modal, toggleBtn } = refs();
  if (!modal || !isModalOpen(modal)) return;

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  toggleBtn?.setAttribute('aria-expanded', 'false');
  unlockModalScroll();

  if (restoreFocus) {
    (returnFocusEl || toggleBtn)?.focus?.();
  }
  returnFocusEl = null;
}

export function initTimerModal() {
  if (initialized) return;

  const { modal, toggleBtn, backBtn, startBtn, resetBtn, minutesInput, secondsInput } = refs();
  if (!modal || !toggleBtn) return;

  updateModeUI();
  setStatus('Ready');
  setStartLabel('Start');
  render();

  bindTap(toggleBtn, () => {
    if (isModalOpen(modal)) closeModal(true);
    else openModal();
  });

  bindTap(backBtn, () => {
    closeModal(false);
    openGameMenu();
  });

  bindTap(startBtn, () => {
    if (running) pauseCurrentMode();
    else {
      if (mode === MODES.timer && countdownRemainingMs === countdownDurationMs) {
        syncDurationFromInputs();
      }
      startCurrentMode();
    }
  });

  bindTap(resetBtn, () => {
    resetCurrentMode();
  });

  refs().modeButtons.forEach((button) => {
    bindTap(button, () => {
      setMode(button.dataset.timerMode);
    });
  });

  refs().presetButtons.forEach((button) => {
    bindTap(button, () => {
      setPresetDuration(button.dataset.timerDuration);
    });
  });

  [minutesInput, secondsInput].forEach((input) => {
    input?.addEventListener('change', () => {
      if (mode !== MODES.timer || running) return;
      syncDurationFromInputs();
      setStatus('Ready');
      render();
    });
  });

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('[data-close-timer]')) {
      closeModal(true);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isModalOpen(modal)) {
      closeModal(true);
    }
  });

  initialized = true;
}
