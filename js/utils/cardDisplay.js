export function getCardDisplayValue(card) {
  if (typeof card === 'object' && card !== null) {
    return card.name || "";
  }
  return card;
}
