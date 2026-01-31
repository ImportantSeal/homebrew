// js/ui/uiFacade.js
// Central place for DOM lookups + simple UI bindings.
// Goal: game logic modules should not query the DOM directly.

const cache = new Map();
const listeners = {
  redraw: null,
  penaltyDeck: null,
  closeDropdownsBound: false
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
  if (el) el.textContent = text;
}

export function getPenaltyDeckEl() {
  return getEl('penalty-deck');
}

export function bindRedrawClick(handler) {
  const btn = getEl('redraw-button');
  if (!btn) return;

  if (listeners.redraw) btn.removeEventListener('click', listeners.redraw);
  listeners.redraw = handler;
  btn.addEventListener('click', handler);
}

export function bindPenaltyDeckClick(handler) {
  const el = getPenaltyDeckEl();
  if (!el) return;

  if (listeners.penaltyDeck) el.removeEventListener('click', listeners.penaltyDeck);
  listeners.penaltyDeck = handler;
  el.addEventListener('click', handler);
}

export function bindCloseDropdownsOnOutsideClick() {
  if (listeners.closeDropdownsBound) return;

  document.addEventListener('click', () => {
    document
      .querySelectorAll('.player-dropdown.show')
      .forEach(d => d.classList.remove('show'));
  });

  listeners.closeDropdownsBound = true;
}

// Optional: if you ever need to reset cached refs (rare)
export function _resetUiCacheForDebug() {
  cache.clear();
}
