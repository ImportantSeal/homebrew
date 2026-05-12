// js/logic/effects.js
import { recordDrinkTaken } from '../stats.js';
import { EFFECT_TYPES } from './actionEffectRegistry.js';
import { getEffectTitle } from './effectNames.js';
import { systemRng } from '../utils/rng.js';
import { FLOW_TRANSITIONS, transitionFlow } from './flowMachine.js';

const NOOP_EFFECT_UI = Object.freeze({
  clearPickMode: () => {},
  enablePlayerNameSelection: () => () => {}
});

function normalizeEffectUi(ui) {
  if (!ui || typeof ui !== 'object') return NOOP_EFFECT_UI;
  return {
    clearPickMode: typeof ui.clearPickMode === 'function' ? ui.clearPickMode : NOOP_EFFECT_UI.clearPickMode,
    enablePlayerNameSelection: typeof ui.enablePlayerNameSelection === 'function'
      ? ui.enablePlayerNameSelection
      : NOOP_EFFECT_UI.enablePlayerNameSelection
  };
}

function makeId(rng = systemRng) {
  return `eff_${Date.now()}_${Math.floor(rng.nextFloat() * 1e9)}`;
}

function clearPickMode(state) {
  const activeUi = state?.effectSelection?.ui;
  if (!activeUi || typeof activeUi.clearPickMode !== 'function') return;
  activeUi.clearPickMode();
}

function setEffectSelectionState(state, overrides = {}) {
  state.effectSelection = {
    active: false,
    pending: null,
    cleanup: null,
    ui: null,
    ...overrides
  };
}

export function addEffect(state, effect) {
  if (!Array.isArray(state.effects)) state.effects = [];
  state.effects.push(effect);
}

export function createEffect(type, turns, { sourceIndex = null, targetIndex = null, rng = systemRng } = {}) {
  return {
    id: makeId(rng),
    type,
    totalTurns: turns,
    remainingTurns: turns,
    // Prevent immediate duration loss on the same turn the effect was created.
    justActivated: true,
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
    if (e?.justActivated) {
      delete e.justActivated;
      return;
    }

    if (typeof e.remainingTurns === 'number') e.remainingTurns -= 1;
    if (typeof e.remainingTurns === 'number' && e.remainingTurns <= 0) expired.push(e);
  });

  if (expired.length > 0) {
    state.effects = state.effects.filter(e => !(typeof e.remainingTurns === 'number' && e.remainingTurns <= 0));
    expired.forEach(e => {
      log?.(`Effect ended: ${getEffectTitle(e.type, e.type)}`);
    });
  }
}

export function cancelTargetedEffectSelection(state) {
  const activeCleanup = state?.effectSelection?.cleanup;
  if (typeof activeCleanup === 'function') {
    activeCleanup();
  }

  clearPickMode(state);
  const transition = transitionFlow(state, FLOW_TRANSITIONS.CLEAR_EFFECT);
  if (!transition.ok) {
    setEffectSelectionState(state);
  }
}

/**
 * "Pick a target" mode for targeted effects like DRINK_BUDDY / DITTO_MAGNET.
 * Blocks other actions until a target is picked (controller handles the guard).
 */
export function beginTargetedEffectSelection(state, def, sourceIndex, log, onDone, rng = systemRng, ui = null) {
  cancelTargetedEffectSelection(state);
  const selectionUi = normalizeEffectUi(ui);

  const players = Array.isArray(state.players) ? state.players : [];
  const hasValidTarget = players.length > 0;
  if (!hasValidTarget) {
    const effectName = getEffectTitle(def?.type, def?.type || "Effect");
    log?.(`${effectName} needs at least one player. Effect was skipped.`);
    const clearTransition = transitionFlow(state, FLOW_TRANSITIONS.CLEAR_EFFECT);
    if (!clearTransition.ok) {
      setEffectSelectionState(state);
    }
    onDone?.(null);
    return null;
  }

  const startTransition = transitionFlow(state, FLOW_TRANSITIONS.START_EFFECT, {
    pendingEffect: {
      type: def.type,
      turns: def.turns,
      sourceIndex
    },
    ui: selectionUi
  });
  if (!startTransition.ok) {
    log?.("Effect selection could not be started.");
    onDone?.(null);
    return null;
  }

  const effectName = getEffectTitle(def.type, def.type);
  const cardMessage = String(def?.message || '').trim();
  const selectionMessage = [
    cardMessage,
    `Choose a player for ${effectName}.`
  ].filter(Boolean).join(' ');

  log?.(`Pick a player for: ${effectName}. Use the player menu.`);

  const activeCleanup = selectionUi.enablePlayerNameSelection(state, (targetIndex, cleanup) => {
    cleanup?.();

    if (state?.effectSelection?.ui !== selectionUi) {
      return;
    }

    state.effectSelection.cleanup = null;

    // Create + store the real effect
    const eff = createEffect(def.type, def.turns, { sourceIndex, targetIndex, rng });
    addEffect(state, eff);

    // Exit pick mode
    clearPickMode(state);
    const clearTransition = transitionFlow(state, FLOW_TRANSITIONS.CLEAR_EFFECT);
    if (!clearTransition.ok) {
      setEffectSelectionState(state);
    }

    const srcName = state.players?.[sourceIndex]?.name ?? "Someone";
    const tgtName = state.players?.[targetIndex]?.name ?? "Someone";

    if (def.type === EFFECT_TYPES.DRINK_BUDDY) {
      log?.(`Drink Buddy: ${tgtName} drinks whenever ${srcName} drinks (${def.turns} turns).`);
    } else if (def.type === EFFECT_TYPES.DITTO_MAGNET) {
      log?.(`Ditto Magnet: if Ditto triggers for ${tgtName}, they take a Shot (${def.turns} turns).`);
    } else if (def.type === EFFECT_TYPES.KINGS_TAX) {
      log?.(`King's Tax: ${tgtName} is king for ${def.turns} turns. Anyone who interrupts them drinks 2.`);
    } else if (def.type === EFFECT_TYPES.DOMINO_CURSE) {
      log?.(`Domino Curse: whenever ${tgtName} drinks, everyone else drinks 1 (${def.turns} turns).`);
    } else if (def.type === EFFECT_TYPES.NEMESIS_MARK) {
      log?.(`Nemesis Mark: when ${tgtName} drinks, ${srcName} may give 1 (${def.turns} turns).`);
    } else {
      log?.(`Effect set: ${def.type} -> ${tgtName} (${def.turns} turns).`);
    }

    onDone?.(targetIndex);
  }, {
    title: String(def?.title || 'Pick a Player').trim() || 'Pick a Player',
    message: selectionMessage || `Choose a player for ${effectName}.`,
    effectName
  });

  state.effectSelection.cleanup = activeCleanup;

  return activeCleanup;
}

