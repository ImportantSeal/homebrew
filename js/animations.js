function setFrontContent(frontEl, finalText) {
  frontEl.innerHTML = "";

  if (finalText === "Immunity") {
    frontEl.innerHTML = `<img src="images/immunity.png" alt="Immunity" style="width:100%; height:100%; object-fit: contain;">`;
    return;
  }

  frontEl.textContent = finalText;
}

export function flipCardAnimation(cardElement, finalText) {
  const front = cardElement.querySelector?.('.card__front');

  // Fallback
  if (!front) {
    cardElement.textContent = finalText;
    cardElement.dataset.value = finalText;
    return;
  }

  const wantFront = finalText !== "???";
  const isFront = cardElement.classList.contains('show-front');

  cardElement._flipToken = (cardElement._flipToken || 0) + 1;
  const token = cardElement._flipToken;

  // Want back
  if (!wantFront) {
    cardElement.classList.remove('show-front');
    cardElement.dataset.value = finalText;
    return;
  }

  // Back -> Front
  if (!isFront) {
    setFrontContent(front, finalText);
    requestAnimationFrame(() => {
      if (cardElement._flipToken !== token) return;
      cardElement.classList.add('show-front');
      cardElement.dataset.value = finalText;
    });
    return;
  }

  // Front -> Back -> swap -> Front
  cardElement.classList.remove('show-front');

  setTimeout(() => {
    if (cardElement._flipToken !== token) return;
    setFrontContent(front, finalText);
    cardElement.classList.add('show-front');
    cardElement.dataset.value = finalText;
  }, 230);
}

export function flashElement(element, flashColor = "yellow", duration = 300) {
  const originalBorder = element.style.borderColor;
  element.style.borderColor = flashColor;
  setTimeout(() => {
    element.style.borderColor = originalBorder;
  }, duration);
}
