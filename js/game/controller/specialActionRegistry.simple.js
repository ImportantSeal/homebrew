import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import { applyEveryoneDrink } from './specialActionSupport.js';
import { actorNameFromContext } from './specialActionRegistry.shared.js';

function handleWhoKnowsYou(context) {
  const { state, log } = context;
  const actorName = actorNameFromContext(context);

  if ((state.players?.length || 0) < 2) {
    log("Who Knows You needs at least two players.");
    return;
  }

  log(`${actorName} asks anyone a question about ${actorName}. Wrong answer -> responder drinks 3. Correct answer -> ${actorName} drinks 3.`);
}

function handleEverybodyDrinkClink(context) {
  const { state, log, applyDrinkEvent } = context;

  applyEveryoneDrink(state, 1, "Everybody Drink", log, applyDrinkEvent);
  log("Everybody drinks 1 and clinks glasses.");
}

function handleDoubleOrNothingD6(context) {
  const { state, currentPlayerIndex, log, applyDrinkEvent } = context;
  const actorName = actorNameFromContext(context);

  applyDrinkEvent(state, currentPlayerIndex, 4, "Double or Nothing", log);
  log(`${actorName} drinks 4 first. Roll a d6 manually: on 4-6 give 8 drinks total, on 1-3 drink 8 more.`);
}

function handleDrinkAndDrawAgain(context) {
  const { state, currentPlayerIndex, log, applyDrinkEvent } = context;
  const actorName = actorNameFromContext(context);

  applyDrinkEvent(state, currentPlayerIndex, 1, "Drink and Draw Again", log);
  log(`${actorName} keeps their turn and draws new cards.`);
  return { endTurn: false, refreshCards: true };
}

function handleRiskyRollD20(context) {
  context.log("Risky Roll (d20): roll manually now. On 1 you down your drink, on 20 everyone else downs, on 2-19 nothing happens.");
}

export const simpleSpecialActionHandlers = Object.freeze({
  [ACTION_CODES.WHO_KNOWS_YOU]: handleWhoKnowsYou,
  [ACTION_CODES.EVERYBODY_DRINK_CLINK]: handleEverybodyDrinkClink,
  [ACTION_CODES.DOUBLE_OR_NOTHING_D6]: handleDoubleOrNothingD6,
  [ACTION_CODES.DRINK_AND_DRAW_AGAIN]: handleDrinkAndDrawAgain,
  [ACTION_CODES.RISKY_ROLL_D20]: handleRiskyRollD20
});
