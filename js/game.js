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
  state.uiLocked = false;

  // Penalty: 1. klikki paljastaa, 2. klikki vahvistaa + nextPlayer
  state.penaltyConfirmArmed = false;

  // Ditto: tallennetaan pending-efekti per kortti, ja ajetaan confirmissa
  state.dittoPending = [null, null, null];

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
  // Redraw: penalty + 1s jälkeen uudet kortit (ei vaihda vuoroa)
  document.getElementById('redraw-button').addEventListener('click', () => {
    redrawGame();
    const currentPlayer = state.players[state.currentPlayerIndex];
    log(`${currentPlayer.name} used Redraw to reveal penalty card and refresh cards.`);
  });

  // Penalty Deck:
  // 1) click -> reveal
  // 2) click -> confirm + next turn
  document.getElementById('penalty-deck').addEventListener('click', () => {
    if (state.uiLocked) return;

    if (state.penaltyShown && state.penaltyConfirmArmed) {
      state.uiLocked = true;
      hidePenaltyCard();
      nextPlayer(); // <-- PELI JATKUU
      state.uiLocked = false;
      return;
    }

    if (!state.penaltyShown) {
      state.uiLocked = true;
      rollPenaltyCard();
      setTimeout(() => { state.uiLocked = false; }, 350);
      return;
    }

    hidePenaltyCard();
  });

  // Dropdownit kiinni kun klikataan muualle
  document.addEventListener('click', () => {
    document.querySelectorAll('.player-dropdown.show')
      .forEach(d => d.classList.remove('show'));
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

  updateTurnOrder();
  renderItemsBoard();
  resetCards();
}

function updateTurnOrder() {
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

function enableMirrorTargetSelection() {
  const nameEls = document.querySelectorAll('.turn-player-name');

  const cleanup = () => {
    nameEls.forEach(el => el.removeEventListener('click', onClick));
  };

  const onClick = (e) => {
    e.stopPropagation();

    const clickedName = e.currentTarget.textContent.trim();
    const targetIndex = state.players.findIndex(p => p.name === clickedName);
    if (targetIndex === -1) return;

    const sourceIndex = state.mirror.sourceIndex;
    const sourcePlayer = state.players[sourceIndex];
    const targetPlayer = state.players[targetIndex];

    const parent = state.mirror.parentName;
    const subName = state.mirror.subName;
    const subInstr = state.mirror.subInstruction;
    const detail = subInstr ? `${subName} — ${subInstr}` : subName || state.mirror.displayText;

    log(`${sourcePlayer.name} used Mirror on ${targetPlayer.name}: ${parent}${detail ? ' | ' + detail : ''}`);

    state.mirror = { active: false, sourceIndex: null, selectedCardIndex: null, parentName: '', subName: '', subInstruction: '', displayText: '' };
    cleanup();

    // Jos käytettiin omalla vuorolla, päätetään vuoro. Muuten ei sotketa vuoroa.
    if (sourceIndex === state.currentPlayerIndex) {
      nextPlayer();
    } else {
      updateTurnOrder();
      renderItemsBoard();
    }
  };

  nameEls.forEach(el => el.addEventListener('click', onClick));
}

// Itemit käytettävissä aina (myös muiden vuoroilla)
function renderItemsBoard() {
  const board = document.getElementById('items-board');
  if (!board) return;
  board.innerHTML = '';

  state.players.forEach((player, pIndex) => {
    const row = document.createElement('div');
    row.className = 'player-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = player.name + ':';
    row.appendChild(nameSpan);

    if (!player.inventory || player.inventory.length === 0) {
      const none = document.createElement('span');
      none.textContent = ' No items';
      row.appendChild(none);
    } else {
      player.inventory.forEach((item, iIndex) => {
        const badge = document.createElement('span');
        badge.className = 'item-badge clickable';
        badge.textContent = item;
        badge.title = 'Use this item';

        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          useItem(pIndex, iIndex);
          renderItemsBoard();
        });

        row.appendChild(badge);
      });
    }

    board.appendChild(row);
  });
}

