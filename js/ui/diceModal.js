// js/ui/diceModal.js
import { addHistoryEntry } from '../cardHistory.js';
import { state } from '../state.js';

const DICEBOX_VERSION = "1.1.4";
const DICEBOX_ORIGIN = `https://unpkg.com/@3d-dice/dice-box@${DICEBOX_VERSION}/dist/`;
const DICEBOX_ASSET_PATH = "assets/";
const MIN_TRAY_PX = 80;
const RECENT_LAYOUT_CHANGE_MS = 700;
const DICE_SCALE_MIN = 3.6;
const DICE_SCALE_MAX = 4.4;
const DICE_SCALE_FALLBACK = 4.0;
const TOUCH_CLICK_GUARD_MS = 700;

let diceBox = null;
let diceBoxInitPromise = null;
let currentDiceScale = null;

// Roll cancellation pattern (can't cancel physics, but we can cancel UI updates safely)
let rollToken = 0;
let isModalOpen = false;
let pendingSoftReset = false;
let lastLayoutChangeAt = 0;

function clampInt(n, min, max, fallback) {
  const x = Number.parseInt(String(n), 10);
  if (Number.isNaN(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function randomDieValues(sides, qty) {
  return Array.from({ length: qty }, () => Math.floor(Math.random() * sides) + 1);
}

function extractRollArray(dieResults) {
  if (Array.isArray(dieResults)) return dieResults;
  if (Array.isArray(dieResults?.rolls)) return dieResults.rolls;
  if (Array.isArray(dieResults?.results)) return dieResults.results;
  if (Array.isArray(dieResults?.dice)) return dieResults.dice;
  return [];
}

function parseDieResults(dieResults, sides) {
  const rolls = extractRollArray(dieResults);

  return rolls
    .map((r) => {
      const raw = r && (r.value ?? r.result ?? r.roll ?? r.face);
      const numericRaw = (raw && typeof raw === "object") ? (raw.value ?? raw.result ?? raw.roll) : raw;
      const value = Number(numericRaw);
      if (!Number.isInteger(value)) return null;
      // Many dice libs encode d10 "10" as 0.
      if (sides === 10 && value === 0) return 10;
      if (value < 1 || value > sides) return null;
      return value;
    })
    .filter((v) => v !== null);
}

function currentPlayerName() {
  const p = state.players?.[state.currentPlayerIndex];
  return p?.name || "Someone";
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function markLayoutChange(needsSoftReset = true) {
  lastLayoutChangeAt = Date.now();
  if (needsSoftReset) pendingSoftReset = true;
}

function computeDiceScale() {
  const tray = document.getElementById('dice-box');
  if (!tray) return DICE_SCALE_FALLBACK;

  const rect = tray.getBoundingClientRect();
  const width = rect?.width ?? 0;
  const height = rect?.height ?? 0;

  if (width < MIN_TRAY_PX || height < MIN_TRAY_PX) return DICE_SCALE_FALLBACK;

  // Keep larger screens from over-scaling the throw area and clipping low on Y-axis.
  const targetScale = Math.min(width, height) / 72;
  return Math.max(DICE_SCALE_MIN, Math.min(DICE_SCALE_MAX, targetScale));
}

function shouldRecreateForScale() {
  if (!diceBox) return false;
  if (currentDiceScale == null) return false;

  const nextScale = computeDiceScale();
  return Math.abs(nextScale - currentDiceScale) >= 0.25;
}

async function waitForTrayLayout(maxFrames = 10) {
  const tray = document.getElementById('dice-box');
  if (!tray) return false;

  for (let i = 0; i < maxFrames; i++) {
    const rect = tray.getBoundingClientRect();
    if (rect.width >= MIN_TRAY_PX && rect.height >= MIN_TRAY_PX) return true;
    await new Promise(requestAnimationFrame);
  }

  return false;
}

async function getDiceBox() {
  if (shouldRecreateForScale()) {
    resetDiceBoxInstance();
  }

  if (diceBox) return diceBox;

  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const mod = await import(`${DICEBOX_ORIGIN}dice-box.es.min.js`);
      const DiceBox = mod.default;

      // Offscreen worker rendering can fail on some fullscreen/GPU setups.
      const scale = computeDiceScale();
      diceBox = new DiceBox({
        container: "#dice-box",
        assetPath: DICEBOX_ASSET_PATH,
        origin: DICEBOX_ORIGIN,
        offscreen: false,
        theme: "default",
        scale
      });
      currentDiceScale = scale;

      await diceBox.init();
      return diceBox;
    })().catch((err) => {
      diceBox = null;
      diceBoxInitPromise = null;
      currentDiceScale = null;
      throw err;
    });
  }

  return diceBoxInitPromise;
}

function resetDiceBoxInstance() {
  try {
    diceBox?.clear?.();
    diceBox?.hide?.();
  } catch {
    // Ignore; we are recreating the instance anyway.
  }

  diceBox = null;
  diceBoxInitPromise = null;
  currentDiceScale = null;
  markLayoutChange(true);
}

async function stabilizeDiceBox(box, forceReset = false) {
  await waitForTrayLayout(20);
  if (!isModalOpen) return false;

  const recentLayoutChange = (Date.now() - lastLayoutChangeAt) < RECENT_LAYOUT_CHANGE_MS;
  const shouldReset = forceReset || pendingSoftReset || recentLayoutChange;

  if (shouldReset) {
    box.clear?.();
    box.hide?.();
    await nextFrame();
    if (!isModalOpen) return false;
  }

  box.show?.();
  box.resize?.();
  await nextFrame();
  if (!isModalOpen) return false;
  box.resize?.();

  if (shouldReset) pendingSoftReset = false;
  return true;
}

function scheduleResize() {
  if (!isModalOpen || !diceBox) return;

  requestAnimationFrame(() => {
    if (!isModalOpen || !diceBox) return;
    diceBox.resize?.();
  });
}

function bindTap(el, handler) {
  if (!el || typeof handler !== "function") return;

  let lastTouchAt = 0;

  // Mobile webviews/some browsers can drop or delay click handlers.
  el.addEventListener('touchend', (e) => {
    lastTouchAt = Date.now();
    e.preventDefault();
    handler(e);
  }, { passive: false });

  el.addEventListener('click', (e) => {
    if ((Date.now() - lastTouchAt) < TOUCH_CLICK_GUARD_MS) return;
    handler(e);
  });
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
  const trayEl = document.getElementById('dice-box');

  const quickButtons = Array.from(document.querySelectorAll('.dice-chip'));

  function setRollingUI(on) {
    if (rollBtn) rollBtn.disabled = on;
    if (resultEl && on) resultEl.textContent = "Rolling...";
  }

  function resetDiceUI() {
    if (rollBtn) rollBtn.disabled = false;
    if (resultEl) resultEl.textContent = "-";
  }

  const open = async () => {
    isModalOpen = true;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    markLayoutChange(true);

    resetDiceUI();

    try {
      const box = await getDiceBox();
      if (!isModalOpen) return;
      await stabilizeDiceBox(box);
    } catch (err) {
      console.error(err);
      if (resultEl) resultEl.textContent = "3D dice failed to initialize. Rolling still works.";
      addHistoryEntry("Dice warning: 3D dice failed to initialize, using fallback rolls.");
    }

    panel?.focus?.();
  };

  const close = () => {
    // Invalidate any in-flight roll so it can't overwrite UI later.
    rollToken++;

    isModalOpen = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();

    resetDiceUI();

    if (diceBox) {
      diceBox.clear?.();
      diceBox.hide?.();
    }
  };

  bindTap(toggleBtn, () => {
    const openNow = modal.classList.contains('is-open');
    if (openNow) close();
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

  const handleViewportChange = () => {
    markLayoutChange(true);
    scheduleResize();
  };

  window.addEventListener('resize', handleViewportChange);
  document.addEventListener('fullscreenchange', handleViewportChange);

  if (trayEl && typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      markLayoutChange(false);
      scheduleResize();
    });
    observer.observe(trayEl);
  }

  async function performRoll(sides, qty) {
    const localToken = ++rollToken;
    if (!isModalOpen) return;

    setRollingUI(true);

    const notation = `${qty}d${sides}`;
    let values = [];
    let usedFallback = false;

    try {
      const box = await getDiceBox();
      if (!isModalOpen || localToken !== rollToken) return;

      const ready = await stabilizeDiceBox(box);
      if (!ready || !isModalOpen || localToken !== rollToken) return;

      box.clear?.();
      let dieResults = null;
      let firstAttemptError = null;

      try {
        dieResults = await box.roll(notation);
      } catch (err) {
        firstAttemptError = err;
      }

      if (!isModalOpen || localToken !== rollToken) return;

      if (!firstAttemptError) {
        values = parseDieResults(dieResults, sides);
      }

      if (firstAttemptError || values.length !== qty) {
        if (firstAttemptError) {
          console.warn("Dice first attempt failed; retrying after soft reset.", firstAttemptError);
        } else {
          console.warn(`Dice parse mismatch (${notation}); retrying after soft reset.`);
        }

        const retryReady = await stabilizeDiceBox(box, true);
        if (!retryReady || !isModalOpen || localToken !== rollToken) return;

        box.clear?.();
        const retryResults = await box.roll(notation);
        if (!isModalOpen || localToken !== rollToken) return;

        values = parseDieResults(retryResults, sides);
      }

      if (values.length !== qty) {
        console.warn(`Dice retry mismatch (${notation}); recreating DiceBox instance.`);
        resetDiceBoxInstance();

        const freshBox = await getDiceBox();
        if (!isModalOpen || localToken !== rollToken) return;

        const freshReady = await stabilizeDiceBox(freshBox, true);
        if (!freshReady || !isModalOpen || localToken !== rollToken) return;

        freshBox.clear?.();
        const freshResults = await freshBox.roll(notation);
        if (!isModalOpen || localToken !== rollToken) return;

        values = parseDieResults(freshResults, sides);
      }

      if (values.length !== qty) {
        usedFallback = true;
        values = randomDieValues(sides, qty);
      }
    } catch (err) {
      console.error(err);
      usedFallback = true;
      values = randomDieValues(sides, qty);
    } finally {
      if (isModalOpen && localToken === rollToken) {
        if (rollBtn) rollBtn.disabled = false;
      }
    }

    if (!isModalOpen || localToken !== rollToken) return;

    const sum = values.reduce((a, b) => a + b, 0);
    const detail = values.length ? ` (${values.join(", ")})` : "";
    const fallbackLabel = usedFallback ? " [fallback]" : "";

    addHistoryEntry(`Dice: ${currentPlayerName()} rolled ${notation}: ${sum}${detail}${fallbackLabel}`);

    if (resultEl) {
      resultEl.textContent = `${notation} -> ${sum}${detail}${fallbackLabel}`;
    }
  }

  // Main Roll button.
  bindTap(rollBtn, async (e) => {
    e.stopPropagation();

    if (!isModalOpen) return;

    const sides = clampInt(sidesSelect?.value, 2, 100, 20);
    const qty = clampInt(qtyInput?.value, 1, 20, 1);

    await performRoll(sides, qty);
  });

  // Quick buttons: one click = roll.
  quickButtons.forEach((btn) => {
    bindTap(btn, async (e) => {
      e.stopPropagation();

      if (!isModalOpen) return;

      const sides = clampInt(btn.dataset.sides, 2, 100, 20);
      const qty = clampInt(btn.dataset.qty, 1, 20, 1);

      // Sync UI fields so user sees what's rolling.
      if (sidesSelect) sidesSelect.value = String(sides);
      if (qtyInput) qtyInput.value = String(qty);

      await performRoll(sides, qty);
    });
  });
}
