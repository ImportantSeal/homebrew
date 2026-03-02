import { showCardActionModal } from './ui/cardActionModal.js';
import { bindTap } from './utils/tap.js';

const CARD_DETAIL_MIN_LENGTH = 30;

function normalizeCardText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function resolveCardFrontScale(text) {
  const length = text.length;
  if (length >= 96) return 0.72;
  if (length >= 76) return 0.78;
  if (length >= 62) return 0.84;
  if (length >= 48) return 0.9;
  if (length >= 36) return 0.95;
  return 1;
}

function shouldShowCardDetailButton(text) {
  return text.length >= CARD_DETAIL_MIN_LENGTH;
}

function openCardDetailModal(text) {
  const safeText = normalizeCardText(text);
  if (!safeText) return;

  showCardActionModal({
    title: 'Card',
    message: safeText,
    fallbackMessage: safeText,
    variant: 'normal',
    closeLabel: 'Close'
  });
}

function buildCardDetailButton(text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card-open-detail';
  button.textContent = 'Open';
  button.setAttribute('aria-label', 'Open full card text');

  bindTap(button, (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    openCardDetailModal(text);
  });

  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.stopPropagation();
    }
  });

  return button;
}

function setFrontContent(frontEl, finalText, cardElement = null) {
  // safer & cleaner than innerHTML injections
  frontEl.replaceChildren();
  frontEl.style.removeProperty('--card-front-font-scale');
  frontEl.dataset.compactText = 'false';
  frontEl.dataset.canExpand = 'false';

  const safeText = normalizeCardText(finalText);

  if (safeText === 'Immunity') {
    const img = document.createElement('img');
    img.src = 'images/immunity.png';
    img.alt = 'Immunity';
    frontEl.appendChild(img);
    return;
  }

  frontEl.style.setProperty('--card-front-font-scale', String(resolveCardFrontScale(safeText)));
  frontEl.dataset.compactText = shouldShowCardDetailButton(safeText) ? 'true' : 'false';

  const content = document.createElement('div');
  content.className = 'card-front-content';

  const text = document.createElement('span');
  text.className = 'card-front-text';
  text.textContent = safeText;
  content.appendChild(text);

  if (cardElement?.classList?.contains('card') && shouldShowCardDetailButton(safeText)) {
    content.appendChild(buildCardDetailButton(safeText));
    frontEl.dataset.canExpand = 'true';
  }

  frontEl.appendChild(content);
}

export function flipCardAnimation(cardElement, finalText) {
  const front = cardElement.querySelector?.('.card__front');

  // Fallback
  if (!front) {
    cardElement.textContent = finalText;
    cardElement.dataset.value = finalText;
    return;
  }

  const wantFront = finalText !== "???";
  const isFront = cardElement.classList.contains('show-front');

  cardElement._flipToken = (cardElement._flipToken || 0) + 1;
  const token = cardElement._flipToken;

  // Want back
  if (!wantFront) {
    cardElement.classList.remove('show-front');
    cardElement.dataset.value = finalText;
    return;
  }

  // Back -> Front
  if (!isFront) {
    setFrontContent(front, finalText, cardElement);
    requestAnimationFrame(() => {
      if (cardElement._flipToken !== token) return;
      cardElement.classList.add('show-front');
      cardElement.dataset.value = finalText;
    });
    return;
  }

  // Front -> Back -> swap -> Front
  cardElement.classList.remove('show-front');

  setTimeout(() => {
    if (cardElement._flipToken !== token) return;
    setFrontContent(front, finalText, cardElement);
    cardElement.classList.add('show-front');
    cardElement.dataset.value = finalText;
  }, 230);
}

const DEFAULT_IMPACT_DURATION_MS = 460;
const IMPACT_FLASH_CLASS = 'card-impact-flash';
const IMPACT_BURST_CLASS = 'card-impact-burst';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveImpactOrigin(element, triggerEvent) {
  const rect = element.getBoundingClientRect?.();
  if (!rect || !rect.width || !rect.height) {
    return { x: 50, y: 50 };
  }

  let clientX = Number.NaN;
  let clientY = Number.NaN;

  if (triggerEvent) {
    if (typeof triggerEvent.clientX === 'number' && typeof triggerEvent.clientY === 'number') {
      clientX = triggerEvent.clientX;
      clientY = triggerEvent.clientY;
    } else if (triggerEvent.changedTouches?.[0]) {
      clientX = triggerEvent.changedTouches[0].clientX;
      clientY = triggerEvent.changedTouches[0].clientY;
    } else if (triggerEvent.touches?.[0]) {
      clientX = triggerEvent.touches[0].clientX;
      clientY = triggerEvent.touches[0].clientY;
    }
  }

  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return { x: 50, y: 50 };
  }

  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100)
  };
}

function resolveImpactColor(element, flashColor) {
  if (typeof flashColor === 'string' && flashColor.trim()) {
    return flashColor.trim();
  }

  const computed = window.getComputedStyle?.(element);
  const hoverRingColor = computed?.getPropertyValue('--hover-ring')?.trim();
  if (hoverRingColor) {
    return hoverRingColor;
  }

  return 'rgba(255, 231, 158, 0.9)';
}

function shouldReduceMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function flashElement(
  element,
  flashColor = "",
  duration = DEFAULT_IMPACT_DURATION_MS,
  triggerEvent = null
) {
  if (!element?.classList) return;

  const safeDuration = Number.isFinite(duration)
    ? Math.max(200, Math.round(duration))
    : DEFAULT_IMPACT_DURATION_MS;
  const impactColor = resolveImpactColor(element, flashColor);
  const { x, y } = resolveImpactOrigin(element, triggerEvent);

  element.style.setProperty('--impact-color', impactColor);
  element.style.setProperty('--impact-duration', `${safeDuration}ms`);
  element.classList.remove(IMPACT_FLASH_CLASS);
  void element.offsetWidth;
  element.classList.add(IMPACT_FLASH_CLASS);

  if (!shouldReduceMotion()) {
    const burst = document.createElement('span');
    burst.className = IMPACT_BURST_CLASS;
    burst.style.setProperty('--impact-origin-x', `${x.toFixed(2)}%`);
    burst.style.setProperty('--impact-origin-y', `${y.toFixed(2)}%`);
    burst.style.setProperty('--impact-duration', `${safeDuration}ms`);
    burst.style.setProperty('--impact-color', impactColor);
    element.appendChild(burst);

    window.setTimeout(() => {
      burst.remove();
    }, safeDuration + 140);
  }

  if (typeof element._impactFlashTimeout === 'number') {
    window.clearTimeout(element._impactFlashTimeout);
  }

  element._impactFlashTimeout = window.setTimeout(() => {
    element.classList.remove(IMPACT_FLASH_CLASS);
  }, safeDuration);
}