function resetCards() {
  state.currentCards = [];
  state.dittoPending = [null, null, null];

  for (let i = 0; i < 3; i++) {
    let card;
    const cardTypeChance = Math.random();

    if (cardTypeChance < 0.2) {
      card = randomFromArray(state.socialCards);
    } else if (cardTypeChance < 0.3) {
      card = state.crowdChallenge;
    } else if (cardTypeChance < 0.4) {
      card = state.special;
    } else {
      card = randomFromArray(state.normalDeck);
    }

    const r = Math.random();
    if (r < 0.04) {
      card = "Immunity";
    } else if (r < 0.06) {
      const otherItems = state.itemCards.filter(item => item !== "Immunity");
      card = randomFromArray(otherItems);
    }

    state.currentCards.push(card);
  }

  // AINA yksi mystery ja kaksi näkyvää (turnin alussa)
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
    cards[i].style.backgroundImage = "";
    cards[i].style.backgroundSize = "";
    cards[i].style.backgroundPosition = "";

    if (!state.revealed[i]) {
      flipCardAnimation(cards[i], "???");
    } else {
      flipCardAnimation(cards[i], getCardDisplayValue(state.currentCards[i]));
    }

    // Yksi handler
    cards[i].onclick = () => selectCard(i);
  }

  hidePenaltyCard();
}

