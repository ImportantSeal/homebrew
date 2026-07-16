import { addHistoryEntry } from '../cardHistory.js';
import { bindTap } from '../utils/tap.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { openGameMenu } from './settingsMenu.js';

const IDS = {
  toggle: 'coin-flip-toggle',
  modal: 'coin-flip-modal',
  coin: 'coin-flip-coin',
  edge: 'coin-flip-edge',
  shadow: 'coin-flip-shadow',
  flip: 'coin-flip-button',
  result: 'coin-flip-result',
  panel: '.modal__panel'
};

const RESULTS = {
  heads: { label: 'Heads', finalY: 0 },
  tails: { label: 'Tails', finalY: 180 }
};

const EDGE_SLICE_COUNT = 36;
const FLIP_DURATION_MS = 2900;
const FLIP_PEAK_LIFT_PX = 132;
const UINT32_HALF_RANGE = 0x80000000;

let initialized = false;
let returnFocusEl = null;
let isFlipping = false;
let flipToken = 0;
let restingResult = 'heads';

function refs() {
  const modal = document.getElementById(IDS.modal);
  return {
    toggleBtn: document.getElementById(IDS.toggle),
    modal,
    panel: modal?.querySelector(IDS.panel) || null,
    backBtn: modal?.querySelector('[data-back-menu]') || null,
    coin: document.getElementById(IDS.coin),
    edge: document.getElementById(IDS.edge),
    shadow: document.getElementById(IDS.shadow),
    flipBtn: document.getElementById(IDS.flip),
    result: document.getElementById(IDS.result)
  };
}

function isModalOpen(modal) {
  return Boolean(modal?.classList.contains('is-open'));
}

function resolveReturnFocus(toggleBtn) {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    return active;
  }
  return toggleBtn;
}

function currentPlayerName(state) {
  const player = state?.players?.[state?.currentPlayerIndex];
  return player?.name || 'Someone';
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function clampUnitFloat(next) {
  if (!Number.isFinite(next)) return 0;
  return Math.min(Math.max(next, 0), 1 - Number.EPSILON);
}

function cryptoSource() {
  const cryptoSource = typeof window !== 'undefined' ? window.crypto : null;
  if (!cryptoSource || typeof cryptoSource.getRandomValues !== 'function') return null;
  return cryptoSource;
}

function cryptoNextFloat() {
  const source = cryptoSource();
  if (!source) return null;
  if (typeof Uint32Array === 'undefined') return null;

  const values = new Uint32Array(1);
  source.getRandomValues(values);
  return values[0] / 0x100000000;
}

function cryptoRandomUint32() {
  const source = cryptoSource();
  if (!source) return null;
  if (typeof Uint32Array === 'undefined') return null;

  const values = new Uint32Array(1);
  source.getRandomValues(values);
  return values[0];
}

function randomFloat() {
  const cryptoValue = cryptoNextFloat();
  return cryptoValue === null ? Math.random() : clampUnitFloat(cryptoValue);
}

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function pickResult() {
  const roll = cryptoRandomUint32();
  if (roll === null) return Math.random() < 0.5 ? 'heads' : 'tails';
  return roll < UINT32_HALF_RANGE ? 'heads' : 'tails';
}

function setResult(text) {
  const { result } = refs();
  if (result) result.textContent = text;
}

function setFlipping(flipping) {
  isFlipping = Boolean(flipping);
  const { flipBtn } = refs();
  if (flipBtn) flipBtn.disabled = isFlipping;
}

function buildCoinEdge() {
  const { edge } = refs();
  if (!edge || edge.childElementCount > 0) return;

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < EDGE_SLICE_COUNT; index += 1) {
    const slice = document.createElement('span');
    slice.style.setProperty('--coin-edge-angle', `${(360 / EDGE_SLICE_COUNT) * index}deg`);
    fragment.appendChild(slice);
  }
  edge.appendChild(fragment);
}

function setShadowPose(liftRatio) {
  const { shadow } = refs();
  if (!shadow) return;

  const safeLift = Math.min(1, Math.max(0, liftRatio));
  shadow.style.setProperty('--coin-shadow-scale', String(1 + safeLift * 0.42));
  shadow.style.setProperty('--coin-shadow-opacity', String(0.5 - safeLift * 0.26));
}

