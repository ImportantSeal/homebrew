export function flipCardAnimation(cardElement, finalText) {
  cardElement.textContent = "";
  cardElement.classList.add('flip');
  setTimeout(() => {
    if (finalText === "Immunity") {
      cardElement.innerHTML = '<img src="/images/immunity.png" alt="Immunity" style="width:100%; height:100%; object-fit: contain;">';
    } else {
      cardElement.textContent = finalText;
    }
    cardElement.dataset.value = finalText;
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
