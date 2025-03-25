export function flipCardAnimation(cardElement, finalText) {
  cardElement.textContent = "";
  cardElement.classList.add('flip');
  setTimeout(() => {
    cardElement.textContent = finalText;
    cardElement.classList.remove('flip');
  }, 600);
}

export function flashElement(element, flashColor = "yellow", duration = 300) {
  const originalBorder = element.style.borderColor;
  element.style.borderColor = flashColor;
  setTimeout(() => {
    element.style.borderColor = originalBorder;
  }, duration);
}
