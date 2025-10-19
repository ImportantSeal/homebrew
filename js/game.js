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

  updateTurnOrder(); // Päivitetään vuorojärjestys dropdown-valikoilla (jossa inventaariot näkyvät)
  renderItemsBoard(); // Päivitetään oikean ylänurkan items board
  resetCards();
}

function updateTurnOrder() {
  const turnOrderElem = document.getElementById('turn-order');
  turnOrderElem.innerHTML = ""; // Tyhjennetään edellinen sisältö

  // Luodaan flex-kontaineri, joka mahdollistaa rivinvaihdon
  state.players.forEach((player, index) => {
    // Kääre-elementti pelaajalle
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('turn-player-wrapper');

    // Pelaajan nimi; nykyisellä pelaajalla käytetään vahvistettua muotoilua
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('turn-player-name');
    if (index === state.currentPlayerIndex) {
      nameSpan.innerHTML = `<strong>${player.name}</strong>`;
    } else {
      nameSpan.textContent = player.name;
    }
    playerDiv.appendChild(nameSpan);

    // Dropdown-valikko pelaajan inventaariolle (piilotettu oletuksena)
    const dropdownDiv = document.createElement('div');
    dropdownDiv.classList.add('player-dropdown');

    const ul = document.createElement('ul');
    if (player.inventory.length === 0) {
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

    // Klikkaamalla pelaajan nimeä toggletaan dropdown näkyviin/piiloon
    nameSpan.addEventListener('click', (e) => {
      dropdownDiv.classList.toggle('show');
      e.stopPropagation();
    });

    turnOrderElem.appendChild(playerDiv);

    // Lisätään erotin nuoli, jos ei ole viimeinen pelaaja
    if (index < state.players.length - 1) {
      const arrowSpan = document.createElement('span');
      arrowSpan.textContent = " → ";
      turnOrderElem.appendChild(arrowSpan);
    }
  });

  // Klikkaamalla dokumentin muuta kohtaa, piilotetaan kaikki dropdown-valikot
  document.addEventListener('click', () => {
    const dropdowns = document.querySelectorAll('.player-dropdown');
    dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
  });
}

function enableMirrorTargetSelection() {
  const nameEls = document.querySelectorAll('.turn-player-name');
  const cleanup = () => {
    nameEls.forEach(el => el.removeEventListener('click', onClick));
  };

  const onClick = (e) => {
    // Find which player was clicked
    const clickedName = e.currentTarget.textContent.replace(/\s+/g, ' ').replace(/^\*|\*$/g, '');
    const targetIndex = state.players.findIndex(p => p.name === clickedName || `**${p.name}**` === clickedName);
    if (targetIndex === -1) return;

    const sourceIndex = state.mirror.sourceIndex;
    const sourcePlayer = state.players[sourceIndex];
    const targetPlayer = state.players[targetIndex];

    // Apply mirror (log-only behavior for now)
    const parent = state.mirror.parentName;
    const subName = state.mirror.subName;
    const subInstr = state.mirror.subInstruction;
    const detail = subInstr ? `${subName} — ${subInstr}` : subName || state.mirror.displayText;
    log(`${sourcePlayer.name} used Mirror on ${targetPlayer.name}: ${parent}${detail ? ' | ' + detail : ''}`);

    // Reset mirror state
    state.mirror = { active: false, sourceIndex: null, selectedCardIndex: null, parentName: '', subName: '', subInstruction: '', displayText: '' };
    cleanup();

    // Advance turn after mirror use
    nextPlayer();
  };

  nameEls.forEach(el => {
    el.addEventListener('click', onClick, { once: true });
  });
}

// Renderöi kaikkien pelaajien itemit oikean paneelin Items-alueeseen.
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
        badge.className = 'item-badge';
        badge.textContent = item;
        // Klikattavissa vain jos on nykyisen pelaajan vuoro
        if (pIndex === state.currentPlayerIndex) {
          badge.classList.add('clickable');
          badge.title = 'Use this item';
          badge.addEventListener('click', () => {
            useItem(pIndex, iIndex);
            renderItemsBoard(); // Päivitä näkymä käytön jälkeen
          });
        }
        row.appendChild(badge);
      });
    }

    board.appendChild(row);
  });
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
    if (r < 0.04) {
      card = "Immunity";
    } else if (r < 0.06) {
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

  // If Mirror mode is active and a card is clicked, capture this card to mirror
  if (state.mirror && state.mirror.active && state.mirror.selectedCardIndex === null) {
    // Reveal if hidden first
    if (!state.revealed[index]) {
      state.revealed[index] = true;
      flipCardAnimation(cards[index], getCardDisplayValue(state.currentCards[index]));
    }

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
      // Normal/item card: just use its text
      displayText = getCardDisplayValue(cardData);
    }

    state.mirror.selectedCardIndex = index;
    state.mirror.parentName = parentName;
    state.mirror.subName = subName;
    state.mirror.subInstruction = subInstruction;
    state.mirror.displayText = displayText;

    log(`Mirror primed with: ${parentName}${subName ? ' - ' + subName : ''}${subInstruction ? ' — ' + subInstruction : ''}. Now click a player's name to target.`);

    // Enable target selection: clicking on turn-order names will apply mirror
    enableMirrorTargetSelection();
    return;
  }

  // Jos kyseessä on haastekortti (esim. Challenge, Crowd Challenge, Special Card)
  if (typeof cardData === 'object' && cardData.subcategories) {
    const challengeEvent = randomFromArray(cardData.subcategories);
    let challengeText;
    let subName = "";
    let subInstruction = "";
    if (typeof challengeEvent === 'object') {
      subName = challengeEvent.name || "";
      subInstruction = challengeEvent.instruction || "";
      challengeText = subInstruction || subName; // what is shown on the card face
    } else {
      subName = String(challengeEvent);
      challengeText = subName;
    }

    // Show the instruction/name on the card
    flipCardAnimation(cards[index], challengeText);

    // Log with both subcategory name and instruction when available
    const parentName = getCardDisplayValue(cardData);
    const details = subInstruction ? `${subName} — ${subInstruction}` : `${subName}`;
    log(`${currentPlayer.name} drew ${parentName}: ${details}`);
    nextPlayer();
    return;
  }

  const revealedValue = cards[index].dataset.value || cards[index].textContent;

  // Jos paljastunut kortti on item (kuten Immunity), käsitellään se samalla tavalla kuin muut itemit
  if (state.itemCards.includes(revealedValue)) {
    log(`${currentPlayer.name} acquired item: ${revealedValue}`);
    currentPlayer.inventory.push(revealedValue);
    flashElement(cards[index]);
    updateTurnOrder();
    renderItemsBoard();
    nextPlayer();
    return;
  }
  
  // If Immunity is active and this is a self- or everyone-drink normal card, consume it
  if (state.players[state.currentPlayerIndex].immunity) {
    const txt = String(revealedValue).trim();
    if (/^(Drink\b|Everybody drinks\b)/i.test(txt)) {
      const p = state.players[state.currentPlayerIndex];
      delete p.immunity;
      log(`${p.name}'s Immunity prevented drinking from: ${txt}`);
      flashElement(cards[index]);
      nextPlayer();
      return;
    }
  }
  
  // Tarkistetaan, onko Ditto-tila jo aktiivinen
  if (state.dittoActive[index]) {
    const activationTime = parseInt(cards[index].dataset.dittoTime || "0", 10);
    if (Date.now() - activationTime < 1000) {
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

    const dittoEvents = [
      () => {
        log("Ditto caused chaos! All players lose one item.");
        state.players.forEach(player => {
          if (player.inventory.length > 0) {
            player.inventory.pop();
          }
        });
        updateTurnOrder();
        renderItemsBoard();
      },
      () => {
        const otherPlayers = state.players.filter((_, i) => i !== state.currentPlayerIndex);
        const targetPlayer = randomFromArray(otherPlayers);
        if (targetPlayer.inventory.length > 0) {
          const stolenItem = targetPlayer.inventory.pop();
          state.players[state.currentPlayerIndex].inventory.push(stolenItem);
          log(`Ditto stole ${stolenItem} from ${targetPlayer.name}!`);
          updateTurnOrder();
          renderItemsBoard();
        } else {
          log("Ditto tried to steal, but the target player had no items.");
        }
      },
      () => {
        const p = state.players[state.currentPlayerIndex];
        if (p.immunity) {
          delete p.immunity;
          log(`${p.name}'s Immunity prevented 'Drink 3!'`);
        } else {
          log("Ditto says: Drink 3!");
        }
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
      }
    ];

    const randomEvent = randomFromArray(dittoEvents);
    if (randomEvent) {
      randomEvent();
    } else {
      log("No Ditto event triggered.");
    }

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
  if (currentPlayer.immunity) {
    log(`${currentPlayer.name}'s Immunity prevented drinking from the penalty!`);
    delete currentPlayer.immunity;
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

function useItem(playerIndex, itemIndex) {
  const player = state.players[playerIndex];
  const item = player.inventory[itemIndex];
  if (!item) return;
  // Poistetaan käytetty esine
  player.inventory.splice(itemIndex, 1);
  updateTurnOrder();
  
  switch (item) {
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
      // Do not auto-advance turn; wait for user to select a card
      renderItemsBoard();
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
        log(`${player.name} used Reveal Free! Hidden card revealed.`);
        if (typeof renderItemsBoard === 'function') { try { renderItemsBoard(); } catch {}
        }
        return; // Do not skip the turn; allow player to choose a card now
      } else {
        log("No hidden card to reveal.");
        if (typeof renderItemsBoard === 'function') { try { renderItemsBoard(); } catch {}
        }
        return; // Still do not skip the turn
      }
      break;
    case "Skip Turn":
      // Skip the current player's own turn: immediately pass to the next player
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const nextPlayerName = state.players[nextIndex].name;
      log(`${player.name} used Skip Turn and passes their turn to ${nextPlayerName}.`);
      state.currentPlayerIndex = nextIndex;
      updateTurn();
      return; // turn already advanced
    case "Immunity":
      if (player.immunity) {
        log(`${player.name} already has Immunity active.`);
      } else {
        player.immunity = true;
        log(`${player.name} activated Immunity! Your next drink will be prevented.`);
      }
      if (typeof renderItemsBoard === 'function') { try { renderItemsBoard(); } catch {} }
      return; // Do not end the turn; immunity is armed
    default:
      log(`${player.name} used ${item}. (No effect)`);
  }
  
  if (playerIndex === state.currentPlayerIndex) {
    nextPlayer();
  }
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
