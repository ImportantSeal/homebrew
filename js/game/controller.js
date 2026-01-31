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
import {
  enableMirrorTargetSelection,
  primeMirrorFromCard,
  enablePlayerNameSelection
} from '../logic/mirror.js';

import { renderCards, getCardElements, setCardKind } from '../ui/cards.js';
import { renderTurnOrder } from '../ui/turnOrder.js';
import { renderItemsBoard } from '../ui/itemsBoard.js';
import { renderStatusEffects } from '../ui/statusEffects.js';

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

// ---------- Timed Effects (NEW) ----------
function makeEffectId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function effectLabel(e) {
  if (!e) return "Effect";
  if (e.type === "DRINK_BUDDY") {
    const src = state.players?.[e.sourceIndex]?.name ?? "Someone";
    const tgt = state.players?.[e.targetIndex]?.name ?? "Someone";
    return `${e.label || "Drink Buddy"} (${src} → ${tgt})`;
  }
  return e.label || e.type || "Effect";
}

function upsertGlobalEffect(type, label, turns) {
  if (!Array.isArray(state.effects)) state.effects = [];
  const existing = state.effects.find(e => e && e.scope === "all" && e.type === type);

  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns || 0, turns);
    log(`Effect refreshed: ${label} (${existing.remainingTurns} turns).`);
  } else {
    state.effects.push({
      id: makeEffectId(),
      type,
      label,
      remainingTurns: turns,
      scope: "all"
    });
    log(`Effect started: ${label} (${turns} turns).`);
  }
}

function upsertDrinkBuddyEffect(sourceIndex, targetIndex, turns) {
  if (!Array.isArray(state.effects)) state.effects = [];
  const existing = state.effects.find(e =>
    e && e.type === "DRINK_BUDDY" && e.sourceIndex === sourceIndex && e.targetIndex === targetIndex
  );

  const src = state.players?.[sourceIndex]?.name ?? "Someone";
  const tgt = state.players?.[targetIndex]?.name ?? "Someone";

  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns || 0, turns);
    log(`Drink Buddy refreshed: ${tgt} drinks with ${src} for ${existing.remainingTurns} turns.`);
  } else {
    state.effects.push({
      id: makeEffectId(),
      type: "DRINK_BUDDY",
      label: "Drink Buddy",
      remainingTurns: turns,
      sourceIndex,
      targetIndex
    });
    log(`Drink Buddy started: ${tgt} drinks whenever ${src} drinks. (${turns} turns)`);
  }
}

function tickTimedEffects() {
  const effects = Array.isArray(state.effects) ? state.effects : [];
  if (effects.length === 0) return;

  // decrement
  effects.forEach(e => {
    if (!e) return;
    const n = Number.isFinite(e.remainingTurns) ? e.remainingTurns : 0;
    e.remainingTurns = Math.max(0, n - 1);
  });

  // expire
  const expired = effects.filter(e => e && (e.remainingTurns || 0) <= 0);
  if (expired.length > 0) {
    expired.forEach(e => log(`Effect ended: ${effectLabel(e)}.`));
  }

  state.effects = effects.filter(e => e && (e.remainingTurns || 0) > 0);
}

// Drink events hook (NEW): enables Drink Buddy to actually do something
function applyDrinkEvent(playerIndex, amount, reason = "", opts = {}) {
  const triggerBuddy = opts.triggerBuddy !== false;

  const p = state.players?.[playerIndex];
  if (!p) return;

  const n = Math.max(1, parseInt(amount, 10) || 1);
  const tail = reason ? ` (${reason})` : "";
  log(`${p.name} drinks ${n}.${tail}`);

  if (!triggerBuddy) return;

  const buddies = (Array.isArray(state.effects) ? state.effects : [])
    .filter(e => e && e.type === "DRINK_BUDDY" && e.sourceIndex === playerIndex && (e.remainingTurns || 0) > 0);

  buddies.forEach(e => {
    const t = state.players?.[e.targetIndex];
    if (!t) return;
    log(`🍻 Drink Buddy: ${t.name} drinks ${n} too.`);
  });
}

