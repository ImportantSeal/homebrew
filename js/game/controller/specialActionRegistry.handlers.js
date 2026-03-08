import { choiceSpecialActionHandlers } from './specialActionRegistry.choice.js';
import { effectSpecialActionHandlers } from './specialActionRegistry.effects.js';
import { itemSpecialActionHandlers } from './specialActionRegistry.item.js';
import { penaltySpecialActionHandlers } from './specialActionRegistry.penalty.js';
import { simpleSpecialActionHandlers } from './specialActionRegistry.simple.js';
import { targetedSpecialActionHandlers } from './specialActionRegistry.targeted.js';

function mergeSpecialActionHandlers(...handlerGroups) {
  const registry = {};

  handlerGroups.forEach((handlers) => {
    Object.entries(handlers).forEach(([actionCode, handler]) => {
      if (Object.prototype.hasOwnProperty.call(registry, actionCode)) {
        throw new Error(`Duplicate special action handler registered for "${actionCode}".`);
      }
      registry[actionCode] = handler;
    });
  });

  return Object.freeze(registry);
}

export const SPECIAL_ACTION_HANDLERS = mergeSpecialActionHandlers(
  simpleSpecialActionHandlers,
  choiceSpecialActionHandlers,
  targetedSpecialActionHandlers,
  penaltySpecialActionHandlers,
  itemSpecialActionHandlers,
  effectSpecialActionHandlers
);
