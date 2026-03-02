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

  cards.forEach((cardEl) => {
    if (!cardEl) return;
    cardEl.classList.remove('card--dealing');
    cardEl.style.removeProperty('--deal-delay');
  });
  if (cards[0]) void cards[0].offsetWidth;

  for (let i = 0; i < 3; i++) {
    const cardEl = cards[i];
    if (!cardEl) continue;

    cardEl.style.setProperty('--deal-delay', `${i * 55}ms`);
    cardEl.classList.add('card--dealing');

    // reset root inline styles
    cardEl.style.borderColor = "";
    cardEl.style.backgroundColor = "";
    cardEl.style.color = "";

    const isHidden = !state.revealed[i];

    // IMPORTANT: don't leak hidden card kind
    setCardKind(state, cardEl, state.currentCards[i], isHidden);

    // reset possible Ditto / any overrides on front
    const front = cardEl.querySelector('.card__front');
    if (front) front.removeAttribute('style');

    if (isHidden) {
      flipCardAnimation(cardEl, "???");
    } else {
      flipCardAnimation(cardEl, getCardDisplayValue(state.currentCards[i]));
    }

    if (typeof cardEl._unbindTap === 'function') {
      cardEl._unbindTap();
    }
    cardEl._unbindTap = bindTap(cardEl, () => onSelectCard(i));

    cardEl.onkeydown = (event) => {
      if (!isActivationKey(event)) return;
      event.preventDefault();
      onSelectCard(i);
    };
  }
}
