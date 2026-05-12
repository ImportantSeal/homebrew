import {
  isChoiceSelectionActive,
  clearChoiceSelection,
  clearSharePenaltyState
} from './guards.js';
import { recordPenaltyTaken } from '../../../stats.js';
import { getPenaltyDisplayValue, getPenaltySpec } from '../../../logic/penaltySchema.js';
import { FLOW_TRANSITIONS, transitionFlow } from '../../../logic/flowMachine.js';
import { getPlayerColorByIndex } from '../../../utils/playerColors.js';

export function createSharePenaltyFlow({
  state,
  log,
  playerName,
  nextPlayer,
  unlockUI,
  renderEffectsPanel,
  renderItems,
  openActionScreen,
  applyDrinkEvent,
  syncBackgroundScene
}) {
  function applySharedPenaltyToTarget(targetIndex, penaltyCard) {
    const targetPlayer = state.players?.[targetIndex];
    if (!targetPlayer) return false;

    if (targetPlayer.shield) {
      delete targetPlayer.shield;
      log(`${targetPlayer.name}'s Shield protected against the shared penalty!`);
      return true;
    }

    const penaltySpec = getPenaltySpec(penaltyCard);
    if (!penaltySpec?.label) return false;

    recordPenaltyTaken(state, targetIndex);
    if (!penaltySpec.drink) return false;

    applyDrinkEvent(state, targetIndex, penaltySpec.drink.amount, 'Shared Penalty', log);
    return true;
  }

  function startSharePenaltyTargetSelection(penaltyCard) {
    const share = state.sharePenalty;
    if (!share?.active) return false;

    const resolvedPenalty = getPenaltyDisplayValue(penaltyCard ?? share.penalty);
    if (!resolvedPenalty) {
      clearSharePenaltyState(state);
      log('Share Penalty could not continue because no penalty card was available.');
      return false;
    }

    const sourcePlayerIndex = Number.isInteger(share.sourcePlayerIndex)
      ? share.sourcePlayerIndex
      : state.currentPlayerIndex;

    const candidates = Array.isArray(state.players)
      ? state.players
        .map((_, idx) => ({ idx, name: playerName(idx), color: getPlayerColorByIndex(state.players, idx) }))
        .filter((entry) => entry.idx !== sourcePlayerIndex)
      : [];

    if (candidates.length === 0) {
      clearSharePenaltyState(state);
      log('Share Penalty needs at least one other player.');
      return false;
    }

    const startChoice = transitionFlow(state, FLOW_TRANSITIONS.START_CHOICE, {
      pendingChoice: {
        type: 'share_penalty_target',
        penalty: penaltyCard ?? share.penalty,
        penaltyLabel: resolvedPenalty,
        sourcePlayerIndex
      }
    });
    if (!startChoice.ok) {
      clearSharePenaltyState(state);
      log('Share Penalty target selection could not be started.');
      return false;
    }

    openActionScreen(
      'Share Penalty',
      `Pick one other player to share penalty: ${resolvedPenalty}.`,
      {
        variant: 'penalty',
        dismissible: false,
        actions: candidates.map((entry) => ({
          id: `share_penalty_${entry.idx}`,
          label: entry.name,
          playerColor: entry.color,
          variant: 'danger'
        })),
        onAction: (selectedAction) => {
          if (!isChoiceSelectionActive(state)) return false;

          const selectedId = String(selectedAction?.id || '');
          const match = selectedId.match(/^share_penalty_(\d+)$/);
          if (!match) {
            log('Invalid share target. Pick one of the listed players.');
            return false;
          }

          const targetIndex = Number.parseInt(match[1], 10);
          const playerCount = state.players?.length || 0;
          if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= playerCount) {
            log('Invalid share target. Pick one of the listed players.');
            return false;
          }

          const pending = state.choiceSelection?.pending;
          if (targetIndex === pending?.sourcePlayerIndex) {
            log('Pick one other player (not yourself).');
            return false;
          }

          const targetName = playerName(targetIndex);
          const penaltyCardToApply = pending?.penalty ?? penaltyCard;
          const penaltyLabel = pending?.penaltyLabel || resolvedPenalty;
          log(`${targetName} shares penalty: ${penaltyLabel}.`);

          const applied = applySharedPenaltyToTarget(targetIndex, penaltyCardToApply);
          if (!applied) {
            log(`Shared penalty could not be auto-applied (${penaltyLabel}). Resolve it manually.`);
          }

          clearChoiceSelection(state);
          clearSharePenaltyState(state);
          syncBackgroundScene(state);
          renderItems();
          nextPlayer();
          unlockUI();
          renderEffectsPanel();
          return true;
        }
      }
    );

    return true;
  }

  return {
    startSharePenaltyTargetSelection
  };
}
