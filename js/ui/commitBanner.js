const DEFAULT_REPO = 'ImportantSeal/homebrew';
const FALLBACK_MESSAGE = 'Latest commit unavailable';
const LOADING_MESSAGE = 'Loading latest commit...';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SEGMENT_COPIES = 96;
const SCROLL_PIXELS_PER_SECOND = 72;

function parseManualTexts(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Fall back to pipe-separated text below.
    }
  }

  return raw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getManualTexts(root) {
  return [
    ...parseManualTexts(root.dataset.manualText),
    ...parseManualTexts(root.dataset.manualTexts)
  ];
}

function cacheKey(repo) {
  return `homebrew:commit-banner:${repo}`;
}

function readCachedCommit(repo) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(repo)) || 'null');
    if (!cached || typeof cached.message !== 'string') return '';
    if (Date.now() - Number(cached.savedAt || 0) > CACHE_TTL_MS) return '';
    return cached.message.trim();
  } catch {
    return '';
  }
}

function writeCachedCommit(repo, message) {
  try {
    localStorage.setItem(cacheKey(repo), JSON.stringify({
      message,
      savedAt: Date.now()
    }));
  } catch {
    // Non-essential cache; ignore private browsing/storage failures.
  }
}

function repoCommitsUrl(repo) {
  const [owner, name] = String(repo || DEFAULT_REPO).split('/').map((part) => part.trim());
  if (!owner || !name) return null;
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits?per_page=1`;
}

function firstCommitLine(message) {
  return String(message || '').split(/\r?\n/)[0].trim();
}

async function fetchLatestCommit(repo, signal) {
  const url = repoCommitsUrl(repo);
  if (!url) return '';

  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
    signal
  });

  if (!response.ok) {
    throw new Error(`GitHub commits request failed: ${response.status}`);
  }

  const commits = await response.json();
  return firstCommitLine(commits?.[0]?.commit?.message);
}

function buildMessages(commitMessage, manualTexts) {
  const messages = [];
  if (commitMessage) messages.push(commitMessage);
  messages.push(...manualTexts);
  return messages.length > 0 ? messages : [FALLBACK_MESSAGE];
}

function createItem(text) {
  const item = document.createElement('span');
  item.className = 'commit-banner__item';
  item.textContent = text;
  return item;
}

function appendMessageSet(segment, messages) {
  messages.forEach((message) => {
    segment.appendChild(createItem(message));
  });
}

function renderTrack(root, messages) {
  const track = root.querySelector('[data-commit-banner-track]');
  if (!track) return;

  track.replaceChildren();

  const segment = document.createElement('div');
  segment.className = 'commit-banner__segment';
  appendMessageSet(segment, messages);
  track.appendChild(segment);

  const targetWidth = Math.max(root.clientWidth || window.innerWidth || 0, 320) * 1.35;
  let copies = 1;
  while (segment.scrollWidth < targetWidth && copies < MAX_SEGMENT_COPIES) {
    appendMessageSet(segment, messages);
    copies += 1;
  }

  const clone = segment.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);

  const cycleWidth = Math.max(segment.scrollWidth, targetWidth);
  const duration = Math.max(18, cycleWidth / SCROLL_PIXELS_PER_SECOND);
  track.style.setProperty('--commit-banner-duration', `${duration.toFixed(2)}s`);
  root.setAttribute('aria-label', messages.join(' / '));
}

function createDeferredRender(root) {
  let frame = 0;
  let currentMessages = [LOADING_MESSAGE];

  return {
    schedule(messages = currentMessages) {
      currentMessages = messages;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderTrack(root, currentMessages);
      });
    }
  };
}

function isSetupVisible(setupContainer) {
  if (!setupContainer) return true;
  if (setupContainer.hidden) return false;
  return getComputedStyle(setupContainer).display !== 'none';
}

export function initCommitBanner() {
  const root = document.getElementById('commit-banner');
  if (!root) return;

  const repo = root.dataset.repo || DEFAULT_REPO;
  const setupContainer = document.getElementById('setup-container');
  const manualTexts = getManualTexts(root);
  const deferredRender = createDeferredRender(root);

  function syncVisibility() {
    const visible = isSetupVisible(setupContainer);
    root.hidden = !visible;
    document.body.classList.toggle('setup-banner-visible', visible);
  }

  syncVisibility();
  deferredRender.schedule(buildMessages(readCachedCommit(repo) || LOADING_MESSAGE, manualTexts));

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => deferredRender.schedule())
    : null;
  resizeObserver?.observe(root);

  if (setupContainer && typeof MutationObserver === 'function') {
    const setupObserver = new MutationObserver(syncVisibility);
    setupObserver.observe(setupContainer, {
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style']
    });
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = window.setTimeout(() => controller?.abort(), 8000);

  fetchLatestCommit(repo, controller?.signal)
    .then((message) => {
      const commitMessage = message || readCachedCommit(repo) || FALLBACK_MESSAGE;
      if (message) writeCachedCommit(repo, message);
      deferredRender.schedule(buildMessages(commitMessage, manualTexts));
    })
    .catch(() => {
      deferredRender.schedule(buildMessages(readCachedCommit(repo) || FALLBACK_MESSAGE, manualTexts));
    })
    .finally(() => {
      window.clearTimeout(timeout);
    });
}
