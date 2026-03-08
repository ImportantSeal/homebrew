import { recordGiveDrinks } from '../../stats.js';
import { ACTION_CODES } from '../../logic/actionEffectRegistry.js';
import {
  queueManualPenaltyDraw,
  queueManualPenaltyDrawForPlayers
} from './helpers.js';
import { applyEveryoneDrink } from './specialActionSupport.js';
import {
  actorNameFromContext,
  allPlayerIndexes,
  createChoiceResult
} from './specialActionRegistry.shared.js';

function handleChaosReferendumGroup(context) {
  return createChoiceResult({
    key: ACTION_CODES.CHAOS_REFERENDUM_GROUP,
    title: "Chaos Referendum",
    message: "Group vote: either everybody drinks 5 OR everybody takes a Penalty card.",
    variant: "choice",
    options: [
      {
        id: "everybody_drinks_5",
        label: "Everybody drinks 5",
        variant: "danger",
        run: ({ state, log, applyDrinkEvent }) => {
          applyEveryoneDrink(state, 5, "Chaos Referendum", log, applyDrinkEvent);
          log?.("Chaos Referendum result: everybody drinks 5.");
          return { endTurn: true };
        }
      },
      {
        id: "everybody_penalty_card",
        label: "Everybody takes a Penalty card",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log }) => {
          queueManualPenaltyDrawForPlayers(
            state,
            log,
            allPlayerIndexes(state),
            currentPlayerIndex,
            "Chaos Referendum: everybody takes a Penalty card."
          );
          return { endTurn: false };
        }
      }
    ]
  }, context.log, "Chaos Referendum choice setup failed.");
}

function handlePenaltyInsurance(context) {
  return createChoiceResult({
    key: ACTION_CODES.PENALTY_INSURANCE,
    title: "Penalty Insurance",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "draw_penalty",
        label: "Draw a Penalty card",
        variant: "danger",
        run: ({ state, log }) => {
          queueManualPenaltyDraw(
            state,
            log,
            "Penalty Insurance: click the Penalty Deck to roll and continue."
          );
          return { endTurn: false };
        }
      },
      {
        id: "drink_5_avoid",
        label: "Drink 5 to avoid the penalty",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 5, "Penalty Insurance", log);
          log?.("Penalty avoided.");
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Penalty Insurance choice setup failed.");
}

function handleDealWithDevil(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.DEAL_WITH_DEVIL,
    title: "Deal with Devil",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "penalty_then_give_6",
        label: "Draw a Penalty card, then give 6",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 6);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 6 drinks total.`);
          queueManualPenaltyDraw(
            state,
            log,
            "Deal with Devil: click the Penalty Deck to roll and continue."
          );
          return { endTurn: false };
        }
      },
      {
        id: "drink_4",
        label: "Drink 4",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 4, "Deal with Devil", log);
          return { endTurn: true };
        }
      }
    ]
  }, context.log, "Deal with Devil choice setup failed.");
}

function handleAllInTax(context) {
  const actorName = actorNameFromContext(context);

  return createChoiceResult({
    key: ACTION_CODES.ALL_IN_TAX,
    title: "All-In Tax",
    message: "Choose one option to continue.",
    variant: "choice",
    options: [
      {
        id: "drink_3",
        label: "Drink 3",
        variant: "primary",
        run: ({ state, currentPlayerIndex, log, applyDrinkEvent }) => {
          applyDrinkEvent(state, currentPlayerIndex, 3, "All-In Tax", log);
          return { endTurn: true };
        }
      },
      {
        id: "give_3_draw_penalty",
        label: "Give 3 and draw a Penalty card",
        variant: "danger",
        run: ({ state, currentPlayerIndex, log }) => {
          recordGiveDrinks(state, currentPlayerIndex, 3);
          log?.(`${state.players?.[currentPlayerIndex]?.name || actorName} gives 3 and draws a penalty.`);
          queueManualPenaltyDraw(
            state,
            log,
            "All-In Tax: click the Penalty Deck to roll and continue."
          );
          return { endTurn: false };
        }
      }
    ]
  }, context.log, "All-In Tax choice setup failed.");
}

function handlePenaltyAllManual(context) {
  const { state, currentPlayerIndex, log } = context;

  queueManualPenaltyDrawForPlayers(
    state,
    log,
    allPlayerIndexes(state),
    currentPlayerIndex,
    "Fun for whole family: everybody takes a Penalty card."
  );
  return { endTurn: false };
}

function handleSharePenaltyLocked(context) {
  const { state, currentPlayerIndex, log } = context;

  const queued = queueManualPenaltyDraw(
    state,
    log,
    "Share Penalty active: roll the Penalty Deck, then apply the same penalty to one other player."
  );
  if (!queued) {
    state.sharePenalty = null;
    return;
  }

  state.sharePenalty = {
    active: true,
    sourcePlayerIndex: currentPlayerIndex,
    penalty: null
  };

  return { endTurn: false };
}

export const penaltySpecialActionHandlers = Object.freeze({
  [ACTION_CODES.CHAOS_REFERENDUM_GROUP]: handleChaosReferendumGroup,
  [ACTION_CODES.PENALTY_INSURANCE]: handlePenaltyInsurance,
  [ACTION_CODES.DEAL_WITH_DEVIL]: handleDealWithDevil,
  [ACTION_CODES.ALL_IN_TAX]: handleAllInTax,
  [ACTION_CODES.PENALTY_ALL_MANUAL]: handlePenaltyAllManual,
  [ACTION_CODES.SHARE_PENALTY_LOCKED]: handleSharePenaltyLocked
});
