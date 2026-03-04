import { bindTap } from '../utils/tap.js';

export function setPickMode(mode) {
  if (typeof document === 'undefined' || !document.body?.dataset) return;
  const next = String(mode || '').trim();
  if (next) {
    document.body.dataset.pickmode = next;
  } else {
    delete document.body.dataset.pickmode;
  }
}

export function clearPickMode() {
  setPickMode('');
}

/**
 * Generic player-name click selection helper.
 * - Uses delegated touch/click listener on #turn-order.
 * - Survives turn-order re-renders while selection is active.
 * - Stops propagation so dropdown/jump handlers are not triggered.
 * - Returns cleanup().
 */
export function enablePlayerNameSelection(state, onPick) {
  if (typeof document === 'undefined') return () => {};
  const turnOrderEl = document.getElementById('turn-order');
  if (!turnOrderEl) return () => {};

  const cleanup = bindTap(turnOrderEl, (e) => {
    const target = e.target;
    if (!target || !target.closest) return;

    const playerBtn = target.closest('.turn-player-name');
    if (!playerBtn || !turnOrderEl.contains(playerBtn)) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    const idxAttr = playerBtn.dataset.index;
    let targetIndex = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : -1;

    if (targetIndex < 0) {
      const clickedName = playerBtn.textContent.trim();
      targetIndex = state.players.findIndex((p) => (p.name || '').trim() === clickedName);
    }

    if (targetIndex === -1) return;
    onPick?.(targetIndex, cleanup);
  }, { capture: true });

  return cleanup;
}

export const effectSelectionUi = Object.freeze({
  setPickMode,
  clearPickMode,
  enablePlayerNameSelection
});