function parseDrinkGiveText(txt) {
  const s = String(txt || "").trim();

  const everyone = s.match(/^Everybody drinks\s+(\d+)/i);
  if (everyone) return { kind: "everybody", drink: parseInt(everyone[1], 10) || 1 };

  // "Drink X, Give Y"
  const drink = s.match(/\bDrink\s+(\d+)/i);
  const give = s.match(/\bGive\s+(\d+)/i);

  return {
    kind: "single",
    drink: drink ? (parseInt(drink[1], 10) || 0) : 0,
    give: give ? (parseInt(give[1], 10) || 0) : 0
  };
}

// ---------- Effect target selection (NEW) ----------
function clearEffectSelection() {
  if (state.effectSelection?.cleanup) {
    try { state.effectSelection.cleanup(); } catch (_) {}
  }
  state.effectSelection = { active: false, pending: null, cleanup: null };
}

function beginEffectTargetSelection(pending) {
  clearEffectSelection();

  state.effectSelection.active = true;
  state.effectSelection.pending = pending;

  log(`Pick a target player by clicking a name in the turn order.`);

  // Attach click listeners to player names (same mechanism as Mirror)
  const cleanup = enablePlayerNameSelection(state, (targetIndex, done) => {
    const p = state.effectSelection.pending;
    if (!p) {
      done?.();
      clearEffectSelection();
      return;
    }

    // Apply the pending effect
    if (p.type === "DRINK_BUDDY") {
      upsertDrinkBuddyEffect(p.sourceIndex, targetIndex, p.remainingTurns);
    } else {
      // future-proof: other targeted effects
      log(`Target selected for ${p.type}, but no handler exists.`);
    }

    done?.();
    clearEffectSelection();

    // End the turn now that selection is complete
    nextPlayer();
    unlockUI();
    renderStatusEffects(state);
  });

  state.effectSelection.cleanup = cleanup;
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

  // NEW: reset timed effects at game start
  state.effects = Array.isArray(state.effects) ? [] : [];
  state.effectSelection = { active: false, pending: null, cleanup: null };

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

  // Dropdown close is now harmless (dropdown removed), but keeping doesn't break anything.
  bindCloseDropdownsOnOutsideClick();
}

// ---------- Turn flow ----------
function nextPlayer() {
  // Each time a turn ends, tick timed effects down by 1
  tickTimedEffects();

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
  renderStatusEffects(state);
  resetCards();
}

function renderItems() {
  renderItemsBoard(state, (pIndex, iIndex) => {
    // If a target selection is pending, don't allow item use (keeps UX clean)
    if (state.effectSelection?.active) {
      log("Finish selecting an effect target first.");
      return;
    }

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

    renderStatusEffects(state);
  });
}

function resetCards() {
  dealTurnCards(state);
  renderCards(state, onCardClick);
  hidePenaltyCard(state);
  renderStatusEffects(state);
}

// ---------- UI event handlers ----------
function onRedrawClick() {
  if (state.effectSelection?.active) {
    log("Pick the target player first.");
    return;
  }

  redrawGame();
  const p = currentPlayer();
  log(`${p.name} used Redraw to reveal penalty card and refresh cards.`);
  renderStatusEffects(state);
}

function onPenaltyDeckClick() {
  if (state.effectSelection?.active) {
    log("Pick the target player first.");
    return;
  }

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
    renderStatusEffects(state);
    return;
  }

  // Otherwise reveal penalty deck normally
  if (!state.penaltyShown) {
    lockUI();

    // NEW: pass applyDrinkEvent so penalties can trigger Drink Buddy
    rollPenaltyCard(state, log, "deck", applyDrinkEvent);

    unlockAfter(TIMING.PENALTY_UNLOCK_MS);
    renderStatusEffects(state);
    return;
  }

  hidePenaltyCard(state);
  renderStatusEffects(state);
}

