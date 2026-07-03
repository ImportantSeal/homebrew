import { isReducedEffectsEnabled } from './effectsProfile.js';
import { restartClassAnimation } from '../utils/restartClassAnimation.js';

const DEFAULTS = {
  speedX: 2.35,
  speedY: 2.35,
  sizePx: 68,
  paddingPx: 0,
  cornerCooldownMs: 7000
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function resolveCornerName(x, y, minX, maxX, minY, maxY) {
  const onLeft = Math.abs(x - minX) < 0.5;
  const onRight = Math.abs(x - maxX) < 0.5;
  const onTop = Math.abs(y - minY) < 0.5;
  const onBottom = Math.abs(y - maxY) < 0.5;

  if (onLeft && onTop) return 'top-left';
  if (onRight && onTop) return 'top-right';
  if (onLeft && onBottom) return 'bottom-left';
  if (onRight && onBottom) return 'bottom-right';
  return 'a corner';
}

function randomHue() {
  return Math.floor(Math.random() * 360);
}

function applyGradientFromHue(el, base) {
  if (!el || !el.style) return;

  const c1 = `hsla(${base}, 88%, 58%, 0.88)`;
  const c2 = `hsla(${(base + 72) % 360}, 86%, 57%, 0.82)`;
  const c3 = `hsla(${(base + 148) % 360}, 84%, 52%, 0.86)`;

  el.style.setProperty('--dvd-grad-1', c1);
  el.style.setProperty('--dvd-grad-2', c2);
  el.style.setProperty('--dvd-grad-3', c3);
}

export function createDvdBouncer({
  containerId = 'game-container',
  containerSelector = '',
  imageSrc = '',
  imageAlt = 'DVD logo',
  onWallHit = null,
  onCornerHit = null,
  speedX = DEFAULTS.speedX,
  speedY = DEFAULTS.speedY,
  sizePx = DEFAULTS.sizePx,
  paddingPx = DEFAULTS.paddingPx,
  cornerCooldownMs = DEFAULTS.cornerCooldownMs
} = {}) {
  let rafId = 0;
  let running = false;
  let lastTimestamp = 0;
  let x = 0;
  let y = 0;
  let vx = Number.isFinite(speedX) ? Math.abs(speedX) : DEFAULTS.speedX;
  let vy = Number.isFinite(speedY) ? Math.abs(speedY) : DEFAULTS.speedY;
  let lastCornerHitAt = 0;
  let gradientHue = randomHue();

  function applyNextGradient(el) {
    // Golden-angle hue stepping keeps strong visual separation between hits.
    gradientHue = (gradientHue + 137) % 360;
    applyGradientFromHue(el, gradientHue);
  }

  function getContainer() {
    if (typeof document === 'undefined') return null;
    if (typeof containerSelector === 'string' && containerSelector.trim()) {
      return document.querySelector(containerSelector.trim());
    }
    return document.getElementById(containerId);
  }

  function ensureElement(container) {
    if (!container) return null;

    let el = container.querySelector('.dvd-bouncer');
    if (el) return el;

    el = document.createElement('div');
    el.className = 'dvd-bouncer';
    el.setAttribute('aria-hidden', 'true');

    const createTextLogo = () => {
      const logo = document.createElement('span');
      logo.className = 'dvd-bouncer__logo';
      logo.textContent = 'DVD';
      return logo;
    };

    const safeImageSrc = typeof imageSrc === 'string' ? imageSrc.trim() : '';
    if (safeImageSrc) {
      const image = document.createElement('img');
      image.className = 'dvd-bouncer__image';
      image.src = safeImageSrc;
      image.alt = String(imageAlt || 'DVD logo');
      image.decoding = 'async';
      image.loading = 'eager';
      image.addEventListener('error', () => {
        el.replaceChildren(createTextLogo());
      }, { once: true });
      el.appendChild(image);
    } else {
      el.appendChild(createTextLogo());
    }

    container.appendChild(el);
    return el;
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTimestamp = 0;
  }

  function seedPosition(container, el) {
    const width = Number(container?.clientWidth || 0);
    const height = Number(container?.clientHeight || 0);
    const boxWidth = Number(el?.offsetWidth || sizePx);
    const boxHeight = Number(el?.offsetHeight || sizePx);
    const minX = paddingPx;
    const minY = paddingPx;
    const maxX = Math.max(minX, width - boxWidth - paddingPx);
    const maxY = Math.max(minY, height - boxHeight - paddingPx);

    const tX = Math.random();
    const tY = Math.random();
    x = minX + (maxX - minX) * tX;
    y = minY + (maxY - minY) * tY;
  }

  function tick(timestamp) {
    if (!running) return;

    const container = getContainer();
    const el = ensureElement(container);
    if (!container || !el) {
      stop();
      return;
    }

    const width = Number(container.clientWidth || 0);
    const height = Number(container.clientHeight || 0);
    const boxWidth = Number(el.offsetWidth || sizePx);
    const boxHeight = Number(el.offsetHeight || sizePx);
    if (width <= boxWidth + paddingPx * 2 || height <= boxHeight + paddingPx * 2) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (!lastTimestamp) lastTimestamp = timestamp;
    const frameScale = clamp((timestamp - lastTimestamp) / (1000 / 60), 0.45, 2.2);
    lastTimestamp = timestamp;

    if (isReducedEffectsEnabled()) {
      el.hidden = true;
      rafId = requestAnimationFrame(tick);
      return;
    }

    el.hidden = false;

    x += vx * frameScale;
    y += vy * frameScale;

    const minX = paddingPx;
    const minY = paddingPx;
    const maxX = Math.max(minX, width - boxWidth - paddingPx);
    const maxY = Math.max(minY, height - boxHeight - paddingPx);

    let hitX = false;
    let hitY = false;

    if (x <= minX) {
      x = minX;
      vx = Math.abs(vx);
      hitX = true;
    } else if (x >= maxX) {
      x = maxX;
      vx = -Math.abs(vx);
      hitX = true;
    }

    if (y <= minY) {
      y = minY;
      vy = Math.abs(vy);
      hitY = true;
    } else if (y >= maxY) {
      y = maxY;
      vy = -Math.abs(vy);
      hitY = true;
    }

    if (hitX || hitY) {
      applyNextGradient(el);
      if (typeof onWallHit === 'function') {
        onWallHit({ hitX, hitY });
      }
    }

    if (hitX && hitY) {
      const currentTime = nowMs();
      if (currentTime - lastCornerHitAt >= cornerCooldownMs) {
        lastCornerHitAt = currentTime;
        restartClassAnimation(el, 'dvd-bouncer--corner-hit');

        const corner = resolveCornerName(x, y, minX, maxX, minY, maxY);
        if (typeof onCornerHit === 'function') {
          onCornerHit({ corner });
        }
      }
    }

    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    const container = getContainer();
    if (!container || typeof requestAnimationFrame !== 'function') return;

    const el = ensureElement(container);
    if (!el) return;

    if (!running) {
      seedPosition(container, el);
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }

    running = true;
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  return {
    start,
    stop
  };
}
