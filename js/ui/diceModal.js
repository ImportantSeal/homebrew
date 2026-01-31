// js/ui/diceModal.js
import { addHistoryEntry } from '../cardHistory.js';
import { state } from '../state.js';

// CDN version
const DICEBOX_VERSION = "1.1.4";
const DICEBOX_ORIGIN = `https://unpkg.com/@3d-dice/dice-box@${DICEBOX_VERSION}/dist/`;

let diceBox = null;
let diceBoxInitPromise = null;

// Roll cancellation pattern (can't cancel physics, but we can cancel UI updates safely)
let rollToken = 0;
let isModalOpen = false;

function clampInt(n, min, max, fallback) {
  const x = Number.parseInt(String(n), 10);
  if (Number.isNaN(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

async function getDiceBox() {
  if (diceBox) return diceBox;

  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const mod = await import(`${DICEBOX_ORIGIN}dice-box.es.min.js`);
      const DiceBox = mod.default;

      diceBox = new DiceBox({
        container: "#dice-box",
        assetPath: "assets/",
        origin: DICEBOX_ORIGIN,
        offscreen: true,
        theme: "default",
        scale: 6
      });

      await diceBox.init();
      return diceBox;
    })();
  }

  return diceBoxInitPromise;
}

function currentPlayerName() {
  const p = state.players?.[state.currentPlayerIndex];
  return p?.name || "Someone";
}

function parseDieResults(dieResults) {
  const values = (dieResults || [])
    .map(r => {
      const v = (r && (r.value ?? r.result ?? r.roll));
      return Number.isFinite(v) ? v : null;
    })
    .filter(v => v !== null);

  return values;
}

export function initDiceModal() {
  const toggleBtn = document.getElementById('dice-toggle');
  const modal = document.getElementById('dice-modal');
  if (!toggleBtn || !modal) return;

  const panel = modal.querySelector('.modal__panel');

  const sidesSelect = document.getElementById('dice-sides');
  const qtyInput = document.getElementById('dice-qty');
  const rollBtn = document.getElementById('dice-roll');
  const resultEl = document.getElementById('dice-result');

  const quickButtons = Array.from(document.querySelectorAll('.dice-chip'));

  function setRollingUI(on) {
    if (rollBtn) rollBtn.disabled = on;
    if (resultEl && on) resultEl.textContent = "Rolling…";
  }

  function resetDiceUI() {
    if (rollBtn) rollBtn.disabled = false;
    if (resultEl) resultEl.textContent = "—";
  }

  const open = async () => {
    isModalOpen = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');

    // Ensure any previous stuck state is cleared
    resetDiceUI();

    // Let layout happen so #dice-box has real size
    await new Promise(requestAnimationFrame);

    const box = await getDiceBox();
    box.show?.();
    box.resize?.();

    panel?.focus?.();
  };

  const close = () => {
    // IMPORTANT: invalidate any in-flight roll so it can't overwrite UI later
    rollToken++;

    isModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();

    // Reset UI so it never stays "Rolling…"
    resetDiceUI();

    if (diceBox) {
      diceBox.clear?.();
      diceBox.hide?.();
    }
  };

  toggleBtn.addEventListener('click', () => {
    const openNow = modal.classList.contains('is-open');
    if (openNow) close();
    else open();
  });

  // Close via backdrop or X
  modal.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest && target.closest('[data-close]')) {
      close();
    }
  });

  // Close via ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      close();
    }
  });

  async function performRoll(sides, qty) {
    const localToken = ++rollToken;

    if (!isModalOpen) return;

    setRollingUI(true);

    const notation = `${qty}d${sides}`;

    try {
      const box = await getDiceBox();

      if (!isModalOpen || localToken !== rollToken) return;

      box.clear?.();

      const dieResults = await box.roll(notation);

      if (!isModalOpen || localToken !== rollToken) return;

      const values = parseDieResults(dieResults);
      const sum = values.reduce((a, b) => a + b, 0);

      const detail = values.length ? ` (${values.join(", ")})` : "";

      const line = `🎲 ${currentPlayerName()} rolled ${notation}: ${sum}${detail}`;
      addHistoryEntry(line);

      if (resultEl) {
        resultEl.textContent = `${notation} → ${sum}${detail}`;
      }
    } catch (err) {
      console.error(err);

      if (isModalOpen && localToken === rollToken) {
        if (resultEl) resultEl.textContent = "Dice failed to load/roll (check console).";
        addHistoryEntry("🎲 Dice error: failed to roll (check console).");
      }
    } finally {
      if (isModalOpen && localToken === rollToken) {
        if (rollBtn) rollBtn.disabled = false;
      }
    }
  }

  // Main Roll button
  rollBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();

    if (!isModalOpen) return;

    const sides = clampInt(sidesSelect?.value, 2, 100, 20);
    const qty = clampInt(qtyInput?.value, 1, 20, 1);

    await performRoll(sides, qty);
  });

  // Quick buttons: one click = roll
  quickButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (!isModalOpen) return;

      const sides = clampInt(btn.dataset.sides, 2, 100, 20);
      const qty = clampInt(btn.dataset.qty, 1, 20, 1);

      // Sync UI fields so user sees what's rolling
      if (sidesSelect) sidesSelect.value = String(sides);
      if (qtyInput) qtyInput.value = String(qty);

      await performRoll(sides, qty);
    });
  });
}
