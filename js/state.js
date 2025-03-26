export const state = {
  players: [],
  currentPlayerIndex: 0,

  // Sosiaaliset ja Challenge-kortit
  socialCards: [
    { name: "Social", instruction: "Everyone drinks one." },
    { name: "Double Social", instruction: "Everyone drinks two." },
    { 
      name: "Challenge", 
      subcategories: [
        { name: "Dare", instruction: "Dare someone." },
        { name: "Truth or Drink", instruction: "Ask someone." },
        { name: "Compliment", instruction: "Everyone gives you a compliment; the worst one drinks three." },
        { name: "Would You Rather", instruction: "" },
        { name: "Two Truths and a Lie", instruction: "" },
        { name: "Rock, Paper, Scissors", instruction: "Play against someone; loser drinks three." },
        { name: "Random Fact", instruction: "Share an interesting fact – a boring fact means a drink." },
        { name: "Bucket List Share", instruction: "Everyone shares a bucket list item; the dullest drinks." },
        { name: "Dream Date", instruction: "Everyone describes their ideal date; the most unoriginal drinks." },
        { name: "This or That", instruction: "Ask someone 'this or that'; hesitation means two drinks." }
      ]
    }
  ],

  // Normaalikortit
  normalDeck: [
    "Drink 1",
    "Drink 2",
    "Drink 3",
    "Drink 4",
    "Drink 5",
    "Drink 6",
    "Give 1",
    "Give 2",
    "Give 3",
    "Drink 2, Give 1",
    "Drink 3, Give 2",
    "Drink 1, Give 3",
    "Drink 1, Give 1",
    "Color Call: Call out a color. Anyone not wearing that color drinks."
  ],

  // Crowd Challenge -kortti, jossa alaluokkana satunnaisesti arvottava tehtävä
  crowdChallenge: {
    name: "Crowd Challenge",
    subcategories: [
      "Waterfall", 
      "Trivia Master", 
      "Categories", 
      "Red or Black"
    ]
  },

  // Special Card, josta arvotaan yksi alaluokka
  special: {
    name: "Special Card",
    subcategories: [
      "Odds Drink", 
      "Even Drink", 
      "Odds Give", 
      "Even Give",
      { name: "Mini King", instruction: "Drink the Kings Cup – a mix of everyone's drinks." },

    ]
  },

  // Penalty-kortit
  penaltyDeck: [
    "Drink 1",
    "Drink 2",
    "Drink 3",
    "Drink 4",
    "Shot",
    "Shotgun"
  ],

  // Item-kortit, joita pelaajat voivat hankkia
  itemCards: ["Shield", "Reveal Free", "Extra Life", "Mystery Boost", "Redraw"],

  // Pelin aikana käytettävät tilat
  currentCards: [],
  revealed: [true, true, true],
  dittoActive: [false, false, false],
  hiddenIndex: null,
  redrawUsed: false,
  cardHistory: [],
  penaltyCard: null,
  penaltyShown: false
};
