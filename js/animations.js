import { isReducedEffectsEnabled } from './ui/effectsProfile.js';

const CARD_COMPACT_TEXT_MIN_LENGTH = 30;
const DEFAULT_FLIP_DURATION_MS = 460;

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

function shouldUseCompactText(text) {
  return text.length >= CARD_COMPACT_TEXT_MIN_LENGTH;
}

function setFrontContent(frontEl, finalText) {
  // safer & cleaner than innerHTML injections
  frontEl.replaceChildren();
  frontEl.style.removeProperty('--card-front-font-scale');
  frontEl.dataset.compactText = 'false';

  const safeText = normalizeCardText(finalText);

  if (safeText === 'Immunity') {
    const img = document.createElement('img');
    img.src = 'images/immunity.png';
    img.alt = 'Immunity';
    frontEl.appendChild(img);
    return;
  }

  frontEl.style.setProperty('--card-front-font-scale', String(resolveCardFrontScale(safeText)));
  frontEl.dataset.compactText = shouldUseCompactText(safeText) ? 'true' : 'false';

  const content = document.createElement('div');
  content.className = 'card-front-content';

  const text = document.createElement('span');
  text.className = 'card-front-text';
  text.textContent = safeText;
  content.appendChild(text);

  frontEl.appendChild(content);
}

export function flipCardAnimation(cardElement, finalText) {
  const front = cardElement.querySelector?.('.card__front');
  const inner = cardElement.querySelector?.('.card__inner');
  const flipDurationMs = resolveFlipDurationMs(cardElement);
  markAnimating(inner || cardElement, 'transform', flipDurationMs);

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
    setFrontContent(front, finalText);
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
    setFrontContent(front, finalText);
    cardElement.classList.add('show-front');
    cardElement.dataset.value = finalText;
  }, Math.max(120, Math.round(flipDurationMs * 0.5)));
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

function shouldReduceEffects() {
  return shouldReduceMotion() || isReducedEffectsEnabled();
}

function parseDurationMs(rawValue, fallbackMs) {
  if (typeof rawValue !== 'string') return fallbackMs;
  const value = rawValue.trim().toLowerCase();
  if (!value) return fallbackMs;

  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallbackMs;

  if (value.endsWith('ms')) return Math.max(0, Math.round(numeric));
  if (value.endsWith('s')) return Math.max(0, Math.round(numeric * 1000));
  return fallbackMs;
}

function resolveFlipDurationMs(cardElement) {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return DEFAULT_FLIP_DURATION_MS;
  }
  const computed = window.getComputedStyle(cardElement);
  const durationValue = computed?.getPropertyValue('--flip-ms');
  return parseDurationMs(durationValue, DEFAULT_FLIP_DURATION_MS);
}

function markAnimating(element, properties = 'transform, opacity', durationMs = DEFAULT_FLIP_DURATION_MS) {
  if (!element?.style) return;

  element.style.willChange = properties;

  if (typeof element._willChangeTimeout === 'number') {
    cancelScheduledTimeout(element._willChangeTimeout);
  }

  const safeDuration = Math.max(120, Math.round(durationMs));
  element._willChangeTimeout = scheduleTimeout(() => {
    element.style.removeProperty('will-change');
    element._willChangeTimeout = null;
  }, safeDuration + 80);
}

function scheduleTimeout(callback, delayMs) {
  if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
    return window.setTimeout(callback, delayMs);
  }
  return setTimeout(callback, delayMs);
}

function cancelScheduledTimeout(timeoutId) {
  if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
    window.clearTimeout(timeoutId);
    return;
  }
  clearTimeout(timeoutId);
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
  markAnimating(element, 'transform, opacity', safeDuration);

  element.style.setProperty('--impact-color', impactColor);
  element.style.setProperty('--impact-duration', `${safeDuration}ms`);
  element.classList.remove(IMPACT_FLASH_CLASS);
  void element.offsetWidth;
  element.classList.add(IMPACT_FLASH_CLASS);

  if (!shouldReduceEffects()) {
    const burst = document.createElement('span');
    burst.className = IMPACT_BURST_CLASS;
    burst.style.setProperty('--impact-origin-x', `${x.toFixed(2)}%`);
    burst.style.setProperty('--impact-origin-y', `${y.toFixed(2)}%`);
    burst.style.setProperty('--impact-duration', `${safeDuration}ms`);
    burst.style.setProperty('--impact-color', impactColor);
    element.appendChild(burst);

    scheduleTimeout(() => {
      burst.remove();
    }, safeDuration + 140);
  }

  if (typeof element._impactFlashTimeout === 'number') {
    cancelScheduledTimeout(element._impactFlashTimeout);
  }

  element._impactFlashTimeout = scheduleTimeout(() => {
    element.classList.remove(IMPACT_FLASH_CLASS);
  }, safeDuration);
}
