// js/ui/saviorEffect.js
//
// Full-screen "angel descends" overlay for the Savior blessing.
// Purely decorative: pointer-events are disabled so it never blocks the game,
// and it removes itself after the animation.

import { isReducedEffectsEnabled } from './effectsProfile.js';

const OVERLAY_CLASS = 'savior-overlay';
const DURATION_MS = 3200;
const REDUCED_DURATION_MS = 2200;
const FEATHER_COUNT = 14;
const REDUCED_FEATHER_COUNT = 6;
const SPARKLE_COUNT = 18;
const REDUCED_SPARKLE_COUNT = 6;

let activeOverlay = null;
let removeTimeoutId = null;

function createEl(tag, className) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function removeActiveOverlay() {
  if (removeTimeoutId) {
    clearTimeout(removeTimeoutId);
    removeTimeoutId = null;
  }
  if (activeOverlay?.parentNode) {
    activeOverlay.parentNode.removeChild(activeOverlay);
  }
  activeOverlay = null;
}

export function playSaviorEffect({ playerName = '', everybody = false } = {}) {
  if (typeof document === 'undefined' || !document.body) return null;

  removeActiveOverlay();

  const reduced = isReducedEffectsEnabled();
  const overlay = createEl('div', OVERLAY_CLASS);
  overlay.setAttribute('aria-hidden', 'true');
  if (reduced) overlay.classList.add(`${OVERLAY_CLASS}--reduced`);

  overlay.appendChild(createEl('div', `${OVERLAY_CLASS}__glow`));
  overlay.appendChild(createEl('div', `${OVERLAY_CLASS}__rays`));
  overlay.appendChild(createEl('div', `${OVERLAY_CLASS}__beam`));

  const angel = createEl('div', `${OVERLAY_CLASS}__angel`);
  angel.appendChild(createEl('div', `${OVERLAY_CLASS}__halo`));
  const wings = createEl('div', `${OVERLAY_CLASS}__wings`);
  wings.appendChild(createEl('span', `${OVERLAY_CLASS}__wing ${OVERLAY_CLASS}__wing--left`));
  wings.appendChild(createEl('span', `${OVERLAY_CLASS}__wing ${OVERLAY_CLASS}__wing--right`));
  angel.appendChild(wings);

  const title = createEl('div', `${OVERLAY_CLASS}__title`);
  title.textContent = 'Savior';
  angel.appendChild(title);

  const safeName = String(playerName || '').trim();
  const subtitleText = everybody
    ? 'Everybody is saved'
    : (safeName ? `${safeName} is saved` : '');
  if (subtitleText) {
    const subtitle = createEl('div', `${OVERLAY_CLASS}__subtitle`);
    subtitle.textContent = subtitleText;
    angel.appendChild(subtitle);
  }
  overlay.appendChild(angel);

  const featherCount = reduced ? REDUCED_FEATHER_COUNT : FEATHER_COUNT;
  for (let i = 0; i < featherCount; i++) {
    const feather = createEl('span', `${OVERLAY_CLASS}__feather`);
    feather.style.setProperty('--x', `${rand(4, 96).toFixed(1)}vw`);
    feather.style.setProperty('--drift', `${rand(-12, 12).toFixed(1)}vw`);
    feather.style.setProperty('--spin', `${Math.round(rand(-260, 260))}deg`);
    feather.style.setProperty('--delay', `${Math.round(rand(0, 900))}ms`);
    feather.style.setProperty('--dur', `${Math.round(rand(2000, 2900))}ms`);
    feather.style.setProperty('--size', `${rand(0.8, 1.5).toFixed(2)}`);
    overlay.appendChild(feather);
  }

  const sparkleCount = reduced ? REDUCED_SPARKLE_COUNT : SPARKLE_COUNT;
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = createEl('span', `${OVERLAY_CLASS}__sparkle`);
    sparkle.style.setProperty('--x', `${rand(10, 90).toFixed(1)}%`);
    sparkle.style.setProperty('--y', `${rand(8, 80).toFixed(1)}%`);
    sparkle.style.setProperty('--delay', `${Math.round(rand(100, 1600))}ms`);
    overlay.appendChild(sparkle);
  }

  document.body.appendChild(overlay);
  activeOverlay = overlay;

  removeTimeoutId = setTimeout(() => {
    if (activeOverlay === overlay) removeActiveOverlay();
  }, reduced ? REDUCED_DURATION_MS : DURATION_MS);

  return overlay;
}
