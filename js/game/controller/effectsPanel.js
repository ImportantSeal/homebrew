import { renderStatusEffects } from '../../ui/statusEffects.js';

import { effectLabelForLog } from './helpers.js';

export function createEffectsPanelController({ state, log, playerName }) {
  function renderEffectsPanel() {
    renderStatusEffects(state, {
      onRemoveEffect: handleManualEffectRemoval,
      onRemoveStatus: handleManualStatusRemoval
    });
  }

  function handleManualEffectRemoval({ effect, label }) {
    if (!effect) return;

    const readable = label || effectLabelForLog(effect);
    const targetName = typeof effect.targetIndex === "number" ? playerName(effect.targetIndex) : null;

    if (effect.type === "NO_SWEARING" || effect.type === "NO_PHONE_TOUCH") {
      state.effects = (state.effects || []).filter(e => e && e.id !== effect.id);
      log(`${readable} closed manually.`);
      renderEffectsPanel();
      return;
    }

    const confirmText = targetName
      ? `Remove ${readable} for ${targetName}?`
      : `Remove ${readable}?`;

    if (!window.confirm(confirmText)) return;

    state.effects = (state.effects || []).filter(e => e && e.id !== effect.id);
    log(`${readable}${targetName ? ` for ${targetName}` : ""} removed manually.`);
    renderEffectsPanel();
  }

  function handleManualStatusRemoval({ playerIndex, key, label }) {
    if (typeof playerIndex !== "number" || !key) return;
    const player = state.players?.[playerIndex];
    if (!player || !player[key]) return;

    const readable = label || key;
    const name = player.name || playerName(playerIndex);

    if (!window.confirm(`Remove ${readable} from ${name}?`)) return;

    delete player[key];
    log(`${readable} removed from ${name}.`);
    renderEffectsPanel();
  }

  return { renderEffectsPanel };
}
