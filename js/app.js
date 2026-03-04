import { gameData } from './gameData.js';
import { validateGameDataActionEffectCodes } from './logic/actionEffectRegistry.js';
import { initSetup } from './setup.js';
import { initRulesModal } from './ui/rulesModal.js';
import { initDiceModal } from './ui/diceModal.js';
import { initCardActionModal } from './ui/cardActionModal.js';
import { initStatsModal } from './ui/statsModal.js';

document.addEventListener('DOMContentLoaded', () => {
  validateGameDataActionEffectCodes(gameData);
  initSetup();
  initRulesModal();
  initDiceModal();
  initCardActionModal();
  initStatsModal();
});
