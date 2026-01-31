// homebrew/js/game/controller.js

import { state } from '../state.js';
import { addHistoryEntry } from '../cardHistory.js';
import { flipCardAnimation, flashElement } from '../animations.js';

import { randomFromArray, createBag } from '../utils/random.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';

import { dealTurnCards } from '../logic/deck.js';
import { rollPenaltyCard, hidePenaltyCard, showPenaltyPreview } from '../logic/penalty.js';
import { activateDitto, runDittoEffect } from '../logic/ditto.js';
import { useItem } from '../logic/items.js';
import { enableMirrorTargetSelection, primeMirrorFromCard } from '../logic/mirror.js';

import { renderCards, getCardElements, setCardKind } from '../ui/cards.js';
import { renderTurnOrder } from '../ui/turnOrder.js';
import { renderItemsBoard } from '../ui/itemsBoard.js';

import {
  showGameContainer,
  setTurnIndicatorText,
  bindRedrawClick,
  bindPenaltyDeckClick,
  bindCloseDropdownsOnOutsideClick
} from '../ui/uiFacade.js';

const TIMING = {
  PENALTY_UNLOCK_MS: 350,
  MYSTERY_REVEAL_UNLOCK_MS: 700,
  DITTO_DOUBLECLICK_GUARD_MS: 1000,
  REDRAW_REFRESH_MS: 1000
};

// ---------- Logging ----------
function log(message) {
  addHistoryEntry(message);
}

// ---------- Small helpers ----------
function currentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function lockUI() {
  state.uiLocked = true;
}

function unlockUI() {
  state.uiLocked = false;
}

function unlockAfter(ms) {
  setTimeout(() => { state.uiLocked = false; }, ms);
}

function isDrawPenaltyCardText(txt) {
  return /^Draw a Penalty Card$/i.test(String(txt).trim());
}

function shouldTriggerPenaltyPreview(subName, subInstruction, challengeText) {
  const a = String(subName || "");
  const b = String(subInstruction || "");
  const c = String(challengeText || "");
  return /penalty/i.test(a) || /penalty/i.test(b) || /penalty deck/i.test(c) || /penalty card/i.test(c);
}

// Bag key for object card pools
function getBagKeyForObjectCard(cardData) {
  if (cardData === state.special) return "special";
  if (cardData === state.crowdChallenge) return "crowd";
  return `social:${cardData.name || "unknown"}`;
}

function ensureBag(stateObj, key, items) {
  if (!stateObj.bags) stateObj.bags = {};
  if (!stateObj.bags[key]) stateObj.bags[key] = createBag(items);
  return stateObj.bags[key];
}

// ---------- Public API ----------
export function startGame() {
  // runtime flags
  state.uiLocked = false;
  state.penaltyConfirmArmed = false;
  state.penaltySource = null;
  state.penaltyHintShown = false;

  state.dittoPending = [null, null, null];
  state.dittoActive = [false, false, false];

  if (!state.bags) state.bags = {};

  initGameView();
  setupEventListeners();
  updateTurn();
}

// ---------- Setup ----------
function initGameView() {
  showGameContainer();
  hidePenaltyCard(state);
}

function setupEventListeners() {
  bindRedrawClick(onRedrawClick);
  bindPenaltyDeckClick(onPenaltyDeckClick);
  bindCloseDropdownsOnOutsideClick();
}

