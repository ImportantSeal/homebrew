import { flipCardAnimation } from '../animations.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';
import { bindTap } from '../utils/tap.js';

const CARD_TILT_MAX_DEG = 4;
let cardMotionState = null;

function isActivationKey(event) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

function getCardMotionState() {
  if (cardMotionState) return cardMotionState;

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    cardMotionState = { enabled: false };
    return cardMotionState;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const state = { enabled: false };

  const refreshState = () => {
    state.enabled = !prefersReducedMotion.matches && canHover.matches && finePointer.matches;
  };

  const bindChange = (query) => {
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', refreshState);
      return;
    }
    if (typeof query.addListener === 'function') {
      query.addListener(refreshState);
    }
  };

  bindChange(prefersReducedMotion);
  bindChange(canHover);
  bindChange(finePointer);
  refreshState();

  cardMotionState = state;
  return cardMotionState;
}

function resetCardDepth(cardEl) {
  if (!cardEl) return;
  cardEl.style.setProperty('--card-tilt-x', '0deg');
  cardEl.style.setProperty('--card-tilt-y', '0deg');
  cardEl.style.setProperty('--card-shine-opacity', '0');
  cardEl.style.setProperty('--card-depth-shadow-x', '0px');
  cardEl.style.setProperty('--card-depth-shadow-y', '0px');
}

function applyCardDepthFromPointer(cardEl, clientX, clientY) {
  const rect = cardEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

  const tiltY = (x - 0.5) * (CARD_TILT_MAX_DEG * 2);
  const tiltX = (0.5 - y) * (CARD_TILT_MAX_DEG * 2);
  const centerDistance = Math.min(1, Math.hypot(x - 0.5, y - 0.5) / 0.72);
  const shineOpacity = Math.max(0.14, 0.36 - (centerDistance * 0.18));

  cardEl.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`);
  cardEl.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`);
  cardEl.style.setProperty('--card-shine-x', `${(14 + (x * 72)).toFixed(2)}%`);
  cardEl.style.setProperty('--card-shine-y', `${(14 + (y * 72)).toFixed(2)}%`);
  cardEl.style.setProperty('--card-shine-opacity', shineOpacity.toFixed(3));
  cardEl.style.setProperty('--card-depth-shadow-x', `${(tiltY * 0.52).toFixed(2)}px`);
  cardEl.style.setProperty('--card-depth-shadow-y', `${(-tiltX * 0.42).toFixed(2)}px`);
}

function bindCardDepthMotion(cardEl) {
  if (!cardEl || typeof cardEl._unbindDepthMotion === 'function') return;

  const motionState = getCardMotionState();
  const allowedPointerType = new Set(['mouse', 'pen']);
  let rafId = 0;
  let pointerX = 0;
  let pointerY = 0;

  const clearDepth = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    resetCardDepth(cardEl);
  };

  const flushDepth = () => {
    rafId = 0;
    if (!motionState.enabled) {
      resetCardDepth(cardEl);
      return;
    }
    applyCardDepthFromPointer(cardEl, pointerX, pointerY);
  };

  const scheduleDepth = (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(flushDepth);
    }
  };

  const supportsPointer = (event) => !event.pointerType || allowedPointerType.has(event.pointerType);

  const onPointerEnter = (event) => {
    if (!motionState.enabled || !supportsPointer(event)) {
      resetCardDepth(cardEl);
      return;
    }
    scheduleDepth(event);
  };

  const onPointerMove = (event) => {
    if (!motionState.enabled || !supportsPointer(event)) return;
    scheduleDepth(event);
  };

  cardEl.addEventListener('pointerenter', onPointerEnter);
  cardEl.addEventListener('pointermove', onPointerMove);
  cardEl.addEventListener('pointerleave', clearDepth);
  cardEl.addEventListener('pointercancel', clearDepth);
  cardEl.addEventListener('blur', clearDepth);

  cardEl._unbindDepthMotion = () => {
    clearDepth();
    cardEl.removeEventListener('pointerenter', onPointerEnter);
    cardEl.removeEventListener('pointermove', onPointerMove);
    cardEl.removeEventListener('pointerleave', clearDepth);
    cardEl.removeEventListener('pointercancel', clearDepth);
    cardEl.removeEventListener('blur', clearDepth);
  };
}

