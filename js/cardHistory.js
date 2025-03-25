export function addHistoryEntry(message) {
  const historyContainer = document.getElementById('card-history');
  const entry = document.createElement('p');
  entry.textContent = message;
  historyContainer.appendChild(entry);
  historyContainer.scrollTop = historyContainer.scrollHeight;
}
