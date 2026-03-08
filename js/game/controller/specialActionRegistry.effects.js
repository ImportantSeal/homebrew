import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import { applyEveryoneDrink } from './specialActionSupport.js';
import { hasActiveTimedEffects } from './specialActionRegistry.shared.js';

function handleEffectSurge(context) {
  const { state, log, applyDrinkEvent } = context;

  if (!hasActiveTimedEffects(state)) {
    log("Effect Surge: no active timed effects, so nothing happens.");
    return;
  }

  applyEveryoneDrink(state, 3, "Effect Surge", log, applyDrinkEvent);
  log("Effect Surge: active effect found. Everybody drinks 3.");
}

function handleCalmTableTax(context) {
  const { state, log, applyDrinkEvent } = context;

  if (hasActiveTimedEffects(state)) {
    log("Calm Table Tax: active timed effects found, so nothing happens.");
    return;
  }

  applyEveryoneDrink(state, 3, "Calm Table Tax", log, applyDrinkEvent);
  log("Calm Table Tax: no active effects. Everybody drinks 3.");
}

export const effectSpecialActionHandlers = Object.freeze({
  [ACTION_CODES.IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3]: handleEffectSurge,
  [ACTION_CODES.IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3]: handleCalmTableTax
});
