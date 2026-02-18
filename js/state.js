export const state = {
  players: [],
  includeItems: false,
  currentPlayerIndex: 0,
  bags: {},

  // UI / flow guards
  uiLocked: false,

  // Penalty deck: 1st click reveals, 2nd click confirms + ends turn
  penaltyConfirmArmed: false,

  // NEW: why penalty is currently shown (affects behavior)
  // "deck" | "card" | "redraw" | "redraw_hold" | null
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
        { name: "Biggest Red Flag", instruction: "Share the biggest red flag you have noticed in someone. If you do not want to answer, drink." },
        { name: "Biggest Green Flag", instruction: "Share the biggest green flag you have noticed in someone. If you do not want to answer, drink." },
        { name: "Five-Year Forecast", instruction: "Give your prediction for your life five years from now. If you do not want to answer, drink." },
        { name: "Learned the Hard Way", instruction: "Share one thing you learned the hard way. If you do not want to answer, drink." },
        { name: "Stupid Purchase", instruction: "Share the dumbest thing you have spent money on. If you do not want to answer, drink." },
        { name: "Biggest Fear", instruction: "Share one thing you are most afraid of. If you do not want to answer, drink." },
        { name: "Advice to Younger Self", instruction: "Give one piece of advice to your younger self. If you do not want to answer, drink." },
        { name: "Self Roast", instruction: "Roast yourself in one sentence. If you do not want to answer, drink." },
        { name: "Common Misconception", instruction: "Share one thing about yourself that most people get wrong. If you do not want to answer, drink." },
        { name: "Annoying Trait", instruction: "Name one trait of yours that annoys other people. If you refuse, drink 2." },
        { name: "Unreasonable Pet Peeve", instruction: "Name one everyday thing you irrationally hate. If you refuse, drink 2." },
        { name: "Never Have I Ever", instruction: "Say 'Never have I ever...' and finish the sentence. Anyone who HAS done it drinks 1 (including you)." },
        { name: "First Impression", instruction: "Choose a player. Everyone says one word describing their first impression of them. The chosen player gives 2 to the harshest word (or drinks 2)." },

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
    "Everybody shotgun",
    "Everybody take a shot + shotgun",
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
      { name: "Latest Google Search", instruction: "Everyone shows their most recent Google search." },
      { name: "Five-Word Movie Pitch", instruction: "Describe a movie using exactly five words. The first correct guess gives 2 drinks. If nobody guesses within 20 seconds, everyone drinks 1." },
      { name: "Drinking Pot (d20)", instruction: "Everyone commits 1-6 drinks to the pot. Then everyone rolls a d20; the lowest roll drinks the entire pot. If there is a tie for lowest, tied players re-roll until one loser remains." },


      
      

    ]
  },

  special: {
    name: "Special Card",
    subcategories: [
      { name: "Odds Drink", instruction: "Roll 1-10; if the result is odd, you drink the number shown." },
      { name: "Even Drink", instruction: "Roll 1-10; if the result is even, you drink the number shown." },
      { name: "Odds Give", instruction: "Roll 1-10; if the result is odd, you give out the number of drinks shown." },
      { name: "Even Give", instruction: "Roll 1-10; if the result is even, you give out the number of drinks shown." },
      { name: "Color Call", instruction: "Call out a color. Anyone not wearing that color drinks." },
      { name: "Mini King", instruction: "Everyone adds to the Kings cup. Drink the Kings Cup." },
      { name: "Social", instruction: "Everyone drinks one." },
      { name: "Double Social", instruction: "Everyone drinks two." },
      { name: "Youngest Drinks", instruction: "The youngest player drinks one." },
      { name: "Oldest Drinks", instruction: "The oldest player drinks one." },
      { name: "Least Drunk Drinks", instruction: "The player with the fewest drinks so far drinks one." },
      { name: "Most Drunk Gives 3", instruction: "The drunkest player gives out three drinks." },
      { name: "Singles Drink", instruction: "All single players drink one." },
      { name: "In Relationship Drink Two", instruction: "All players in a relationship drink two." },
      { name: "Last Bathroom", instruction: "The player who last used the bathroom drinks one." },
      { name: "Speed Round", instruction: "Name five items in a category within 10 seconds. Failure means a drink." },
      { name: "Lilo and Stitch", instruction: "If you have siblings, drink as many sips as the total number of your siblings." },
      { name: "Sloth", instruction: "Lie on your back and drink." },
      { name: "To The Western Sky", instruction: "The player to your left must drink." },
      { name: "Social Distancing", instruction: "Everyone drinks if they are sitting less than 1 meter apart." },
      { name: "For All Ages", instruction: "Roll 1-10; players whose age ends with that digit give 1; others drink 1." },
      { name: "Host Tax", instruction: "Host drinks as many sips as there are players at the table." },
      { name: "Last Arrival ", instruction: "Last arrival drinks the same number as the last Drink-card value shown in Card History. " },
      { name: "Battery Debt", instruction: "Everyone shows phone battery %. Lowest battery drinks the DIFFERENCE to the highest battery (rounded down, max 8)." },
      { name: "Notification Curse", instruction: "For the next 60 seconds, the first person who gets ANY notification drinks the last Drink-card value." },
      { name: "Most Recent Sip", instruction: "The person who last took a sip drinks 3." },
      { name: "Oldest Drinks the Gap", instruction: "The oldest player drinks the age difference between the oldest and youngest players." },
      { name: "Youngest Drinks the Gap", instruction: "The youngest player drinks the age difference between the oldest and youngest players." },
      { name: "Matching Drink Check", instruction: "Everyone drinking the same beverage as you drinks 1. If nobody matches, you drink 1." },
      { name: "Below Half, Finish It", instruction: "Anyone whose drink is below the halfway mark must finish it." },
      { name: "Straight-Line Test", instruction: "Walk in a straight line. If you succeed, give 2 drinks. If you fail, drink water." },
      { name: "Echo", instruction: "Repeat the last Drink-card value: you drink that amount again. (If last was Everybody drinks, only YOU repeat it.)" },
      { name: "Name Length Ladder", instruction: "Longest name drinks 3. Shortest name gives 1." },
      { name: "Birthday Roulette", instruction: "Nearest upcoming birthday gives 2. Farthest birthday drinks 2." },
      { name: "Left-Handed Justice", instruction: "If you are left-handed: give 2. If not: drink 1. (Yes, it’s unfair.)" },
      { name: "Glance & Sip", instruction: "Everyone looks at the same person (count to 3). Most looked-at drinks 3." },
      { name: "Give Echo", instruction: "Give the last 'Give X' value shown in Card History. If none, give 2." },
      { name: "No U", instruction: "Redirect the most recent Drink/Give aimed at you to another player. If none applies, drink 1." },
      { name: "Share Penalty", instruction: "Share a Penalty card with one other player." },
      { name: "Fun for whole family", instruction: "Roll the Penalty deck. The penalty applies to ALL players." },
      { name: "Water break", instruction: "Drink some water... or take a shot, it's your life." },
      { name: "Little unfair", instruction: "If you have an item, give out 3 drinks. If not, drink 3." },



      {
        name: "Who Knows You",
        instruction:
          "Choose a player. They answer a question about you (e.g. 'coffee or tea'). Wrong → they drink 1. Correct → you drink 1.",
        action: "WHO_KNOWS_YOU"
      },
      {
        name: "Double or Nothing (d6)",
        instruction:
          "You drink 4. You may roll a d6: 4–6 → GIVE 8. 1–3 → DRINK 8.",
        action: "DOUBLE_OR_NOTHING_D6"
      },

      // ===== NEW ONE-SHOT LOGIC CARDS =====
      {
        name: "Risky Advice (d20)",
        instruction: "Roll a d20. On 1: you down a drink. On 20: everyone else downs. Otherwise: give a genuinely useful tip — if the table says it’s bad, you drink 2.",
        action: "RISKY_ADVICE_D20"
      },
      {
        name: "The Collector",
        instruction: "If you currently have the MOST items, you drink as many as you have items.",
        action: "COLLECTOR"
      },
      {
        name: "The Minimalist",
        instruction: "If you have 0 items, you GIVE as many drinks as the total number of items held by other players.",
        action: "MINIMALIST"
      },
      {
        name: "Drink and Draw Again",
        instruction: "Drink 1. Your turn does not pass, and you draw new cards.",
        action: "DRINK_AND_DRAW_AGAIN"
      },

      // ===== EFFECT CARDS =====
      {
        name: "Left Hand Rule",
        instruction: "For the next 6 turns, everyone drinks with their LEFT hand.",
        effect: { type: "LEFT_HAND", turns: 6 }
      },
      {
        name: "No Names",
        instruction: "For the next 10 turns, you are not allowed to say ANY names.",
        effect: { type: "NO_NAMES", turns: 10 }
      },
      {
        name: "No Swearing",
        instruction: "For the next 10 turns, the next person who swears drinks 4.",
        effect: { type: "NO_SWEARING", turns: 10 }
      },
      {
        name: "Hands Off Your Phone",
        instruction: "For the next 10 turns, everyone keeps their phone away. The first player who touches their own phone drinks 2. Keep this effect visible and click Remove after it triggers.",
        effect: { type: "NO_PHONE_TOUCH", turns: 10 }
      },
      {
        name: "Drink Buddy (Pick a target)",
        instruction: "Pick a player. For the next 6 turns, that player drinks whenever YOU drink.",
        effect: { type: "DRINK_BUDDY", turns: 6, needsTarget: true }
      },
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
