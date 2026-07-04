// homebrew/js/game/controller.js

import { createInitialState, resetStateForNewGame } from '../state.js';
import { addHistoryEntry, clearHistoryEntries } from '../cardHistory.js';
import { resetStats } from '../stats.js';

import { createBag } from '../utils/random.js';
import { systemRng } from '../utils/rng.js';
import { ensurePlayerColors, getPlayerColorByIndex } from '../utils/playerColors.js';

import { dealTurnCards } from '../logic/deck.js';
import { hidePenaltyCard } from '../logic/penalty.js';
import { tickEffects, cancelTargetedEffectSelection } from '../logic/effects.js';
import {
  isChoiceSelectionActive,
  isCardPenaltyPending,
  isEffectSelectionActive,
  isGroupPenaltyPending,
  isPenaltyConfirmRequired,
  isPenaltyFlowActive as isUnifiedPenaltyFlowActive,
  isPenaltyOpen,
  isPenaltySource,
  isRedrawHoldPenaltyOpen,
  PENALTY_SOURCES
} from '../logic/flowMachine.js';
import { enableLeaveGuard } from '../navigationGuard.js';

import { initCards, renderCards } from '../ui/cards.js';
import { renderTurnOrder } from '../ui/turnOrder.js';
import { showCardActionModal } from '../ui/cardActionModal.js';
import { setBaseBackgroundScene, syncBackgroundScene } from '../ui/backgroundScene.js';
import { createDvdBouncer } from '../ui/dvdBouncer.js';
import { createUiSounds } from '../ui/sounds.js';

