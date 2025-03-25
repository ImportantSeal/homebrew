import { state } from './state.js';
import { startGame } from './game.js';

export function initSetup() {
  const setupContainer = document.getElementById('setup-container');
  const playerInput = document.getElementById('player-input');
  const addPlayerButton = document.getElementById('add-player-button');
  const playerList = document.getElementById('player-list');
  const startGameButton = document.getElementById('start-game-button');

  // Lisää pelaaja kun Add Player -nappia klikataan
  addPlayerButton.addEventListener('click', addPlayer);

  // Lisää pelaaja, kun Enter-näppäintä painetaan syötekentässä
  playerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      addPlayer();
    }
  });

  startGameButton.addEventListener('click', () => {
    if (state.players.length > 0) {
      setupContainer.style.display = "none";
      startGame();
    }
  });

  function addPlayer() {
    const name = playerInput.value.trim();
    if (name && !state.players.some(p => p.name === name)) {
      state.players.push({ name: name, inventory: [] });
      updatePlayerList();
      playerInput.value = "";
      startGameButton.disabled = state.players.length === 0;
    }
  }

  function updatePlayerList() {
    playerList.innerHTML = "";
    state.players.forEach(player => {
      const li = document.createElement('li');
      li.textContent = player.name;
      playerList.appendChild(li);
    });
  }
}
