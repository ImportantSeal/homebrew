// js/ui/diceModal.js
import { addHistoryEntry } from '../cardHistory.js';
import { state } from '../state.js';

const DICEBOX_VERSION = "1.1.4";
const DICEBOX_ORIGIN = `https://unpkg.com/@3d-dice/dice-box@${DICEBOX_VERSION}/dist/`;

let diceBox = null;
let diceBoxInitPromise = null;

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

        // Required when using unpkg CDN:
        assetPath: "assets/",
        origin: DICEBOX_ORIGIN,

        // QoL:
        offscreen: true, // if not supported, DiceBox should fallback internally
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

export function initDiceModal() {
  const toggleBtn = document.getElementById('dice-toggle');
  const modal = document.getElementById('dice-modal');
  if (!toggleBtn || !modal) return;

  const panel = modal.querySelector('.modal__panel');

  const sidesSelect = document.getElementById('dice-sides');
  const qtyInput = document.getElementById('dice-qty');
  const modInput = document.getElementById('dice-mod');
  const rollBtn = document.getElementById('dice-roll');
  const resultEl = document.getElementById('dice-result');

  const open = async () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');

    // Let layout happen so #dice-box has real size before init/resize.
    await new Promise(requestAnimationFrame);

    const box = await getDiceBox();
    box.show?.();
    box.resize?.();

    panel?.focus?.();
  };

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();

    if (diceBox) {
      diceBox.hide?.();
      diceBox.clear?.();
    }
  };

  toggleBtn.addEventListener('click', () => {
    const isOpen = modal.classList.contains('is-open');
    if (isOpen) close();
    else open();
  });

  // Sulje backdropista tai X-napista
  modal.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest && target.closest('[data-close]')) {
      close();
    }
  });

  // Sulje Escillä
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      close();
    }
  });

  // Roll
  rollBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();

    const sides = clampInt(sidesSelect?.value, 2, 100, 20);
    const qty = clampInt(qtyInput?.value, 1, 20, 1);
    const mod = clampInt(modInput?.value, -50, 50, 0);

    const notation = `${qty}d${sides}`;

    rollBtn.disabled = true;
    if (resultEl) resultEl.textContent = "Rolling…";

    try {
      const box = await getDiceBox();

      // Clear previous dice so tray doesn't get crowded
      box.clear?.();

      const dieResults = await box.roll(notation);

      // dieResults is typically an array of "die result" objects.
      // We read any numeric field that looks like a value.
      const values = (dieResults || [])
        .map(r => {
          const v = (r && (r.value ?? r.result ?? r.roll));
          return Number.isFinite(v) ? v : null;
        })
        .filter(v => v !== null);

      const sum = values.reduce((a, b) => a + b, 0);
      const total = sum + mod;

      const detail = values.length ? ` (${values.join(", ")})` : "";
      const modTxt = mod === 0 ? "" : (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`);

      const line = `🎲 ${currentPlayerName()} rolled ${notation}${modTxt}: ${total}${detail}`;
      addHistoryEntry(line);

      if (resultEl) {
        resultEl.textContent = `${notation}${modTxt} → ${total}${detail}`;
      }
    } catch (err) {
      console.error(err);
      if (resultEl) resultEl.textContent = "Dice failed to load/roll (check console).";
      addHistoryEntry("🎲 Dice error: failed to roll (check console).");
    } finally {
      rollBtn.disabled = false;
    }
  });
}
