import { runSpecialActionFromRegistry } from './specialActionRegistry.js';

export {
  inventoryCount,
  totalOtherItems,
  maxItemsAnyPlayer,
  createChoiceAction,
  applyEveryoneDrink,
  applyEveryoneElseDrink,
  ensureInventory,
  createTargetPlayerChoiceAction,
  runSpecialChoiceAction
} from './specialActionSupport.js';

export function runSpecialAction(action, context) {
  return runSpecialActionFromRegistry(action, context);
}
