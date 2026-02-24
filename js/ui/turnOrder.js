// js/ui/turnOrder.js
import { applyPlayerColor, ensurePlayerColor, ensurePlayerColors } from '../utils/playerColors.js';

export function renderTurnOrder(state) {
  const turnOrderElem = document.getElementById('turn-order');
  if (!turnOrderElem) return;

  turnOrderElem.innerHTML = "";
  ensurePlayerColors(state.players);

  state.players.forEach((player, index) => {
    const color = ensurePlayerColor(player, index);
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('turn-player-wrapper');

    const nameSpan = document.createElement('button');
    nameSpan.type = 'button';
    nameSpan.classList.add('turn-player-name');
    nameSpan.dataset.index = String(index);
    applyPlayerColor(nameSpan, color);

    const nameText = document.createElement(index === state.currentPlayerIndex ? 'strong' : 'span');
    nameText.className = 'player-name-token';
    nameText.textContent = player.name;
    if (index === state.currentPlayerIndex) {
      nameText.classList.add('is-current');
    }
    nameSpan.appendChild(nameText);

    playerDiv.appendChild(nameSpan);
    turnOrderElem.appendChild(playerDiv);

    if (index < state.players.length - 1) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = " → ";
      turnOrderElem.appendChild(arrowSpan);
    }
  });
}
