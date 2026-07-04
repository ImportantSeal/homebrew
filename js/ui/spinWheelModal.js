import { Wheel } from '../spin-wheel-esm.js';
import { addHistoryEntry } from '../cardHistory.js';
import { resolveRng } from '../utils/rng.js';
import { bindTap } from '../utils/tap.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { openGameMenu } from './settingsMenu.js';

const IDS = {
  toggle: 'spin-wheel-toggle',
  modal: 'spin-wheel-modal',
  box: 'spin-wheel-box',
  spin: 'spin-wheel-spin',
  result: 'spin-wheel-result',
  panel: '.modal__panel'
};

const SPIN_DURATION_MS = 3600;
const SPIN_REVOLUTIONS = 5;

const WHEEL_RESULTS = [
  { label: 'Water', backgroundColor: '#C7F9FF', labelColor: '#06121A' },
  { label: 'Drink 2', backgroundColor: '#FCA5A5', labelColor: '#1F0507' },
  { label: 'Drink 3', backgroundColor: '#F87171', labelColor: '#270407' },
  { label: 'Drink 4', backgroundColor: '#EF4444', labelColor: '#FFF6F6' },
  { label: 'Drink 5', backgroundColor: '#B91C1C', labelColor: '#FFF6F6' },
  { label: 'Shot', backgroundColor: '#450A0A', labelColor: '#FFE4E6' },
  { label: 'Everyone 2', backgroundColor: '#FEF3C7', labelColor: '#2A1703' },
  { label: 'Everyone 3', backgroundColor: '#F59E0B', labelColor: '#1F1203' },
  { label: 'Give 2', backgroundColor: '#DBF4FF', labelColor: '#062033' },
  { label: 'Give 3', backgroundColor: '#BAE6FD', labelColor: '#062033' },
  { label: 'Give 4', backgroundColor: '#7DD3FC', labelColor: '#062033' },
  { label: 'Give 5', backgroundColor: '#38BDF8', labelColor: '#041B2A' }
];

let initialized = false;
let returnFocusEl = null;
let wheel = null;
let isSpinning = false;
let pendingIndex = null;

function refs() {
  const modal = document.getElementById(IDS.modal);
  return {
    toggleBtn: document.getElementById(IDS.toggle),
    modal,
    panel: modal?.querySelector(IDS.panel) || null,
    backBtn: modal?.querySelector('[data-back-menu]') || null,
    box: document.getElementById(IDS.box),
    spinBtn: document.getElementById(IDS.spin),
    result: document.getElementById(IDS.result)
  };
}

function isModalOpen(modal) {
  return Boolean(modal?.classList.contains('is-open'));
}

function setResult(text) {
  const { result } = refs();
  if (result) result.textContent = text;
}

function setSpinning(spinning) {
  isSpinning = Boolean(spinning);
  const { spinBtn } = refs();
  if (spinBtn) spinBtn.disabled = isSpinning;
}

function randomIndex(length, rng) {
  if (!Number.isInteger(length) || length <= 0) return -1;
  const next = resolveRng(rng).nextFloat();
  const safeNext = Number.isFinite(next) ? Math.min(Math.max(next, 0), 1 - Number.EPSILON) : 0;
  return Math.floor(safeNext * length);
}

function getResultLabel(index) {
  return WHEEL_RESULTS[index]?.label || 'Unknown';
}

function createWheelProps(state) {
  return {
    items: WHEEL_RESULTS.map(({ label, backgroundColor, labelColor }) => ({
      label,
      backgroundColor,
      labelColor
    })),
    itemLabelFont: 'Montserrat, Plus Jakarta Sans, Arial, sans-serif',
    itemLabelFontSizeMax: 28,
    itemLabelRadius: 0.84,
    itemLabelRadiusMax: 0.34,
    itemLabelStrokeColor: 'rgba(255, 255, 255, 0.55)',
    itemLabelStrokeWidth: 1,
    lineColor: 'rgba(7, 10, 20, 0.58)',
    lineWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 2,
    radius: 0.94,
    isInteractive: false,
    pointerAngle: 0,
    onRest: (event) => {
      const resultIndex = Number.isInteger(pendingIndex) ? pendingIndex : event.currentIndex;
      const label = getResultLabel(resultIndex) || getResultLabel(event.currentIndex);
      pendingIndex = null;
      setSpinning(false);
      setResult(label);
      addHistoryEntry(state, `Spin Wheel: ${label}`);
    }
  };
}

function ensureWheel(state) {
  const { box } = refs();
  if (!box) return null;

  if (!wheel) {
    wheel = new Wheel(box, createWheelProps(state));
  }

  wheel.resize();
  return wheel;
}

function openModal(state) {
  const { modal, panel, toggleBtn } = refs();
  if (!modal || !toggleBtn || isModalOpen(modal)) return;

  returnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  toggleBtn.setAttribute('aria-expanded', 'true');
  lockModalScroll();
  setResult('Ready');
  setSpinning(false);
  ensureWheel(state);
  panel?.focus?.();
}

function closeModal(restoreFocus = true) {
  const { modal, toggleBtn } = refs();
  if (!modal || !isModalOpen(modal)) return;

  wheel?.stop?.();
  pendingIndex = null;
  setSpinning(false);
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  toggleBtn?.setAttribute('aria-expanded', 'false');
  unlockModalScroll();

  if (restoreFocus) {
    (returnFocusEl || toggleBtn)?.focus?.();
  }
  returnFocusEl = null;
}

function spin(state) {
  const activeWheel = ensureWheel(state);
  if (!activeWheel || isSpinning) return;

  const index = randomIndex(WHEEL_RESULTS.length, state?.rng);
  if (index < 0) return;

  pendingIndex = index;
  setSpinning(true);
  setResult('Spinning...');
  activeWheel.spinToItem(index, SPIN_DURATION_MS, true, SPIN_REVOLUTIONS, 1);
}

export function initSpinWheelModal({ state } = {}) {
  if (!state || typeof state !== 'object') return;
  if (initialized) return;

  const { modal, toggleBtn, backBtn, spinBtn } = refs();
  if (!modal || !toggleBtn) return;

  bindTap(toggleBtn, () => {
    if (isModalOpen(modal)) closeModal(true);
    else openModal(state);
  });

  bindTap(backBtn, () => {
    closeModal(false);
    openGameMenu();
  });

  bindTap(spinBtn, () => {
    spin(state);
  });

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('[data-close-spin-wheel]')) {
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
