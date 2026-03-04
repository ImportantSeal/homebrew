import { resetMirrorState } from './mirror.js';

export function useItem(
  state,
  playerIndex,
  itemIndex,
  log,
  updateTurnOrder,
  renderItemsBoard,
  updateTurn,
  ui = {}
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
      log(`${player.name} used Immunity. No automatic effect; resolve it manually.`);
      return;

    case "Reveal Free":
      if (state.hiddenIndex !== null && !state.revealed[state.hiddenIndex]) {
        const idx = state.hiddenIndex;
        state.revealed[idx] = true;

        if (typeof ui.revealHiddenCard === 'function') {
          ui.revealHiddenCard(state, idx);
        }

        log(`${player.name} used Reveal Free! Mystery card revealed.`);
      } else {
        log("No mystery card to reveal.");
      }
      return;

    case "Mirror":
      resetMirrorState(state);
      log(`${player.name} used Mirror. No automatic target selection in this version.`);
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
