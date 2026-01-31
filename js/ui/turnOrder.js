// js/ui/turnOrder.js

export function renderTurnOrder(state) {
  const turnOrderElem = document.getElementById('turn-order');
  if (!turnOrderElem) return;

  turnOrderElem.innerHTML = "";

  state.players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('turn-player-wrapper');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('turn-player-name');

    if (index === state.currentPlayerIndex) {
      nameSpan.innerHTML = `<strong>${player.name}</strong>`;
    } else {
      nameSpan.textContent = player.name;
    }

    // ✅ EI dropdownia, EI toggle-clickiä täällä
    playerDiv.appendChild(nameSpan);
    turnOrderElem.appendChild(playerDiv);

    if (index < state.players.length - 1) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = " → ";
      turnOrderElem.appendChild(arrowSpan);
    }
  });
}
