const DEFAULT_REPO = 'ImportantSeal/homebrew';
const COMMIT_PAGE_SIZE = 100;
const MAX_SEGMENT_COPIES = 96;
const SCROLL_PIXELS_PER_SECOND = 72;
const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

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

function repoCommitsUrl(repo) {
  const [owner, name] = String(repo || DEFAULT_REPO).split('/').map((part) => part.trim());
  if (!owner || !name) return null;
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits?per_page=${COMMIT_PAGE_SIZE}`;
}

function firstCommitLine(message) {
  return String(message || '').split(/\r?\n/)[0].trim();
}

function formatCommitDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return DATE_FORMATTER.format(date);
}

function isMergeLikeMessage(message) {
  return /^Merge\b/i.test(message) || /^Merged\b/i.test(message);
}

function isDisplayCommit(commitEntry) {
  const message = firstCommitLine(commitEntry?.commit?.message);
  if (!message || isMergeLikeMessage(message)) return false;

  const parents = Array.isArray(commitEntry?.parents) ? commitEntry.parents : [];
  return parents.length <= 1;
}

async function fetchLatestCommit(repo, signal) {
  const url = repoCommitsUrl(repo);
  if (!url) return null;

  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
    signal
  });

  if (!response.ok) {
    throw new Error(`GitHub commits request failed: ${response.status}`);
  }

  const commits = await response.json();
  if (!Array.isArray(commits)) return null;

  const latestDisplayCommit = commits.find(isDisplayCommit);
  const commit = latestDisplayCommit?.commit;
  const message = firstCommitLine(commit?.message);
  if (!message) return null;

  return {
    message,
    date: formatCommitDate(commit?.committer?.date || commit?.author?.date)
  };
}

function buildMessages(commit, manualTexts) {
  const messages = [];
  if (commit?.message) {
    messages.push({
      type: 'commit',
      title: 'Latest commit',
      date: commit.date || '',
      message: commit.message
    });
  }
  messages.push(...manualTexts.map((text) => ({ type: 'manual', message: text })));
  return messages;
}

function messageToLabel(message) {
  if (message?.type === 'commit') {
    return [message.title, message.date, message.message].filter(Boolean).join(' / ');
  }
  return String(message?.message || '').trim();
}

function createItem(message) {
  const item = document.createElement('span');
  item.className = 'commit-banner__item';

  if (message?.type !== 'commit') {
    item.textContent = messageToLabel(message);
    return item;
  }

  item.classList.add('commit-banner__item--commit');

  const label = document.createElement('span');
  label.className = 'commit-banner__label';
  label.textContent = message.title;
  item.appendChild(label);

  if (message.date) {
    const date = document.createElement('time');
    date.className = 'commit-banner__date';
    date.textContent = message.date;
    item.appendChild(date);
  }

  const text = document.createElement('span');
  text.className = 'commit-banner__message';
  text.textContent = message.message;
  item.appendChild(text);

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
  if (!messages.length) {
    root.removeAttribute('aria-label');
    return;
  }

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
  root.setAttribute('aria-label', messages.map(messageToLabel).filter(Boolean).join(' / '));
}

function createDeferredRender(root) {
  let frame = 0;
  let currentMessages = [];

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
  let hasBannerMessages = false;

  function syncVisibility() {
    const visible = isSetupVisible(setupContainer) && hasBannerMessages;
    root.hidden = !visible;
    document.body.classList.toggle('setup-banner-visible', visible);
  }

  function setBannerMessages(messages) {
    hasBannerMessages = Array.isArray(messages) && messages.length > 0;
    syncVisibility();
    deferredRender.schedule(messages);
  }

  syncVisibility();
  setBannerMessages(buildMessages(null, manualTexts));

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
    .then((commit) => {
      setBannerMessages(buildMessages(commit, manualTexts));
    })
    .catch(() => {
      setBannerMessages(buildMessages(null, manualTexts));
    })
    .finally(() => {
      window.clearTimeout(timeout);
    });
}
