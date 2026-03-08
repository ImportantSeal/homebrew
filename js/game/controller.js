// homebrew/js/game/controller.js

import { createInitialState, resetStateForNewGame } from '../state.js';
import { addHistoryEntry, clearHistoryEntries } from '../cardHistory.js';
import { resetStats } from '../stats.js';

import { createBag } from '../utils/random.js';
import { systemRng } from '../utils/rng.js';
import { ensurePlayerColors } from '../utils/playerColors.js';

import { dealTurnCards } from '../logic/deck.js';
import { hidePenaltyCard } from '../logic/penalty.js';
import { tickEffects, cancelTargetedEffectSelection } from '../logic/effects.js';
import { enableLeaveGuard } from '../navigationGuard.js';

import { renderCards } from '../ui/cards.js';
import { renderTurnOrder } from '../ui/turnOrder.js';
import { showCardActionModal } from '../ui/cardActionModal.js';
import { setBaseBackgroundScene, syncBackgroundScene } from '../ui/backgroundScene.js';

import {
  showGameContainer,
  setTurnIndicatorText,
  bindRedrawClick,
  bindPenaltyRefreshClick,
  bindPenaltyDeckClick,
  bindTurnOrderPlayerClick,
  bindTurnOrderRemoveClick
} from '../ui/uiFacade.js';

import { createEffectsPanelController } from './controller/effectsPanel.js';
import { createCardHandlers } from './controller/cardHandlers.js';
import { createItemsController } from './controller/itemsController.js';
import { createPlayerRemovalController } from './controller/playerRemoval.js';

const TIMING = {
  PENALTY_UNLOCK_MS: 350,
  MYSTERY_REVEAL_UNLOCK_MS: 700,
  DITTO_DOUBLECLICK_GUARD_MS: 1000,
  REDRAW_REFRESH_MS: 1000
};

export function createGameController({ initialState = createInitialState() } = {}) {
  const state = initialState && typeof initialState === 'object'
    ? initialState
    : createInitialState();
  let penaltyDeckSizeSyncBound = false;

function resolveHistoryLogKind(options = {}) {
  if (options && typeof options === 'object' && typeof options.kind === 'string') {
    const explicitKind = options.kind.trim();
    if (explicitKind) return explicitKind;
  }

  if (typeof state.historyLogKind === 'string') {
    const contextualKind = state.historyLogKind.trim();
    if (contextualKind) return contextualKind;
  }

  return null;
}

function log(message, options = {}) {
  const safeOptions = options && typeof options === 'object' ? { ...options } : {};
  const kind = resolveHistoryLogKind(safeOptions);
  if (kind) {
    safeOptions.kind = kind;
  } else {
    delete safeOptions.kind;
  }
  return addHistoryEntry(state, message, safeOptions);
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

function renderTurnHeader() {
  const p = currentPlayer();
  setTurnIndicatorText(p ? `${p.name}'s Turn` : "Player's Turn");
  renderTurnOrder(state);
}

function isPenaltyFlowActive() {
  if (state.penaltyShown) return true;
  return state.penaltySource === "card_pending" || state.penaltySource === "group_pending";
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

  const cardRect = cardEl.getBoundingClientRect();
  const panel = penaltyDeckEl.closest(".left-panel");
  const panelRect = panel?.getBoundingClientRect();
  const panelStyles = panel ? window.getComputedStyle(panel) : null;
  const panelPaddingX = panelStyles
    ? (parseFloat(panelStyles.paddingLeft || "0") + parseFloat(panelStyles.paddingRight || "0"))
    : 0;
  const panelInnerWidth = panelRect ? Math.max(0, panelRect.width - panelPaddingX) : 0;

  if (cardRect.width > 0) {
    const targetWidth = panelInnerWidth > 0
      ? Math.min(cardRect.width, panelInnerWidth)
      : cardRect.width;
    penaltyDeckEl.style.width = `${Math.round(targetWidth)}px`;
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

const { renderItems } = createItemsController({
  state,
  log,
  renderTurnHeader,
  renderEffectsPanel,
  updateTurn
});

const { onTurnOrderPlayerRemoveClick } = createPlayerRemovalController({
  state,
  log,
  playerName,
  renderTurnHeader,
  renderItems,
  renderEffectsPanel,
  updateTurn,
  syncPenaltyDeckSizeToCards,
  isPenaltyFlowActive
});

const rng = {
  nextFloat: () => (state.rng ?? systemRng).nextFloat()
};

const { onRedrawClick, onPenaltyRefreshClick, onPenaltyDeckClick, onCardClick } = createCardHandlers({
  state,
  timing: TIMING,
  createBag,
  rng,
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

function startGame() {
  cancelTargetedEffectSelection(state);
  resetStateForNewGame(state);
  enableLeaveGuard();
  ensurePlayerColors(state.players);
  clearHistoryEntries(state);
  resetStats(state);

  initGameView();
  setupEventListeners();
  updateTurn();
}

function initGameView() {
  showGameContainer();
  syncBackgroundScene(state);
  bindPenaltyDeckSizeSync();
  requestAnimationFrame(syncPenaltyDeckSizeToCards);
  hidePenaltyCard(state);
}

function setupEventListeners() {
  bindRedrawClick(onRedrawClick);
  bindPenaltyRefreshClick(onPenaltyRefreshClick);
  bindPenaltyDeckClick(onPenaltyDeckClick);
  bindTurnOrderPlayerClick(onTurnOrderPlayerClick);
  bindTurnOrderRemoveClick(onTurnOrderPlayerRemoveClick);
}

function onTurnOrderPlayerClick(playerBtn) {
  const rawIndex = Number(playerBtn?.dataset?.index);
  if (!Number.isInteger(rawIndex)) return;

  if (state.uiLocked) return;
  if (isPenaltyFlowActive()) return;
  if (state.choiceSelection?.active) return;
  if (state.effectSelection?.active) return;

  jumpToPlayerTurn(rawIndex);
}

function jumpToPlayerTurn(targetIndex) {
  const playerCount = state.players.length;
  if (playerCount === 0) return;
  if (targetIndex < 0 || targetIndex >= playerCount) return;
  if (targetIndex === state.currentPlayerIndex) return;
  if (state.uiLocked || isPenaltyFlowActive()) return;

  const fromName = playerName(state.currentPlayerIndex);
  const toName = playerName(targetIndex);

  // Manual switch should not stay locked from previous animation flow.
  state.uiLocked = false;
  state.currentPlayerIndex = targetIndex;

  log(`Turn manually switched: ${fromName} -> ${toName}.`);
  updateTurn();
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
  setBaseBackgroundScene(state, 'normal');
  renderTurnHeader();
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

function resetCards({ keepPenaltyOpen = false } = {}) {
  setBaseBackgroundScene(state, 'normal');
  dealTurnCards(state, rng);
  renderCards(state, onCardClick);
  if (!keepPenaltyOpen) {
    hidePenaltyCard(state);
  }
  renderEffectsPanel();
  requestAnimationFrame(syncPenaltyDeckSizeToCards);
}

  return {
    state,
    startGame
  };
}

export const gameController = createGameController();
export const startGame = () => gameController.startGame();
