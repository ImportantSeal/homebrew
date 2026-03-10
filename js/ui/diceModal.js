// js/ui/diceModal.js
import { addHistoryEntry } from '../cardHistory.js';
import { lockModalScroll, unlockModalScroll } from './modalScrollLock.js';
import { bindTap } from '../utils/tap.js';
import {
  clampInt,
  currentPlayerName,
  formatNotation,
  formatSignedInt,
  parseDieResults,
  randomDieValues
} from './diceModalHelpers.js';
import {
  DICEBOX_ROLL_TIMEOUT_MS,
  withTimeout,
  markLayoutChange,
  getDiceBox,
  stabilizeDiceBox,
  resetDiceBoxInstance,
  setDiceModalOpen,
  isDiceModalOpen,
  hideDiceBox,
  scheduleResize,
  handleViewportChange,
  diceAvailabilityMessage,
  fallbackMessage,
  shouldLogDiceUnavailableWarning
} from './diceModalRuntime.js';

// Roll cancellation pattern (can't cancel physics, but we can cancel UI updates safely)
let rollToken = 0;

export function initDiceModal({ state } = {}) {
  if (!state || typeof state !== 'object') return;

  const toggleBtn = document.getElementById('dice-toggle');
  const modal = document.getElementById('dice-modal');
  if (!toggleBtn || !modal) return;

  const panel = modal.querySelector('.modal__panel');

  const sidesSelect = document.getElementById('dice-sides');
  const qtyInput = document.getElementById('dice-qty');
  const modInput = document.getElementById('dice-mod');
  const rollBtn = document.getElementById('dice-roll');
  const resultEl = document.getElementById('dice-result');
  const trayEl = document.getElementById('dice-box');

  const quickButtons = Array.from(document.querySelectorAll('.dice-chip'));

  function setRollingUI(on) {
    if (rollBtn) rollBtn.disabled = on;
    if (resultEl && on) resultEl.textContent = 'Rolling...';
  }

  function resetDiceUI() {
    if (rollBtn) rollBtn.disabled = false;
    if (resultEl) resultEl.textContent = '-';
  }

  const open = async () => {
    if (isDiceModalOpen()) return;

    setDiceModalOpen(true);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    lockModalScroll();
    markLayoutChange(true);

    resetDiceUI();

    try {
      const box = await getDiceBox();
      if (!isDiceModalOpen()) return;
      if (box) {
        await stabilizeDiceBox(box);
      } else if (resultEl) {
        resultEl.textContent = fallbackMessage();
      }
    } catch (err) {
      console.error(err);
      if (resultEl) {
        resultEl.textContent = diceAvailabilityMessage();
      }
      if (shouldLogDiceUnavailableWarning()) {
        addHistoryEntry(state, 'Dice warning: 3D dice unavailable, using fallback rolls.');
      }
    }

    panel?.focus?.();
  };

  const close = () => {
    if (!isDiceModalOpen()) return;

    // Invalidate any in-flight roll so it can't overwrite UI later.
    rollToken++;

    setDiceModalOpen(false);
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    unlockModalScroll();
    toggleBtn.focus();

    resetDiceUI();
    hideDiceBox();
  };

  bindTap(toggleBtn, () => {
    if (isDiceModalOpen()) close();
    else open();
  });

  // Close via backdrop or X.
  modal.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest && target.closest('[data-close]')) {
      close();
    }
  });

  // Close via ESC.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      close();
    }
  });

  window.addEventListener('resize', handleViewportChange);
  document.addEventListener('fullscreenchange', handleViewportChange);

  if (trayEl && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      markLayoutChange(false);
      scheduleResize();
    });
    observer.observe(trayEl);
  }

  async function performRoll(sides, qty, modifier = 0) {
    const localToken = ++rollToken;
    if (!isDiceModalOpen()) return;

    setRollingUI(true);

    const safeModifier = clampInt(modifier, -50, 50, 0);
    const baseNotation = `${qty}d${sides}`;
    const notation = formatNotation(qty, sides, safeModifier);
    let values = [];
    let usedFallback = false;

    try {
      const box = await getDiceBox();
      if (!isDiceModalOpen() || localToken !== rollToken) return;

      const ready = box ? await stabilizeDiceBox(box) : false;
      if (ready && box && isDiceModalOpen() && localToken === rollToken) {
        try {
          if (typeof box.roll !== 'function') {
            throw new Error('DiceBox.roll is not available');
          }
          const dieResults = await withTimeout(
            box.roll(baseNotation),
            DICEBOX_ROLL_TIMEOUT_MS,
            `rolling ${baseNotation}`
          );
          if (!isDiceModalOpen() || localToken !== rollToken) return;
          values = parseDieResults(dieResults, sides);
        } catch (err) {
          console.warn(`Dice roll failed (${baseNotation}); using fallback.`, err);
        }

        if (values.length !== qty) {
          resetDiceBoxInstance();
          const retryBox = await getDiceBox();
          if (!isDiceModalOpen() || localToken !== rollToken) return;

          const retryReady = retryBox ? await stabilizeDiceBox(retryBox, true) : false;
          if (retryReady && retryBox && isDiceModalOpen() && localToken === rollToken) {
            try {
              const retryResults = await withTimeout(
                retryBox.roll(baseNotation),
                DICEBOX_ROLL_TIMEOUT_MS,
                `rolling ${baseNotation} (retry)`
              );
              if (!isDiceModalOpen() || localToken !== rollToken) return;
              values = parseDieResults(retryResults, sides);
            } catch (err) {
              console.warn(`Dice roll retry failed (${baseNotation}); using fallback.`, err);
            }
          }
        }
      }

      if (values.length !== qty) {
        console.warn(`Dice parse mismatch (${baseNotation}); using fallback.`);
        usedFallback = true;
        values = randomDieValues(sides, qty, state?.rng);
      }
    } catch (err) {
      console.error(err);
      usedFallback = true;
      values = randomDieValues(sides, qty, state?.rng);
    } finally {
      if (isDiceModalOpen() && localToken === rollToken) {
        if (rollBtn) rollBtn.disabled = false;
        if (resultEl && resultEl.textContent === 'Rolling...') {
          resultEl.textContent = '-';
        }
      }
    }

    if (!isDiceModalOpen() || localToken !== rollToken) return;

    const baseSum = values.reduce((a, b) => a + b, 0);
    const sum = baseSum + safeModifier;
    const detail = values.length ? ` (${values.join(', ')})` : '';
    const breakdown = safeModifier === 0
      ? ''
      : ` [${baseSum}${formatSignedInt(safeModifier)}=${sum}]`;
    const fallbackLabel = usedFallback ? ' [fallback]' : '';

    addHistoryEntry(state, `Dice: ${currentPlayerName(state)} rolled ${notation}: ${sum}${detail}${breakdown}${fallbackLabel}`);

    if (resultEl) {
      resultEl.textContent = `${notation} -> ${sum}${detail}${breakdown}${fallbackLabel}`;
    }
  }

  // Main Roll button.
  bindTap(rollBtn, async (e) => {
    e.stopPropagation();

    if (!isDiceModalOpen()) return;

    const sides = clampInt(sidesSelect?.value, 2, 100, 20);
    const qty = clampInt(qtyInput?.value, 1, 20, 1);
    const modifier = clampInt(modInput?.value, -50, 50, 0);
    if (modInput) modInput.value = String(modifier);

    await performRoll(sides, qty, modifier);
  });

  // Quick buttons: one click = roll.
  quickButtons.forEach((btn) => {
    bindTap(btn, async (e) => {
      e.stopPropagation();

      if (!isDiceModalOpen()) return;

      const sides = clampInt(btn.dataset.sides, 2, 100, 20);
      const qty = clampInt(btn.dataset.qty, 1, 20, 1);
      const modifier = clampInt(modInput?.value, -50, 50, 0);

      // Sync UI fields so user sees what's rolling.
      if (sidesSelect) sidesSelect.value = String(sides);
      if (qtyInput) qtyInput.value = String(qty);
      if (modInput) modInput.value = String(modifier);

      await performRoll(sides, qty, modifier);
    });
  });
}
