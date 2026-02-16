import { flipCardAnimation } from '../animations.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';
import { setCardKind } from '../ui/cards.js';

function getCardEls() {
  return [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
}

export function useItem(
  state,
  playerIndex,
  itemIndex,
  log,
  updateTurnOrder,
  renderItemsBoard,
  updateTurn
) {
  const player = state.players[playerIndex];
  const item = player.inventory[itemIndex];
  if (!item) return;

  // Poista käytetty item (sama kuin ennen)
  player.inventory.splice(itemIndex, 1);
  updateTurnOrder();
  renderItemsBoard();

  switch (item) {
    case "Shield":
      player.shield = true;
      log(`${player.name} activated Shield! Your next penalty will be blocked.`);
      return;

    case "Immunity":
      log(`${player.name} used Immunity. And cancelled the next drink.`);
      return;

    case "Reveal Free":
      if (state.hiddenIndex !== null && !state.revealed[state.hiddenIndex]) {
        const cards = getCardEls();
        const idx = state.hiddenIndex;

        state.revealed[idx] = true;

        // NOW that it's revealed: apply real kind styling
        setCardKind(state, cards[idx], state.currentCards[idx], false);

        flipCardAnimation(cards[idx], getCardDisplayValue(state.currentCards[idx]));
        log(`${player.name} used Reveal Free! Mystery card revealed.`);
      } else {
        log("No mystery card to reveal.");
      }
      return;

    case "Mirror":
      state.mirror = {
        active: false,
        sourceIndex: null,
        selectedCardIndex: null,
        parentName: "",
        subName: "",
        subInstruction: "",
        displayText: ""
      };
      log(`${player.name} used Mirror. (No target selection.)`);
      return;

    case "Skip Turn":
      if (playerIndex === state.currentPlayerIndex) {
        const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
        const nextName = state.players[nextIndex].name;
        log(`${player.name} used Skip Turn and passes their turn to ${nextName}.`);
        state.currentPlayerIndex = nextIndex;
        updateTurn();
        return;
      }
      player.skipNextTurn = true;
      log(`${player.name} used Skip Turn. Their next turn will be skipped.`);
      return;

    default:
      log(`${player.name} used ${item}. (No effect)`);
      return;
  }
}
