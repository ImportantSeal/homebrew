// homebrew/js/game/controller.js

import { state } from '../state.js';
import { addHistoryEntry, clearHistoryEntries } from '../cardHistory.js';
import { resetStats } from '../stats.js';

import { createBag } from '../utils/random.js';
import { ensurePlayerColors } from '../utils/playerColors.js';

import { dealTurnCards } from '../logic/deck.js';
import { hidePenaltyCard } from '../logic/penalty.js';
import { tickEffects, cancelTargetedEffectSelection } from '../logic/effects.js';
import { useItem } from '../logic/items.js';
import { enableLeaveGuard } from '../navigationGuard.js';

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
  bindTurnOrderPlayerClick,
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
  return addHistoryEntry(message, safeOptions);
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
  enableLeaveGuard();
  ensurePlayerColors(state.players);

  // runtime flags
  state.uiLocked = false;
  state.historyLogKind = null;
  state.penaltyConfirmArmed = false;
  state.penaltySource = null;
  state.penaltyHintShown = false;

  state.dittoPending = [null, null, null];
  state.dittoActive = [false, false, false];

  // reset effects for a fresh game
  state.effects = [];
  state.effectSelection = { active: false, pending: null, cleanup: null };
  state.choiceSelection = { active: false, pending: null };
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
  resetStats(state);

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
  bindTurnOrderPlayerClick(onTurnOrderPlayerClick);
  bindCloseDropdownsOnOutsideClick();
}

function onTurnOrderPlayerClick(playerBtn) {
  if (state.choiceSelection?.active) return;
  if (state.effectSelection?.active) return;

  const rawIndex = Number(playerBtn?.dataset?.index);
  if (!Number.isInteger(rawIndex)) return;

  jumpToPlayerTurn(rawIndex);
}

function jumpToPlayerTurn(targetIndex) {
  const playerCount = state.players.length;
  if (playerCount === 0) return;
  if (targetIndex < 0 || targetIndex >= playerCount) return;
  if (targetIndex === state.currentPlayerIndex) return;

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

  renderItemsBoard(state, (pIndex, iIndex, itemName) => {
    if (state.choiceSelection?.active) {
      log("Resolve the current card choice first.");
      return;
    }

    if (state.effectSelection?.active) {
      log("Pick a target player first (effect selection is active).");
      return;
    }

    const isImmunity = String(itemName || "").trim() === "Immunity";
    const isCurrentPlayersItem = pIndex === state.currentPlayerIndex;

    if (!isCurrentPlayersItem && !isImmunity) {
      log("Only the active player can use items. Immunity can be used anytime.");
      return;
    }

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
