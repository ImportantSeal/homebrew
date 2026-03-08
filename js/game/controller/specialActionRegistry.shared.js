import { createChoiceAction } from './specialActionSupport.js';

export function createChoiceResult(config, log, failureMessage) {
  const choice = createChoiceAction(config);
  if (!choice) {
    log?.(failureMessage);
    return;
  }

  return {
    endTurn: false,
    choice
  };
}

export function hasActiveTimedEffects(state) {
  return Array.isArray(state?.effects)
    && state.effects.some((effect) => (effect?.remainingTurns ?? 0) > 0);
}

export function allPlayerIndexes(state) {
  return Array.isArray(state?.players) ? state.players.map((_, index) => index) : [];
}

export function actorNameFromContext(context) {
  return context.currentPlayer?.name || 'Current player';
}
