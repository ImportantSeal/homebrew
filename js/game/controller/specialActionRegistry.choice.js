import { recordGiveDrinks } from '../../stats.js';
import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import { applyEveryoneDrink } from './specialActionSupport.js';
import { actorNameFromContext, createChoiceResult } from './specialActionRegistry.shared.js';

function handleChaosButton(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.CHAOS_BUTTON,
    title: "Chaos Button",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "everybody_drinks_3",
        label: "Everybody drinks 3 now",
        variant: "danger",
        run: ({ state, log, applyDrinkEvent }) => {
          log?.("Chaos Button choice: everybody drinks 3 now.");
          applyEveryoneDrink(state, 3, "Chaos Button", log, applyDrinkEvent);
          log?.("Everybody drinks 3.");
          return { endTurn: true };
        }
      },
      {
        id: "drink_1_draw_again",
        label: "Drink 1 and draw one extra card",
        variant: "primary",
        run: ({ state, currentPlayer, currentPlayerIndex, log, applyDrinkEvent }) => {
          const currentActorName = currentPlayer?.name || actorName;
          applyDrinkEvent(state, currentPlayerIndex, 1, "Chaos Button", log);
          log?.(`${currentActorName} keeps their turn and draws one extra card.`);
          return { endTurn: false, refreshCards: true };
        }
      }
    ]
  }, context.log, "Chaos Button choice setup failed. Skipping card action.");
}

function handleSelfishSwitch(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.SELFISH_SWITCH,
    title: "Selfish Switch",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "drink_4",
        label: "Drink 4",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 4, "Selfish Switch", log);
          return { endTurn: true };
        }
      },
      {
        id: "give_6",
        label: "Give 6 drinks total",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 6);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 6 drinks total.`);
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Selfish Switch choice setup failed.");
}

function handleLastCallInsurance(context) {
  return createChoiceResult({
    key: ACTION_CODES.LAST_CALL_INSURANCE,
    title: "Last Call Insurance",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "take_shot",
        label: "Take a Shot",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, "Shot", "Last Call Insurance", log);
          return { endTurn: true };
        }
      },
      {
        id: "everybody_drinks_2",
        label: "Everybody drinks 2",
        variant: "primary",
        run: ({ state, log, applyDrinkEvent }) => {
          applyEveryoneDrink(state, 2, "Last Call Insurance", log, applyDrinkEvent);
          log?.("Everybody drinks 2.");
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Last Call Insurance choice setup failed.");
}

function handleFinalOffer(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.FINAL_OFFER,
    title: "Final Offer",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "shot_end_turn",
        label: "Take a Shot and end turn",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, "Shot", "Final Offer", log);
          return { endTurn: true };
        }
      },
      {
        id: "drink_5_draw_again",
        label: "Drink 5 and draw one extra card",
        variant: "primary",
        run: ({ state, currentPlayer, currentPlayerIndex, log, applyDrinkEvent }) => {
          const currentActorName = currentPlayer?.name || actorName;
          applyDrinkEvent(state, currentPlayerIndex, 5, "Final Offer", log);
          log?.(`${currentActorName} keeps their turn and draws one extra card.`);
          return { endTurn: false, refreshCards: true };
        }
      }
    ]
  }, context.log, "Final Offer choice setup failed.");
}

function handleColdExit(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.COLD_EXIT,
    title: "Cold Exit",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "drink_4_end_turn",
        label: "Drink 4 and end turn",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 4, "Cold Exit", log);
          return { endTurn: true };
        }
      },
      {
        id: "give_2_redraw",
        label: "Give 2 and redraw cards",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 2);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 2 and redraws cards.`);
          return { endTurn: false, refreshCards: true };
        }
      }
    ]
  }, context.log, "Cold Exit choice setup failed.");
}

export const choiceSpecialActionHandlers = Object.freeze({
  [ACTION_CODES.CHAOS_BUTTON]: handleChaosButton,
  [ACTION_CODES.SELFISH_SWITCH]: handleSelfishSwitch,
  [ACTION_CODES.LAST_CALL_INSURANCE]: handleLastCallInsurance,
  [ACTION_CODES.FINAL_OFFER]: handleFinalOffer,
  [ACTION_CODES.COLD_EXIT]: handleColdExit
});
