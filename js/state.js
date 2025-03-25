export const state = {
    players: [], // Pelaajat esim. { name: string, inventory: [] }
    currentPlayerIndex: 0,
    normalDeck: [
      "Drink 1",
      "Drink 2",
      "Give 1",
      "Give 3",
      "Crowd Challenge",
      "Surprise Card"
    ],
    penaltyDeck: [
      "Penalty Drink 1",
      "Penalty Drink 2",
      "Penalty Drink 3"
    ],
    itemCards: ["Shield", "Reveal Free", "Extra Life", "Mystery Boost"],
    currentCards: [],
    revealed: [true, true, true],
    dittoActive: [false, false, false],
    hiddenIndex: null,
    redrawUsed: false,
    cardHistory: []
  };
  