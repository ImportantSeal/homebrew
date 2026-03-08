import { SPECIAL_ACTION_HANDLERS } from './specialActionRegistry.handlers.js';

export function runSpecialActionFromRegistry(action, context) {
  const normalizedAction = String(action ?? '').trim();
  if (!normalizedAction) return;

  const handler = SPECIAL_ACTION_HANDLERS[normalizedAction];
  if (typeof handler !== 'function') return;

  return handler(context);
}