function parseDrinkAmount(text) {
  const t = String(text || '').trim();

  // Drink N
  const m = t.match(/\bDrink\s+(\d+)\b/i);
  if (m) return { amount: parseInt(m[1], 10), label: `Drink ${m[1]}` };

  // Shot + Shotgun
  if (/^Shot\+Shotgun$/i.test(t) || /^Shot\s*\+\s*Shotgun$/i.test(t)) {
    return { amount: 3, label: 'Shot + Shotgun' };
  }

  // Shot / Shotgun
  if (/^Shotgun$/i.test(t)) return { amount: 2, label: 'Shotgun' };
  if (/^Shot$/i.test(t)) return { amount: 1, label: 'Shot' };

  return null;
}

/**
 * Central "drink happened" hook:
 * - triggers DRINK_BUDDY if drinker is a source
 * - triggers DOMINO_CURSE if drinker is the cursed target
 * - logs NEMESIS_MARK reminder if drinker is marked target
 */
export function applyDrinkEvent(state, playerIndex, textOrAmount, reason, log, opts = {}) {
  const {
    skipBuddy = false,
    suppressSelfLog = false,
    skipDomino = false,
    skipNemesis = false
  } = opts;

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

  if (!suppressSelfLog) {
    log?.(`${player.name}: ${label}${reason ? ` (${reason})` : ""}`);
  }

  recordDrinkTaken(state, playerIndex, amount);

  const effects = Array.isArray(state.effects) ? state.effects : [];

  if (!skipBuddy) {
    effects
      .filter(e => e && e.type === EFFECT_TYPES.DRINK_BUDDY && e.sourceIndex === playerIndex && (e.remainingTurns ?? 0) > 0)
      .forEach(e => {
        const tgt = state.players?.[e.targetIndex];
        if (!tgt) return;

        log?.(`${tgt.name}: ${label} (Drink Buddy with ${player.name})`);
        recordDrinkTaken(state, e.targetIndex, amount);
      });
  }

  if (!skipDomino) {
    effects
      .filter(e => e && e.type === EFFECT_TYPES.DOMINO_CURSE && e.targetIndex === playerIndex && (e.remainingTurns ?? 0) > 0)
      .forEach(() => {
        state.players?.forEach((_, idx) => {
          if (idx === playerIndex) return;
          applyDrinkEvent(state, idx, 1, "Domino Curse", log, { skipDomino: true });
        });
      });
  }

  if (!skipNemesis) {
    effects
      .filter(e => e && e.type === EFFECT_TYPES.NEMESIS_MARK && e.targetIndex === playerIndex && (e.remainingTurns ?? 0) > 0)
      .forEach(e => {
        const srcName = state.players?.[e.sourceIndex]?.name ?? "Someone";
        log?.(`${srcName}: may give 1 (Nemesis Mark on ${player.name}).`);
      });
  }
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
    e => e && e.type === EFFECT_TYPES.DITTO_MAGNET && e.targetIndex === playerIndex && (e.remainingTurns ?? 0) > 0
  );

  if (magnets.length === 0) return;

  // One magnet = one shot. If you WANT stacking, remove the "only once" behavior.
  // We'll do: trigger once even if multiple magnets exist.
  log?.(`${player.name} got Ditto while magnetized -> Shot!`);
  applyDrinkEvent(state, playerIndex, "Shot", "Ditto Magnet", log);

  // Consume Ditto Magnet(s) on trigger so the effect disappears immediately.
  state.effects = effects.filter(
    e => !(e && e.type === EFFECT_TYPES.DITTO_MAGNET && e.targetIndex === playerIndex && (e.remainingTurns ?? 0) > 0)
  );
  log?.(`Ditto Magnet ended for ${player.name}.`);
}
