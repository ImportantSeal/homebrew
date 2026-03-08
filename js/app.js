import { gameData } from './gameData.js';
import { gameController } from './game.js';
import { validateGameDataActionEffectCodes } from './logic/actionEffectRegistry.js';
import { initSetup } from './setup.js';
import { initRulesModal } from './ui/rulesModal.js';
import { initDiceModal } from './ui/diceModal.js';
import { initCardActionModal } from './ui/cardActionModal.js';
import { initStatsModal } from './ui/statsModal.js';

document.addEventListener('DOMContentLoaded', () => {
  const { state, startGame } = gameController;

  validateGameDataActionEffectCodes(gameData);
  initSetup({ state, startGame });
  initRulesModal();
  initDiceModal({ state });
  initCardActionModal();
  initStatsModal({ state });
});
