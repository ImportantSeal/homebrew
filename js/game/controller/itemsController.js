import { flipCardAnimation } from '../../animations.js';
import { useItem } from '../../logic/items.js';
import { getCardDisplayValue } from '../../utils/cardDisplay.js';
import { getCardElements, setCardKind } from '../../ui/cards.js';
import { renderItemsBoard } from '../../ui/itemsBoard.js';

function revealHiddenCard(state, index) {
  const cards = getCardElements();
  const cardEl = cards[index];
  if (!cardEl) return;

  setCardKind(state, cardEl, state.currentCards[index], false);
  flipCardAnimation(cardEl, getCardDisplayValue(state.currentCards[index]));
}

export function createItemsController({
  state,
  log,
  renderTurnHeader,
  renderEffectsPanel,
  updateTurn
}) {
  function renderItems() {
    if (!state.includeItems) return;

    renderItemsBoard(state, (playerIndex, itemIndex, itemName) => {
      if (state.choiceSelection?.active) {
        log("Resolve the current card choice first.");
        return;
      }

      if (state.effectSelection?.active) {
        log("Pick a target player first (effect selection is active).");
        return;
      }

      const isImmunity = String(itemName || '').trim() === 'Immunity';
      const isCurrentPlayersItem = playerIndex === state.currentPlayerIndex;

      if (!isCurrentPlayersItem && !isImmunity) {
        log("Only the active player can use items. Immunity can be used anytime.");
        return;
      }

      useItem(
        state,
        playerIndex,
        itemIndex,
        log,
        renderTurnHeader,
        renderItems,
        updateTurn,
        { revealHiddenCard }
      );

      renderEffectsPanel();
    });
  }

  return {
    renderItems
  };
}
