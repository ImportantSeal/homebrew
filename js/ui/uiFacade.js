// js/ui/uiFacade.js
// Central place for DOM lookups + simple UI bindings.
// Goal: game logic modules should not query the DOM directly.

import { bindTap } from '../utils/tap.js';
import { restartClassAnimation } from '../utils/restartClassAnimation.js';
import { applyPlayerColor } from '../utils/playerColors.js';

const cache = new Map();
const listeners = {
  redrawUnbind: null,
  penaltyRefreshUnbind: null,
  penaltyDeckUnbind: null,
  turnOrderUnbind: null,
  turnOrderRemoveUnbind: null,
  audioMuteUnbind: null,
  audioVolumeInputHandler: null,
  audioVolumeChangeHandler: null,
  bomburToggleChangeHandler: null
};

function getEl(id) {
  if (cache.has(id)) return cache.get(id);
  const el = document.getElementById(id);
  cache.set(id, el);
  return el;
}

export function showGameContainer() {
  const el = getEl('game-container');
  if (el) el.style.display = "block";
}

export function setTurnIndicatorText(text) {
  const el = getEl('turn-indicator');
  if (!el) return;

  const nextText = String(text ?? "");
  const didChange = el.textContent !== nextText;
  el.textContent = nextText;
  if (!didChange) return;

  restartClassAnimation(el, 'turn-indicator--pulse');
}

export function setPenaltyDrawIndicator(details = null) {
  const el = getEl('penalty-draw-indicator');
  if (!el) return;

  const name = typeof details?.name === 'string' ? details.name.trim() : '';
  if (!name) {
    el.hidden = true;
    el.removeAttribute('aria-label');
    applyPlayerColor(el, '');
    return;
  }

  const metaEl = el.querySelector('.penalty-draw-indicator__meta');
  const nameEl = el.querySelector('.penalty-draw-indicator__name');
  const position = Number.isInteger(details?.position) ? details.position : null;
  const total = Number.isInteger(details?.total) ? details.total : null;
  const hasProgress = position !== null && total !== null && total > 1 && position >= 1 && position <= total;
  const metaText = hasProgress ? `Penalty ${position}/${total}` : 'Penalty draw';
  const nameText = `${name} draws now`;
  const previousText = `${metaEl?.textContent || ''}|${nameEl?.textContent || ''}`;
  const nextText = `${metaText}|${nameText}`;

  if (metaEl) metaEl.textContent = metaText;
  if (nameEl) nameEl.textContent = nameText;
  applyPlayerColor(el, details?.color || '');
  el.setAttribute('aria-label', hasProgress
    ? `${name} draws penalty card now. Penalty ${position} of ${total}.`
    : `${name} draws penalty card now.`);
  el.hidden = false;

  if (previousText !== nextText) {
    restartClassAnimation(el, 'penalty-draw-indicator--pulse');
  }
}

export function setNextActionNotification(details = null) {
  const el = getEl('next-action-notification');
  if (!el) return;

  const message = typeof details?.message === 'string' ? details.message.trim() : '';
  if (!message) {
    el.hidden = true;
    el.removeAttribute('aria-label');
    delete el.dataset.variant;
    return;
  }

  const metaEl = el.querySelector('.next-action-notification__meta');
  const messageEl = el.querySelector('.next-action-notification__message');
  const metaText = typeof details?.meta === 'string' && details.meta.trim()
    ? details.meta.trim()
    : 'Next action';
  const variant = typeof details?.variant === 'string' && details.variant.trim()
    ? details.variant.trim()
    : 'default';
  const previousText = `${metaEl?.textContent || ''}|${messageEl?.textContent || ''}`;
  const nextText = `${metaText}|${message}`;

  if (metaEl) metaEl.textContent = metaText;
  if (messageEl) messageEl.textContent = message;
  el.dataset.variant = variant;
  el.setAttribute('aria-label', `${metaText}: ${message}`);
  el.hidden = false;

  if (previousText !== nextText) {
    restartClassAnimation(el, 'next-action-notification--pulse');
  }
}

export function getPenaltyDeckEl() {
  return getEl('penalty-deck');
}

export function getPrimaryCardEl() {
  return getEl('card0');
}

export function getCardContainerEl() {
  const key = 'card-container';
  if (cache.has(key)) return cache.get(key);
  const el = document.querySelector('.card-container');
  cache.set(key, el);
  return el;
}

export function setItemsPanelVisibility(showItems) {
  const isVisible = Boolean(showItems);
  const itemsTitle = getEl('items-title');
  const itemsBoard = getEl('items-board');

  if (itemsTitle) itemsTitle.style.display = isVisible ? '' : 'none';
  if (!itemsBoard) return;

  itemsBoard.style.display = isVisible ? '' : 'none';
  if (!isVisible) {
    itemsBoard.replaceChildren();
    delete itemsBoard.dataset.renderSignature;
  }
}

export function bindRedrawClick(handler) {
  const btn = getEl('redraw-button');
  if (!btn) return;

  if (typeof listeners.redrawUnbind === 'function') listeners.redrawUnbind();
  listeners.redrawUnbind = bindTap(btn, handler);
}

export function bindPenaltyRefreshClick(handler) {
  const btn = getEl('penalty-refresh-button');
  if (!btn) return;

  if (typeof listeners.penaltyRefreshUnbind === 'function') listeners.penaltyRefreshUnbind();
  listeners.penaltyRefreshUnbind = bindTap(btn, handler);
}

