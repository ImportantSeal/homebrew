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

  // Redraw-nappula: näyttää penaltyn ja 1 sekunnin viiveen jälkeen refreshaa normaalikortit
  document.getElementById('redraw-button').addEventListener('click', () => {
    redrawGame();
    const currentPlayer = state.players[state.currentPlayerIndex];
    log(`${currentPlayer.name} used Redraw to reveal penalty card and refresh cards.`);
  });
  
  // Penalty deck: näyttää vain penaltyn (ei refreshing)
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

  // Päivitetään vuorojärjestys overlay
  const turnOrderOverlay = document.getElementById('turn-order-overlay');
  const playerNames = state.players.map((p, index) => {
    return index === state.currentPlayerIndex ? `<strong>${p.name}</strong>` : p.name;
  });
  turnOrderOverlay.innerHTML = 'Turn Order: ' + playerNames.join(' &rarr; ');

  updateInventoryDisplay();
  resetCards();
  // Jos redrawa ei haluta automaattisesti piilottaa penaltyä, hidePenaltyCard() voidaan kutsua normaalin kortin valinnassa.
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
  state.currentCards = [];
  for (let i = 0; i < 3; i++) {
    // Aloitetaan normaalista kortista
    let card = randomFromArray(state.normalDeck);
    const r = Math.random();
    if (r < 0.25) {
      // 25 % mahdollisuus saada Immunity‐kortti
      card = "Immunity";
    } else if (r < 0.3) {
      // Muilla itemeillä on yhteensä 5 % mahdollisuus ilmestyä
      const otherItems = state.itemCards.filter(item => item !== "Immunity");
      card = randomFromArray(otherItems);
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
  
  // Jos penalty on näkyvissä, piilota se ennen normaalin kortin käsittelyä
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
    // Nollataan ditto-tila ja palauta tyylit
    state.dittoActive[index] = false;
    cards[index].style.backgroundColor = "white";
    cards[index].style.borderColor = "black";
    cards[index].style.backgroundImage = "";
    nextPlayer();
    return;
  }
  
  const revealedValue = cards[index].dataset.value || cards[index].textContent;
  
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
    cards[index].dataset.value = "Ditto";
    cards[index].textContent = ""; // Clear text content to avoid overlap with the image
    cards[index].style.borderColor = "purple";
    cards[index].style.backgroundColor = "#E6E6FA";
    cards[index].style.backgroundImage = "url('images/ditto.png')"; // Add the Ditto image
    cards[index].style.backgroundSize = "cover"; // Ensure the image covers the card
    cards[index].style.backgroundPosition = "center"; // Center the image
    log("Ditto effect activated! Click again to confirm.");

    // Define a pool of Ditto-specific events
    const dittoEvents = [
      () => {
          log("Ditto transformed into a Shield! You gain a Shield.");
          state.players[state.currentPlayerIndex].shield = true;
      },
      () => {
          log("Ditto caused chaos! All players lose one item.");
          state.players.forEach(player => {
              if (player.inventory.length > 0) {
                  player.inventory.pop();
              }
          });
          updateInventoryDisplay();
      },
      () => {
          const otherPlayers = state.players.filter((_, i) => i !== state.currentPlayerIndex);
          const targetPlayer = randomFromArray(otherPlayers);
          if (targetPlayer.inventory.length > 0) {
              const stolenItem = targetPlayer.inventory.pop();
              state.players[state.currentPlayerIndex].inventory.push(stolenItem);
              log(`Ditto stole ${stolenItem} from ${targetPlayer.name}!`);
              updateInventoryDisplay();
          } else {
              log("Ditto tried to steal, but the target player had no items.");
          }
      },
      () => {
          log("Ditto revealed all hidden cards!");
          const cards = [
              document.getElementById('card0'),
              document.getElementById('card1'),
              document.getElementById('card2')
          ];
          state.revealed = [true, true, true];
          cards.forEach((card, i) => {
              flipCardAnimation(card, state.currentCards[i]);
          });
      },
      () => {
          log("Ditto granted you Penalty Immunity! Your next penalty will be negated.");
          state.players[state.currentPlayerIndex].penaltyImmunity = true;
      }
  ];

    // Randomly select and execute a Ditto event
    const randomEvent = randomFromArray(dittoEvents);
    randomEvent();

    // Allow the player to confirm the Ditto card
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
  // Redraw: paljastaa penaltyn ja 1 sekunnin viiveen jälkeen uudistaa normaalikortit
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
