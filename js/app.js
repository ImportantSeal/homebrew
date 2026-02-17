import { initSetup } from './setup.js';
import { initRulesModal } from './ui/rulesModal.js';
import { initDiceModal } from './ui/diceModal.js';
import { initCardActionModal } from './ui/cardActionModal.js';

document.addEventListener('DOMContentLoaded', () => {
  initSetup();
  initRulesModal();
  initDiceModal();
  initCardActionModal();
});
