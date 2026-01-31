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
      log?.(`Effect ended: ${e.type}`);
    });
  }
}

function friendlyEffectName(type) {
  if (type === "DRINK_BUDDY") return "Drink Buddy";
  if (type === "LEFT_HAND") return "Left Hand Rule";
  if (type === "NO_NAMES") return "No Names";
  if (type === "DITTO_MAGNET") return "Ditto Magnet";
  return type;
}

/**
 * "Pick a target" mode for targeted effects like DRINK_BUDDY / DITTO_MAGNET.
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

  log?.(`Pick a player for: ${friendlyEffectName(def.type)}. Click a player name in turn order.`);

  activeCleanup = enablePlayerNameSelection(state, (targetIndex, cleanup) => {
    // ✅ disallow self-target
    if (targetIndex === sourceIndex) {
      const srcName = state.players?.[sourceIndex]?.name ?? "You";
      log?.(`Nope. ${srcName} can't target themselves — pick someone else.`);
      return; // keep selection active; do NOT cleanup
    }

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

    if (def.type === "DRINK_BUDDY") {
      log?.(`Drink Buddy: ${tgtName} drinks whenever ${srcName} drinks (${def.turns} turns).`);
    } else if (def.type === "DITTO_MAGNET") {
      log?.(`Ditto Magnet: if Ditto triggers for ${tgtName}, they take a Shot (${def.turns} turns).`);
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

  // Shot / Shotgun
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

      log?.(`${tgt.name}: ${label} (Drink Buddy with ${player.name})`);
    });
}

/**
 * Trigger hook for "Ditto appeared for player X".
 * Used by DITTO_MAGNET.
 */
export function onDittoActivated(state, playerIndex, log) {
  const player = state.players?.[playerIndex];
  if (!player) return;

  const effects = Array.isArray(state.effects) ? state.effects : [];
  const magnets = effects.filter(
    e => e && e.type === "DITTO_MAGNET" && e.targetIndex === playerIndex && (e.remainingTurns ?? 0) > 0
  );

  if (magnets.length === 0) return;

  // One magnet = one shot. If you WANT stacking, remove the "only once" behavior.
  // We'll do: trigger once even if multiple magnets exist.
  log?.(`${player.name} got Ditto while magnetized → Shot!`);
  applyDrinkEvent(state, playerIndex, "Shot", "Ditto Magnet", log);
}
