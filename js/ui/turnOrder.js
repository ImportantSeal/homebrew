export function renderTurnOrder(state) {
  const turnOrderElem = document.getElementById('turn-order');
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
    playerDiv.appendChild(nameSpan);

    const dropdownDiv = document.createElement('div');
    dropdownDiv.classList.add('player-dropdown');

    const ul = document.createElement('ul');
    if (!player.inventory || player.inventory.length === 0) {
      const li = document.createElement('li');
      li.textContent = "No items";
      ul.appendChild(li);
    } else {
      player.inventory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
    }
    dropdownDiv.appendChild(ul);
    playerDiv.appendChild(dropdownDiv);

    // sama toiminta kuin ennen: nimi togglettaa dropdownin
    nameSpan.addEventListener('click', (e) => {
      dropdownDiv.classList.toggle('show');
      e.stopPropagation();
    });

    turnOrderElem.appendChild(playerDiv);

    if (index < state.players.length - 1) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = " → ";
      turnOrderElem.appendChild(arrowSpan);
    }
  });
}
