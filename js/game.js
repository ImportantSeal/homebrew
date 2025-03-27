import { state } from './state.js';
import { addHistoryEntry } from './cardHistory.js';
import { flipCardAnimation, flashElement } from './animations.js';

// Apufunktio, joka palauttaa kortin näytettävän arvon
function getCardDisplayValue(card) {
  if (typeof card === 'object' && card !== null) {
    return card.name || "";
  }
  return card;
}

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

  // Redraw-nappula: näyttää penaltyn ja 1 sekunnin viiveen jälkeen refreshaa kortit
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

  // Päivitetään vuorojärjestys turn-order -elementtiin
  const turnOrderElem = document.getElementById('turn-order');
  const order = state.players.map((p, index) => 
    index === state.currentPlayerIndex ? `<strong>${p.name}</strong>` : p.name
  );
  turnOrderElem.innerHTML = 'Turn Order: ' + order.join(' → ');
  
  updateInventoryDisplay();
  resetCards();
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
    let card;
    const cardTypeChance = Math.random();
    
    // Määritellään todennäköisyydet eri korttityypeille:
    if (cardTypeChance < 0.2) {
      card = randomFromArray(state.socialCards);
    } else if (cardTypeChance < 0.3) {
      card = state.crowdChallenge;
    } else if (cardTypeChance < 0.4) {
      card = state.special;
    } else {
      card = randomFromArray(state.normalDeck);
    }
    
    // Mahdollisuus Immunity- tai item-kortille:
    const r = Math.random();
    if (r < 0.01) {
      card = "Immunity";
    } else if (r < 0.02) {
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
      // Käytetään apufunktiota, jotta varmistetaan oikea näytettävä arvo
      flipCardAnimation(cards[i], getCardDisplayValue(state.currentCards[i]));
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

  // Poistetaan click-listenerit väliaikaisesti
  cards.forEach(card => card.onclick = null);
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Jos korttia ei ole vielä paljastettu, paljasta se
  if (!state.revealed[index]) {
    state.revealed[index] = true;
    flipCardAnimation(cards[index], getCardDisplayValue(state.currentCards[index]));
    setTimeout(() => {
      cards[index].onclick = () => selectCard(index);
    }, 700);
    return;
  }

  const cardData = state.currentCards[index];

  // Jos kyseessä on haastekortti (esim. Challenge, Crowd Challenge, Special Card)
  if (typeof cardData === 'object' && cardData.subcategories) {
    const challengeEvent = randomFromArray(cardData.subcategories);
    let challengeText;
    if (typeof challengeEvent === 'object') {
      challengeText = challengeEvent.instruction || challengeEvent.name;
    } else {
      challengeText = challengeEvent;
    }
    flipCardAnimation(cards[index], challengeText);
    log(`${currentPlayer.name} drew ${getCardDisplayValue(cardData)}: ${challengeText}`);
    nextPlayer();
    return;
  }

  const revealedValue = cards[index].dataset.value || cards[index].textContent;

  // Jos paljastunut kortti on item (kuten Immunity), käsitellään se samalla tavalla kuin muut itemit
  if (state.itemCards.includes(revealedValue)) {
    log(`${currentPlayer.name} acquired item: ${revealedValue}`);
    currentPlayer.inventory.push(revealedValue);
    flashElement(cards[index]);
    updateInventoryDisplay();
    nextPlayer();
    return;
  }

  // Tarkistetaan, onko Ditto-tila jo aktiivinen
  if (state.dittoActive[index]) {
    // Käytetään aikaleimaa: jos aktivointi on alle 1 sekunnin takaa, ei vahvisteta
    const activationTime = parseInt(cards[index].dataset.dittoTime || "0", 10);
    if (Date.now() - activationTime < 1000) {
      // Liian nopea klikkaus; odotetaan vahvistusklikkausta myöhemmin
      cards[index].onclick = () => selectCard(index);
      return;
    }
    log(`${currentPlayer.name} confirmed Ditto card.`);
    state.dittoActive[index] = false;
    cards[index].style.backgroundColor = "white";
    cards[index].style.borderColor = "black";
    cards[index].style.backgroundImage = "";
    nextPlayer();
    return;
  }

  // Aktivoidaan Ditto-efekti satunnaisesti
  if (Math.random() < 0.03) {
    state.dittoActive[index] = true;
    cards[index].dataset.value = "Ditto";
    cards[index].textContent = "";
    cards[index].style.borderColor = "purple";
    cards[index].style.backgroundColor = "#E6E6FA";
    cards[index].style.backgroundImage = "url('images/ditto.png')";
    cards[index].style.backgroundSize = "cover";
    cards[index].style.backgroundPosition = "center";
    log("Ditto effect activated! Click again to confirm.");
    
    // Tallennetaan aktivointiaika
    cards[index].dataset.dittoTime = Date.now();

    const dittoEvents = [
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
        log("Ditto says: Drink 3!");
      },
      () => {
        log("Ditto started a Waterfall!");
      },
      () => {
        log("Ditto ordered a Shot! Take a shot now.");
      },
      () => {
        log("Ditto started challenge! Prepare for a random challenge.");
        const challenges = [
          "Challenge: Truth or Drink",
          "Challenge: Dare",
          "Challenge: Mini King",
          "Categories"
        ];
        const challenge = randomFromArray(challenges);
        log(challenge);
      },
      () => {
        log("Ditto wants to roll the penalty deck for everyone! The penalty applies to all players.");
        //rollPenaltyCard();
      }
    ];

    const randomEvent = randomFromArray(dittoEvents);
    if (randomEvent) {
      randomEvent();
    } else {
      log("No Ditto event triggered.");
    }

    // Palautetaan click-toiminto heti, sillä vahvistus tarkistetaan seuraavalla klikkauksella
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
  
  switch (item) {
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
        flipCardAnimation(cards[state.hiddenIndex], getCardDisplayValue(state.currentCards[state.hiddenIndex]));
        log(`${currentPlayer.name} used Reveal Free! Hidden card revealed.`);
      } else {
        log("No hidden card to reveal.");
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
    case "Immunity":
      log(`${currentPlayer.name} used Immunity and dodged challenge!`);
      break;
    default:
      log(`${currentPlayer.name} used ${item}. (No effect)`);
  }
}


function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
