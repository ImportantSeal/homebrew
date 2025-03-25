import { state } from './state.js';
import { addHistoryEntry } from './cardHistory.js';
import { flipCardAnimation, flashElement } from './animations.js';

export function startGame() {
  initGameView();
  setupEventListeners();
  updateTurn();
}

function initGameView() {
  const gameContainer = document.getElementById('game-container');
  gameContainer.style.display = "block";
  hidePenaltyCard();
}

function setupEventListeners() {
  const cards = [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
  cards.forEach((card, index) => {
    card.addEventListener('click', () => selectCard(index));
  });

  // Redraw-nappula toimii
  document.getElementById('redraw-button').addEventListener('click', () => {
    redrawGame();
    const currentPlayer = state.players[state.currentPlayerIndex];
    log(`${currentPlayer.name} used Redraw to reveal penalty card and refresh cards.`);
  });

  // Myös penalty deckin klikkaus paljastaa penaltyn
  document.getElementById('penalty-deck').addEventListener('click', () => {
    if (!state.penaltyShown) {
      rollPenaltyCard();
      const currentPlayer = state.players[state.currentPlayerIndex];
      log(`${currentPlayer.name} clicked Penalty Deck and revealed penalty card.`);
    }
  });
}

function log(message) {
  addHistoryEntry(message);
}

function nextPlayer() {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.extraLife) {
    log(`${currentPlayer.name} uses Extra Life to keep their turn.`);
    delete currentPlayer.extraLife;
    updateTurn();
    return;
  }
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  updateTurn();
}

function updateTurn() {
  const turnIndicator = document.getElementById('turn-indicator');
  const currentPlayer = state.players[state.currentPlayerIndex];
  turnIndicator.textContent = `${currentPlayer.name}'s Turn`;
  updateInventoryDisplay();
  resetCards();
  hidePenaltyCard();
}

function updateInventoryDisplay() {
  const inventoryList = document.getElementById('inventory-list');
  const currentPlayer = state.players[state.currentPlayerIndex];
  inventoryList.innerHTML = "";
  if (currentPlayer.inventory.length === 0) {
    const li = document.createElement('li');
    li.textContent = "No items";
    inventoryList.appendChild(li);
  } else {
    currentPlayer.inventory.forEach((item, index) => {
      const li = document.createElement('li');
      li.textContent = `${item} (click to use)`;
      li.addEventListener('click', () => useItem(index));
      inventoryList.appendChild(li);
    });
  }
}

function resetCards() {
  state.redrawUsed = false;
  state.currentCards = [];
  // Arvotaan 3 korttia normalDeckistä/itemDeckistä
  for (let i = 0; i < 3; i++) {
    let card = randomFromArray(state.normalDeck);
    if (Math.random() < 0.3) {
      card = randomFromArray(state.itemCards);
    }
    state.currentCards.push(card);
  }
  state.hiddenIndex = Math.floor(Math.random() * 3);
  state.revealed = [true, true, true];
  state.revealed[state.hiddenIndex] = false;
  state.dittoActive = [false, false, false];

  const cards = [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
  for (let i = 0; i < 3; i++) {
    cards[i].style.borderColor = "black";
    cards[i].style.backgroundColor = "white";
    if (!state.revealed[i]) {
      flipCardAnimation(cards[i], "???");
    } else {
      flipCardAnimation(cards[i], state.currentCards[i]);
    }
    cards[i].onclick = () => selectCard(i);
  }
  hidePenaltyCard();
}

function selectCard(index) {
  const cards = [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
  if (state.penaltyShown) {
    hidePenaltyCard();
  }
  cards.forEach(card => card.onclick = null);
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (!state.revealed[index]) {
    state.revealed[index] = true;
    flipCardAnimation(cards[index], state.currentCards[index]);
    setTimeout(() => {
      cards[index].onclick = () => selectCard(index);
    }, 700);
    return;
  }

  if (state.dittoActive[index]) {
    log(`${currentPlayer.name} confirmed Ditto card.`);
    cards[index].style.backgroundColor = "white";
    cards[index].style.borderColor = "black";
    nextPlayer();
    return;
  }

  const revealedValue = cards[index].textContent;
  if (state.itemCards.includes(revealedValue)) {
    log(`${currentPlayer.name} acquired item: ${revealedValue}`);
    currentPlayer.inventory.push(revealedValue);
    flashElement(cards[index]);
    updateInventoryDisplay();
    nextPlayer();
    return;
  }

  if (Math.random() < 0.25) {
    state.dittoActive[index] = true;
    cards[index].textContent = "Ditto";
    cards[index].style.borderColor = "purple";
    cards[index].style.backgroundColor = "#E6E6FA";
    log("Ditto effect activated! Click again to confirm.");
    cards[index].onclick = () => selectCard(index);
    return;
  }

  log(`${currentPlayer.name} selected ${revealedValue}`);
  flashElement(cards[index]);
  nextPlayer();
}

function rollPenaltyCard() {
  if (state.penaltyShown) return;
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.shield) {
    log(`${currentPlayer.name}'s Shield protected against the penalty!`);
    delete currentPlayer.shield;
    return;
  }
  const penalty = randomFromArray(state.penaltyDeck);
  state.penaltyCard = penalty;
  state.penaltyShown = true;
  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, penalty);
  log(`${currentPlayer.name} rolled penalty card: ${penalty}`);
}

function hidePenaltyCard() {
  state.penaltyShown = false;
  state.penaltyCard = null;
  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}

function redrawGame() {
  // Molemmat toiminnot: penalty paljastuu ja kortit refreshataan
  rollPenaltyCard();
  setTimeout(() => {
    resetCards();
  }, 1000);
}

function useItem(itemIndex) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const item = currentPlayer.inventory[itemIndex];
  if (!item) return;
  currentPlayer.inventory.splice(itemIndex, 1);
  updateInventoryDisplay();
  
  switch(item) {
    case "Shield":
      currentPlayer.shield = true;
      log(`${currentPlayer.name} used Shield! Your next penalty will be negated.`);
      break;
    case "Reveal Free":
      if (state.hiddenIndex !== null && !state.revealed[state.hiddenIndex]) {
        const cards = [
          document.getElementById('card0'),
          document.getElementById('card1'),
          document.getElementById('card2')
        ];
        state.revealed[state.hiddenIndex] = true;
        flipCardAnimation(cards[state.hiddenIndex], state.currentCards[state.hiddenIndex]);
        log(`${currentPlayer.name} used Reveal Free! Hidden card revealed.`);
      } else {
        log(`No hidden card to reveal.`);
      }
      break;
    case "Extra Life":
      currentPlayer.extraLife = true;
      log(`${currentPlayer.name} used Extra Life! You get another turn.`);
      break;
    case "Redraw":
      redrawGame();
      log(`${currentPlayer.name} used Redraw! Penalty card revealed and cards refreshed.`);
      break;
    default:
      log(`${currentPlayer.name} used ${item}. (No effect)`);
  }
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
