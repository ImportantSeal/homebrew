// homebrew/js/game/controller.js

import { state } from '../state.js';
import { addHistoryEntry, clearHistoryEntries } from '../cardHistory.js';

import { createBag } from '../utils/random.js';

import { dealTurnCards } from '../logic/deck.js';
import { hidePenaltyCard } from '../logic/penalty.js';
import { tickEffects, cancelTargetedEffectSelection } from '../logic/effects.js';
import { useItem } from '../logic/items.js';

import { renderCards } from '../ui/cards.js';
import { renderTurnOrder } from '../ui/turnOrder.js';
import { renderItemsBoard } from '../ui/itemsBoard.js';
import { showCardActionModal } from '../ui/cardActionModal.js';

import {
  showGameContainer,
  setTurnIndicatorText,
  bindRedrawClick,
  bindPenaltyRefreshClick,
  bindPenaltyDeckClick,
  bindCloseDropdownsOnOutsideClick
} from '../ui/uiFacade.js';

import { createEffectsPanelController } from './controller/effectsPanel.js';
import { createCardHandlers } from './controller/cardHandlers.js';

const TIMING = {
  PENALTY_UNLOCK_MS: 350,
  MYSTERY_REVEAL_UNLOCK_MS: 700,
  DITTO_DOUBLECLICK_GUARD_MS: 1000,
  REDRAW_REFRESH_MS: 1000
};

let penaltyDeckSizeSyncBound = false;

function log(message) {
  return addHistoryEntry(message);
}

function currentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function playerName(index) {
  const p = state.players?.[index];
  if (p && p.name) return p.name;
  const safeIndex = Number.isFinite(index) ? index : 0;
  return `Player ${safeIndex + 1}`;
}

function lockUI() {
  state.uiLocked = true;
}

function unlockUI() {
  state.uiLocked = false;
}

function unlockAfter(ms) {
  setTimeout(() => {
    state.uiLocked = false;
  }, ms);
}

function openActionScreen(title, message = "", options = {}) {
  showCardActionModal({
    title,
    message,
    fallbackMessage: "Check Card History for details.",
    ...options
  });
}

function syncPenaltyDeckSizeToCards() {
  const penaltyDeckEl = document.getElementById("penalty-deck");
  const cardEl = document.getElementById("card0");
  if (!penaltyDeckEl || !cardEl) return;

  const rect = cardEl.getBoundingClientRect();
  if (rect.width > 0) {
    penaltyDeckEl.style.width = `${Math.round(rect.width)}px`;
  }
}

function bindPenaltyDeckSizeSync() {
  if (penaltyDeckSizeSyncBound) return;
  penaltyDeckSizeSyncBound = true;

  const sync = () => requestAnimationFrame(syncPenaltyDeckSizeToCards);
  window.addEventListener("resize", sync);

  if (typeof ResizeObserver !== "undefined") {
    const cardContainer = document.querySelector(".card-container");
    if (cardContainer) {
      const observer = new ResizeObserver(sync);
      observer.observe(cardContainer);
    }
  }
}

const { renderEffectsPanel } = createEffectsPanelController({
  state,
  log,
  playerName
});

const { onRedrawClick, onPenaltyRefreshClick, onPenaltyDeckClick, onCardClick } = createCardHandlers({
  state,
  timing: TIMING,
  createBag,
  log,
  currentPlayer,
  playerName,
  nextPlayer,
  lockUI,
  unlockUI,
  unlockAfter,
  renderEffectsPanel,
  renderItems,
  renderTurnOrder,
  resetCards,
  openActionScreen
});

export function startGame() {
  cancelTargetedEffectSelection(state);

  // runtime flags
  state.uiLocked = false;
  state.penaltyConfirmArmed = false;
  state.penaltySource = null;
  state.penaltyHintShown = false;

  state.dittoPending = [null, null, null];
  state.dittoActive = [false, false, false];

  // reset effects for a fresh game
  state.effects = [];
  state.effectSelection = { active: false, pending: null, cleanup: null };
  state.mirror = {
    active: false,
    sourceIndex: null,
    selectedCardIndex: null,
    parentName: "",
    subName: "",
    subInstruction: "",
    displayText: ""
  };

  if (!state.bags) state.bags = {};
  clearHistoryEntries();

  initGameView();
  setupEventListeners();
  updateTurn();
}

function initGameView() {
  showGameContainer();
  bindPenaltyDeckSizeSync();
  requestAnimationFrame(syncPenaltyDeckSizeToCards);
  hidePenaltyCard(state);
}

function setupEventListeners() {
  bindRedrawClick(onRedrawClick);
  bindPenaltyRefreshClick(onPenaltyRefreshClick);
  bindPenaltyDeckClick(onPenaltyDeckClick);
  bindCloseDropdownsOnOutsideClick();
}

function nextPlayer() {
  // End-of-turn timing: tick active effects once per finished turn.
  tickEffects(state, log);

  const p = currentPlayer();
  if (p.extraLife) {
    log(`${p.name} uses Extra Life to keep their turn.`);
    delete p.extraLife;
    updateTurn();
    return;
  }

  const playerCount = state.players.length;
  for (let i = 0; i < playerCount; i++) {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;

    const next = currentPlayer();
    if (next?.skipNextTurn) {
      delete next.skipNextTurn;
      log(`${next.name} skips this turn.`);
      continue;
    }

    break;
  }

  updateTurn();
}

function updateTurn() {
  const p = currentPlayer();
  setTurnIndicatorText(`${p.name}'s Turn`);

  renderTurnOrder(state);
  updateItemsPanelVisibility();
  renderItems();
  renderEffectsPanel();
  resetCards();
  requestAnimationFrame(syncPenaltyDeckSizeToCards);
}

function updateItemsPanelVisibility() {
  const itemsTitle = document.getElementById("items-title");
  const itemsBoard = document.getElementById("items-board");
  const showItems = Boolean(state.includeItems);

  if (itemsTitle) itemsTitle.style.display = showItems ? "" : "none";
  if (itemsBoard) {
    itemsBoard.style.display = showItems ? "" : "none";
    if (!showItems) itemsBoard.innerHTML = "";
  }
}

function renderItems() {
  if (!state.includeItems) return;

  renderItemsBoard(state, (pIndex, iIndex) => {
    useItem(
      state,
      pIndex,
      iIndex,
      log,
      () => renderTurnOrder(state),
      renderItems,
      updateTurn
    );

    renderEffectsPanel();
  });
}

function resetCards({ keepPenaltyOpen = false } = {}) {
  dealTurnCards(state);
  renderCards(state, onCardClick);
  if (!keepPenaltyOpen) {
    hidePenaltyCard(state);
  }
  renderEffectsPanel();
  requestAnimationFrame(syncPenaltyDeckSizeToCards);
}