import {
  showGameContainer,
  setTurnIndicatorText,
  setPenaltyDrawIndicator,
  setNextActionNotification,
  getCardContainerEl,
  getPrimaryCardEl,
  bindRedrawClick,
  bindPenaltyRefreshClick,
  bindPenaltyDeckClick,
  bindTurnOrderPlayerClick,
  bindTurnOrderRemoveClick,
  bindAudioMuteToggle,
  bindAudioVolumeChange,
  bindBomburToggleChange,
  setAudioMuteState,
  setAudioVolumeValue,
  getAudioVolumeValue,
  setBomburToggleState,
  getBomburToggleState,
  getPenaltyDeckEl,
  setItemsPanelVisibility
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

const AUDIO_STORAGE_KEYS = {
  muted: 'homebrew.audio.muted',
  volume: 'homebrew.audio.volume'
};
const BOMBUR_STORAGE_KEY = 'homebrew.bombur.enabled';

function clamp01(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function loadAudioPrefs() {
  if (typeof localStorage === 'undefined') {
    return { muted: false, volume: 1 };
  }

  try {
    const mutedRaw = localStorage.getItem(AUDIO_STORAGE_KEYS.muted);
    const volumeRaw = Number.parseFloat(localStorage.getItem(AUDIO_STORAGE_KEYS.volume) || '1');
    const muted = mutedRaw === 'true';
    const volume = clamp01(volumeRaw);
    return { muted, volume };
  } catch {
    return { muted: false, volume: 1 };
  }
}

function saveAudioPrefs({ muted, volume }) {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(AUDIO_STORAGE_KEYS.muted, muted ? 'true' : 'false');
    localStorage.setItem(AUDIO_STORAGE_KEYS.volume, String(clamp01(volume)));
  } catch {
    // Ignore persistence failures (private mode, storage disabled, etc.)
  }
}

function loadBomburEnabled() {
  if (typeof localStorage === 'undefined') return true;

  try {
    return localStorage.getItem(BOMBUR_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveBomburEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(BOMBUR_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore persistence failures (private mode, storage disabled, etc.)
  }
}

function formatCornerLabel(corner) {
  return String(corner || '')
    .trim()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Corner';
}

export function createGameController({ initialState = createInitialState() } = {}) {
  const state = initialState && typeof initialState === 'object'
    ? initialState
    : createInitialState();
  let penaltyDeckSizeSyncBound = false;
  let penaltyDeckSizeSyncFrame = 0;
  let lastPenaltyDeckWidth = '';

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

function getValidQueuedPenaltyEntries(group) {
  const playerCount = Array.isArray(state.players) ? state.players.length : 0;
  if (!group?.active || group.mode === 'shared' || !Array.isArray(group.queue)) return [];

  return group.queue
    .map((playerIndex, queueIndex) => ({ playerIndex, queueIndex }))
    .filter(({ playerIndex }) => (
      Number.isInteger(playerIndex)
      && playerIndex >= 0
      && playerIndex < playerCount
    ));
}

function getPendingGroupPenaltyQueueIndex(group, entries) {
  const cursor = Number.isInteger(group?.cursor) && group.cursor >= 0 ? group.cursor : 0;
  const entry = entries.find(({ queueIndex }) => queueIndex >= cursor);
  return entry?.queueIndex ?? null;
}

function getOpenGroupPenaltyQueueIndex(group, entries) {
  const targetIndex = state.penaltyRollPlayerIndex;
  if (!Number.isInteger(targetIndex)) return null;

  const cursor = Number.isInteger(group?.cursor) && group.cursor >= 0 ? group.cursor : 0;
  const entryFromCursor = entries.find(({ playerIndex, queueIndex }) => (
    playerIndex === targetIndex && queueIndex >= cursor
  ));
  if (entryFromCursor) return entryFromCursor.queueIndex;

  const fallbackEntry = entries.find(({ playerIndex }) => playerIndex === targetIndex);
  return fallbackEntry?.queueIndex ?? null;
}

function getActivePenaltyDrawDetails() {
  const group = state.penaltyGroup;
  const entries = getValidQueuedPenaltyEntries(group);
  if (!entries.length) return null;

  const queueIndex = state.penaltyShown && isPenaltySource(state, PENALTY_SOURCES.GROUP)
    ? getOpenGroupPenaltyQueueIndex(group, entries)
    : (isGroupPenaltyPending(state) ? getPendingGroupPenaltyQueueIndex(group, entries) : null);
  if (!Number.isInteger(queueIndex)) return null;

  const activeEntry = entries.find((entry) => entry.queueIndex === queueIndex);
  if (!activeEntry) return null;

  const position = entries.findIndex((entry) => entry.queueIndex === queueIndex) + 1;
  return {
    name: playerName(activeEntry.playerIndex),
    color: getPlayerColorByIndex(state.players, activeEntry.playerIndex),
    position,
    total: entries.length
  };
}

function getPenaltyRollTargetName() {
  const targetIndex = Number.isInteger(state.penaltyRollPlayerIndex)
    ? state.penaltyRollPlayerIndex
    : state.currentPlayerIndex;
  return playerName(targetIndex);
}

function isSharedPenaltyPending() {
  return (
    isCardPenaltyPending(state)
    && state.penaltyGroup?.active
    && state.penaltyGroup.mode === 'shared'
  );
}

function renderPenaltyDrawStatus() {
  const penaltyDraw = getActivePenaltyDrawDetails();
  if (penaltyDraw) {
    setTurnIndicatorText(`Penalty: ${penaltyDraw.name} draws now`);
    setPenaltyDrawIndicator(penaltyDraw);
    return penaltyDraw;
  }

  const p = currentPlayer();
  setTurnIndicatorText(p ? `${p.name}'s Turn` : "Player's Turn");
  setPenaltyDrawIndicator(null);
  return null;
}

function getNextActionNotification(penaltyDraw = null) {
  if (isChoiceSelectionActive(state)) {
    return {
      meta: 'Next action',
      message: 'Choose an option in the card action window to continue.',
      variant: 'choice'
    };
  }

  if (isEffectSelectionActive(state)) {
    return {
      meta: 'Next action',
      message: 'Pick a target player from the player list to continue.',
      variant: 'choice'
    };
  }

  if (isRedrawHoldPenaltyOpen(state)) {
    return {
      meta: 'Next action',
      message: 'Close the Redraw penalty window to continue.',
      variant: 'penalty'
    };
  }

  if (isGroupPenaltyPending(state)) {
    const targetName = penaltyDraw?.name || getPenaltyRollTargetName();
    return {
      meta: penaltyDraw ? `Penalty ${penaltyDraw.position}/${penaltyDraw.total}` : 'Next action',
      message: `Click the Penalty Deck to roll ${targetName}'s penalty card.`,
      variant: 'penalty'
    };
  }

  if (isSharedPenaltyPending()) {
    return {
      meta: 'Next action',
      message: 'Click the Penalty Deck to roll one penalty for everyone.',
      variant: 'penalty'
    };
  }

  if (isCardPenaltyPending(state)) {
    const targetName = getPenaltyRollTargetName();
    return {
      meta: 'Next action',
      message: `Click the Penalty Deck to roll ${targetName}'s penalty card.`,
      variant: 'penalty'
    };
  }

  if (state.penaltyShown && isPenaltyConfirmRequired(state)) {
    const targetName = penaltyDraw?.name || getPenaltyRollTargetName();
    return {
      meta: 'Next action',
      message: `Click the Penalty Deck again to confirm ${targetName}'s penalty and continue.`,
      variant: 'penalty'
    };
  }

  if (state.penaltyShown && isPenaltySource(state, PENALTY_SOURCES.REDRAW)) {
    return {
      meta: 'Next action',
      message: 'Click the Penalty Deck again to close this preview.',
      variant: 'penalty'
    };
  }

  if (state.penaltyShown && isPenaltyOpen(state)) {
    return {
      meta: 'Next action',
      message: 'Click the Penalty Deck again to confirm and continue.',
      variant: 'penalty'
    };
  }

  return null;
}

function renderFlowStatus() {
  const penaltyDraw = renderPenaltyDrawStatus();
  setNextActionNotification(getNextActionNotification(penaltyDraw));
}

function renderTurnHeader() {
  renderFlowStatus();
  renderTurnOrder(state);
}

function isPenaltyFlowActive() {
  return isUnifiedPenaltyFlowActive(state);
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
  penaltyDeckSizeSyncFrame = 0;

  const penaltyDeckEl = getPenaltyDeckEl();
  const cardEl = getPrimaryCardEl();
  if (!penaltyDeckEl || !cardEl) return;

  const cardRect = cardEl.getBoundingClientRect();
  const panel = penaltyDeckEl.closest(".left-panel");
  const panelStyles = panel ? window.getComputedStyle(panel) : null;
  const panelPaddingX = panelStyles
    ? (parseFloat(panelStyles.paddingLeft || "0") + parseFloat(panelStyles.paddingRight || "0"))
    : 0;
  const panelClientWidth = panel ? Number(panel.clientWidth || 0) : 0;
  const panelInnerWidth = panel ? Math.max(0, panelClientWidth - panelPaddingX) : 0;

  if (cardRect.width > 0) {
    const targetWidth = panelInnerWidth > 0
      ? Math.min(cardRect.width, panelInnerWidth)
      : cardRect.width;
    const nextWidth = `${Math.round(targetWidth)}px`;
    if (nextWidth === lastPenaltyDeckWidth && penaltyDeckEl.style.width === nextWidth) return;
    penaltyDeckEl.style.width = nextWidth;
    lastPenaltyDeckWidth = nextWidth;
  }
}

function schedulePenaltyDeckSizeSync() {
  if (penaltyDeckSizeSyncFrame) return;
  penaltyDeckSizeSyncFrame = requestAnimationFrame(syncPenaltyDeckSizeToCards);
}

function bindPenaltyDeckSizeSync() {
  if (penaltyDeckSizeSyncBound) return;
  penaltyDeckSizeSyncBound = true;

  window.addEventListener("resize", schedulePenaltyDeckSizeSync);

  if (typeof ResizeObserver !== "undefined") {
    const cardContainer = getCardContainerEl();
    if (cardContainer) {
      const observer = new ResizeObserver(schedulePenaltyDeckSizeSync);
      observer.observe(cardContainer);
    }
  }
}

const effectsPanelController = createEffectsPanelController({
  state,
  log,
  playerName
});

function renderEffectsPanel() {
  renderFlowStatus();
  effectsPanelController.renderEffectsPanel();
}

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
  syncPenaltyDeckSizeToCards: schedulePenaltyDeckSizeSync,
  isPenaltyFlowActive
});

const rng = {
  nextFloat: () => (state.rng ?? systemRng).nextFloat()
};

const uiSounds = createUiSounds();
const savedAudioPrefs = loadAudioPrefs();
uiSounds.setMuted(savedAudioPrefs.muted);
uiSounds.setMasterVolume(savedAudioPrefs.volume);
setAudioMuteState(savedAudioPrefs.muted);
setAudioVolumeValue(savedAudioPrefs.volume * 100);
let bomburEnabled = loadBomburEnabled();
setBomburToggleState(bomburEnabled);

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
  openActionScreen,
  onCardSelected: () => uiSounds.playSelect(),
  onDittoTriggered: () => uiSounds.playDitto()
});

