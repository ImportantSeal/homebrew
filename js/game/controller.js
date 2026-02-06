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

import {
  addEffect,
  createEffect,
  tickEffects,
  beginTargetedEffectSelection,
  applyDrinkEvent,
  onDittoActivated
} from '../logic/effects.js';

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

function parseDrinkFromText(text) {
  const t = String(text || "").trim();

  // Everybody drinks N
  const all = t.match(/^Everybody drinks\s+(\d+)\b/i);
  if (all) return { scope: "all", amount: parseInt(all[1], 10) };

  // Drink N (also matches "Drink 2, Give 1")
  const self = t.match(/\bDrink\s+(\d+)\b/i);
  if (self) return { scope: "self", amount: parseInt(self[1], 10) };

  return null;
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function inventoryCount(player) {
  return Array.isArray(player?.inventory) ? player.inventory.length : 0;
}

function totalOtherItems(state, selfIndex) {
  return state.players.reduce((sum, p, idx) => {
    if (idx === selfIndex) return sum;
    return sum + inventoryCount(p);
  }, 0);
}

function maxItemsAnyPlayer(state) {
  return Math.max(0, ...state.players.map(p => inventoryCount(p)));
}

function runSpecialAction(action) {
  const p = currentPlayer();
  const selfIndex = state.currentPlayerIndex;

  switch (action) {
    case "DRINK_AND_DRAW_AGAIN": {
      applyDrinkEvent(state, selfIndex, 1, "Drink and Draw Again", log);
      log(`${p.name} keeps their turn and draws new cards.`);
      return { endTurn: false, refreshCards: true };
    }

    case "RISKY_ADVICE_D20": {
      const r = rollDie(20);
      log(`Risky roll (d20): ${r}`);

      if (r === 1) {
        log("Critical fail: down your drink. (We treat this as Shotgun.)");
        applyDrinkEvent(state, selfIndex, "Shotgun", "Risky Advice: 1", log);
        return;
      }

      if (r === 20) {
        log("Natural 20: everyone else downs. (We treat this as Shotgun.)");
        state.players.forEach((_, idx) => {
          if (idx !== selfIndex) applyDrinkEvent(state, idx, "Shotgun", "Risky Advice: 20", log);
        });
        return;
      }

      // “Advice quality” is social judgement — we just instruct
      log("Give a genuinely useful tip. Table votes: if it's BAD → you drink 2. If it's GOOD → you may give 2.");
      return;
    }

    case "COLLECTOR": {
      const myItems = inventoryCount(p);
      const maxItems = maxItemsAnyPlayer(state);

      if (maxItems <= 0) {
        log("The Collector: nobody has any items. Nothing happens.");
        return;
      }

      if (myItems === maxItems) {
        log(`The Collector: you have the most items (${myItems}). Drink ${myItems}.`);
        if (myItems > 0) applyDrinkEvent(state, selfIndex, myItems, "The Collector", log);
      } else {
        log(`The Collector: you do NOT have the most items (${myItems} vs max ${maxItems}). Safe... for now.`);
      }
      return;
    }

    case "MINIMALIST": {
      const myItems = inventoryCount(p);
      if (myItems !== 0) {
        log(`The Minimalist: you have ${myItems} item(s), so nothing happens.`);
        return;
      }

      const give = totalOtherItems(state, selfIndex);
      if (give <= 0) {
        log("The Minimalist: everyone is item-poor. Nothing happens.");
        return;
      }

      log(`The Minimalist: you have 0 items → GIVE ${give} drinks (total items held by others).`);
      return;
    }

    default:
      return;
  }
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

  // reset effects for a fresh game
  state.effects = [];
  state.effectSelection = { active: false, pending: null };

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
  //  end-of-turn timing: tick active effects once per finished turn
  tickEffects(state, log);

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
    log("Pick a target player first (effect selection is active).");
    return;
  }

  redrawGame();
  const p = currentPlayer();
  log(`${p.name} used Redraw to reveal penalty card and refresh cards.`);
  renderStatusEffects(state);
}

