import { getCardDisplayValue } from '../../../utils/cardDisplay.js';
import { resolveStatsLeaderboardTopic } from '../../../statsLeaderboard.js';
import { runSpecialAction } from '../specialActions.js';
import {
  getBagKeyForObjectCard,
  ensureBag,
  getObjectCardPool,
  shouldTriggerPenaltyPreview,
  shouldWaitForPenaltyDeckRoll,
  queueManualPenaltyDraw,
  effectLabelForLog
} from '../helpers.js';

function activateNonTargetedEffect(state, effectDef, log, renderEffectsPanel, addEffect, createEffect) {
  if (effectDef.type === "LEFT_HAND") {
    addEffect(state, createEffect("LEFT_HAND", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Left Hand Rule (${effectDef.turns} turns).`);
  } else if (effectDef.type === "NO_NAMES") {
    addEffect(state, createEffect("NO_NAMES", effectDef.turns, { targetIndex: state.currentPlayerIndex }));
    log(`Effect activated: No Names (${effectDef.turns} turns).`);
  } else if (effectDef.type === "NO_SWEARING") {
    addEffect(state, createEffect("NO_SWEARING", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: No Swearing (${effectDef.turns} turns). Remove it after the first player swears.`);
  } else if (effectDef.type === "NO_PHONE_TOUCH") {
    addEffect(state, createEffect("NO_PHONE_TOUCH", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Hands Off Your Phone (${effectDef.turns} turns).`);
  } else if (effectDef.type === "DELAYED_REACTION") {
    addEffect(state, createEffect("DELAYED_REACTION", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Delayed Reaction (${effectDef.turns} turns).`);
  } else if (effectDef.type === "NAME_SWAP") {
    addEffect(state, createEffect("NAME_SWAP", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Name Swap (${effectDef.turns} turns). Choose two players and enforce the rule.`);
  } else if (effectDef.type === "GLASS_DOWN") {
    addEffect(state, createEffect("GLASS_DOWN", effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: Glass Down Rule (${effectDef.turns} turns).`);
  } else {
    addEffect(state, createEffect(effectDef.type, effectDef.turns, { sourceIndex: state.currentPlayerIndex }));
    log(`Effect activated: ${effectLabelForLog({ type: effectDef.type }, effectDef.type)} (${effectDef.turns} turns).`);
  }

  renderEffectsPanel();
}

export function createObjectCardFlow({
  state,
  createBag,
  log,
  currentPlayer,
  playerName,
  nextPlayer,
  renderEffectsPanel,
  resetCards,
  openActionScreen,
  applyDrinkEvent,
  rollPenaltyCard,
  showPenaltyPreview,
  beginTargetedEffectSelection,
  addEffect,
  createEffect,
  startChoiceSelection,
  syncBackgroundScene,
  flipCardAnimation
}) {
  function handleObjectCardDraw(cardEl, parentCard) {
    const pool = getObjectCardPool(state, parentCard);
    if (pool.length === 0) {
      log("No valid cards available in this deck.");
      return true;
    }

    const bagKey = getBagKeyForObjectCard(state, parentCard);
    const bag = ensureBag(state, bagKey, pool, createBag);
    const event = bag.next();

    let subName = "";
    let subInstruction = "";
    let shownText = "";
    let effectDef = null;
    let action = null;

    if (typeof event === "object") {
      subName = event.name || "";
      subInstruction = event.instruction || "";
      shownText = subInstruction || subName;

      if (event.effect && typeof event.effect === "object") {
        effectDef = event.effect;
      }
      if (event.action) {
        action = event.action;
      }
    } else {
      subName = String(event);
      shownText = subName;
    }

    flipCardAnimation(cardEl, shownText);

    const parentName = getCardDisplayValue(parentCard);
    const actionTitle = subName || parentName || "Card Action";
    const drawMessage = (subInstruction && subName)
      ? `${subName} - ${subInstruction}`
      : (subInstruction || subName);
    const actionMessage = subInstruction || shownText || subName || "";
    const explicitLeaderboardTopic = event?.leaderboardTopic || event?.statsTopic || event?.statsLeaderboardTopic;
    const leaderboardTopic = explicitLeaderboardTopic || resolveStatsLeaderboardTopic(subName, subInstruction);

    if (drawMessage) {
      if (leaderboardTopic) {
        log(drawMessage, { leaderboardTopic });
      } else {
        log(drawMessage);
      }
    }

    const actionResolvesFlow = Boolean(action);
    const penaltyMeta = event?.penalty;
    const waitsForPenaltyDeckRoll = !actionResolvesFlow
      && (
        penaltyMeta?.requiresRoll === true
        || penaltyMeta?.waitForRoll === true
        || penaltyMeta?.manualRoll === true
        || shouldWaitForPenaltyDeckRoll(subName, subInstruction, shownText)
      );

    // If the subevent mentions penalty, also flip penalty deck (preview only).
    if (!actionResolvesFlow
      && !waitsForPenaltyDeckRoll
      && (penaltyMeta?.preview === true
        || penaltyMeta?.showPreview === true
        || shouldTriggerPenaltyPreview(subName, subInstruction, shownText))) {
      const label = `${parentName}${subName ? `: ${subName}` : ""}`;
      showPenaltyPreview(state, log, label);
    }

    // Timed effect cards.
    if (effectDef && effectDef.type && effectDef.turns) {
      // Targeted effect: enter pick mode, do not end turn yet.
      if (effectDef.needsTarget) {
        beginTargetedEffectSelection(
          state,
          {
            type: effectDef.type,
            turns: effectDef.turns,
            title: actionTitle,
            message: actionMessage || drawMessage
          },
          state.currentPlayerIndex,
          log,
          () => {
            renderEffectsPanel();
            nextPlayer();
          }
        );

        renderEffectsPanel();
        return false;
      }

      activateNonTargetedEffect(state, effectDef, log, renderEffectsPanel, addEffect, createEffect);
    }

    let actionResult = null;
    if (action) {
      actionResult = runSpecialAction(action, {
        state,
        currentPlayer: currentPlayer(),
        currentPlayerIndex: state.currentPlayerIndex,
        playerName,
        log,
        applyDrinkEvent,
        rollPenaltyCard
      });
      renderEffectsPanel();
      syncBackgroundScene(state);
    }

    if (actionResult?.choice) {
      const started = startChoiceSelection(
        actionResult.choice,
        actionTitle,
        actionMessage || drawMessage
      );
      if (started) {
        renderEffectsPanel();
        return false;
      }

      log("Card choice could not be started. Turn continues.");
      return true;
    }

    openActionScreen(actionTitle, actionMessage || drawMessage, { variant: "normal" });

    if (actionResult?.refreshCards) {
      resetCards();
      renderEffectsPanel();
    }

    if (waitsForPenaltyDeckRoll) {
      const queuedPenalty = queueManualPenaltyDraw(state, log, "Roll the Penalty Deck to continue.");
      if (queuedPenalty) {
        syncBackgroundScene(state);
      }
      return false;
    }

    return actionResult?.endTurn ?? true;
  }

  return {
    handleObjectCardDraw
  };
}