const dvdBouncer = createDvdBouncer({
  containerSelector: '#game-container',
  imageSrc: 'images/dvd.png',
  imageAlt: 'DVD logo',
  onWallHit: () => {
    uiSounds.playWallHit();
  },
  onCornerHit: ({ corner }) => {
    uiSounds.playCornerHit();
    if (!Array.isArray(state.players) || state.players.length < 1) return;

    const cornerLabel = formatCornerLabel(corner);
    log(`Bombur corner hit (${cornerLabel}): everyone takes 1 shot.`, { kind: 'shot' });
    openActionScreen(
      'Corner Hit',
      `Bombur landed perfectly on ${cornerLabel}. Everyone takes 1 shot.`,
      {
        variant: 'penalty',
        closeLabel: 'Cheers'
      }
    );
  }
});

function syncBomburBouncer() {
  setBomburToggleState(bomburEnabled);

  if (bomburEnabled) {
    dvdBouncer.start();
  } else {
    dvdBouncer.remove();
  }
}

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
  uiSounds.arm();
  showGameContainer();
  initCards(onCardClick);
  syncBackgroundScene(state);
  syncBomburBouncer();
  bindPenaltyDeckSizeSync();
  schedulePenaltyDeckSizeSync();
  hidePenaltyCard(state);
}