function onPenaltyDeckClick() {
  if (state.effectSelection?.active) {
    log("Pick a target player first (effect selection is active).");
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
    rollPenaltyCard(state, log, "deck");

    // If a real penalty appeared, hook drink buddy + immunity handling
    if (state.penaltyShown && state.penaltyCard) {
      const drink = parseDrinkFromText(state.penaltyCard);
      if (drink?.scope === "self") {
        applyDrinkEvent(state, state.currentPlayerIndex, drink.amount, "Penalty", log);
      }
    }

    unlockAfter(TIMING.PENALTY_UNLOCK_MS);
    renderStatusEffects(state);
    return;
  }

  hidePenaltyCard(state);
  renderStatusEffects(state);
}

function onCardClick(index) {
  if (state.uiLocked) return;

  //  Block card clicks while an effect is waiting for target pick
  if (state.effectSelection?.active) {
    log("Pick the target player in the turn order first.");
    return;
  }

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

    //  pass applyDrinkEvent so Ditto drink outcomes can trigger Drink Buddy too
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
    const endsTurnNow = handleObjectCardDraw(cardEl, cardData);

    // If we started a target-pick effect, DON'T end the turn yet
    if (endsTurnNow) {
      nextPlayer();
    }

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
  let effectDef = null;
  let action = null;

  if (typeof event === "object") {
    subName = event.name || "";
    subInstruction = event.instruction || "";
    shownText = subInstruction || subName;

    if (event.effect && typeof event.effect === "object") {
      effectDef = event.effect; // { type, turns, needsTarget? }
    }
    if (event.action) {
      action = event.action;
    }
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

  // Timed Effect Cards
  if (effectDef && effectDef.type && effectDef.turns) {
    // Targeted effect: enter pick mode, DO NOT end turn yet
    if (effectDef.needsTarget) {
      beginTargetedEffectSelection(
        state,
        { type: effectDef.type, turns: effectDef.turns },
        state.currentPlayerIndex,
        log,
        () => {
          renderStatusEffects(state);
          // End the turn AFTER target is picked
          nextPlayer();
        }
      );

      renderStatusEffects(state);
      return false;
    }

    // Non-targeted effects:
    if (effectDef.type === "LEFT_HAND") {
      addEffect(state, createEffect("LEFT_HAND", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
      log(`Effect activated: Left Hand Rule (${effectDef.turns} turns).`);
    } else if (effectDef.type === "NO_NAMES") {
      addEffect(state, createEffect("NO_NAMES", effectDef.turns, { targetIndex: state.currentPlayerIndex }));
      log(`Effect activated: No Names (${effectDef.turns} turns).`);
    } else {
      addEffect(state, createEffect(effectDef.type, effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
      log(`Effect activated: ${effectDef.type} (${effectDef.turns} turns).`);
    }

    renderStatusEffects(state);
  }

  //  NEW: one-shot action cards (Risky/Collector/Minimalist)
  let actionResult = null;
  if (action) {
    actionResult = runSpecialAction(action);
    renderStatusEffects(state);
  }

  if (actionResult?.refreshCards) {
    resetCards();
    renderStatusEffects(state);
  }

  return actionResult?.endTurn ?? true;
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
      renderStatusEffects(state);
      return;
    }

    // If a real penalty appeared, hook drink buddy + immunity handling
    if (state.penaltyCard) {
      const drink = parseDrinkFromText(state.penaltyCard);
      if (drink?.scope === "self") {
        applyDrinkEvent(state, state.currentPlayerIndex, drink.amount, "Penalty", log);
      }
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

  // Ditto activation chance (same as before)
  if (Math.random() < 0.06) {
    const idx = parseInt(cardEl.dataset.index || "0", 10);
    activateDitto(state, cardEl, idx, log);

    //  NEW: Ditto Magnet trigger
    onDittoActivated(state, state.currentPlayerIndex, log);

    unlockUI();
    renderStatusEffects(state);
    return;
  }

  //  Drink event hook (for Immunity + Drink Buddy logging)
  const drink = parseDrinkFromText(txt);
  if (drink) {
    if (drink.scope === "all") {
      state.players.forEach((_, idx) => {
        applyDrinkEvent(state, idx, drink.amount, "Everybody drinks", log);
      });
    } else {
      applyDrinkEvent(state, state.currentPlayerIndex, drink.amount, "Drink card", log);
    }
  } else {
    log(`${p.name} selected ${value}`);
  }

  flashElement(cardEl);

  nextPlayer();
  unlockUI();
  renderStatusEffects(state);
}

function redrawGame() {
  rollPenaltyCard(state, log, "redraw");
  setTimeout(() => {
    resetCards();
  }, TIMING.REDRAW_REFRESH_MS);
}
