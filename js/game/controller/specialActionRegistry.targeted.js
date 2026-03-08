import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import {
  applyEveryoneDrink,
  applyEveryoneElseDrink,
  createTargetPlayerChoiceAction
} from './specialActionSupport.js';
import { actorNameFromContext, createChoiceResult } from './specialActionRegistry.shared.js';

function handleMercyCard(actionCode, context) {
  const cardTitle = actionCode === ACTION_CODES.MERCY_CLAUSE ? "Mercy Clause" : "Mercy or Mayhem";

  return createChoiceResult({
    key: actionCode,
    title: cardTitle,
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "everybody_drinks_1",
        label: "Everybody drinks 1",
        variant: "primary",
        run: ({ state, log, applyDrinkEvent }) => {
          applyEveryoneDrink(state, 1, cardTitle, log, applyDrinkEvent);
          log?.("Everybody drinks 1.");
          return { endTurn: true };
        }
      },
      {
        id: "pick_player_drinks_4",
        label: "Pick one player to drink 4",
        variant: "danger",
        run: ({ state, log }) => {
          const targetChoice = createTargetPlayerChoiceAction({
            key: `${actionCode}_TARGET`,
            title: cardTitle,
            message: "Pick one player (you can pick yourself) to drink 4.",
            state,
            optionVariant: "danger",
            onPick: ({ state, log, applyDrinkEvent }, targetIndex, targetName) => {
              applyDrinkEvent(state, targetIndex, 4, cardTitle, log);
              log?.(`${targetName} drinks 4 (${cardTitle}).`);
              return { endTurn: true };
            }
          });

          if (!targetChoice) {
            log?.(`${cardTitle} needs at least two players.`);
            return { endTurn: true };
          }

          return { endTurn: false, choice: targetChoice };
        }
      }
    ]
  }, context.log, `${cardTitle} choice setup failed.`);
}

function handleMutualDamage(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.MUTUAL_DAMAGE,
    title: "Mutual Damage",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "you_and_target_drink_3",
        label: "You and one player both drink 3",
        variant: "danger",
        run: ({ state, log }) => {
          const targetChoice = createTargetPlayerChoiceAction({
            key: "MUTUAL_DAMAGE_TARGET",
            title: "Mutual Damage",
            message: "Pick one player. You both drink 3.",
            state,
            optionVariant: "danger",
            onPick: ({ state, currentPlayerIndex, log, applyDrinkEvent }, targetIndex, targetName) => {
              const currentActorName = state.players?.[currentPlayerIndex]?.name || actorName;
              if (targetIndex === currentPlayerIndex) {
                applyDrinkEvent(state, currentPlayerIndex, 3, "Mutual Damage", log);
                log?.(`${currentActorName} picked themselves and drinks 3.`);
                return { endTurn: true };
              }

              applyDrinkEvent(state, currentPlayerIndex, 3, "Mutual Damage", log);
              applyDrinkEvent(state, targetIndex, 3, "Mutual Damage", log);
              log?.(`${currentActorName} and ${targetName} both drink 3.`);
              return { endTurn: true };
            }
          });

          if (!targetChoice) {
            log?.("Mutual Damage needs at least two players.");
            return { endTurn: true };
          }

          return { endTurn: false, choice: targetChoice };
        }
      },
      {
        id: "everybody_else_drinks_1",
        label: "Everybody else drinks 1",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyEveryoneElseDrink(state, currentPlayerIndex, 1, "Mutual Damage", log, applyDrinkEvent);
          log?.("Everybody else drinks 1.");
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Mutual Damage choice setup failed.");
}

export const targetedSpecialActionHandlers = Object.freeze({
  [ACTION_CODES.MERCY_OR_MAYHEM]: (context) => handleMercyCard(ACTION_CODES.MERCY_OR_MAYHEM, context),
  [ACTION_CODES.MERCY_CLAUSE]: (context) => handleMercyCard(ACTION_CODES.MERCY_CLAUSE, context),
  [ACTION_CODES.MUTUAL_DAMAGE]: handleMutualDamage
});