function onCardClick(index) {
  if (state.effectSelection?.active) {
    log("Pick the target player first (click a name in the turn order).");
    return;
  }

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

    // NEW: pass applyDrinkEvent so Ditto drink effects + buddy work
    runDittoEffect(state, index, log, () => renderTurnOrder(state), renderItems, applyDrinkEvent);

    state.dittoActive[index] = false;
    state.dittoPending[index] = null;

    nextPlayer();
    unlockUI();
    renderStatusEffects(state);
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
    const waitForTarget = handleObjectCardDraw(cardEl, cardData);

    if (waitForTarget) {
      // We are now waiting for user to click a player name.
      unlockUI();
      renderStatusEffects(state);
      return;
    }

    nextPlayer();
    unlockUI();
    renderStatusEffects(state);
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
  let effect = null;

  if (typeof event === "object") {
    subName = event.name || "";
    subInstruction = event.instruction || "";
    shownText = subInstruction || subName;
    effect = event.effect || null;
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

  // ✅ NEW: timed effects from special subevents
  if (effect && effect.type) {
    const turns = Math.max(1, parseInt(effect.turns, 10) || 1);

    if (effect.type === "LEFT_HAND") {
      upsertGlobalEffect("LEFT_HAND", "Left Hand Rule", turns);
      return false;
    }

    if (effect.type === "NO_NAMES") {
      upsertGlobalEffect("NO_NAMES", "No Names", turns);
      return false;
    }

    if (effect.type === "DRINK_BUDDY") {
      // Needs target selection -> do NOT end turn yet
      beginEffectTargetSelection({
        type: "DRINK_BUDDY",
        remainingTurns: turns,
        sourceIndex: state.currentPlayerIndex
      });
      return true;
    }
  }

  return false;
}

function handlePlainCard(cardEl, cardData) {
  const p = currentPlayer();
  const value = getCardDisplayValue(cardData);
  const txt = String(value).trim();

  // Penalty card (must confirm via penalty deck click)
  if (isDrawPenaltyCardText(txt)) {
    flashElement(cardEl);

    // NEW: pass applyDrinkEvent so penalty drink triggers buddy
    rollPenaltyCard(state, log, "card", applyDrinkEvent);

    // If blocked by Shield/Immunity, penalty won't show -> turn ends normally
    if (!state.penaltyShown) {
      nextPlayer();
      unlockUI();
      renderStatusEffects(state);
      return;
    }

    unlockAfter(TIMING.PENALTY_UNLOCK_MS);
    renderStatusEffects(state);
    return;
  }

  // Item cards
  if (state.itemCards.includes(value)) {
    log(`${p.name} acquired item: ${value}`);
    p.inventory.push(value);

    flashElement(cardEl);
    renderTurnOrder(state);
    renderItems();
    renderStatusEffects(state);

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
      renderStatusEffects(state);
      return;
    }
  }

  // Ditto activation chance (same as before)
  if (Math.random() < 0.06) {
    const idx = parseInt(cardEl.dataset.index || "0", 10);
    activateDitto(state, cardEl, idx, log);
    unlockUI();
    renderStatusEffects(state);
    return;
  }

  // ✅ NEW: parse drink/give and route through applyDrinkEvent
  const parsed = parseDrinkGiveText(txt);

  if (parsed.kind === "everybody") {
    flashElement(cardEl);

    // Everybody drinks: don't trigger Drink Buddy as "extra" (they already drink anyway)
    state.players.forEach((_, i) => applyDrinkEvent(i, parsed.drink, "Everybody drinks", { triggerBuddy: false }));

    nextPlayer();
    unlockUI();
    renderStatusEffects(state);
    return;
  }

  // Single player drink/give/mix
  if (parsed.drink > 0) {
    flashElement(cardEl);
    applyDrinkEvent(state.currentPlayerIndex, parsed.drink, "Card");
  }

  if (parsed.give > 0) {
    flashElement(cardEl);
    log(`${p.name} gives ${parsed.give}.`);
  }

  if (parsed.drink === 0 && parsed.give === 0) {
    log(`${p.name} selected ${value}`);
    flashElement(cardEl);
  }

  nextPlayer();
  unlockUI();
  renderStatusEffects(state);
}

function redrawGame() {
  // NEW: pass applyDrinkEvent (redraw penalty is preview; buddy impact doesn’t really matter, but safe)
  rollPenaltyCard(state, log, "redraw", applyDrinkEvent);

  setTimeout(() => {
    resetCards();
  }, TIMING.REDRAW_REFRESH_MS);
}