export function getCardElements() {
  return [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
}

export function computeKind(state, cardData) {
  // Object cards (Challenge / Crowd / Special)
  if (typeof cardData === 'object' && cardData !== null) {
    const name = String(cardData.name || "").trim();
    if (/^Challenge$/i.test(name)) return 'social';
    if (/^Crowd Challenge$/i.test(name)) return 'crowd';
    if (/^Special Card$/i.test(name)) return 'special';
    return 'special';
  }

  const value = String(getCardDisplayValue(cardData) ?? "").trim();
  const isShot = /\bShotgun\b/i.test(value) || /\bShot\b/i.test(value) || /takes a shot/i.test(value);

  // Items
  if (state.itemCards && state.itemCards.includes(value)) return 'item';

  // Penalty call
  if (/^Draw a Penalty Card$/i.test(value) || /^Everybody takes a Penalty Card$/i.test(value) || /^Penalty for All$/i.test(value)) {
    return 'penaltycall';
  }

  // Mix drink/give
  const hasDrink = isShot || /(Everybody drinks\b|^Drink\b)/i.test(value) || /\bDrink\b/i.test(value);
  const hasGive = /\bGive\b/i.test(value) || /^Give\b/i.test(value);
  if (hasDrink && hasGive) return 'mix';
  if (hasGive) return 'give';
  if (hasDrink) return 'drink';

  return 'normal';
}

/**
 * Sets card kind safely:
 * - hidden mystery card stays 'normal' to prevent style/hover leak
 * - once revealed, set to actual computed kind
 */
export function setCardKind(state, cardEl, cardData, isHidden) {
  const kind = isHidden ? 'normal' : computeKind(state, cardData);
  cardEl.dataset.kind = kind;
}

export function renderCards(state, onSelectCard) {
  const cards = getCardElements();

  cards.forEach((cardEl) => {
    if (!cardEl) return;
    cardEl.classList.remove('card--dealing');
    cardEl.style.removeProperty('--deal-delay');
    bindCardDepthMotion(cardEl);
    resetCardDepth(cardEl);
  });

  const penaltyDeckEl = document.getElementById('penalty-deck');
  if (penaltyDeckEl) {
    bindCardDepthMotion(penaltyDeckEl);
    resetCardDepth(penaltyDeckEl);
  }

  if (cards[0]) void cards[0].offsetWidth;

  for (let i = 0; i < 3; i++) {
    const cardEl = cards[i];
    if (!cardEl) continue;

    cardEl.style.setProperty('--deal-delay', `${i * 55}ms`);
    cardEl.classList.add('card--dealing');

    // reset root inline styles
    cardEl.style.borderColor = "";
    cardEl.style.backgroundColor = "";
    cardEl.style.color = "";

    const isHidden = !state.revealed[i];

    // IMPORTANT: don't leak hidden card kind
    setCardKind(state, cardEl, state.currentCards[i], isHidden);

    // reset possible Ditto / any overrides on front
    const front = cardEl.querySelector('.card__front');
    if (front) front.removeAttribute('style');

    if (isHidden) {
      flipCardAnimation(cardEl, "???");
    } else {
      flipCardAnimation(cardEl, getCardDisplayValue(state.currentCards[i]));
    }

    if (typeof cardEl._unbindTap === 'function') {
      cardEl._unbindTap();
    }
    cardEl._unbindTap = bindTap(cardEl, () => onSelectCard(i));

    cardEl.onkeydown = (event) => {
      if (!isActivationKey(event)) return;
      event.preventDefault();
      onSelectCard(i);
    };
  }
}
