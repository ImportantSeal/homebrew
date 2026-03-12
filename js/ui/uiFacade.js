// js/ui/uiFacade.js
// Central place for DOM lookups + simple UI bindings.
// Goal: game logic modules should not query the DOM directly.

import { bindTap } from '../utils/tap.js';
import { restartClassAnimation } from '../utils/restartClassAnimation.js';

const cache = new Map();
const listeners = {
  redrawUnbind: null,
  penaltyRefreshUnbind: null,
  penaltyDeckUnbind: null,
  turnOrderUnbind: null,
  turnOrderRemoveUnbind: null
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

// Optional: if you ever need to reset cached refs (rare)
export function _resetUiCacheForDebug() {
  cache.clear();
}
