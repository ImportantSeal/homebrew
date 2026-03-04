import { runSpecialChoiceAction } from '../specialActions.js';
import { isChoiceSelectionActive, clearChoiceSelection } from './guards.js';

export function createChoiceFlow({
  state,
  currentPlayer,
  playerName,
  log,
  applyDrinkEvent,
  rollPenaltyCard,
  openActionScreen,
  resetCards,
  nextPlayer,
  unlockUI,
  renderEffectsPanel,
  syncBackgroundScene
}) {
  function startChoiceSelection(choice, fallbackTitle = "Choose One", fallbackMessage = "") {
    if (!choice || choice.type !== "choice" || !Array.isArray(choice.options) || choice.options.length === 0) {
      log("Card choice setup failed.");
      return false;
    }

    state.choiceSelection = {
      active: true,
      pending: choice
    };

    const title = String(choice.title || fallbackTitle || "Choose One").trim() || "Choose One";
    const message = String(choice.message || fallbackMessage || "Choose one option to continue.").trim()
      || "Choose one option to continue.";
    const variant = String(choice.variant || "choice").trim() || "choice";

    openActionScreen(title, message, {
      variant,
      dismissible: false,
      actions: choice.options.map((option) => ({
        id: option.id,
        label: option.label,
        variant: option.variant || "primary"
      })),
      onAction: (selectedAction) => {
        if (!isChoiceSelectionActive(state)) return false;

        const pendingChoice = state.choiceSelection?.pending;
        const result = runSpecialChoiceAction(pendingChoice, selectedAction?.id, {
          state,
          currentPlayer: currentPlayer(),
          currentPlayerIndex: state.currentPlayerIndex,
          playerName,
          log,
          applyDrinkEvent,
          rollPenaltyCard
        });

        if (!result) {
          log("Invalid choice. Pick one of the listed options.");
          return false;
        }

        clearChoiceSelection(state);
        syncBackgroundScene(state);

        if (result.choice) {
          const chained = startChoiceSelection(
            result.choice,
            title,
            message
          );

          if (chained) {
            unlockUI();
            renderEffectsPanel();
            // Keep modal open because we immediately rendered the follow-up choice.
            return false;
          }

          log("Follow-up choice setup failed.");
        }

        if (result.refreshCards) {
          resetCards();
        }

        if (result.endTurn ?? true) {
          nextPlayer();
        }

        unlockUI();
        renderEffectsPanel();
        return true;
      }
    });

    return true;
  }

  return {
    startChoiceSelection
  };
}
