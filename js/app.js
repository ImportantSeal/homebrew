import { initSetup } from './setup.js';
import { initRulesModal } from './ui/rulesModal.js';
import { initDiceModal } from './ui/diceModal.js';

document.addEventListener('DOMContentLoaded', () => {
  initSetup();
  initRulesModal();
  initDiceModal();
});
