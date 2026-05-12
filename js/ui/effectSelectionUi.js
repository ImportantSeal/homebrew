import { closeCardActionModal, showCardActionModal } from './cardActionModal.js';

export function clearPickMode() {
  if (typeof document === 'undefined' || !document.body?.dataset) return;
  delete document.body.dataset.pickmode;
}

function playerLabel(player, index) {
  const name = String(player?.name || '').trim();
  return name || `Player ${index + 1}`;
}

function targetIndexFromAction(actionId) {
  const match = String(actionId || '').match(/^effect_target_(\d+)$/);
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isInteger(index) ? index : null;
}

/**
 * Generic player selection helper for targeted effects.
 * Opens the same card action menu used by other card choices.
 * Returns cleanup().
 */
export function enablePlayerNameSelection(state, onPick, details = {}) {
  if (typeof document === 'undefined') return () => {};
  const players = Array.isArray(state?.players) ? state.players : [];
  if (players.length === 0) return () => {};

  let active = true;
  const cleanupAfterPick = () => {
    active = false;
  };

  const cleanup = () => {
    active = false;
    closeCardActionModal();
  };

  const title = String(details?.title || 'Pick a Player').trim() || 'Pick a Player';
  const message = String(details?.message || 'Choose a player to continue.').trim()
    || 'Choose a player to continue.';

  showCardActionModal({
    title,
    message,
    variant: 'choice',
    dismissible: false,
    actions: players.map((player, index) => ({
      id: `effect_target_${index}`,
      label: playerLabel(player, index),
      variant: index === state.currentPlayerIndex ? 'secondary' : 'primary'
    })),
    onAction: (selectedAction) => {
      if (!active) return false;

      const targetIndex = targetIndexFromAction(selectedAction?.id);
      if (targetIndex === null || targetIndex < 0 || targetIndex >= players.length) return false;

      onPick?.(targetIndex, cleanupAfterPick);
      return true;
    }
  });

  return cleanup;
}

export const effectSelectionUi = Object.freeze({
  clearPickMode,
  enablePlayerNameSelection
});
