// js/ui/turnOrder.js
import { applyPlayerColor, ensurePlayerColor, ensurePlayerColors } from '../utils/playerColors.js';

let lastCurrentPlayerIndex = null;

function createTurnOrderSignature(state, canRemovePlayers, currentPlayerIndex) {
  return JSON.stringify({
    canRemovePlayers,
    currentPlayerIndex,
    players: (state?.players || []).map((player, index) => ({
      name: player?.name ?? '',
      color: ensurePlayerColor(player, index)
    }))
  });
}

export function renderTurnOrder(state) {
  const turnOrderElem = document.getElementById('turn-order');
  if (!turnOrderElem) return;

  ensurePlayerColors(state.players);
  const canRemovePlayers = (state?.players?.length || 0) > 2;
  const currentPlayerIndex = Number.isInteger(state?.currentPlayerIndex) ? state.currentPlayerIndex : null;
  const renderSignature = createTurnOrderSignature(state, canRemovePlayers, currentPlayerIndex);
  if (turnOrderElem.dataset.renderSignature === renderSignature && turnOrderElem.childElementCount > 0) {
    lastCurrentPlayerIndex = currentPlayerIndex;
    return;
  }

  const shouldAnimateCurrent = currentPlayerIndex !== null && currentPlayerIndex !== lastCurrentPlayerIndex;
  const fragment = document.createDocumentFragment();

  state.players.forEach((player, index) => {
    const color = ensurePlayerColor(player, index);
    const isCurrentPlayer = index === state.currentPlayerIndex;
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('turn-player-wrapper');

    const nameSpan = document.createElement('button');
    nameSpan.type = 'button';
    nameSpan.classList.add('turn-player-name');
    if (isCurrentPlayer) {
      nameSpan.classList.add('turn-player-name--current');
      if (shouldAnimateCurrent) {
        nameSpan.classList.add('turn-player-name--turn-enter');
      }
      nameSpan.setAttribute('aria-current', 'true');
    }
    nameSpan.dataset.index = String(index);
    applyPlayerColor(nameSpan, color);

    const nameText = document.createElement(isCurrentPlayer ? 'strong' : 'span');
    nameText.className = 'player-name-token';
    nameText.textContent = player.name;
    if (isCurrentPlayer) {
      nameText.classList.add('is-current');
    }
    nameSpan.appendChild(nameText);
    playerDiv.appendChild(nameSpan);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'turn-player-remove';
    removeBtn.dataset.index = String(index);
    removeBtn.setAttribute('aria-label', `Remove ${player.name} from game`);
    removeBtn.title = canRemovePlayers ? `Remove ${player.name}` : 'Need at least 2 players';
    removeBtn.textContent = 'x';
    if (!canRemovePlayers) {
      removeBtn.disabled = true;
    }
    playerDiv.appendChild(removeBtn);

    fragment.appendChild(playerDiv);

    if (index < state.players.length - 1) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = ' \u2192 ';
      fragment.appendChild(arrowSpan);
    }
  });

  turnOrderElem.replaceChildren(fragment);
  turnOrderElem.dataset.renderSignature = renderSignature;
  lastCurrentPlayerIndex = currentPlayerIndex;
}
