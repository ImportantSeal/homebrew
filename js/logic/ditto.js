// js/ditto/effects.js

import { randomFromArray } from '../utils/random.js';
import { resolveRng } from '../utils/rng.js';
import { getPlainCardSpec } from './cardSchema.js';
import { getPenaltyDisplayValue, getPenaltySpec } from './penaltySchema.js';
import { addEffect, createEffect } from './effects.js';
import { EFFECT_TYPES } from './actionEffectRegistry.js';
import { recordGiveDrinks } from '../stats.js';

const ITEM_DITTO_TYPES = new Set(['LOSE_ONE_ITEM_ALL', 'STEAL_RANDOM_ITEM']);
const TRAP_DITTO_TYPE = 'TRAP_CARD';
const MIRROR_DITTO_TYPE = 'MIRROR_IMAGE';
const CLONE_DITTO_TYPE = 'CLONE';
const HIJACK_DITTO_TYPE = 'HIJACKED_TURN';
const LINK_DITTO_TYPE = 'DITTO_LINK';
const DITTO_LINK_TURNS = 3;
// Ditto types that need the original (pre-Ditto) card to resolve.
const SOURCE_CARD_DITTO_TYPES = new Set([TRAP_DITTO_TYPE, MIRROR_DITTO_TYPE, CLONE_DITTO_TYPE]);

function logDitto(log, message) {
  if (typeof log === 'function') {
    log(message, { kind: 'ditto' });
  }
}

function applyPenaltyResult(state, playerIndex, penaltyCard, log, applyDrinkEvent) {
  if (typeof applyDrinkEvent !== 'function') return;

  const penaltySpec = getPenaltySpec(penaltyCard);
  if (penaltySpec?.drink) {
    applyDrinkEvent(state, playerIndex, penaltySpec.drink.amount, 'Ditto penalty', log);
  }
}

function formatDrinkLabel(amount) {
  if (typeof amount === 'number') return `Drink ${amount}`;
  const text = String(amount || '').trim();
  if (/^Shot\+Shotgun$/i.test(text)) return 'Shot + Shotgun';
  if (/^Shotgun$/i.test(text)) return 'Shotgun';
  if (/^Shot$/i.test(text)) return 'Shot';
  return text || 'Drink 1';
}

