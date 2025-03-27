export const state = {
  players: [],
  currentPlayerIndex: 0,

  // Sosiaaliset ja Challenge-kortit
  socialCards: [
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
    "Draw a Penalty Card",
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
  ],

  // Crowd Challenge -kortti, jossa alaluokkana satunnaisesti arvottava tehtävä
  crowdChallenge: {
    name: "Crowd Challenge",
    subcategories: [
      "Waterfall", 
      "Trivia Master", 
      "Categories", 
      "Red or Black",
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
      { name: "Fun Time", instruction: "Roll the penalty deck. The penalty applies to all players." },
      { name: "Color Call", instruction: "Call out a color. Anyone not wearing that color drinks." },
      { name: "Mini King", instruction: "Drink the Kings Cup." },
      { name: "Social", instruction: "Everyone drinks one." },
      { name: "Double Social", instruction: "Everyone drinks two." },
      { name: "Youngest Drinks", instruction: "The youngest player drinks one." },
      { name: "Oldest Drinks", instruction: "The oldest player drinks one." },
      { name: "Least Drunk Drinks", instruction: "The player with the fewest drinks so far drinks one." },
      { name: "Most Drunk Gives 3", instruction: "The drunkest player gives out three drinks." },
      { name: "Singles Drink", instruction: "All single players drink one." },
      { name: "In Relationship Drink Two", instruction: "All players in a relationship drink two." },
      { name: "Last Bathroom", instruction: "The player who last used the bathroom drinks one." },

    ]
  },

  // Penalty-kortit
  penaltyDeck: [
    "Drink 2",
    "Drink 3",
    "Drink 4",
    "Drink 5",
    "Shot",
    "Shotgun",
  ],

  // Item-kortit, joita pelaajat voivat hankkia
  itemCards: ["Shield", "Reveal Free", "Mirror", "Immunity"],

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
