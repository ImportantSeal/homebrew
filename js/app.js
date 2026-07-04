import { gameData } from './gameData.js';
import { gameController } from './game.js';
import { validateGameDataActionEffectCodes } from './logic/actionEffectRegistry.js';
import { initSetup } from './setup.js';
import { initSettingsMenu } from './ui/settingsMenu.js';
import { initRulesModal } from './ui/rulesModal.js';
import { initDiceModal } from './ui/diceModal.js';
import { initCardActionModal } from './ui/cardActionModal.js';
import { initStatsModal } from './ui/statsModal.js';
import { initSpinWheelModal } from './ui/spinWheelModal.js';
import { initReducedEffects } from './ui/effectsProfile.js';

document.addEventListener('DOMContentLoaded', () => {
  const { state, startGame } = gameController;

  initReducedEffects(state);
  validateGameDataActionEffectCodes(gameData);
  initSetup({ state, startGame });
  initSettingsMenu();
  initRulesModal();
  initDiceModal({ state });
  initCardActionModal();
  initStatsModal({ state });
  initSpinWheelModal({ state });
});
