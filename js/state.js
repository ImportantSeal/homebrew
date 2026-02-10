export const state = {
  players: [],
  currentPlayerIndex: 0,
  bags: {},

  // UI / flow guards
  uiLocked: false,

  // Penalty deck: 1st click reveals, 2nd click confirms + ends turn
  penaltyConfirmArmed: false,

  // NEW: why penalty is currently shown (affects behavior)
  // "deck" | "card" | "redraw" | null
  penaltySource: null,

  // NEW: prevent log spam when player clicks cards while penalty must be confirmed
  penaltyHintShown: false,

  // Ditto: pending effect per card index
  dittoPending: [null, null, null],

  // NEW: timed effects
  // Each effect: { id, type, remainingTurns, sourceIndex?, targetIndex?, createdBy? }
  effects: [],

  // NEW: when an effect needs a target pick
  effectSelection: {
    active: false,
    pending: null, // { type, remainingTurns, sourceIndex, meta }
    cleanup: null
  },

  // Sosiaaliset ja Challenge-kortit
  socialCards: [
    {
      name: "Challenge",
      subcategories: [
        { name: "Dare", instruction: "Dare someone." },
        { name: "Truth or Drink", instruction: "Ask someone Truth or Drink." },
        { name: "Compliment", instruction: "Everyone gives you a compliment; the worst one drinks three." },
        { name: "Would You Rather", instruction: "Ask someone Would You Rather." },
        { name: "Two Truths and a Lie", instruction: "Share two truths and one lie; others guess the lie." },
        { name: "Rock, Paper, Scissors", instruction: "Play R,P,S against someone; loser drinks three." },
        { name: "Random Fact", instruction: "Share an interesting fact – a boring fact means a drink." },
        { name: "Bucket List Share", instruction: "Everyone shares a bucket list item; the dullest drinks." },
        { name: "Dream Date", instruction: "Everyone describes their ideal date; the most unoriginal drinks." },
        { name: "This or That", instruction: "Ask someone 'this or that'; hesitation means two drinks." },
        { name: "Share a Secret", instruction: "Everyone must share a secret. If your secret is voted lame, take 1 drink. If you refuse to share, take 3 drinks." },
        { name: "On your feet!", instruction: "Everyone stands up, and the last person standing must drink." },
        { name: "Hear me out", instruction: "Everyone must reveal their Hear me out crush" },
        { name: "Song Association", instruction: "Say a word. First person to sing a lyric with it gives one; last drinks one." },
        { name: "5-Second Rule", instruction: "Name 3 things in a category in 5 seconds. Fail and drink two." },
        { name: "Most Likely To", instruction: "Say 'Most likely to…'. Count to three and point; most-voted drinks one." },
        { name: "Staring Contest", instruction: "Pick an opponent. First to blink drinks two." },
        { name: "Hot Take", instruction: "Share a spicy (friendly) opinion. If groans > cheers, drink one; else give one." },
        { name: "Riddle Me", instruction: "Ask a riddle. If solved, you drink one; if not, the group drinks one." },
        { name: "Guess the Number", instruction: "Hold 1–5 fingers behind your back. Closest gives one; exact gives two." },
        { name: "No hands", instruction: "Take a shot without using your hands." },

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
    "Drink 1, Give 1",
    "Everybody drinks 1",
    "Everybody drinks 2",
    "Everybody drinks 3",
    "Everybody takes a Shot",
  ],

  crowdChallenge: {
    name: "Crowd Challenge",
    subcategories: [
      { name: "Waterfall", instruction: "Starting with you, everyone begins drinking; each person can stop only when the person to their right stops." },
      { name: "Trivia Master", instruction: "Ask a trivia question to the group; wrong answers drink, first correct answer gives one." },
      { name: "Categories", instruction: "Pick a category and go clockwise naming items; first repeat, pause, or miss drinks." },
      { name: "This or That?", instruction: "Everyone chooses between two options; the minority drinks." },
      { name: "Heads or Tails", instruction: "Everyone chooses heads/tails with hands; losing side drinks." },
      { name: "Reverse Waterfall", instruction: "Everyone starts drinking; you can stop anytime, but your right neighbor must stop after you." },
      { name: "Last Letter Chain", instruction: "Pick a category; each item must start with the last letter of the previous; first repeat or miss drinks." },
      { name: "Finger Total 21", instruction: "Without talking, on three everyone shows 0–10 fingers; if the total equals 21, drawer gives 3, else all drink 1." },
      { name: "Show Most Recent Picture", instruction: "Show the most recent picture you took on your phone." },
      { name: "Race to the bottom", instruction: "The last player to finish their drink must take a shot." },
      { name: "Hands up", instruction: "The last player to raise their hand drinks as many sips as there are hands in the room." },
      { name: "Group Selfie", instruction: "Take a group selfie together." },
      { name: "Fast Hands", instruction: "Who first takes a drink gives 4 drinks to everyone else." },

      
      

    ]
  },

  special: {
    name: "Special Card",
    subcategories: [

      {
        name: "Ditto Magnet (Pick a target)",
        instruction: "Pick a player. For the next 5 turns, if Ditto triggers for them, they take a Shot immediately.",
        effect: { type: "DITTO_MAGNET", turns: 5, needsTarget: true }
      }
    ]
  },

  penaltyDeck: [
    "Drink 3",
    "Drink 4",
    "Drink 5",
    "Drink 6",
    "Shot",
    "Shotgun"
  ],

  itemCards: ["Shield", "Reveal Free", "Mirror", "Immunity", "Skip Turn"],

  // Pelin aikana käytettävät tilat
  currentCards: [],
  revealed: [true, true, true],
  dittoActive: [false, false, false],
  hiddenIndex: null,
  redrawUsed: false,
  cardHistory: [],
  penaltyCard: null,
  penaltyShown: false,

  mirror: {
    active: false,
    sourceIndex: null,
    selectedCardIndex: null,
    parentName: "",
    subName: "",
    subInstruction: "",
    displayText: ""
  }
};
