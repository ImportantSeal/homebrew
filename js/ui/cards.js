import { flipCardAnimation } from '../animations.js';
import { getCardDisplayValue } from '../utils/cardDisplay.js';
import { bindTap } from '../utils/tap.js';

function isActivationKey(event) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

export function getCardElements() {
  return [
    document.getElementById('card0'),
    document.getElementById('card1'),
    document.getElementById('card2')
  ];
}

export function computeKind(state, cardData) {
  // Object cards (Challenge / Crowd / Special)
  if (typeof cardData === 'object' && cardData !== null) {
    const name = String(cardData.name || "").trim();
    if (/^Challenge$/i.test(name)) return 'social';
    if (/^Crowd Challenge$/i.test(name)) return 'crowd';
    if (/^Special Card$/i.test(name)) return 'special';
    return 'special';
  }

  const value = String(getCardDisplayValue(cardData) ?? "").trim();
  const isShot = /\bShotgun\b/i.test(value) || /\bShot\b/i.test(value) || /takes a shot/i.test(value);

  // Items
  if (state.itemCards && state.itemCards.includes(value)) return 'item';

  // Penalty call
  if (/^Draw a Penalty Card$/i.test(value)) return 'penaltycall';

  // Mix drink/give
  const hasDrink = isShot || /(Everybody drinks\b|^Drink\b)/i.test(value) || /\bDrink\b/i.test(value);
  const hasGive = /\bGive\b/i.test(value) || /^Give\b/i.test(value);
  if (hasDrink && hasGive) return 'mix';
  if (hasGive) return 'give';
  if (hasDrink) return 'drink';

  return 'normal';
}

/**
 * Sets card kind safely:
 * - hidden mystery card stays 'normal' to prevent style/hover leak
 * - once revealed, set to actual computed kind
 */
export function setCardKind(state, cardEl, cardData, isHidden) {
  const kind = isHidden ? 'normal' : computeKind(state, cardData);
  cardEl.dataset.kind = kind;
}

export function renderCards(state, onSelectCard) {
  const cards = getCardElements();

  for (let i = 0; i < 3; i++) {
    // reset root inline styles
    cards[i].style.borderColor = "";
    cards[i].style.backgroundColor = "";
    cards[i].style.color = "";

    const isHidden = !state.revealed[i];

    // IMPORTANT: don't leak hidden card kind
    setCardKind(state, cards[i], state.currentCards[i], isHidden);

    // reset possible Ditto / any overrides on front
    const front = cards[i].querySelector('.card__front');
    if (front) front.removeAttribute('style');

    if (isHidden) {
      flipCardAnimation(cards[i], "???");
    } else {
      flipCardAnimation(cards[i], getCardDisplayValue(state.currentCards[i]));
    }

    if (typeof cards[i]._unbindTap === 'function') {
      cards[i]._unbindTap();
    }
    cards[i]._unbindTap = bindTap(cards[i], () => onSelectCard(i));

    cards[i].onkeydown = (event) => {
      if (!isActivationKey(event)) return;
      event.preventDefault();
      onSelectCard(i);
    };
  }
}