function setupEventListeners() {
  bindRedrawClick(onRedrawClick);
  bindPenaltyRefreshClick(onPenaltyRefreshClick);
  bindPenaltyDeckClick(onPenaltyDeckClick);
  bindTurnOrderPlayerClick(onTurnOrderPlayerClick);
  bindTurnOrderRemoveClick(onTurnOrderPlayerRemoveClick);
  bindAudioMuteToggle(() => {
    const nextMuted = !uiSounds.getMuted();
    uiSounds.setMuted(nextMuted);
    setAudioMuteState(nextMuted);
    saveAudioPrefs({ muted: nextMuted, volume: uiSounds.getMasterVolume() });
  });
  bindAudioVolumeChange(() => {
    const volumePercent = getAudioVolumeValue();
    const volume = clamp01(volumePercent / 100);
    uiSounds.setMasterVolume(volume);

    if (volumePercent === 0 && !uiSounds.getMuted()) {
      uiSounds.setMuted(true);
    } else if (volumePercent > 0 && uiSounds.getMuted()) {
      uiSounds.setMuted(false);
    }

    const nextMuted = uiSounds.getMuted();

    setAudioMuteState(nextMuted);
    saveAudioPrefs({ muted: nextMuted, volume });
  });
  bindBomburToggleChange(() => {
    bomburEnabled = getBomburToggleState();
    saveBomburEnabled(bomburEnabled);
    syncBomburBouncer();
  });
}

function onTurnOrderPlayerClick(playerBtn) {
  const rawIndex = Number(playerBtn?.dataset?.index);
  if (!Number.isInteger(rawIndex)) return;

  if (state.uiLocked) return;
  if (isPenaltyFlowActive()) return;
  if (isChoiceSelectionActive(state)) return;
  if (isEffectSelectionActive(state)) return;

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
  schedulePenaltyDeckSizeSync();
}

function updateItemsPanelVisibility() {
  setItemsPanelVisibility(state.includeItems);
}

function resetCards({ keepPenaltyOpen = false } = {}) {
  setBaseBackgroundScene(state, 'normal');
  dealTurnCards(state, rng);
  renderCards(state);
  if (!keepPenaltyOpen) {
    hidePenaltyCard(state);
  }
  renderEffectsPanel();
  schedulePenaltyDeckSizeSync();
}

  return {
    state,
    startGame
  };
}

export const gameController = createGameController();
export const startGame = () => gameController.startGame();
