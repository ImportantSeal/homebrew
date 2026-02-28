// js/ditto/effects.js

import { randomFromArray } from '../utils/random.js';
import { recordPenaltyTaken } from '../stats.js';

const ITEM_DITTO_TYPES = new Set(['LOSE_ONE_ITEM_ALL', 'STEAL_RANDOM_ITEM']);

function logDitto(log, message) {
  if (typeof log === 'function') {
    log(message, { kind: 'ditto' });
  }
}

export function getDittoEventPool(state) {
  const pool = [
    { type: 'LOSE_ONE_ITEM_ALL' },
    { type: 'STEAL_RANDOM_ITEM' },
    { type: 'DRINK_3' },
    { type: 'WATERFALL' },
    { type: 'SHOT' },
    { type: 'RANDOM_CHALLENGE' },
    { type: 'PENALTY_ALL' }
  ];

  if (state?.includeItems) return pool;
  return pool.filter(ev => !ITEM_DITTO_TYPES.has(ev.type));
}

export function activateDitto(state, cardElement, cardIndex, log) {
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
  state.dittoPending[cardIndex] = randomFromArray(dittoPool) || { type: 'DRINK_3' };
}

/**
 * applyDrinkEvent(playerIndex, amount, reason) is injected from controller,
 * so Ditto drink effects can trigger "Drink Buddy" etc.
 */
export function runDittoEffect(state, cardIndex, log, updateTurnOrder, renderItemsBoard, applyDrinkEvent) {
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
          instruction: "You are Mini King until your next turn. Anyone interrupting you drinks 2."
        },
        {
          title: "Categories",
          instruction: "Pick a category and go clockwise naming items; first repeat, pause, or miss drinks."
        }
      ];
      const selected = randomFromArray(challenges) || challenges[0];
      const challengeText = `Challenge: ${selected.title} - ${selected.instruction}`;
      logDitto(log, `Ditto challenge: ${selected.title}. ${selected.instruction}`);
      return { title: infoTitle, message: challengeText };
    }

    case 'PENALTY_ALL': {
      const penalty = randomFromArray(state.penaltyDeck);
      logDitto(log, `Ditto rolled a penalty for everyone: ${penalty}`);
      let blockedCount = 0;
      let affectedCount = 0;

      state.players.forEach((p, idx) => {
        if (p.shield) {
          delete p.shield;
          logDitto(log, `${p.name}'s Shield blocked the penalty.`);
          blockedCount += 1;
        } else {
          logDitto(log, `${p.name} takes penalty: ${penalty}`);
          affectedCount += 1;
          recordPenaltyTaken(state, idx);
          // if it's Drink X / Shot etc, trigger drink event
          const m = String(penalty).match(/Drink\s+(\d+)/i);
          if (m) applyDrinkEvent?.(state, idx, parseInt(m[1], 10), "Ditto penalty all", log);
          else if (/^Shotgun$/i.test(String(penalty))) applyDrinkEvent?.(state, idx, "Shotgun", "Ditto penalty all", log);
          else if (/^Shot$/i.test(String(penalty))) applyDrinkEvent?.(state, idx, "Shot", "Ditto penalty all", log);
        }
      });

      updateTurnOrder();
      renderItemsBoard();
      return {
        title: infoTitle,
        message: `Penalty for everyone: ${penalty}. Affected: ${affectedCount}, blocked by Shield: ${blockedCount}.`
      };
    }

    default:
      logDitto(log, "Unknown Ditto effect.");
      return { title: infoTitle, message: "Unknown Ditto effect." };
  }
}
