export function flipCardAnimation(cardElement, finalText) {
  // Aloitetaan flip-out-animaatio
  cardElement.classList.add('flip-out');
  
  // Flip-out puolessa välissä: vaihdetaan sisältö kortin selkäpuoleen
  setTimeout(() => {
    cardElement.innerHTML = `<img src="images/cardback.png" alt="Card Back" style="width:100%; height:100%; object-fit: cover;">`;
  }, 150); // 150ms – puolet flip-out kestoajasta (300ms)

  // Kun flip-out on valmis (300ms), päivitetään sisältö uudella kortin etupuolella ja käynnistetään flip-in
  setTimeout(() => {
    if (finalText === "Immunity") {
      cardElement.innerHTML = `<img src="images/immunity.png" alt="Immunity" style="width:100%; height:100%; object-fit: contain;">`;
    } else {
      cardElement.textContent = finalText;
    }
    cardElement.dataset.value = finalText;
    cardElement.classList.remove('flip-out');
    cardElement.classList.add('flip-in');

    // Kun flip-in on valmis (300ms), poistetaan animaatioluokka
    setTimeout(() => {
      cardElement.classList.remove('flip-in');
    }, 300);
  }, 300);
}






export function flashElement(element, flashColor = "yellow", duration = 300) {
  const originalBorder = element.style.borderColor;
  element.style.borderColor = flashColor;
  setTimeout(() => {
    element.style.borderColor = originalBorder;
  }, duration);
}
