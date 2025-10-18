export const state = {
  players: [],
  currentPlayerIndex: 0,

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
        { name: "On your feet!", instruction: "Everyone stands up, and the last person standing must drink."},
        { name: "Hear me out", instruction: "Everyone must reveal their Hear me out crush"},
        { name: "Song Association", instruction: "Say a word. First person to sing a lyric with it gives one; last drinks one." },
        { name: "5-Second Rule", instruction: "Name 3 things in a category in 5 seconds. Fail and drink two." },
        { name: "Most Likely To", instruction: "Say 'Most likely to…'. Count to three and point; most-voted drinks one." },
        { name: "Staring Contest", instruction: "Pick an opponent. First to blink drinks two." },
        { name: "Hot Take", instruction: "Share a spicy (friendly) opinion. If groans > cheers, drink one; else give one." },
        { name: "Riddle Me", instruction: "Ask a riddle. If solved, you drink one; if not, the group drinks one." },
        { name: "Simon Says", instruction: "Lead 5 commands. Anyone who messes up drinks one." },
        { name: "Speed Math", instruction: "Give someone a quick sum (e.g., 7×6−5). Wrong answer drinks one; right lets them give one." },
        { name: "Guess the Number", instruction: "Hold 1–5 fingers behind your back. Closest gives one; exact gives two." },
        { name: "Left or Right", instruction: "Hide a coin in one hand. Guesser picks; wrong drinks one, right gives one." },


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
    "Everybody drinks 1",
    "Everybody drinks 2",
    "Everybody drinks 3"
  ],

  // Crowd Challenge -kortti, jossa alaluokkana satunnaisesti arvottava tehtävä
  crowdChallenge: {
    name: "Crowd Challenge",
    subcategories: [
      { name: "Waterfall", instruction: "Starting with you, everyone begins drinking; each person can stop only when the person to their right stops." }, 
      { name: "Trivia Master", instruction: "Ask a trivia question to the group; wrong answers drink, first correct answer gives one." }, 
      { name: "Categories", instruction: "Pick a category and go clockwise naming items; first repeat, pause, or miss drinks." }, 
      { name: "Red or Black", instruction: "Everyone chooses red or black; flip a card or use RNG—losing color drinks." },
      { name: "Heads or Tails", instruction: "Everyone chooses heads/tails with hands; losing side drinks." },
      { name: "Zip Zap Zop", instruction: "Pass 'Zip'→'Zap'→'Zop' in order; hesitation or wrong word drinks." },
      { name: "Human Bingo (Speed)", instruction: "Leader calls quick traits (e.g., 'has a pet'); fewest hands raised drink." },
      { name: "Reverse Waterfall", instruction: "Everyone starts drinking; you can stop anytime, but your right neighbor must stop after you." },
      { name: "Fizz Buzz", instruction: "Count up; say 'Fizz' for multiples of 3, 'Buzz' for 5, 'FizzBuzz' for both—mistakes drink." },
      

      
    ]
  },

  // Special Card, josta arvotaan yksi alaluokka
  special: {
    name: "Special Card",
    subcategories: [
      { name: "Odds Drink", instruction: "Roll a die; if the result is odd, you drink the number shown." }, 
      { name: "Even Drink", instruction: "Roll a die; if the result is even, you drink the number shown." }, 
      { name: "Odds Give", instruction: "Roll a die; if the result is odd, you give out the number of drinks shown." }, 
      { name: "Even Give", instruction: "Roll a die; if the result is even, you give out the number of drinks shown." },
      { name: "Fun Time", instruction: "Roll the penalty deck. The penalty applies to all players." },
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
      { name: "Sloth", instruction: "Lie on your back and drink."},
      { name: "To The Western Sky", instruction: "The player to your left must drinks."}
      

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
