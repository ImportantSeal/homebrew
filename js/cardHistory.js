export function addHistoryEntry(message) {
  const historyContainer = document.getElementById('card-history');
  if (!historyContainer) return;

  const historyScroller = historyContainer.closest('.history-section') || historyContainer;
  const distanceFromBottom =
    historyScroller.scrollHeight - historyScroller.scrollTop - historyScroller.clientHeight;
  const shouldStickToBottom = distanceFromBottom <= 24;

  const entry = document.createElement('p');
  entry.textContent = message;
  historyContainer.appendChild(entry);

  if (shouldStickToBottom) {
    historyScroller.scrollTo({
      top: historyScroller.scrollHeight,
      behavior: "smooth"
    });
  }
}