function selectCard(index) {
  if (state.uiLocked) return;
  state.uiLocked = true;

  const cards = [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];

  // Jos penalty on auki ja klikataan kortteja, piilota penalty (ei vaihda vuoroa)
  if (state.penaltyShown) {
    hidePenaltyCard();
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  // 1) Mystery: eka klikki vain paljastaa. (EI ADVANCE)
  if (!state.revealed[index]) {
    state.revealed[index] = true;
    flipCardAnimation(cards[index], getCardDisplayValue(state.currentCards[index]));
    // vapauta lukko flipin jälkeen -> toinen klikki voi valita
    setTimeout(() => { state.uiLocked = false; }, 700);
    return;
  }

  // Ditto confirm (täällä koska kortti on jo “paljastettu”)
  if (state.dittoActive[index]) {
    const activationTime = parseInt(cards[index].dataset.dittoTime || "0", 10);
    if (Date.now() - activationTime < 1000) {
      state.uiLocked = false;
      return;
    }

    log(`${currentPlayer.name} confirmed Ditto card.`);

    // Aja pending-efekti nyt
    runDittoEffect(index);

    // Reset ditto state + ulkoasu
    state.dittoActive[index] = false;
    state.dittoPending[index] = null;
    cards[index].style.backgroundColor = "white";
    cards[index].style.borderColor = "black";
    cards[index].style.backgroundImage = "";
    cards[index].dataset.value = "";

    nextPlayer();
    state.uiLocked = false;
    return;
  }

  const cardData = state.currentCards[index];

  // Mirror mode: primetetään kortti
  if (state.mirror && state.mirror.active && state.mirror.selectedCardIndex === null) {
    let displayText = '';
    let parentName = getCardDisplayValue(cardData);
    let subName = '';
    let subInstruction = '';

    if (typeof cardData === 'object' && cardData.subcategories) {
      const chosen = randomFromArray(cardData.subcategories);
      if (typeof chosen === 'object') {
        subName = chosen.name || '';
        subInstruction = chosen.instruction || '';
        displayText = subInstruction || subName;
      } else {
        subName = String(chosen);
        displayText = subName;
      }
    } else {
      displayText = getCardDisplayValue(cardData);
    }

    state.mirror.selectedCardIndex = index;
    state.mirror.parentName = parentName;
    state.mirror.subName = subName;
    state.mirror.subInstruction = subInstruction;
    state.mirror.displayText = displayText;

    log(`Mirror primed with: ${parentName}${subName ? ' - ' + subName : ''}${subInstruction ? ' — ' + subInstruction : ''}. Now click a player's name to target.`);
    enableMirrorTargetSelection();

    state.uiLocked = false;
    return;
  }

  // Haastekortit
  if (typeof cardData === 'object' && cardData.subcategories) {
    const challengeEvent = randomFromArray(cardData.subcategories);
    let subName = "";
    let subInstruction = "";
    let challengeText = "";

    if (typeof challengeEvent === 'object') {
      subName = challengeEvent.name || "";
      subInstruction = challengeEvent.instruction || "";
      challengeText = subInstruction || subName;
    } else {
      subName = String(challengeEvent);
      challengeText = subName;
    }

    flipCardAnimation(cards[index], challengeText);

    const parentName = getCardDisplayValue(cardData);
    const details = subInstruction ? `${subName} — ${subInstruction}` : `${subName}`;
    log(`${currentPlayer.name} drew ${parentName}: ${details}`);

    nextPlayer();
    state.uiLocked = false;
    return;
  }

  // Normaalikortit / itemit: käytä suoraan cardDataa (ei datasetin varassa)
  const value = getCardDisplayValue(cardData);

  // Item-kortit
  if (state.itemCards.includes(value)) {
    log(`${currentPlayer.name} acquired item: ${value}`);
    currentPlayer.inventory.push(value);
    flashElement(cards[index]);
    updateTurnOrder();
    renderItemsBoard();
    nextPlayer();
    state.uiLocked = false;
    return;
  }

  // Immunity kulutus
  if (state.players[state.currentPlayerIndex].immunity) {
    const txt = String(value).trim();
    if (/^(Drink\b|Everybody drinks\b)/i.test(txt)) {
      const p = state.players[state.currentPlayerIndex];
      delete p.immunity;
      log(`${p.name}'s Immunity prevented drinking from: ${txt}`);
      flashElement(cards[index]);
      nextPlayer();
      state.uiLocked = false;
      return;
    }
  }

  // Ditto aktivointi satunnaisesti
  if (Math.random() < 0.06) {
    state.dittoActive[index] = true;
    cards[index].dataset.value = "Ditto";
    cards[index].textContent = "";
    cards[index].style.borderColor = "purple";
    cards[index].style.backgroundColor = "#E6E6FA";
    cards[index].style.backgroundImage = "url('images/ditto.png')";
    cards[index].style.backgroundSize = "cover";
    cards[index].style.backgroundPosition = "center";
    log("Ditto effect activated! Click again to confirm.");

    cards[index].dataset.dittoTime = Date.now();

    // valitse efekti, mutta aja vasta confirmissa
    state.dittoPending[index] = randomFromArray(getDittoEventPool());

    state.uiLocked = false;
    return;
  }

  log(`${currentPlayer.name} selected ${value}`);
  flashElement(cards[index]);
  nextPlayer();
  state.uiLocked = false;
}

function getDittoEventPool() {
  return [
    { type: 'LOSE_ONE_ITEM_ALL' },
    { type: 'STEAL_RANDOM_ITEM' },
    { type: 'DRINK_3' },
    { type: 'WATERFALL' },
    { type: 'SHOT' },
    { type: 'RANDOM_CHALLENGE' },
    { type: 'PENALTY_ALL' }
  ];
}

function runDittoEffect(cardIndex) {
  const ev = state.dittoPending?.[cardIndex];
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (!ev) {
    log("Ditto had no stored effect (unexpected).");
    return;
  }

  switch (ev.type) {
    case 'LOSE_ONE_ITEM_ALL': {
      log("Ditto caused chaos! All players lose one item.");
      state.players.forEach(p => {
        if (p.inventory && p.inventory.length > 0) p.inventory.pop();
      });
      updateTurnOrder();
      renderItemsBoard();
      return;
    }

    case 'STEAL_RANDOM_ITEM': {
      const others = state.players.filter((_, i) => i !== state.currentPlayerIndex);
      const target = randomFromArray(others);
      if (target && target.inventory && target.inventory.length > 0) {
        const stolen = target.inventory.pop();
        currentPlayer.inventory.push(stolen);
        log(`Ditto stole ${stolen} from ${target.name}!`);
      } else {
        log("Ditto tried to steal, but the target player had no items.");
      }
      updateTurnOrder();
      renderItemsBoard();
      return;
    }

    case 'DRINK_3': {
      if (currentPlayer.immunity) {
        delete currentPlayer.immunity;
        log(`${currentPlayer.name}'s Immunity prevented 'Drink 3!'`);
      } else {
        log("Ditto says: Drink 3!");
      }
      return;
    }

    case 'WATERFALL': {
      log("Ditto started a Waterfall!");
      return;
    }

    case 'SHOT': {
      log("Ditto ordered a Shot! Take a shot now.");
      return;
    }

    case 'RANDOM_CHALLENGE': {
      log("Ditto started a challenge! Prepare for a random challenge.");
      const challenges = [
        "Challenge: Truth or Drink",
        "Challenge: Dare",
        "Challenge: Mini King",
        "Categories"
      ];
      log(randomFromArray(challenges));
      return;
    }

    case 'PENALTY_ALL': {
      const penalty = randomFromArray(state.penaltyDeck);
      log(`Ditto rolled a penalty for everyone: ${penalty}`);

      state.players.forEach(p => {
        if (p.shield) {
          delete p.shield;
          log(`${p.name}'s Shield blocked the penalty.`);
        } else if (p.immunity) {
          delete p.immunity;
          log(`${p.name}'s Immunity prevented the penalty.`);
        } else {
          log(`${p.name} takes penalty: ${penalty}`);
        }
      });

      updateTurnOrder();
      renderItemsBoard();
      return;
    }

    default:
      log("Unknown Ditto effect.");
      return;
  }
}

function rollPenaltyCard() {
  if (state.penaltyShown) return;

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (currentPlayer.shield) {
    log(`${currentPlayer.name}'s Shield protected against the penalty!`);
    delete currentPlayer.shield;
    state.penaltyConfirmArmed = false;
    return;
  }

  if (currentPlayer.immunity) {
    log(`${currentPlayer.name}'s Immunity prevented drinking from the penalty!`);
    delete currentPlayer.immunity;
    state.penaltyConfirmArmed = false;
    return;
  }

  const penalty = randomFromArray(state.penaltyDeck);
  state.penaltyCard = penalty;
  state.penaltyShown = true;
  state.penaltyConfirmArmed = true;

  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, penalty);
  log(`${currentPlayer.name} rolled penalty card: ${penalty}`);
}

