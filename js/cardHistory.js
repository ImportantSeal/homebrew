import { state } from './state.js';

const MAX_HISTORY_ENTRIES = 300;

function normalizeMessage(message) {
  return String(message ?? "").trim();
}

export function addHistoryEntry(message) {
  const historyContainer = document.getElementById('card-history');
  const text = normalizeMessage(message);
  if (!historyContainer || !text) return null;

  const historyScroller = historyContainer.closest('.history-section') || historyContainer;
  const distanceFromBottom =
    historyScroller.scrollHeight - historyScroller.scrollTop - historyScroller.clientHeight;
  const shouldStickToBottom = distanceFromBottom <= 24;

  if (!Array.isArray(state.cardHistory)) state.cardHistory = [];
  state.cardHistory.push(text);
  if (state.cardHistory.length > MAX_HISTORY_ENTRIES) {
    state.cardHistory.splice(0, state.cardHistory.length - MAX_HISTORY_ENTRIES);
  }

  const entry = document.createElement('p');
  entry.textContent = text;
  historyContainer.appendChild(entry);

  if (shouldStickToBottom) {
    historyScroller.scrollTo({
      top: historyScroller.scrollHeight,
      behavior: "smooth"
    });
  }

  return text;
}

export function getLastHistoryEntry() {
  if (Array.isArray(state.cardHistory) && state.cardHistory.length > 0) {
    return state.cardHistory[state.cardHistory.length - 1];
  }

  const historyContainer = document.getElementById('card-history');
  const last = historyContainer?.lastElementChild;
  const text = last?.textContent ? String(last.textContent).trim() : "";
  return text || null;
}

export function clearHistoryEntries() {
  state.cardHistory = [];
  const historyContainer = document.getElementById('card-history');
  if (historyContainer) historyContainer.innerHTML = "";
}
