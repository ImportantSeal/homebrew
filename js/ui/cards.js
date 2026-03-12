import { flipCardAnimation } from '../animations.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';
import { bindTap } from '../utils/tap.js';
import { getPlainCardKind } from '../logic/cardSchema.js';
import { isReducedEffectsEnabled } from './effectsProfile.js';

const CARD_TILT_MAX_DEG = 4;
const CARD_DEAL_DURATION_MS = 360;
const CARD_DEAL_STAGGER_MS = 55;
let cardMotionState = null;

function setCardAnimating(cardEl, enabled) {
  if (!cardEl?.classList) return;
  cardEl.classList.toggle('card--animating', Boolean(enabled));
}

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
    setCardAnimating(cardEl, false);
    resetCardDepth(cardEl);
  };

  const flushDepth = () => {
    rafId = 0;
    if (!motionState.enabled) {
      setCardAnimating(cardEl, false);
      resetCardDepth(cardEl);
      return;
    }
    setCardAnimating(cardEl, true);
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
      setCardAnimating(cardEl, false);
      resetCardDepth(cardEl);
      return;
    }
    setCardAnimating(cardEl, true);
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

function getCardFrontElement(cardEl) {
  if (!cardEl) return null;
  if (cardEl._frontElement) return cardEl._frontElement;
  cardEl._frontElement = cardEl.querySelector('.card__front');
  return cardEl._frontElement;
}

function getCardIndex(cardEl) {
  const rawIndex = Number.parseInt(cardEl?.dataset?.index ?? '', 10);
  return Number.isInteger(rawIndex) ? rawIndex : -1;
}

function triggerCardSelection(cardEl, event) {
  const index = getCardIndex(cardEl);
  if (index < 0) return;
  if (typeof cardEl?._onSelectCard !== 'function') return;
  cardEl._onSelectCard(index, event);
}

function bindCardSelection(cardEl) {
  if (!cardEl || cardEl._selectionBound) return;

  cardEl._unbindTap = bindTap(cardEl, (event) => triggerCardSelection(cardEl, event));

  const onKeyDown = (event) => {
    if (!isActivationKey(event)) return;
    event.preventDefault();
    triggerCardSelection(cardEl, event);
  };

  cardEl.addEventListener('keydown', onKeyDown);
  cardEl._selectionBound = true;
}

function cancelPendingDealAnimation(cardEl) {
  if (!cardEl) return;

  if (typeof cardEl._dealAnimationFrame === 'number') {
    cancelAnimationFrame(cardEl._dealAnimationFrame);
    cardEl._dealAnimationFrame = null;
  }

  if (typeof cardEl._dealAnimationTimeout === 'number') {
    clearTimeout(cardEl._dealAnimationTimeout);
    cardEl._dealAnimationTimeout = null;
  }
}

function scheduleDealAnimation(cardEl, delayMs) {
  if (!cardEl) return;

  cancelPendingDealAnimation(cardEl);
  cardEl.classList.remove('card--dealing');
  cardEl.style.setProperty('--deal-delay', `${delayMs}ms`);

  if (!isReducedEffectsEnabled()) {
    setCardAnimating(cardEl, true);
  } else {
    setCardAnimating(cardEl, false);
  }

  cardEl._dealAnimationFrame = requestAnimationFrame(() => {
    cardEl._dealAnimationFrame = null;
    cardEl.classList.add('card--dealing');
  });

  cardEl._dealAnimationTimeout = setTimeout(() => {
    cardEl.classList.remove('card--dealing');
    setCardAnimating(cardEl, false);
    cardEl._dealAnimationTimeout = null;
  }, CARD_DEAL_DURATION_MS + delayMs + 80);
}

function resetCardTransientState(cardEl) {
  if (!cardEl) return;

  const hasImpactState = cardEl.classList.contains('card-impact-flash')
    || typeof cardEl._impactFlashTimeout === 'number';

  if (hasImpactState) {
    cardEl.classList.remove('card-impact-flash');
    cardEl.querySelectorAll('.card-impact-burst').forEach((burstEl) => burstEl.remove());
  }

  if (typeof cardEl._impactFlashTimeout === 'number') {
    clearTimeout(cardEl._impactFlashTimeout);
    cardEl._impactFlashTimeout = null;
  }

  cardEl.style.borderColor = "";
  cardEl.style.backgroundColor = "";
  cardEl.style.color = "";
  cardEl.style.removeProperty('--impact-color');
  cardEl.style.removeProperty('--impact-duration');
}

function initializeCard(cardEl, onSelectCard) {
  if (!cardEl) return;
  if (typeof onSelectCard === 'function') {
    cardEl._onSelectCard = onSelectCard;
  }
  bindCardSelection(cardEl);
  bindCardDepthMotion(cardEl);
  getCardFrontElement(cardEl);
}

export function initCards(onSelectCard) {
  const cards = getCardElements();

  cards.forEach((cardEl, index) => {
    if (!cardEl) return;
    cardEl.dataset.index = String(index);
    initializeCard(cardEl, onSelectCard);
  });

  const penaltyDeckEl = document.getElementById('penalty-deck');
  if (penaltyDeckEl) {
    bindCardDepthMotion(penaltyDeckEl);
  }
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
    if (cardData.type === 'plain') {
      return getPlainCardKind(cardData);
    }

    const name = String(cardData.name || "").trim();
    if (/^Challenge$/i.test(name)) return 'social';
    if (/^Crowd Challenge$/i.test(name)) return 'crowd';
    if (/^Special Card$/i.test(name)) return 'special';
    return 'special';
  }

  const value = String(getCardDisplayValue(cardData) ?? "").trim();

  // Items
  if (state.itemCards && state.itemCards.includes(value)) return 'item';

  return getPlainCardKind(cardData);
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

export function renderCards(state) {
  const cards = getCardElements();

  cards.forEach((cardEl, index) => {
    if (!cardEl) return;
    cardEl.dataset.index = String(index);
    initializeCard(cardEl);
    cancelPendingDealAnimation(cardEl);
    cardEl.classList.remove('card--dealing');
    setCardAnimating(cardEl, false);
    cardEl.style.removeProperty('--deal-delay');
    resetCardDepth(cardEl);
  });

  const penaltyDeckEl = document.getElementById('penalty-deck');
  if (penaltyDeckEl) {
    bindCardDepthMotion(penaltyDeckEl);
    resetCardDepth(penaltyDeckEl);
  }

  for (let i = 0; i < 3; i++) {
    const cardEl = cards[i];
    if (!cardEl) continue;

    resetCardTransientState(cardEl);
    scheduleDealAnimation(cardEl, i * CARD_DEAL_STAGGER_MS);

    const isHidden = !state.revealed[i];

    // IMPORTANT: don't leak hidden card kind
    setCardKind(state, cardEl, state.currentCards[i], isHidden);

    // reset possible Ditto / any overrides on front
    const front = getCardFrontElement(cardEl);
    if (front) front.removeAttribute('style');

    if (isHidden) {
      flipCardAnimation(cardEl, "???");
    } else {
      flipCardAnimation(cardEl, getCardDisplayValue(state.currentCards[i]));
    }
  }
}