function hidePenaltyCard() {
  state.penaltyShown = false;
  state.penaltyCard = null;
  state.penaltyConfirmArmed = false;

  const penaltyDeckEl = document.getElementById('penalty-deck');
  flipCardAnimation(penaltyDeckEl, "Penalty Deck");
}

function redrawGame() {
  rollPenaltyCard();
  setTimeout(() => {
    resetCards();
  }, 1000);
}

function useItem(playerIndex, itemIndex) {
  const player = state.players[playerIndex];
  const item = player.inventory[itemIndex];
  if (!item) return;

  // Poista käytetty item
  player.inventory.splice(itemIndex, 1);
  updateTurnOrder();
  renderItemsBoard();

  switch (item) {
    case "Shield":
      player.shield = true;
      log(`${player.name} activated Shield! Your next penalty will be blocked.`);
      return;

    case "Immunity":
      player.immunity = true;
      log(`${player.name} activated Immunity! Your next drink will be prevented.`);
      return;

    case "Reveal Free":
      if (state.hiddenIndex !== null && !state.revealed[state.hiddenIndex]) {
        const cards = [
          document.getElementById('card0'),
          document.getElementById('card1'),
          document.getElementById('card2')
        ];
        state.revealed[state.hiddenIndex] = true;
        flipCardAnimation(cards[state.hiddenIndex], getCardDisplayValue(state.currentCards[state.hiddenIndex]));
        log(`${player.name} used Reveal Free! Mystery card revealed.`);
      } else {
        log("No mystery card to reveal.");
      }
      return;

    case "Mirror":
      state.mirror = {
        active: true,
        sourceIndex: playerIndex,
        selectedCardIndex: null,
        parentName: "",
        subName: "",
        subInstruction: "",
        displayText: ""
      };
      log(`${player.name} activated Mirror. Click one of the current cards to mirror its effect to a target.`);
      enableMirrorTargetSelection();
      return;

    case "Skip Turn":
      if (playerIndex === state.currentPlayerIndex) {
        const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
        const nextName = state.players[nextIndex].name;
        log(`${player.name} used Skip Turn and passes their turn to ${nextName}.`);
        state.currentPlayerIndex = nextIndex;
        updateTurn();
        return;
      }
      player.skipNextTurn = true;
      log(`${player.name} used Skip Turn. Their next turn will be skipped.`);
      return;

    default:
      log(`${player.name} used ${item}. (No effect)`);
      return;
  }
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
