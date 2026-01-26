import { flipCardAnimation } from '../animations.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';

export function getCardElements() {
  return [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
}

export function renderCards(state, onSelectCard) {
  const cards = getCardElements();

  for (let i = 0; i < 3; i++) {
    // reset root inline styles
    cards[i].style.borderColor = "";
    cards[i].style.backgroundColor = "";
    cards[i].style.color = "";

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
