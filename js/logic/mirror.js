import { bindTap } from '../utils/tap.js';

export function createMirrorState() {
  return {
    active: false,
    sourceIndex: null,
    selectedCardIndex: null,
    parentName: '',
    subName: '',
    subInstruction: '',
    displayText: ''
  };
}

export function resetMirrorState(state) {
  if (!state || typeof state !== 'object') return createMirrorState();
  state.mirror = createMirrorState();
  return state.mirror;
}

/**
 * Generic player-name click selection helper.
 * - Uses delegated touch/click listener on #turn-order.
 * - Survives turn-order re-renders while selection is active.
 * - Stops propagation so dropdown/jump handlers are not triggered.
 * - Returns cleanup().
 */
export function enablePlayerNameSelection(state, onPick) {
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
