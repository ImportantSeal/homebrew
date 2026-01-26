import { flipCardAnimation } from '../animations.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';

export function getCardElements() {
  return [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
}

function computeKind(state, cardData) {
  // Object cards (Challenge / Crowd / Special)
  if (typeof cardData === 'object' && cardData !== null) {
    const name = String(cardData.name || "").trim();
    if (/^Challenge$/i.test(name)) return 'social';
    if (/^Crowd Challenge$/i.test(name)) return 'crowd';
    if (/^Special Card$/i.test(name)) return 'special';
    return 'special';
  }

  const value = String(getCardDisplayValue(cardData) ?? "").trim();

  // Items
  if (state.itemCards && state.itemCards.includes(value)) return 'item';

  // Penalty call
  if (/^Draw a Penalty Card$/i.test(value)) return 'penaltycall';

  // Mix drink/give
  const hasDrink = /(Everybody drinks\b|^Drink\b)/i.test(value) || /\bDrink\b/i.test(value);
  const hasGive = /\bGive\b/i.test(value) || /^Give\b/i.test(value);
  if (hasDrink && hasGive) return 'mix';
  if (hasGive) return 'give';
  if (hasDrink) return 'drink';

  return 'normal';
}

export function renderCards(state, onSelectCard) {
  const cards = getCardElements();

  for (let i = 0; i < 3; i++) {
    // reset root inline styles
    cards[i].style.borderColor = "";
    cards[i].style.backgroundColor = "";
    cards[i].style.color = "";

    // set kind every render (works even if card is hidden)
    const kind = computeKind(state, state.currentCards[i]);
    cards[i].dataset.kind = kind;

    // reset possible Ditto front overrides
    const front = cards[i].querySelector('.card__front');
    if (front) front.removeAttribute('style');

    if (!state.revealed[i]) {
      flipCardAnimation(cards[i], "???");
    } else {
      flipCardAnimation(cards[i], getCardDisplayValue(state.currentCards[i]));
    }

    cards[i].onclick = () => onSelectCard(i);
  }
}