export function bindPenaltyDeckClick(handler) {
  const el = getPenaltyDeckEl();
  if (!el) return;

  if (typeof listeners.penaltyDeckUnbind === 'function') listeners.penaltyDeckUnbind();
  listeners.penaltyDeckUnbind = bindTap(el, handler);
}

export function bindTurnOrderPlayerClick(handler) {
  const el = getEl('turn-order');
  if (!el) return;

  if (typeof listeners.turnOrderUnbind === 'function') listeners.turnOrderUnbind();
  listeners.turnOrderUnbind = bindTap(el, (event) => {
    const target = event.target;
    if (!target || !target.closest) return;

    const playerBtn = target.closest('.turn-player-name');
    if (!playerBtn || !el.contains(playerBtn)) return;

    handler?.(playerBtn, event);
  });
}

export function bindTurnOrderRemoveClick(handler) {
  const el = getEl('turn-order');
  if (!el) return;

  if (typeof listeners.turnOrderRemoveUnbind === 'function') listeners.turnOrderRemoveUnbind();
  listeners.turnOrderRemoveUnbind = bindTap(el, (event) => {
    const target = event.target;
    if (!target || !target.closest) return;

    const removeBtn = target.closest('.turn-player-remove');
    if (!removeBtn || !el.contains(removeBtn)) return;

    handler?.(removeBtn, event);
  });
}

export function bindAudioMuteToggle(handler) {
  const btn = getEl('audio-mute-toggle');
  if (!btn) return;

  if (typeof listeners.audioMuteUnbind === 'function') listeners.audioMuteUnbind();
  listeners.audioMuteUnbind = bindTap(btn, handler);
}

export function bindAudioVolumeChange(handler) {
  const slider = getEl('audio-volume-slider');
  if (!slider || typeof handler !== 'function') return;

  if (typeof listeners.audioVolumeInputHandler === 'function') {
    slider.removeEventListener('input', listeners.audioVolumeInputHandler);
  }
  if (typeof listeners.audioVolumeChangeHandler === 'function') {
    slider.removeEventListener('change', listeners.audioVolumeChangeHandler);
  }

  const onInput = (event) => handler(event);
  const onChange = (event) => handler(event);

  slider.addEventListener('input', onInput);
  slider.addEventListener('change', onChange);

  listeners.audioVolumeInputHandler = onInput;
  listeners.audioVolumeChangeHandler = onChange;
}

export function setAudioMuteState(muted) {
  const btn = getEl('audio-mute-toggle');
  if (!btn) return;

  const isMuted = Boolean(muted);
  btn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  btn.setAttribute('aria-label', isMuted ? 'Unmute sounds' : 'Mute sounds');
  btn.textContent = isMuted ? 'Sound: Off' : 'Sound: On';
}

export function setAudioVolumeValue(volumePercent) {
  const slider = getEl('audio-volume-slider');
  if (!slider) return;

  const safePercent = Number.isFinite(volumePercent)
    ? Math.min(100, Math.max(0, Math.round(volumePercent)))
    : 100;
  slider.value = String(safePercent);
}

export function getAudioVolumeValue() {
  const slider = getEl('audio-volume-slider');
  if (!slider) return 100;

  const raw = Number.parseInt(slider.value, 10);
  if (!Number.isFinite(raw)) return 100;
  return Math.min(100, Math.max(0, raw));
}

export function bindBomburToggleChange(handler) {
  const checkbox = getEl('bombur-toggle');
  if (!checkbox || typeof handler !== 'function') return;

  if (typeof listeners.bomburToggleChangeHandler === 'function') {
    checkbox.removeEventListener('change', listeners.bomburToggleChangeHandler);
  }

  const onChange = (event) => handler(event);
  checkbox.addEventListener('change', onChange);
  listeners.bomburToggleChangeHandler = onChange;
}

export function flashToolsButton() {
  const button = getEl('settings-toggle');
  if (!button) return;
  restartClassAnimation(button, 'settings-toggle--tool-hint');
}

export function setBomburAvailability(available) {
  const isAvailable = Boolean(available);
  const section = document.querySelector('.settings-section--bombur');
  const checkbox = getEl('bombur-toggle');

  if (section) {
    section.hidden = !isAvailable;
    section.style.display = isAvailable ? '' : 'none';
  }

  if (!checkbox) return;

  checkbox.disabled = !isAvailable;
  if (!isAvailable) {
    checkbox.checked = false;
    checkbox.setAttribute('aria-label', 'Bombur DVD icon is unavailable on mobile');
  }
}

export function setBomburToggleState(enabled) {
  const checkbox = getEl('bombur-toggle');
  if (!checkbox) return;

  if (checkbox.disabled) {
    checkbox.checked = false;
    checkbox.setAttribute('aria-label', 'Bombur DVD icon is unavailable on mobile');
    return;
  }

  const isEnabled = Boolean(enabled);
  checkbox.checked = isEnabled;
  checkbox.setAttribute('aria-label', isEnabled ? 'Hide Bombur DVD icon' : 'Show Bombur DVD icon');
}

export function getBomburToggleState() {
  const checkbox = getEl('bombur-toggle');
  if (!checkbox) return true;
  if (checkbox.disabled) return false;
  return checkbox.checked !== false;
}

// Optional: if you ever need to reset cached refs (rare)
export function _resetUiCacheForDebug() {
  cache.clear();
}
