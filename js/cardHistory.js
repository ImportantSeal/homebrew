import { state } from './state.js';
import { ensurePlayerColors, setPlayerColoredText } from './utils/playerColors.js';
import {
  buildStatsLeaderboardMessage,
  getStatsLeaderboardButtonLabel,
  normalizeStatsLeaderboardTopic
} from './statsLeaderboard.js';

const MAX_HISTORY_ENTRIES = 300;
const HISTORY_CARD_KINDS = new Set([
  'normal',
  'drink',
  'give',
  'mix',
  'penaltycall',
  'item',
  'social',
  'crowd',
  'special',
  'ditto'
]);

function normalizeMessage(message) {
  return String(message ?? "").trim();
}

function normalizeKind(kind) {
  if (typeof kind !== 'string') return null;
  const normalized = kind.trim().toLowerCase();
  return HISTORY_CARD_KINDS.has(normalized) ? normalized : null;
}

function createHistoryEntryElement(text, index, kind, options = {}) {
  const entry = document.createElement('article');
  entry.className = 'history-entry is-latest';
  entry.dataset.rawText = text;
  if (kind) entry.dataset.kind = kind;
  const leaderboardTopic = normalizeStatsLeaderboardTopic(options?.leaderboardTopic);
  if (leaderboardTopic) entry.dataset.leaderboardTopic = leaderboardTopic;

  const meta = document.createElement('div');
  meta.className = 'history-entry__meta';
  meta.textContent = `Turn log #${index}`;

  const content = document.createElement('div');
  content.className = 'history-entry__text';
  setPlayerColoredText(content, text, state.players);

  entry.append(meta, content);

  if (leaderboardTopic) {
    const actions = document.createElement('div');
    actions.className = 'history-entry__actions';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-entry__leaderboard-btn';
    btn.textContent = getStatsLeaderboardButtonLabel(leaderboardTopic);

    btn.addEventListener('click', () => {
      const leaderboardText = buildStatsLeaderboardMessage(state, leaderboardTopic);
      if (!leaderboardText) return;
      addHistoryEntry(leaderboardText, { kind: 'special' });
    });

    actions.appendChild(btn);
    entry.appendChild(actions);
  }

  return entry;
}

export function addHistoryEntry(message, options = {}) {
  const historyContainer = document.getElementById('card-history');
  const text = normalizeMessage(message);
  const kind = normalizeKind(options && typeof options === 'object' ? options.kind : null);
  const leaderboardTopic = normalizeStatsLeaderboardTopic(
    options && typeof options === 'object' ? options.leaderboardTopic : null
  );
  if (!historyContainer || !text) return null;
  ensurePlayerColors(state.players);

  const historyScroller = historyContainer.closest('.history-section') || historyContainer;

  if (!Array.isArray(state.cardHistory)) state.cardHistory = [];
  state.cardHistory.push(text);
  if (state.cardHistory.length > MAX_HISTORY_ENTRIES) {
    state.cardHistory.splice(0, state.cardHistory.length - MAX_HISTORY_ENTRIES);
  }

  const latest = historyContainer.querySelector('.history-entry.is-latest');
  if (latest) latest.classList.remove('is-latest');

  const entry = createHistoryEntryElement(text, state.cardHistory.length, kind, { leaderboardTopic });
  historyContainer.appendChild(entry);

  while (historyContainer.childElementCount > MAX_HISTORY_ENTRIES) {
    historyContainer.firstElementChild?.remove();
  }

  const scrollToBottom = () => {
    historyScroller.scrollTop = historyScroller.scrollHeight;
  };
  scrollToBottom();
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(scrollToBottom);
  }

  return text;
}

export function getLastHistoryEntry() {
  if (Array.isArray(state.cardHistory) && state.cardHistory.length > 0) {
    return state.cardHistory[state.cardHistory.length - 1];
  }

  const historyContainer = document.getElementById('card-history');
  const last = historyContainer?.lastElementChild;
  const raw = typeof last?.dataset?.rawText === 'string'
    ? String(last.dataset.rawText).trim()
    : "";
  if (raw) return raw;

  const textNode = last?.querySelector?.('.history-entry__text');
  const text = textNode?.textContent ? String(textNode.textContent).trim() : "";
  return text || null;
}

export function clearHistoryEntries() {
  state.cardHistory = [];
  const historyContainer = document.getElementById('card-history');
  if (historyContainer) historyContainer.innerHTML = "";
}
