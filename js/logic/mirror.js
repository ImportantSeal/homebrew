// js/logic/mirror.js

/**
 * Generic player name click selection helper.
 * - Adds click listeners to .turn-player-name
 * - Uses stopImmediatePropagation so it won't also toggle dropdown
 * - Returns cleanup()
 */
export function enablePlayerNameSelection(state, onPick) {
  const nameEls = document.querySelectorAll('.turn-player-name');

  const cleanup = () => {
    nameEls.forEach(el => el.removeEventListener('click', onClick));
  };

  const onClick = (e) => {
    // IMPORTANT: prevent dropdown toggle + other click handlers
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    const clickedName = e.currentTarget.textContent.trim();
    const targetIndex = state.players.findIndex(p => p.name === clickedName);
    if (targetIndex === -1) return;

    onPick?.(targetIndex, cleanup);
  };

  nameEls.forEach(el => el.addEventListener('click', onClick));
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