// ---------- Turn flow ----------
function nextPlayer() {
  const p = currentPlayer();

  if (p.extraLife) {
    log(`${p.name} uses Extra Life to keep their turn.`);
    delete p.extraLife;
    updateTurn();
    return;
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  updateTurn();
}

function updateTurn() {
  const p = currentPlayer();
  setTurnIndicatorText(`${p.name}'s Turn`);

  renderTurnOrder(state);
  renderItems();
  resetCards();
}

function renderItems() {
  renderItemsBoard(state, (pIndex, iIndex) => {
    useItem(
      state,
      pIndex,
      iIndex,
      log,
      () => renderTurnOrder(state),
      renderItems,
      updateTurn,
      () => enableMirrorTargetSelection(state, log, () => renderTurnOrder(state), renderItems, nextPlayer)
    );
  });
}

function resetCards() {
  dealTurnCards(state);
  renderCards(state, onCardClick);
  hidePenaltyCard(state);
}

// ---------- UI event handlers ----------
function onRedrawClick() {
  redrawGame();
  const p = currentPlayer();
  log(`${p.name} used Redraw to reveal penalty card and refresh cards.`);
}

function onPenaltyDeckClick() {
  if (state.uiLocked) return;

  // If penalty is showing, clicking confirms/hides depending on source
  if (state.penaltyShown && state.penaltyConfirmArmed) {
    lockUI();

    const source = state.penaltySource;
    hidePenaltyCard(state);

    // "redraw" = preview/info penalty -> does NOT end turn
    if (source !== "redraw") {
      nextPlayer();
    }

    unlockUI();
    return;
  }

  // Otherwise reveal penalty deck normally
  if (!state.penaltyShown) {
    lockUI();
    rollPenaltyCard(state, log, "deck");
    unlockAfter(TIMING.PENALTY_UNLOCK_MS);
    return;
  }

  hidePenaltyCard(state);
}

function onCardClick(index) {
  if (state.uiLocked) return;
  lockUI();

  // If penalty is open, handle it first
  if (state.penaltyShown) {
    // If penalty came from selecting the penalty card, you must confirm via penalty deck click
    if (state.penaltySource === "card") {
      if (!state.penaltyHintShown) {
        log("Penalty is waiting: click the Penalty Deck to confirm.");
        state.penaltyHintShown = true;
      }
      unlockUI();
      return;
    }

    // Otherwise, clicking cards hides preview/deck penalty (no turn advance)
    hidePenaltyCard(state);
  }

  const cards = getCardElements();
  const cardEl = cards[index];

  // 1) Mystery reveal: first click only reveals
  if (!state.revealed[index]) {
    state.revealed[index] = true;

    setCardKind(state, cardEl, state.currentCards[index], false);
    flipCardAnimation(cardEl, getCardDisplayValue(state.currentCards[index]));

    unlockAfter(TIMING.MYSTERY_REVEAL_UNLOCK_MS);
    return;
  }

  // 2) Ditto confirm flow
  if (state.dittoActive[index]) {
    const activationTime = parseInt(cardEl.dataset.dittoTime || "0", 10);
    if (Date.now() - activationTime < TIMING.DITTO_DOUBLECLICK_GUARD_MS) {
      unlockUI();
      return;
    }

    const p = currentPlayer();
    log(`${p.name} confirmed Ditto card.`);
    runDittoEffect(state, index, log, () => renderTurnOrder(state), renderItems);

    state.dittoActive[index] = false;
    state.dittoPending[index] = null;

    nextPlayer();
    unlockUI();
    return;
  }

  const cardData = state.currentCards[index];

  // 3) Mirror prime flow
  if (state.mirror && state.mirror.active && state.mirror.selectedCardIndex === null) {
    primeMirrorFromCard(state, cardData, index, log, randomFromArray);

    enableMirrorTargetSelection(
      state,
      log,
      () => renderTurnOrder(state),
      renderItems,
      nextPlayer
    );

    unlockUI();
    return;
  }

  // 4) Object card (Special/Crowd/Social) draw
  if (typeof cardData === 'object' && cardData.subcategories) {
    handleObjectCardDraw(cardEl, cardData);
    nextPlayer();
    unlockUI();
    return;
  }

  // 5) Plain cards / items / drink/give
  handlePlainCard(cardEl, cardData);
}

// ---------- Draw handlers ----------
function handleObjectCardDraw(cardEl, parentCard) {
  const p = currentPlayer();

  const bagKey = getBagKeyForObjectCard(parentCard);
  const bag = ensureBag(state, bagKey, parentCard.subcategories);
  const event = bag.next();

  let subName = "";
  let subInstruction = "";
  let shownText = "";

  if (typeof event === "object") {
    subName = event.name || "";
    subInstruction = event.instruction || "";
    shownText = subInstruction || subName;
  } else {
    subName = String(event);
    shownText = subName;
  }

  flipCardAnimation(cardEl, shownText);

  const parentName = getCardDisplayValue(parentCard);
  const details = subInstruction ? `${subName} — ${subInstruction}` : `${subName}`;
  log(`${p.name} drew ${parentName}: ${details}`);

  // If the subevent mentions penalty, also flip penalty deck (preview only)
  if (shouldTriggerPenaltyPreview(subName, subInstruction, shownText)) {
    const label = `${parentName}${subName ? `: ${subName}` : ""}`;
    showPenaltyPreview(state, log, label);
  }
}

function handlePlainCard(cardEl, cardData) {
  const p = currentPlayer();
  const value = getCardDisplayValue(cardData);
  const txt = String(value).trim();

  // Penalty card (must confirm via penalty deck click)
  if (isDrawPenaltyCardText(txt)) {
    flashElement(cardEl);

    rollPenaltyCard(state, log, "card");

    // If blocked by Shield/Immunity, penalty won't show -> turn ends normally
    if (!state.penaltyShown) {
      nextPlayer();
      unlockUI();
      return;
    }

    unlockAfter(TIMING.PENALTY_UNLOCK_MS);
    return;
  }

  // Item cards
  if (state.itemCards.includes(value)) {
    log(`${p.name} acquired item: ${value}`);
    p.inventory.push(value);

    flashElement(cardEl);
    renderTurnOrder(state);
    renderItems();

    nextPlayer();
    unlockUI();
    return;
  }

  // Immunity consumption for drink effects
  if (p.immunity) {
    if (/^(Drink\b|Everybody drinks\b)/i.test(txt)) {
      delete p.immunity;
      log(`${p.name}'s Immunity prevented drinking from: ${txt}`);

      flashElement(cardEl);
      nextPlayer();
      unlockUI();
      return;
    }
  }

  // Ditto activation chance (same as before)
  if (Math.random() < 0.06) {
    const idx = parseInt(cardEl.dataset.index || "0", 10);
    activateDitto(state, cardEl, idx, log);
    unlockUI();
    return;
  }

  log(`${p.name} selected ${value}`);
  flashElement(cardEl);

  nextPlayer();
  unlockUI();
}

function redrawGame() {
  rollPenaltyCard(state, log, "redraw");
  setTimeout(() => {
    resetCards();
  }, TIMING.REDRAW_REFRESH_MS);
}