function formatEveryoneAction(amount) {
  if (typeof amount === 'number') return `drinks ${amount}`;
  const text = String(amount || '').trim();
  if (/^Shot\+Shotgun$/i.test(text)) return 'takes a Shot and a Shotgun';
  if (/^Shotgun$/i.test(text)) return 'takes a Shotgun';
  return 'takes a Shot';
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function boostGroupDrinkAmount(amount) {
  if (typeof amount === 'number') return amount + 1;

  const text = String(amount || '').trim();
  if (/^Shot\+Shotgun$/i.test(text)) return 'Shot+Shotgun';
  if (/^Shotgun$/i.test(text)) return 'Shot+Shotgun';
  if (/^Shot$/i.test(text)) return 'Shotgun';
  return amount;
}

function applyEveryoneDrink(state, amount, reason, log, applyDrinkEvent) {
  if (!Array.isArray(state?.players) || typeof applyDrinkEvent !== 'function') return;

  state.players.forEach((_, idx) => {
    applyDrinkEvent(state, idx, amount, reason, log, { suppressSelfLog: true });
  });
}

function resolveTrapSourceCard(state, cardIndex, ev) {
  if (ev && Object.prototype.hasOwnProperty.call(ev, 'sourceCard')) return ev.sourceCard;
  return state?.currentCards?.[cardIndex];
}

function runDittoTrap(state, cardIndex, ev, log, applyDrinkEvent) {
  const sourceCard = resolveTrapSourceCard(state, cardIndex, ev);
  const spec = getPlainCardSpec(sourceCard);

  if (spec.drink && spec.give && spec.drink.scope === 'self') {
    const drinkAmount = toPositiveNumber(spec.drink.amount);
    const giveAmount = toPositiveNumber(spec.give.amount);

    if (drinkAmount > 0 && giveAmount > 0) {
      const trapAmount = drinkAmount + giveAmount;
      const message = `The Give backfires. ${formatDrinkLabel(trapAmount)}.`;
      logDitto(log, message);
      applyDrinkEvent?.(state, state.currentPlayerIndex, trapAmount, 'Ditto trap', log);
      return message;
    }
  }

  if (spec.give) {
    const trapAmount = toPositiveNumber(spec.give.amount) || 1;
    const message = `The Give backfires. ${formatDrinkLabel(trapAmount)}.`;
    logDitto(log, message);
    applyDrinkEvent?.(state, state.currentPlayerIndex, trapAmount, 'Ditto trap', log);
    return message;
  }

  if (spec.drink) {
    if (spec.drink.scope === 'all') {
      const trapAmount = boostGroupDrinkAmount(spec.drink.amount);
      const message = `The group drink gets worse. Everybody ${formatEveryoneAction(trapAmount)}.`;
      logDitto(log, message);
      applyEveryoneDrink(state, trapAmount, 'Ditto trap', log, applyDrinkEvent);
      return message;
    }

    const message = `The Drink spreads. Everybody ${formatEveryoneAction(spec.drink.amount)}.`;
    logDitto(log, message);
    applyEveryoneDrink(state, spec.drink.amount, 'Ditto trap', log, applyDrinkEvent);
    return message;
  }

  const message = 'The trap misfires. Drink 3.';
  logDitto(log, message);
  applyDrinkEvent?.(state, state.currentPlayerIndex, 3, 'Ditto trap', log);
  return message;
}

// Shot-type amounts as a numeric drink count (for give stats).
function drinkAmountToNumber(amount) {
  if (typeof amount === 'number') return amount;
  const text = String(amount || '').trim();
  if (/^Shot\+Shotgun$/i.test(text)) return 3;
  if (/^Shotgun$/i.test(text)) return 2;
  if (/^Shot$/i.test(text)) return 1;
  return 0;
}

function formatGiveLabel(amount) {
  if (typeof amount === 'number') return `give ${amount}`;
  return `pick a player to take a ${formatDrinkLabel(amount)}`;
}

function nextPlayerIndex(state) {
  const count = state?.players?.length || 0;
  if (count < 2) return null;
  return (state.currentPlayerIndex + 1) % count;
}

/**
 * Mirror Image: the original card flips.
 * Drink X -> Give X, Give X -> Drink X, Drink A + Give B -> Drink B + Give A,
 * Everybody drinks X -> everybody except you drinks X.
 */
function runDittoMirror(state, cardIndex, ev, log, applyDrinkEvent) {
  const sourceCard = resolveTrapSourceCard(state, cardIndex, ev);
  const spec = getPlainCardSpec(sourceCard);
  const playerIndex = state.currentPlayerIndex;
  const playerName = state.players?.[playerIndex]?.name ?? 'You';

  if (spec.drink && spec.drink.scope === 'all') {
    const message = `Mirror Image! The group drink reflects away from you. Everybody except ${playerName} ${formatEveryoneAction(spec.drink.amount)}.`;
    logDitto(log, message);
    state.players.forEach((_, idx) => {
      if (idx === playerIndex) return;
      applyDrinkEvent?.(state, idx, spec.drink.amount, 'Ditto mirror', log, { suppressSelfLog: true });
    });
    return message;
  }

  if (spec.drink && spec.give) {
    const newDrink = spec.give.amount;
    const newGive = spec.drink.amount;
    const message = `Mirror Image! The card flips: ${formatDrinkLabel(newDrink)} and ${formatGiveLabel(newGive)}.`;
    logDitto(log, message);
    applyDrinkEvent?.(state, playerIndex, newDrink, 'Ditto mirror', log);
    recordGiveDrinks(state, playerIndex, drinkAmountToNumber(newGive));
    return message;
  }

  if (spec.drink) {
    const message = `Mirror Image! The card flips: instead of drinking, ${formatGiveLabel(spec.drink.amount)}.`;
    logDitto(log, message);
    recordGiveDrinks(state, playerIndex, drinkAmountToNumber(spec.drink.amount));
    return message;
  }

  if (spec.give) {
    const message = `Mirror Image! The card flips: instead of giving, ${formatDrinkLabel(spec.give.amount)}.`;
    logDitto(log, message);
    applyDrinkEvent?.(state, playerIndex, spec.give.amount, 'Ditto mirror', log);
    return message;
  }

  const message = 'The mirror cracks. Drink 2.';
  logDitto(log, message);
  applyDrinkEvent?.(state, playerIndex, 2, 'Ditto mirror', log);
  return message;
}

/**
 * Clone: the original card hits you AND the next player in turn order.
 * Everybody drinks X -> everybody drinks it twice.
 */
function runDittoClone(state, cardIndex, ev, log, applyDrinkEvent) {
  const sourceCard = resolveTrapSourceCard(state, cardIndex, ev);
  const spec = getPlainCardSpec(sourceCard);
  const playerIndex = state.currentPlayerIndex;
  const playerName = state.players?.[playerIndex]?.name ?? 'You';

  if (spec.drink && spec.drink.scope === 'all') {
    const message = `Clone! The group drink happens twice. Everybody ${formatEveryoneAction(spec.drink.amount)}, two times.`;
    logDitto(log, message);
    applyEveryoneDrink(state, spec.drink.amount, 'Ditto clone', log, applyDrinkEvent);
    applyEveryoneDrink(state, spec.drink.amount, 'Ditto clone', log, applyDrinkEvent);
    return message;
  }

  const cloneIndex = nextPlayerIndex(state);
  const targets = cloneIndex == null ? [playerIndex] : [playerIndex, cloneIndex];
  const cloneName = cloneIndex == null ? null : (state.players?.[cloneIndex]?.name ?? 'Next player');

  const parts = [];
  if (spec.drink) parts.push(formatDrinkLabel(spec.drink.amount));
  if (spec.give) parts.push(`Give ${spec.give.amount}`);
  if (parts.length === 0) parts.push('Drink 2');
  const cardText = parts.join(', ');

  targets.forEach((idx) => {
    if (spec.drink) applyDrinkEvent?.(state, idx, spec.drink.amount, 'Ditto clone', log);
    if (spec.give) recordGiveDrinks(state, idx, spec.give.amount);
    if (!spec.drink && !spec.give) applyDrinkEvent?.(state, idx, 2, 'Ditto clone', log);
  });

  const message = cloneName
    ? `Clone! ${cardText} hits both ${playerName} and ${cloneName}.`
    : `Clone! Nobody to clone onto. ${cardText}.`;
  logDitto(log, message);
  return message;
}

/**
 * Hijacked Turn: the next player in turn order gets an extra turn
 * (they keep their turn once when it ends; see controller nextPlayer).
 */
function runDittoHijack(state, log, applyDrinkEvent) {
  const hijackerIndex = nextPlayerIndex(state);
  if (hijackerIndex == null) {
    const message = 'Ditto tried to hijack your turn, but nobody else is playing. Drink 2.';
    logDitto(log, message);
    applyDrinkEvent?.(state, state.currentPlayerIndex, 2, 'Ditto hijack', log);
    return message;
  }

  const hijacker = state.players[hijackerIndex];
  hijacker.dittoExtraTurn = true;
  const message = `Hijacked Turn! Ditto steals your turn. ${hijacker.name} draws twice in a row.`;
  logDitto(log, message);
  return message;
}

/**
 * Ditto Link: a random other player drinks whenever you drink for the next turns.
 * Reuses the DRINK_BUDDY effect.
 */
function runDittoLink(state, log, applyDrinkEvent, rng) {
  const sourceIndex = state.currentPlayerIndex;
  const candidates = (state.players || [])
    .map((_, idx) => idx)
    .filter(idx => idx !== sourceIndex);
  const targetIndex = randomFromArray(candidates, rng);

  if (targetIndex == null) {
    const message = 'Ditto found nobody to link with. Drink 2.';
    logDitto(log, message);
    applyDrinkEvent?.(state, sourceIndex, 2, 'Ditto link', log);
    return message;
  }

  addEffect(state, createEffect(EFFECT_TYPES.DRINK_BUDDY, DITTO_LINK_TURNS, { sourceIndex, targetIndex, rng }));
  const srcName = state.players[sourceIndex]?.name ?? 'You';
  const tgtName = state.players[targetIndex]?.name ?? 'Someone';
  const message = `Ditto Link! For the next ${DITTO_LINK_TURNS} turns, ${tgtName} drinks whenever ${srcName} drinks.`;
  logDitto(log, message);
  return message;
}

export function getDittoEventPool(state) {
  const pool = [
    { type: 'LOSE_ONE_ITEM_ALL' },
    { type: 'STEAL_RANDOM_ITEM' },
    { type: 'DRINK_3' },
    { type: 'WATERFALL' },
    { type: 'SHOT' },
    { type: 'RANDOM_CHALLENGE' },
    { type: 'PENALTY_ALL' },
    { type: TRAP_DITTO_TYPE },
    { type: MIRROR_DITTO_TYPE },
    { type: CLONE_DITTO_TYPE },
    { type: HIJACK_DITTO_TYPE },
    { type: LINK_DITTO_TYPE }
  ];

  if (state?.includeItems) return pool;
  return pool.filter(ev => !ITEM_DITTO_TYPES.has(ev.type));
}

export function activateDitto(state, cardElement, cardIndex, log, sourceCard = null) {
  const rng = resolveRng(state?.rng);
  const originalCard = sourceCard ?? state?.currentCards?.[cardIndex] ?? cardElement?.dataset?.value ?? null;
  state.dittoActive[cardIndex] = true;
  cardElement.dataset.value = "Ditto";

  // mark kind for CSS (badge + strip + ditto image)
  cardElement.dataset.kind = "ditto";

  // keep DOM clean: no inline background-image; CSS handles the visual
  const front = cardElement.querySelector('.card__front');
  if (front) {
    front.textContent = "";
    front.removeAttribute('style');
  }

  // ensure it's showing front
  cardElement.classList.add('show-front');

  logDitto(log, "Ditto effect activated! Click again to confirm.");

  cardElement.dataset.dittoTime = Date.now();
  const dittoPool = getDittoEventPool(state);
  const selectedEvent = randomFromArray(dittoPool, rng) || { type: 'DRINK_3' };
  state.dittoPending[cardIndex] = SOURCE_CARD_DITTO_TYPES.has(selectedEvent.type)
    ? { ...selectedEvent, sourceCard: originalCard }
    : selectedEvent;
}

/**
 * applyDrinkEvent(playerIndex, amount, reason) is injected from controller,
 * so Ditto drink effects can trigger "Drink Buddy" etc.
 */
export function runDittoEffect(state, cardIndex, log, updateTurnOrder, renderItemsBoard, applyDrinkEvent) {
  const rng = resolveRng(state?.rng);
  const ev = state.dittoPending?.[cardIndex];
  const currentPlayer = state.players[state.currentPlayerIndex];
  const infoTitle = "Ditto Effect";

  if (!ev) {
    logDitto(log, "Ditto had no stored effect (unexpected).");
    return { title: infoTitle, message: "Ditto had no stored effect." };
  }

  if (!state.includeItems && ITEM_DITTO_TYPES.has(ev.type)) {
    logDitto(log, "Ditto skipped an item-related effect because items are disabled.");
    return {
      title: infoTitle,
      message: "Ditto skipped an item-related effect because items are disabled."
    };
  }

  switch (ev.type) {
    case 'LOSE_ONE_ITEM_ALL': {
      logDitto(log, "Ditto caused chaos! All players lose one item.");
      state.players.forEach(p => {
        if (p.inventory && p.inventory.length > 0) p.inventory.pop();
      });
      updateTurnOrder();
      renderItemsBoard();
      return { title: infoTitle, message: "All players lose one item." };
    }

    case 'STEAL_RANDOM_ITEM': {
      const others = state.players.filter((_, i) => i !== state.currentPlayerIndex);
      const target = randomFromArray(others);
      if (target && target.inventory && target.inventory.length > 0) {
        const stolen = target.inventory.pop();
        currentPlayer.inventory.push(stolen);
        logDitto(log, `Ditto stole ${stolen} from ${target.name}!`);
        updateTurnOrder();
        renderItemsBoard();
        return { title: infoTitle, message: `Stole ${stolen} from ${target.name}.` };
      } else {
        logDitto(log, "Ditto tried to steal, but the target player had no items.");
        updateTurnOrder();
        renderItemsBoard();
        return {
          title: infoTitle,
          message: "Tried to steal an item, but the target had no items."
        };
      }
    }

    case 'DRINK_3': {
      logDitto(log, "Ditto says: Drink 3!");
      applyDrinkEvent?.(state, state.currentPlayerIndex, 3, "Ditto", log);
      return { title: infoTitle, message: "Drink 3." };
    }

    case 'WATERFALL': {
      logDitto(log, "Ditto started a Waterfall. Everyone starts drinking in order.");
      return { title: infoTitle, message: "Start a Waterfall. Everyone drinks in order." };
    }

    case 'SHOT': {
      logDitto(log, "Ditto ordered a Shot. Take a shot now.");
      applyDrinkEvent?.(state, state.currentPlayerIndex, "Shot", "Ditto", log);
      return { title: infoTitle, message: "Take a Shot." };
    }

    case 'RANDOM_CHALLENGE': {
      const challenges = [
        {
          title: "Truth or Penalty",
          instruction: "Ask any player: 'Truth or Penalty?'"
        },
        {
          title: "Dare",
          instruction: "Dare someone."
        },
        {
          title: "Mini King",
          instruction: "Everyone adds to the King's Cup. You drink the King's Cup."
        },
        {
          title: "Categories",
          instruction: "Pick a category and go clockwise naming items; first repeat, pause, or miss drinks."
        }
      ];
      const selected = randomFromArray(challenges, rng) || challenges[0];
      const challengeText = `Challenge: ${selected.title} - ${selected.instruction}`;
      logDitto(log, `Ditto challenge: ${selected.title}. ${selected.instruction}`);
      return { title: infoTitle, message: challengeText };
    }

    case 'PENALTY_ALL': {
      const penalty = randomFromArray(state.penaltyDeck, rng) || 'Drink 1';
      const penaltyLabel = getPenaltyDisplayValue(penalty);
      let affectedCount = 0;
      let blockedByShieldCount = 0;

      state.players.forEach((player, idx) => {
        if (state.includeItems && player?.shield) {
          delete player.shield;
          blockedByShieldCount += 1;
          return;
        }

        affectedCount += 1;
        applyPenaltyResult(state, idx, penalty, log, applyDrinkEvent);
      });

      if (blockedByShieldCount > 0) {
        updateTurnOrder();
        renderItemsBoard();
      }

      let message = `Penalty for everyone: ${penaltyLabel}. Affected: ${affectedCount}.`;
      if (blockedByShieldCount > 0) {
        message += ` Blocked by Shield: ${blockedByShieldCount}.`;
      }

      logDitto(log, `Ditto triggered group penalty ${penaltyLabel}. Affected ${affectedCount}.`);
      return { title: infoTitle, message };
    }

    case TRAP_DITTO_TYPE: {
      const message = runDittoTrap(state, cardIndex, ev, log, applyDrinkEvent);
      return { title: infoTitle, message };
    }

    case MIRROR_DITTO_TYPE: {
      const message = runDittoMirror(state, cardIndex, ev, log, applyDrinkEvent);
      return { title: infoTitle, message };
    }

    case CLONE_DITTO_TYPE: {
      const message = runDittoClone(state, cardIndex, ev, log, applyDrinkEvent);
      return { title: infoTitle, message };
    }

    case HIJACK_DITTO_TYPE: {
      const message = runDittoHijack(state, log, applyDrinkEvent);
      updateTurnOrder();
      return { title: infoTitle, message };
    }

    case LINK_DITTO_TYPE: {
      const message = runDittoLink(state, log, applyDrinkEvent, rng);
      return { title: infoTitle, message };
    }

    default:
      logDitto(log, "Unknown Ditto effect.");
      return { title: infoTitle, message: "Unknown Ditto effect." };
  }
}
