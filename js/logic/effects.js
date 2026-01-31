// js/logic/effects.js
import { enablePlayerNameSelection } from './mirror.js';

let activeCleanup = null;

function makeId() {
  return `eff_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

export function addEffect(state, effect) {
  if (!Array.isArray(state.effects)) state.effects = [];
  state.effects.push(effect);
}

export function createEffect(type, turns, { sourceIndex = null, targetIndex = null } = {}) {
  return {
    id: makeId(),
    type,
    totalTurns: turns,
    remainingTurns: turns,
    sourceIndex,
    targetIndex
  };
}

/**
 * Decrements effect timers once per finished turn.
 * Removes expired effects.
 */
export function tickEffects(state, log) {
  if (!Array.isArray(state.effects) || state.effects.length === 0) return;

  const expired = [];
  state.effects.forEach(e => {
    if (typeof e.remainingTurns === 'number') e.remainingTurns -= 1;
    if (typeof e.remainingTurns === 'number' && e.remainingTurns <= 0) expired.push(e);
  });

  if (expired.length > 0) {
    state.effects = state.effects.filter(e => !(typeof e.remainingTurns === 'number' && e.remainingTurns <= 0));
    expired.forEach(e => {
      // Keep log short (UI shows the details)
      log?.(`Effect ended: ${e.type}`);
    });
  }
}

/**
 * "Pick a target" mode for targeted effects like DRINK_BUDDY.
 * - Adds highlight mode to turn order names
 * - Blocks other actions until target picked (controller handles the guard)
 */
export function beginTargetedEffectSelection(state, def, sourceIndex, log, onDone) {
  // Clean any previous selection just in case
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  state.effectSelection = {
    active: true,
    pending: {
      type: def.type,
      turns: def.turns,
      sourceIndex
    }
  };

  // Visual hint: highlight player names while picking
  document.body.dataset.pickmode = 'effect-target';

  log?.(`Pick a player for: ${def.type}. Click a player name in turn order.`);

  activeCleanup = enablePlayerNameSelection(state, (targetIndex, cleanup) => {
    cleanup?.();
    activeCleanup = null;

    // Create + store the real effect
    const eff = createEffect(def.type, def.turns, { sourceIndex, targetIndex });
    addEffect(state, eff);

    // Exit pick mode
    state.effectSelection.active = false;
    state.effectSelection.pending = null;
    delete document.body.dataset.pickmode;

    const srcName = state.players?.[sourceIndex]?.name ?? "Someone";
    const tgtName = state.players?.[targetIndex]?.name ?? "Someone";

    // Specific friendly log line
    if (def.type === "DRINK_BUDDY") {
      log?.(`Drink Buddy: ${tgtName} drinks whenever ${srcName} drinks (${def.turns} turns).`);
    } else {
      log?.(`Effect set: ${def.type} → ${tgtName} (${def.turns} turns).`);
    }

    onDone?.(targetIndex);
  });

  return activeCleanup;
}

function parseDrinkAmount(text) {
  const t = String(text || '').trim();

  // Drink N
  const m = t.match(/\bDrink\s+(\d+)\b/i);
  if (m) return { amount: parseInt(m[1], 10), label: `Drink ${m[1]}` };

  // Shot / Shotgun (map to “amount” for buddy mirroring)
  if (/^Shotgun$/i.test(t)) return { amount: 2, label: 'Shotgun' };
  if (/^Shot$/i.test(t)) return { amount: 1, label: 'Shot' };

  return null;
}

/**
 * Central “drink happened” hook:
 * - consumes Immunity for the drinker
 * - triggers DRINK_BUDDY if drinker is a source
 *
 * NOTE: this is a social game; we mainly LOG the extra drink instruction.
 */
export function applyDrinkEvent(state, playerIndex, textOrAmount, reason, log, opts = {}) {
  const { skipBuddy = false } = opts;

  const player = state.players?.[playerIndex];
  if (!player) return;

  let amount = null;
  let label = "";

  if (typeof textOrAmount === 'number') {
    amount = textOrAmount;
    label = `Drink ${amount}`;
  } else {
    const parsed = parseDrinkAmount(textOrAmount);
    if (!parsed) return;
    amount = parsed.amount;
    label = parsed.label;
  }

  // Immunity blocks *this* drink effect
  if (player.immunity) {
    delete player.immunity;
    log?.(`${player.name}'s Immunity prevented: ${label}${reason ? ` (${reason})` : ""}`);
    return;
  }

  // We keep it short (the card itself already says the instruction)
  log?.(`${player.name}: ${label}${reason ? ` (${reason})` : ""}`);

  if (skipBuddy) return;

  // Trigger Drink Buddy(s)
  const effects = Array.isArray(state.effects) ? state.effects : [];
  effects
    .filter(e => e && e.type === "DRINK_BUDDY" && e.sourceIndex === playerIndex && (e.remainingTurns ?? 0) > 0)
    .forEach(e => {
      const tgt = state.players?.[e.targetIndex];
      if (!tgt) return;

      if (tgt.immunity) {
        delete tgt.immunity;
        log?.(`${tgt.name}'s Immunity prevented Drink Buddy (${player.name}).`);
        return;
      }

      // Prevent chain loops
      log?.(`${tgt.name}: ${label} (Drink Buddy with ${player.name})`);
    });
}
