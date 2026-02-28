export const gameData = {
  // Sosiaaliset ja Challenge-kortit
  socialCards: [
    {
      name: "Challenge",
      subcategories: [
        { name: "Dare", instruction: "Dare someone." },
        { name: "Truth or Penalty", instruction: "Ask any player: 'Truth or Penalty?'" },
        { name: "Compliment", instruction: "Everyone compliments you; the worst one drinks 3." },
        { name: "Would You Rather", instruction: "Ask someone Would You Rather." },
        { name: "Rock, Paper, Scissors", instruction: "Play R,P,S against someone; loser drinks three." },
        { name: "Random Fact", instruction: "Share an interesting fact - a boring fact means 1 drink." },
        { name: "This or That", instruction: "Ask someone 'this or that'; hesitation means two drinks." },
        { name: "Song Association", instruction: "Say a word. First to sing a lyric with it gives 1; last to sing drinks 1." },
        { name: "5-Second Rule", instruction: "Name 3 things in a category within 5 seconds. Fail and drink 2." },
        { name: "Most Likely To", instruction: "Say 'Most likely to...'. Count to three and point; the most-voted player drinks 1." },
        { name: "Staring Contest", instruction: "Pick an opponent. First to blink drinks two." },
        { name: "Hot Take", instruction: "Share one hot take." },
        { name: "Riddle Me", instruction: "Ask a riddle. If solved, you drink one; if not, the group drinks one." },
        { name: "Guess the Number", instruction: "Hold 1-5 fingers behind your back. Closest gives 1; exact guess gives 2." },
        { name: "No hands", instruction: "Take a shot without using your hands." },
        { name: "Biggest Red Flag", instruction: "Share one big red flag in relationships in general." },
        { name: "Biggest Green Flag", instruction: "Share one big green flag in relationships in general." },
        { name: "Flirting Style", instruction: "Describe your flirting style in 3 words. Group picks the cringiest; that player drinks 2." },
        { name: "Red Flag Redemption", instruction: "Name one red flag you used to have but fixed. If you cannot name one, drink 2." },
        { name: "Instant Ick", instruction: "Name one tiny instant ick." },
        { name: "Dealbreaker Draft", instruction: "Name your #1 dealbreaker. If you hesitate for 5 seconds, drink 2." },
        { name: "Five-Year Forecast", instruction: "Give your prediction for your life five years from now." },
        { name: "Learned the Hard Way", instruction: "Share one thing you learned the hard way." },
        { name: "Stupid Purchase", instruction: "Share the dumbest thing you've spent money on." },
        { name: "Biggest Fear", instruction: "Share one thing you're most afraid of." },
        { name: "Advice to Younger Self", instruction: "Give one piece of advice to your younger self." },
        { name: "Self Roast", instruction: "Roast yourself in one sentence." },
        { name: "Common Misconception", instruction: "Share one thing most people get wrong about you." },
        { name: "Annoying Trait", instruction: "Name one trait of yours that annoys other people." },
        { name: "Unreasonable Pet Peeve", instruction: "Name one everyday thing you irrationally hate." },
        { name: "Give Count Guess", instruction: "Guess how many drinks you have given so far. If your guess is exact, give that many drinks (max 10). If your guess is wrong, drink your guessed amount (max 10)." },
        { name: "First Thought", instruction: "The player on your right gives one random word. Say your first thought instantly; freeze over 3 seconds = drink 1." },
        { name: "Dating Resume", instruction: "Give a 15-second dating pitch for yourself." },
        { name: "Real or Fake Opinion", instruction: "State one opinion. Everyone guesses whether you truly mean it. Anyone who guesses wrong drinks 1. You drink 1 for each player who guessed correctly." },
        { name: "Unnecessary Skill", instruction: "Share one useless skill you have. If anyone claims it is actually useful, you drink 1." },
        { name: "Deal or Steal", instruction: "Pick one player. You and that player secretly choose either 'Deal' or 'Steal' and reveal at the same time. If both choose Deal, both give 1 drink. If one chooses Steal and the other chooses Deal, the Steal player gives 3 drinks total. If both choose Steal, both drink 2." },

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
    "Take a Shot",
    "Shotgun",
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
      { name: "Minority Wins", instruction: "Set a binary topic. Minority side gives 1 each, majority side drinks 1 each." },
      { name: "Overrated / Underrated", instruction: "Pick a thing (not a person). Everyone votes: overrated or underrated. Minority drinks 2." },
      { name: "Heads or Tails", instruction: "Everyone chooses heads/tails with hands; losing side drinks." },
      { name: "Color Call", instruction: "Call out a color. Anyone not wearing that color drinks." },
      { name: "Reverse Waterfall", instruction: "Everyone starts drinking; you can stop anytime, but your right neighbor must stop after you." },
      { name: "Last Letter Chain", instruction: "Pick a category; each item must start with the last letter of the previous; first repeat or miss drinks." },
      { name: "Finger Total 21", instruction: "No talking. On three, everyone shows 0-10 fingers. If the total is 21, drawer gives 3; otherwise everyone drinks 1." },
      { name: "Glance & Sip", instruction: "Everyone looks at the same person (count to 3). Most looked-at drinks 3." },
      { name: "Show Most Recent Picture", instruction: "Everyone shows their most recent picture." },
      { name: "Race to the bottom", instruction: "The last player to finish their drink must take a shot." },
      { name: "Hands up", instruction: "Last player to raise a hand drinks as many sips as there are hands in the room." },
      { name: "Group Selfie", instruction: "Take a group selfie together." },
      { name: "Fast Hands", instruction: "First player to take a sip gives 4 drinks total to others." },
      { name: "Matching Drink Check", instruction: "Everyone drinking the same beverage as you drinks 1. If nobody matches, you drink 1." },
      { name: "Name Length Ladder", instruction: "Compare first names only. Longest drinks 3. Shortest gives 1." },
      { name: "Birthday Roulette", instruction: "Nearest upcoming birthday gives 2. Farthest drinks 2." },
      { name: "Latest Google Search", instruction: "Everyone shows their most recent Google search." },
      { name: "Five-Word Movie Pitch", instruction: "Describe a movie using exactly five words. The first correct guess gives 2 drinks. If nobody guesses within 20 seconds, everyone drinks 1." },
      { name: "Drinking Pot (d20)", instruction: "Everyone commits 1-6 drinks to the pot. Then everyone rolls a d20; the lowest roll drinks the entire pot. If there is a tie for lowest, tied players re-roll until one loser remains." },
      { name: "Share a Secret", instruction: "Everyone shares one secret. If your secret is voted lame, drink 1." },
      { name: "On your feet!", instruction: "Everyone stands up. Last one standing drinks 1." },
      { name: "Hear me out", instruction: "Everyone reveals their 'hear me out' crush." },
      { name: "Two Truths and a Lie", instruction: "Say two truths and one lie. Everyone guesses the lie." },
      { name: "Unpopular Opinion", instruction: "Share one unpopular opinion. If nobody agrees, drink 1. If everyone agrees, drink 3." },
      { name: "Never Have I Ever", instruction: "Say 'Never have I ever...' and finish it. Anyone who has done it drinks 1, including you." },
      { name: "First Impression", instruction: "Everyone says one word about their first impression of you. Group picks the most accurate; that player gives 3." },
      { name: "The Bluff", instruction: "Make a bold claim about yourself. Anyone may challenge. If the challenger is right, you drink 3. If wrong, the challenger drinks 3. No challenge means no drinks." },
      { name: "Most Drinks Guess", instruction: "Everyone guesses who has taken the most drinks. Check Stats. Correct guesses may each give 1." },
      { name: "Cringe Archive", instruction: "Everyone shares one cringe moment." },
      { name: "Room Alias", instruction: "Describe an object in the room without saying its name. First correct guess gives 2." },
      { name: "Instant Opinion", instruction: "Name a topic. Everyone instantly gives a one-word opinion. Anyone silent drinks 3." },
      { name: "One's Gotta Go", instruction: "Name 4 things in one category. Everyone points to one to remove. Minority choice drinks 1." },
      { name: "Bet the Number", instruction: "Ask a numeric question. Everyone guesses once. Closest without going over gives 3. Over drinks 1. If all go over, everyone drinks 1." },
      { name: "Chaos Referendum", instruction: "Group vote together: either everybody drinks 5 OR everybody takes a Penalty card.", action: "CHAOS_REFERENDUM_GROUP" },


      
      

    ]
  },

  special: {
    name: "Special Card",
    subcategories: [

      { name: "Little unfair", instruction: "If you have an item, give out 3 drinks. If not, drink 3." },
      { name: "Clean Sheet Punishment", instruction: "If your Penalties are 0, draw a Penalty Card." },
      { name: "Generous Leader", instruction: "Player(s) with the most Drinks given give 3." },
      { name: "Quiet Hands", instruction: "Player(s) with the least Drinks given drink 2." },
      { name: "Dry Streak Breaker", instruction: "Player(s) with the least Drinks taken drink 5." },
      { name: "Tank Reward", instruction: "Player(s) with the most Drinks taken give 2." },
      { name: "Penalty Veteran Reward", instruction: "Player(s) with the most Penalties give 5." },
      { name: "Untouched Tank", instruction: "Check the Stats page. If your Drinks taken is 0, drink 9." },
      { name: "No-Show Giver", instruction: "If your Drinks given is 0, drink 9." },
      { name: "Mix Master", instruction: "Player(s) with the highest Drink + Give count drink 3 and give 3." },

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
};
