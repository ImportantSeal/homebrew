export function getCardDisplayValue(card) {
  if (typeof card === 'object' && card !== null) {
    return card.label || card.name || card.title || card.text || "";
  }
  return card;
}
