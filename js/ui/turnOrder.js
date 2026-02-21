// js/ui/turnOrder.js

export function renderTurnOrder(state) {
  const turnOrderElem = document.getElementById('turn-order');
  if (!turnOrderElem) return;

  turnOrderElem.innerHTML = "";

  state.players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('turn-player-wrapper');

    const nameSpan = document.createElement('button');
    nameSpan.type = 'button';
    nameSpan.classList.add('turn-player-name');
    nameSpan.dataset.index = String(index);

    if (index === state.currentPlayerIndex) {
      const strong = document.createElement('strong');
      strong.textContent = player.name;
      nameSpan.appendChild(strong);
    } else {
      nameSpan.textContent = player.name;
    }

    playerDiv.appendChild(nameSpan);
    turnOrderElem.appendChild(playerDiv);

    if (index < state.players.length - 1) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = " → ";
      turnOrderElem.appendChild(arrowSpan);
    }
  });
}
