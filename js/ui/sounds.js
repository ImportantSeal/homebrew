import { isReducedEffectsEnabled } from './effectsProfile.js';

const BASE_VOLUMES = {
  ditto: 0.42,
  select: 0.52,
  wallHit: 0.56,
  cornerHit: 0.64,
  savior: 0.32
};

function clamp01(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function canUseAudio() {
  return typeof Audio === 'function';
}

function createAudio(src, volume = 1) {
  if (!canUseAudio()) return null;
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
}

function safePlay(audio, { muted = false } = {}) {
  if (!audio || muted || isReducedEffectsEnabled()) return;

  try {
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {});
    }
  } catch {
    // Ignore playback failures (autoplay policy, missing file, etc.).
  }
}

export function createUiSounds({
  dittoSrc = 'sounds/ditto.mp3',
  selectSrc = 'sounds/select.mp3',
  wallHitSrc = 'sounds/wallhit.mp3',
  cornerHitSrc = 'sounds/cornerHit.mp3'
} = {}) {
  const dittoAudio = createAudio(dittoSrc, BASE_VOLUMES.ditto);
  const selectAudio = createAudio(selectSrc, BASE_VOLUMES.select);
  const wallHitAudio = createAudio(wallHitSrc, BASE_VOLUMES.wallHit);
  const cornerHitAudio = createAudio(cornerHitSrc, BASE_VOLUMES.cornerHit);
  const warmupTargets = [dittoAudio, selectAudio, wallHitAudio, cornerHitAudio].filter(Boolean);
  let armed = false;
  let warmupDone = false;
  let muted = false;
  let masterVolume = 1;

  function applyVolume() {
    if (dittoAudio) dittoAudio.volume = BASE_VOLUMES.ditto * masterVolume;
    if (selectAudio) selectAudio.volume = BASE_VOLUMES.select * masterVolume;
    if (wallHitAudio) wallHitAudio.volume = BASE_VOLUMES.wallHit * masterVolume;
    if (cornerHitAudio) cornerHitAudio.volume = BASE_VOLUMES.cornerHit * masterVolume;
  }

  applyVolume();

  function warmup() {
    if (warmupDone) return;
    warmupDone = true;

    warmupTargets.forEach((audio) => {
      try {
        const previousMuted = audio.muted;
        audio.muted = true;
        const promise = audio.play();
        if (promise && typeof promise.then === 'function') {
          promise.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = previousMuted;
          }).catch(() => {
            audio.muted = previousMuted;
          });
        } else {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = previousMuted;
        }
      } catch {
        // Ignore warmup failures.
      }
    });
  }

  function arm() {
    if (armed || typeof document === 'undefined') return;
    armed = true;

    const unlock = () => {
      warmup();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };

    document.addEventListener('pointerdown', unlock, { capture: true, passive: true, once: true });
    document.addEventListener('keydown', unlock, { capture: true, passive: true, once: true });
    document.addEventListener('touchstart', unlock, { capture: true, passive: true, once: true });
  }

  function playDitto() {
    safePlay(dittoAudio, { muted });
  }

  function playSelect() {
    safePlay(selectAudio, { muted });
  }

  function playWallHit() {
    safePlay(wallHitAudio, { muted });
  }

  function playCornerHit() {
    safePlay(cornerHitAudio, { muted });
  }

  let saviorContext = null;

  // Soft synthesized "heavenly" major chord + shimmer (no audio file needed).
  function playSavior() {
    if (muted || isReducedEffectsEnabled() || masterVolume <= 0) return;
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (typeof AudioCtx !== 'function') return;

    try {
      if (!saviorContext) saviorContext = new AudioCtx();
      const ctx = saviorContext;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const master = ctx.createGain();
      const peak = BASE_VOLUMES.savior * masterVolume;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(peak, now + 0.35);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
      master.connect(ctx.destination);

      // C major add9 (C5 E5 G5 C6 D6), staggered like a harp swell.
      [523.25, 659.25, 783.99, 1046.5, 1174.66].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + index * 0.09;
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + 2.5);
      });
    } catch {
      // Ignore Web Audio failures.
    }
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
  }

  function getMuted() {
    return muted;
  }

  function setMasterVolume(nextVolume) {
    masterVolume = clamp01(nextVolume);
    applyVolume();
  }

  function getMasterVolume() {
    return masterVolume;
  }

  return {
    arm,
    playDitto,
    playSelect,
    playWallHit,
    playCornerHit,
    playSavior,
    setMuted,
    getMuted,
    setMasterVolume,
    getMasterVolume
  };
}