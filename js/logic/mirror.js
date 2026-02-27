// js/logic/mirror.js

import { bindTap } from '../utils/tap.js';

/**
 * Generic player name click selection helper.
 * - Uses delegated touch/click listener on #turn-order
 * - Survives turn-order re-renders while selection is active
 * - Uses stopImmediatePropagation so it won't also toggle dropdown / jump turn
 * - Returns cleanup()
 */
export function enablePlayerNameSelection(state, onPick) {
  const turnOrderEl = document.getElementById('turn-order');
  if (!turnOrderEl) return () => {};

  const cleanup = bindTap(turnOrderEl, (e) => {
    const target = e.target;
    if (!target || !target.closest) return;

    const playerBtn = target.closest('.turn-player-name');
    if (!playerBtn || !turnOrderEl.contains(playerBtn)) return;

    // IMPORTANT: prevent dropdown toggle + turn-order delegated click handlers
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    // Prefer explicit index to avoid text mismatches (e.g. trailing spaces / emojis)
    const idxAttr = playerBtn.dataset.index;
    let targetIndex = Number.isFinite(Number(idxAttr)) ? Number(idxAttr) : -1;

    // Fallback to name match if dataset missing
    if (targetIndex < 0) {
      const clickedName = playerBtn.textContent.trim();
      targetIndex = state.players.findIndex(p => (p.name || "").trim() === clickedName);
    }

    if (targetIndex === -1) return;
    onPick?.(targetIndex, cleanup);
  }, { capture: true });

  return cleanup;
}

export function enableMirrorTargetSelection(state, log, updateTurnOrder, renderItemsBoard, nextPlayer) {
  let cleanup = null;

  cleanup = enablePlayerNameSelection(state, (targetIndex, done) => {
    const sourceIndex = state.mirror.sourceIndex;
    const sourcePlayer = state.players[sourceIndex];
    const targetPlayer = state.players[targetIndex];

    const parent = state.mirror.parentName;
    const subName = state.mirror.subName;
    const subInstr = state.mirror.subInstruction;
    const detail = subInstr ? `${subName} — ${subInstr}` : subName || state.mirror.displayText;

    log(`${sourcePlayer.name} used Mirror on ${targetPlayer.name}: ${parent}${detail ? ' | ' + detail : ''}`);

    state.mirror = { active: false, sourceIndex: null, selectedCardIndex: null, parentName: '', subName: '', subInstruction: '', displayText: '' };
    done?.();

    if (sourceIndex === state.currentPlayerIndex) {
      nextPlayer();
    } else {
      updateTurnOrder();
      renderItemsBoard();
    }
  });

  return cleanup;
}

export function primeMirrorFromCard(state, cardData, cardIndex, log, randomFromArray) {
  let displayText = '';
  let parentName = (typeof cardData === 'object' && cardData !== null) ? (cardData.name || '') : String(cardData ?? '');
  let subName = '';
  let subInstruction = '';

  if (typeof cardData === 'object' && cardData.subcategories) {
    const chosen = randomFromArray(cardData.subcategories);
    if (typeof chosen === 'object') {
      subName = chosen.name || '';
      subInstruction = chosen.instruction || '';
      displayText = subInstruction || subName;
    } else {
      subName = String(chosen);
      displayText = subName;
    }
  } else {
    displayText = parentName;
  }

  state.mirror.selectedCardIndex = cardIndex;
  state.mirror.parentName = parentName;
  state.mirror.subName = subName;
  state.mirror.subInstruction = subInstruction;
  state.mirror.displayText = displayText;

  log(`Mirror primed with: ${parentName}${subName ? ' - ' + subName : ''}${subInstruction ? ' — ' + subInstruction : ''}. Now click a player's name to target.`);
}
