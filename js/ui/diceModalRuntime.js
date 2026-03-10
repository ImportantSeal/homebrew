const DICEBOX_VERSION = '1.1.4';
const DICEBOX_ORIGIN = `https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@${DICEBOX_VERSION}/dist/`;
const DICEBOX_ASSET_PATH = 'assets/';
const MIN_TRAY_PX = 80;
const TRAY_LAYOUT_WAIT_FRAMES = 45;
const RECENT_LAYOUT_CHANGE_MS = 700;
const DICE_SCALE_MIN = 6.2;
const DICE_SCALE_MAX = 9.8;
const DICE_SCALE_FALLBACK = 7.2;
const DICEBOX_IMPORT_TIMEOUT_MS = 6000;
const DICEBOX_INIT_TIMEOUT_MS = 6000;
export const DICEBOX_ROLL_TIMEOUT_MS = 7000;
const DICEBOX_INIT_RETRY_LIMIT = 2;

const DICE3D_UNAVAILABLE_MESSAGE = '3D dice unavailable. Rolling uses fallback.';
const DICE3D_WARMING_MESSAGE = '3D dice warming up. If fallback appears, roll once more.';

let diceBox = null;
let diceBoxInitPromise = null;
let currentDiceScale = null;
let isModalOpen = false;
let pendingSoftReset = false;
let lastLayoutChangeAt = 0;
let dice3dDisabled = false;
let dice3dWarningLogged = false;
let diceInitFailureCount = 0;

function runBoxMethod(box, name) {
  const fn = box?.[name];
  if (typeof fn !== 'function') return false;
  try {
    fn.call(box);
    return true;
  } catch (err) {
    console.warn(`DiceBox.${name} failed`, err);
    return false;
  }
}

function softResetBox(box) {
  // clear() has thrown in some runtime combinations; hide() is enough here.
  runBoxMethod(box, 'hide');
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export function withTimeout(promise, ms, label) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Timeout while ${label}`));
      }, ms);
    })
  ]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

export function markLayoutChange(needsSoftReset = true) {
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
  const pointerCoarse = window.matchMedia?.('(pointer: coarse)')?.matches === true;
  const mobileBoost = pointerCoarse ? 1.2 : 1;
  const targetScale = (Math.min(width, height) / 52) * mobileBoost;
  return Math.max(DICE_SCALE_MIN, Math.min(DICE_SCALE_MAX, targetScale));
}

function shouldRecreateForScale() {
  if (!diceBox) return false;
  if (currentDiceScale == null) return false;

  const nextScale = computeDiceScale();
  return Math.abs(nextScale - currentDiceScale) >= 0.25;
}

async function waitForTrayLayout(maxFrames = TRAY_LAYOUT_WAIT_FRAMES) {
  const tray = document.getElementById('dice-box');
  if (!tray) return false;

  for (let i = 0; i < maxFrames; i++) {
    const rect = tray.getBoundingClientRect();
    if (rect.width >= MIN_TRAY_PX && rect.height >= MIN_TRAY_PX) return true;
    await new Promise(requestAnimationFrame);
  }

  return false;
}

export async function getDiceBox() {
  if (dice3dDisabled) return null;

  await waitForTrayLayout();

  if (shouldRecreateForScale()) {
    resetDiceBoxInstance();
  }

  if (diceBox) return diceBox;

  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const mod = await withTimeout(
        import(`${DICEBOX_ORIGIN}dice-box.es.min.js`),
        DICEBOX_IMPORT_TIMEOUT_MS,
        'loading 3D dice module'
      );
      const DiceBox = mod.default;

      // Offscreen worker rendering can fail on some fullscreen/GPU setups.
      const scale = computeDiceScale();
      diceBox = new DiceBox({
        container: '#dice-box',
        assetPath: DICEBOX_ASSET_PATH,
        origin: DICEBOX_ORIGIN,
        offscreen: false,
        theme: 'default',
        scale
      });
      currentDiceScale = scale;

      await withTimeout(diceBox.init(), DICEBOX_INIT_TIMEOUT_MS, 'initializing 3D dice');
      diceInitFailureCount = 0;
      return diceBox;
    })().catch((err) => {
      diceBox = null;
      diceBoxInitPromise = null;
      currentDiceScale = null;
      diceInitFailureCount += 1;
      if (diceInitFailureCount > DICEBOX_INIT_RETRY_LIMIT) {
        dice3dDisabled = true;
      }
      throw err;
    });
  }

  return diceBoxInitPromise;
}

export function resetDiceBoxInstance() {
  softResetBox(diceBox);

  diceBox = null;
  diceBoxInitPromise = null;
  currentDiceScale = null;
  markLayoutChange(true);
}

export async function stabilizeDiceBox(box, forceReset = false) {
  await waitForTrayLayout(20);
  if (!isModalOpen) return false;

  const recentLayoutChange = (Date.now() - lastLayoutChangeAt) < RECENT_LAYOUT_CHANGE_MS;
  const shouldReset = forceReset || pendingSoftReset || recentLayoutChange;

  if (shouldReset) {
    softResetBox(box);
    await nextFrame();
    if (!isModalOpen) return false;
  }

  runBoxMethod(box, 'show');
  runBoxMethod(box, 'resize');
  await nextFrame();
  if (!isModalOpen) return false;
  runBoxMethod(box, 'resize');

  if (shouldReset) pendingSoftReset = false;
  return true;
}

export function setDiceModalOpen(open) {
  isModalOpen = Boolean(open);
}

export function isDiceModalOpen() {
  return isModalOpen;
}

export function hideDiceBox() {
  if (diceBox) {
    softResetBox(diceBox);
  }
}

export function scheduleResize() {
  if (!isModalOpen || !diceBox) return;

  requestAnimationFrame(() => {
    if (!isModalOpen || !diceBox) return;
    runBoxMethod(diceBox, 'resize');
  });
}

export function handleViewportChange() {
  // Fullscreen and 4K viewport transitions can produce transient init failures.
  // Allow retries after a viewport change instead of staying permanently disabled.
  dice3dDisabled = false;
  markLayoutChange(true);
  scheduleResize();
}

export function diceAvailabilityMessage() {
  return dice3dDisabled ? DICE3D_UNAVAILABLE_MESSAGE : DICE3D_WARMING_MESSAGE;
}

export function fallbackMessage() {
  return DICE3D_UNAVAILABLE_MESSAGE;
}

export function shouldLogDiceUnavailableWarning() {
  if (!dice3dDisabled || dice3dWarningLogged) return false;
  dice3dWarningLogged = true;
  return true;
}
