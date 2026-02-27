import { state } from './state.js';
import { startGame } from './game.js';
import { applyPlayerColor, ensurePlayerColor, ensurePlayerColors } from './utils/playerColors.js';

export function initSetup() {
  const MIN_PLAYERS = 2;

  const setupContainer = document.getElementById('setup-container');
  const playerInput = document.getElementById('player-input');
  const addPlayerButton = document.getElementById('add-player-button');
  const playerList = document.getElementById('player-list');
  const includeItemsCheckbox = document.getElementById('include-items-checkbox');
  const includeItemsMenuToggle = document.getElementById('include-items-menu-toggle');
  const itemsInfoMenu = document.getElementById('items-info-menu');
  const startGameButton = document.getElementById('start-game-button');

  if (includeItemsCheckbox) includeItemsCheckbox.checked = false;
  state.includeItems = false;

  function openItemsMenu() {
    if (!itemsInfoMenu) return;
    itemsInfoMenu.hidden = false;
    includeItemsMenuToggle?.setAttribute('aria-expanded', 'true');
  }

  function closeItemsMenu(restoreFocus = false) {
    if (!itemsInfoMenu) return;
    itemsInfoMenu.hidden = true;
    includeItemsMenuToggle?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) includeItemsMenuToggle?.focus?.();
  }

  includeItemsMenuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (itemsInfoMenu?.hidden) openItemsMenu();
    else closeItemsMenu();
  });

  itemsInfoMenu?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    if (!itemsInfoMenu || itemsInfoMenu.hidden) return;
    const target = event.target;
    if (includeItemsMenuToggle?.contains(target)) return;
    if (target && target.closest && target.closest('#items-info-menu')) return;
    closeItemsMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && itemsInfoMenu && !itemsInfoMenu.hidden) {
      closeItemsMenu(true);
    }
  });

  // Lisää pelaaja kun Add Player -nappia klikataan
  addPlayerButton.addEventListener('click', addPlayer);

  // Lisää pelaaja, kun Enter-näppäintä painetaan syötekentässä
  playerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      addPlayer();
    }
  });

  startGameButton.addEventListener('click', () => {
    if (state.players.length >= MIN_PLAYERS) {
      ensurePlayerColors(state.players);
      state.includeItems = Boolean(includeItemsCheckbox?.checked);
      if (itemsInfoMenu && !itemsInfoMenu.hidden) closeItemsMenu();
      setupContainer.style.display = "none";
      startGame();
    }
  });

  function addPlayer() {
    const name = playerInput.value.trim();
    if (name && !state.players.some(p => p.name === name)) {
      const player = { name, inventory: [] };
      ensurePlayerColor(player, state.players.length, state.players);
      state.players.push(player);
      updatePlayerList();
      playerInput.value = "";
      startGameButton.disabled = state.players.length < MIN_PLAYERS;
    }
  }

  function updatePlayerList() {
    playerList.innerHTML = "";
    state.players.forEach((player, index) => {
      const color = ensurePlayerColor(player, index, state.players);
      const li = document.createElement('li');
      li.classList.add('player-name-token');
      applyPlayerColor(li, color);
      li.textContent = player.name;
      playerList.appendChild(li);
    });
  }
}
