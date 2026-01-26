import { state } from '../state.js';
import { addHistoryEntry } from '../cardHistory.js';
import { flipCardAnimation, flashElement } from '../animations.js';

import { randomFromArray } from '../utils/random.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';

import { dealTurnCards } from '../logic/deck.js';
import { rollPenaltyCard, hidePenaltyCard } from '../logic/penalty.js';
import { activateDitto, runDittoEffect } from '../logic/ditto.js';
import { useItem } from '../logic/items.js';
import { enableMirrorTargetSelection, primeMirrorFromCard } from '../logic/mirror.js';

import { renderCards, getCardElements } from '../ui/cards.js';
import { renderTurnOrder } from '../ui/turnOrder.js';
import { renderItemsBoard } from '../ui/itemsBoard.js';

function log(message) {
  addHistoryEntry(message);
}

export function startGame() {
  state.uiLocked = false;

  // Penalty: 1. klikki paljastaa, 2. klikki vahvistaa + nextPlayer
  state.penaltyConfirmArmed = false;

  // Ditto: pending-efekti per kortti
  state.dittoPending = [null, null, null];

  initGameView();
  setupEventListeners();
  updateTurn();
}

function initGameView() {
  const gameContainer = document.getElementById('game-container');
  gameContainer.style.display = "block";
  hidePenaltyCard(state);
}

function setupEventListeners() {
  document.getElementById('redraw-button').addEventListener('click', () => {
    redrawGame();
    const currentPlayer = state.players[state.currentPlayerIndex];
    log(`${currentPlayer.name} used Redraw to reveal penalty card and refresh cards.`);
  });

  document.getElementById('penalty-deck').addEventListener('click', () => {
    if (state.uiLocked) return;

    if (state.penaltyShown && state.penaltyConfirmArmed) {
      state.uiLocked = true;
      hidePenaltyCard(state);
      nextPlayer();
      state.uiLocked = false;
      return;
    }

    if (!state.penaltyShown) {
      state.uiLocked = true;
      rollPenaltyCard(state, log);
      setTimeout(() => { state.uiLocked = false; }, 350);
      return;
    }

    hidePenaltyCard(state);
  });

  // Dropdownit kiinni kun klikataan muualle
  document.addEventListener('click', () => {
    document.querySelectorAll('.player-dropdown.show')
      .forEach(d => d.classList.remove('show'));
  });
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
  renderItems();
  resetCards();
}

function updateTurnOrder() {
  renderTurnOrder(state);
}

function renderItems() {
  renderItemsBoard(state, (pIndex, iIndex) => {
    useItem(
      state,
      pIndex,
      iIndex,
      log,
      updateTurnOrder,
      renderItems,
      updateTurn,
      () => enableMirrorTargetSelection(state, log, updateTurnOrder, renderItems, nextPlayer)
    );
  });
}

function resetCards() {
  dealTurnCards(state);
  renderCards(state, selectCard);
  hidePenaltyCard(state);
}

function selectCard(index) {
  if (state.uiLocked) return;
  state.uiLocked = true;

  const cards = getCardElements();

  // Jos penalty on auki ja klikataan kortteja, piilota penalty (ei vaihda vuoroa)
  if (state.penaltyShown) {
    hidePenaltyCard(state);
  }

  const currentPlayer = state.players[state.currentPlayerIndex];

  // 1) Mystery: eka klikki vain paljastaa. (EI ADVANCE)
  if (!state.revealed[index]) {
    state.revealed[index] = true;
    flipCardAnimation(cards[index], getCardDisplayValue(state.currentCards[index]));
    setTimeout(() => { state.uiLocked = false; }, 700);
    return;
  }

  // Ditto confirm (kortti on jo paljastettu)
  if (state.dittoActive[index]) {
    const activationTime = parseInt(cards[index].dataset.dittoTime || "0", 10);
    if (Date.now() - activationTime < 1000) {
      state.uiLocked = false;
      return;
    }

    log(`${currentPlayer.name} confirmed Ditto card.`);

    runDittoEffect(state, index, log, updateTurnOrder, renderItems);

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
    primeMirrorFromCard(state, cardData, index, log, randomFromArray);

    log(`Mirror primed with: ${state.mirror.parentName}${state.mirror.subName ? ' - ' + state.mirror.subName : ''}${state.mirror.subInstruction ? ' — ' + state.mirror.subInstruction : ''}. Now click a player's name to target.`);
    enableMirrorTargetSelection(state, log, updateTurnOrder, renderItems, nextPlayer);

    state.uiLocked = false;
    return;
  }

  // Haastekortit (object + subcategories)
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

  // Normaalikortit / itemit
  const value = getCardDisplayValue(cardData);

  // Item-kortit
  if (state.itemCards.includes(value)) {
    log(`${currentPlayer.name} acquired item: ${value}`);
    currentPlayer.inventory.push(value);
    flashElement(cards[index]);
    updateTurnOrder();
    renderItems();
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
    activateDitto(state, cards[index], index, log);
    state.uiLocked = false;
    return;
  }

  log(`${currentPlayer.name} selected ${value}`);
  flashElement(cards[index]);
  nextPlayer();
  state.uiLocked = false;
}

function redrawGame() {
  rollPenaltyCard(state, log);
  setTimeout(() => {
    resetCards();
  }, 1000);
}
