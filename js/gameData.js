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
      { name: "Odds Drink", instruction: "Roll 1-10; if the result is odd, you drink the number shown." },
      { name: "Even Drink", instruction: "Roll 1-10; if the result is even, you drink the number shown." },
      { name: "Odds Give", instruction: "Roll 1-10; if the result is odd, you give out the number of drinks shown." },
      { name: "Even Give", instruction: "Roll 1-10; if the result is even, you give out the number of drinks shown." },
      { name: "Mini King", instruction: "Everyone adds to the King's Cup. You drink the King's Cup." },
      { name: "Social", instruction: "Everyone clinks glasses and drinks one." },
      { name: "Double Social", instruction: "Everyone drinks two." },
      { name: "Youngest Drinks", instruction: "The youngest player drinks one." },
      { name: "Oldest Drinks", instruction: "The oldest player drinks one." },
      { name: "Least Drunk Drinks", instruction: "The player with the fewest drinks so far drinks one." },
      { name: "Party Sponsor", instruction: "The drunkest player gives out 3 drinks." },
      { name: "Singles Drink", instruction: "All single players drink one." },
      { name: "Couples Tax", instruction: "All players in a relationship drink 2." },
      { name: "Last Bathroom", instruction: "The player who last used the bathroom drinks one." },
      { name: "Speed Round", instruction: "Name five items in a category within 10 seconds. Failure means a drink." },
      { name: "Lilo and Stitch", instruction: "If you have siblings, drink as many sips as the total number of your siblings." },
      { name: "Sloth", instruction: "Lie on your back and drink." },
      { name: "To The Western Sky", instruction: "The player to your left must drink." },
      { name: "Social Distancing", instruction: "Everyone drinks if they are sitting less than 1 meter apart." },
      { name: "For All Ages", instruction: "Roll 1-10; players whose age ends with that digit give 1; others drink 1." },
      { name: "Host Tax", instruction: "Host drinks as many sips as there are players at the table." },
      { name: "Last Arrival ", instruction: "Last arrival drinks the same amount as the last Drink card value in Card History." },
      { name: "Battery Debt", instruction: "Everyone shows phone battery %. Lowest battery drinks the difference to the highest battery (rounded down, max 8)." },
      { name: "Notification Curse", instruction: "For the next 10 rounds, 'notification' means taking a Penalty card. The first player who takes a Penalty card drinks the last Drink card value." },
      { name: "Most Recent Sip", instruction: "The person who last took a sip drinks 3." },
      { name: "Generation Gap Bill", instruction: "Find the oldest and youngest players. The oldest drinks the age difference." },
      { name: "Generation Gap Rebate", instruction: "Find the oldest and youngest players. The youngest drinks the age difference." },
      { name: "Below Half, Finish It", instruction: "Anyone whose drink is below the halfway mark must finish it." },
      { name: "Straight-Line Test", instruction: "Walk in a straight line. If you succeed, give 2 drinks. If you fail, drink water." },
      { name: "Echo", instruction: "Repeat the last Drink card value and drink it again. (If last was Everybody drinks, only you repeat it.)" },
      { name: "Left-Handed Justice", instruction: "If you are left-handed: give 2. If not: drink 1. (Yes, it's unfair.)" },
      { name: "Give Echo", instruction: "Give the last 'Give X' value shown in Card History. If none, give 2." },
      { name: "No U", instruction: "Redirect the most recent Drink/Give aimed at you to another player. If none applies, drink 1." },
      {
        name: "Lie Mode (4 Turns)",
        instruction: "Choose one player. For the next 4 turns, they may speak only lies. If they tell the truth, they drink 2.",
        effect: { type: "LIE_MODE", turns: 4, needsTarget: true }
      },
      { name: "Domino Curse (6 Rounds)", instruction: "Choose one player. For the next 6 rounds, whenever they drink, all other players drink 1." },
      { name: "Nemesis Mark", instruction: "Pick a nemesis for 3 rounds; whenever they drink, you may give 1." },
      { name: "Forbidden Word (8 Rounds)", instruction: "Set one forbidden word for 8 rounds. Anyone saying it drinks 1." },
      { name: "Question Master (6 Rounds)", instruction: "Drawer is Question Master for 6 rounds. If you answer their question directly, you drink 2." },
      {
        name: "Share Penalty",
        instruction: "Reveal a Penalty card now and share that same penalty with one other player.",
        action: "SHARE_PENALTY_LOCKED"
      },
      { name: "Fun for whole family", instruction: "Roll the Penalty deck. The penalty applies to all players." },
      { name: "Water break", instruction: "Drink some water... or take a shot, it's your life." },
      { name: "Little unfair", instruction: "If you have an item, give out 3 drinks. If not, drink 3." },
      { name: "Clean Sheet Punishment", instruction: "If your Penalties are 0, draw a Penalty Card." },
      { name: "Generous Leader", instruction: "Player(s) with the most Drinks given give 3." },
      { name: "Quiet Hands", instruction: "Player(s) with the least Drinks given drink 2." },
      { name: "Tank Reward", instruction: "Player(s) with the most Drinks taken give 2." },
      { name: "Penalty Veteran Reward", instruction: "Player(s) with the most Penalties give 5." },
      { name: "Untouched Tank", instruction: "Check the Stats page. If your Drinks taken is 0, drink 9." },
      { name: "No-Show Giver", instruction: "If your Drinks given is 0, drink 9." },
      { name: "Mix Master", instruction: "Player(s) with the highest Drink + Give count drink 3 and give 3." },



      {
        name: "Who Knows You",
        instruction:
          "The card drawer asks anyone a question about themselves. Wrong answer -> responder drinks 3. Correct answer -> card drawer drinks 3.",
        action: "WHO_KNOWS_YOU"
      },
      {
        name: "Double or Nothing (d6)",
        instruction:
          "Drink 4 first. Then roll a d6: on 4-6, give 8 drinks total; on 1-3, drink 8 more.",
        action: "DOUBLE_OR_NOTHING_D6"
      },

      // ===== NEW ONE-SHOT LOGIC CARDS =====
      {
        name: "Risky Roll (d20)",
        instruction: "Roll a d20. On 1: you down your drink. On 20: everyone else downs. On 2-19: nothing happens.",
        action: "RISKY_ROLL_D20"
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
        instruction: "Drink 1. Your turn does not pass; draw new cards.",
        action: "DRINK_AND_DRAW_AGAIN"
      },
      {
        name: "Chaos Button",
        instruction: "Choose one: everybody drinks 3 now, OR you drink 1 and draw one extra card.",
        action: "CHAOS_BUTTON"
      },
      {
        name: "Selfish Switch",
        instruction: "Choose one: drink 4, OR give 6 drinks total.",
        action: "SELFISH_SWITCH"
      },
      {
        name: "Mercy or Mayhem",
        instruction: "Choose one: everybody drinks 1, OR pick one other player to drink 4.",
        action: "MERCY_OR_MAYHEM"
      },
      {
        name: "Last Call Insurance",
        instruction: "Choose one: take a Shot, OR everybody drinks 2.",
        action: "LAST_CALL_INSURANCE"
      },
      {
        name: "Penalty Insurance",
        instruction: "Choose one: draw a Penalty card now, OR drink 5 to avoid the penalty.",
        action: "PENALTY_INSURANCE"
      },
      {
        name: "Deal with Devil",
        instruction: "Choose one: draw a Penalty card, then give 6 drinks total, OR drink 4.",
        action: "DEAL_WITH_DEVIL"
      },
      {
        name: "Immunity or Suffer",
        instruction: "Choose one: gain an Immunity item and drink 5, OR skip the item and drink 2.",
        action: "IMMUNITY_OR_SUFFER"
      },
      {
        name: "Item Buyout",
        instruction: "Choose one: discard 1 item and give 8 drinks total, OR keep your items and drink 3.",
        action: "ITEM_BUYOUT"
      },
      {
        name: "Final Offer",
        instruction: "Choose one: take a Shot and end your turn, OR drink 5 and draw one extra card.",
        action: "FINAL_OFFER"
      },
      {
        name: "Cold Exit",
        instruction: "Choose one: drink 4 and end your turn, OR give 2 and redraw cards.",
        action: "COLD_EXIT"
      },
      {
        name: "All-In Tax",
        instruction: "Choose one: drink 3, OR give 3 and draw a Penalty card.",
        action: "ALL_IN_TAX"
      },
      {
        name: "Effect Surge",
        instruction: "If any timed effect is active, everybody drinks 3.",
        action: "IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3"
      },
      {
        name: "Calm Table Tax",
        instruction: "If no timed effects are active, everybody drinks 3.",
        action: "IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3"
      },
      {
        name: "Mutual Damage",
        instruction: "Choose one: you and one other player both drink 3, OR everybody else drinks 1.",
        action: "MUTUAL_DAMAGE"
      },
      {
        name: "Mercy Clause",
        instruction: "Choose one: everybody drinks 1, OR pick one other player to drink 4.",
        action: "MERCY_CLAUSE"
      },
      {
        name: "King's Tax",
        instruction: "Choose a temporary king for six rounds. Anyone who interrupts the king drinks 2.",
        effect: { type: "KINGS_TAX", turns: 6, needsTarget: true }
      },
      {
        name: "Delayed Reaction (3 Turns)",
        instruction: "No instant reactions for 3 turns. If you react in under 2 seconds, drink 1.",
        effect: { type: "DELAYED_REACTION", turns: 3 }
      },
      {
        name: "Name Swap (4 Turns)",
        instruction: "Choose two players. For 4 turns, they use each other's names. Wrong name -> drink 1.",
        effect: { type: "NAME_SWAP", turns: 4 }
      },
      {
        name: "Glass Down Rule (4 Turns)",
        instruction: "For 4 turns, your drink must be on the table before speaking. Break it -> drink 1.",
        effect: { type: "GLASS_DOWN", turns: 4 }
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
        instruction: "For the next 10 turns, everyone keeps their phone away. The first player who touches their own phone drinks 2.",
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
};