function applyFinalPose(resultKey) {
  const { coin } = refs();
  const result = RESULTS[resultKey] || RESULTS.heads;

  restingResult = resultKey in RESULTS ? resultKey : 'heads';
  if (coin) {
    delete coin.dataset.flipping;
    coin.dataset.result = restingResult;
    coin.style.transform = `translate3d(0, 0, 0) rotateX(0deg) rotateY(${result.finalY}deg) rotateZ(0deg)`;
  }
  setShadowPose(0);
}

function animateCoin(resultKey, state, token) {
  const { coin, modal } = refs();
  if (!coin) return Promise.resolve(true);

  const result = RESULTS[resultKey] || RESULTS.heads;
  coin.dataset.flipping = 'true';

  if (prefersReducedMotion()) {
    applyFinalPose(resultKey);
    return Promise.resolve(true);
  }

  const xTurns = 6 + Math.floor(randomFloat() * 3);
  const yTurns = 5 + Math.floor(randomFloat() * 3);
  const zTurns = 1 + Math.floor(randomFloat() * 2);
  const finalX = xTurns * 360;
  const finalY = (yTurns * 360) + result.finalY;
  const finalZ = zTurns * 360;
  const startedAt = performance.now();

  return new Promise((resolve) => {
    function frame(now) {
      if (token !== flipToken || !isModalOpen(modal)) {
        delete coin.dataset.flipping;
        resolve(false);
        return;
      }

      const elapsed = Math.max(0, now - startedAt);
      const t = Math.min(1, elapsed / FLIP_DURATION_MS);
      const eased = easeOutQuint(t);
      const liftRatio = Math.sin(Math.PI * t);
      const lift = -FLIP_PEAK_LIFT_PX * liftRatio;
      const wobble = Math.sin(t * Math.PI * 7) * (1 - t) * 12;
      const bank = Math.sin(t * Math.PI * 3.5) * (1 - t) * 16;

      coin.style.transform = [
        `translate3d(0, ${lift.toFixed(2)}px, 0)`,
        `rotateX(${(finalX * eased + wobble).toFixed(2)}deg)`,
        `rotateY(${(finalY * eased).toFixed(2)}deg)`,
        `rotateZ(${(finalZ * eased + bank).toFixed(2)}deg)`
      ].join(' ');
      setShadowPose(liftRatio);

      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }

      applyFinalPose(resultKey);
      resolve(true);
    }

    requestAnimationFrame(frame);
  });
}

function openModal() {
  const { modal, panel, toggleBtn } = refs();
  if (!modal || !toggleBtn || isModalOpen(modal)) return;

  returnFocusEl = resolveReturnFocus(toggleBtn);
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  toggleBtn.setAttribute('aria-expanded', 'true');
  lockModalScroll();
  buildCoinEdge();
  applyFinalPose(restingResult);
  setResult('Ready');
  setFlipping(false);
  panel?.focus?.();
}

function closeModal(restoreFocus = true) {
  const { modal, toggleBtn } = refs();
  if (!modal || !isModalOpen(modal)) return;

  flipToken += 1;
  const { coin } = refs();
  if (coin) delete coin.dataset.flipping;
  setFlipping(false);
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  toggleBtn?.setAttribute('aria-expanded', 'false');
  unlockModalScroll();

  if (restoreFocus) {
    (returnFocusEl || toggleBtn)?.focus?.();
  }
  returnFocusEl = null;
}

async function flip(state) {
  const { modal } = refs();
  if (!isModalOpen(modal) || isFlipping) return;

  const localToken = ++flipToken;
  const resultKey = pickResult();
  const label = RESULTS[resultKey].label;

  setFlipping(true);
  setResult('Flipping...');

  const completed = await animateCoin(resultKey, state, localToken);
  if (!completed || localToken !== flipToken || !isModalOpen(refs().modal)) return;

  setFlipping(false);
  setResult(label);
  addHistoryEntry(state, `Coin Flip: ${currentPlayerName(state)} flipped ${label}`);
}

export function initCoinFlipModal({ state } = {}) {
  if (!state || typeof state !== 'object') return;
  if (initialized) return;

  const { modal, toggleBtn, backBtn, flipBtn } = refs();
  if (!modal || !toggleBtn) return;

  buildCoinEdge();
  applyFinalPose(restingResult);
  setResult('Ready');

  bindTap(toggleBtn, () => {
    if (isModalOpen(modal)) closeModal(true);
    else openModal();
  });

  bindTap(backBtn, () => {
    closeModal(false);
    openGameMenu();
  });

  bindTap(flipBtn, () => {
    flip(state);
  });

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('[data-close-coin-flip]')) {
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
