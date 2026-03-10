import {
  FLOW_PHASES,
  FLOW_TRANSITIONS,
  PENALTY_SOURCES
} from './flowMachine.constants.js';
import {
  createChoiceSelection,
  createEffectSelection,
  syncFlowPhase
} from './flowMachine.state.js';

const TRANSITION_TABLE = Object.freeze({
  [FLOW_PHASES.IDLE]: Object.freeze({
    [FLOW_TRANSITIONS.START_CHOICE]: FLOW_PHASES.CHOICE_SELECTION,
    [FLOW_TRANSITIONS.START_EFFECT]: FLOW_PHASES.EFFECT_SELECTION,
    [FLOW_TRANSITIONS.QUEUE_CARD_PENALTY]: FLOW_PHASES.PENALTY_PENDING_CARD,
    [FLOW_TRANSITIONS.QUEUE_GROUP_PENALTY]: FLOW_PHASES.PENALTY_PENDING_GROUP,
    [FLOW_TRANSITIONS.SHOW_DECK_PENALTY]: FLOW_PHASES.PENALTY_OPEN_DECK,
    [FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY]: FLOW_PHASES.PENALTY_OPEN_REDRAW,
    [FLOW_TRANSITIONS.SHOW_REDRAW_HOLD_PENALTY]: FLOW_PHASES.PENALTY_OPEN_REDRAW_HOLD,
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.CHOICE_SELECTION]: Object.freeze({
    [FLOW_TRANSITIONS.CLEAR_CHOICE]: FLOW_PHASES.IDLE,
    [FLOW_TRANSITIONS.QUEUE_CARD_PENALTY]: FLOW_PHASES.PENALTY_PENDING_CARD,
    [FLOW_TRANSITIONS.QUEUE_GROUP_PENALTY]: FLOW_PHASES.PENALTY_PENDING_GROUP
  }),
  [FLOW_PHASES.EFFECT_SELECTION]: Object.freeze({
    [FLOW_TRANSITIONS.CLEAR_EFFECT]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.PENALTY_PENDING_CARD]: Object.freeze({
    [FLOW_TRANSITIONS.SHOW_CARD_PENALTY]: FLOW_PHASES.PENALTY_OPEN_CARD,
    [FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY]: FLOW_PHASES.IDLE,
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.PENALTY_PENDING_GROUP]: Object.freeze({
    [FLOW_TRANSITIONS.SHOW_GROUP_PENALTY]: FLOW_PHASES.PENALTY_OPEN_GROUP,
    [FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY]: FLOW_PHASES.IDLE,
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.PENALTY_OPEN_DECK]: Object.freeze({
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.PENALTY_OPEN_CARD]: Object.freeze({
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.PENALTY_OPEN_GROUP]: Object.freeze({
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE,
    [FLOW_TRANSITIONS.RESUME_GROUP_PENDING]: FLOW_PHASES.PENALTY_PENDING_GROUP
  }),
  [FLOW_PHASES.PENALTY_OPEN_REDRAW]: Object.freeze({
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  }),
  [FLOW_PHASES.PENALTY_OPEN_REDRAW_HOLD]: Object.freeze({
    [FLOW_TRANSITIONS.HIDE_PENALTY]: FLOW_PHASES.IDLE
  })
});

const SHOW_PENALTY_SOURCE_BY_ACTION = Object.freeze({
  [FLOW_TRANSITIONS.SHOW_DECK_PENALTY]: PENALTY_SOURCES.DECK,
  [FLOW_TRANSITIONS.SHOW_CARD_PENALTY]: PENALTY_SOURCES.CARD,
  [FLOW_TRANSITIONS.SHOW_GROUP_PENALTY]: PENALTY_SOURCES.GROUP,
  [FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY]: PENALTY_SOURCES.REDRAW,
  [FLOW_TRANSITIONS.SHOW_REDRAW_HOLD_PENALTY]: PENALTY_SOURCES.REDRAW_HOLD
});

function blockedTransition(action, fromPhase, reason) {
  return {
    ok: false,
    action,
    from: fromPhase,
    to: fromPhase,
    reason
  };
}

function okTransition(action, fromPhase, toPhase) {
  return {
    ok: true,
    action,
    from: fromPhase,
    to: toPhase
  };
}

function commitTransition(state, result) {
  state.flow.phase = result.to;
  state.flow.lastTransition = {
    action: result.action,
    ok: result.ok,
    from: result.from,
    to: result.to,
    reason: result.reason || null,
    at: Date.now()
  };
  return result;
}

function applyTransition(state, action, guard = null) {
  const fromPhase = syncFlowPhase(state);
  const toPhase = TRANSITION_TABLE[fromPhase]?.[action];
  if (!toPhase) {
    return commitTransition(
      state,
      blockedTransition(action, fromPhase, `Transition "${action}" is not allowed from "${fromPhase}".`)
    );
  }

  if (guard) {
    const guardResult = guard();
    if (!guardResult.ok) {
      return commitTransition(
        state,
        blockedTransition(action, fromPhase, guardResult.reason || `Guard blocked transition "${action}".`)
      );
    }
  }

  return commitTransition(state, okTransition(action, fromPhase, toPhase));
}

function guardOk() {
  return { ok: true };
}

function guardFail(reason) {
  return { ok: false, reason };
}

function normalizePendingChoice(pendingChoice) {
  if (!pendingChoice || typeof pendingChoice !== 'object') return null;
  if (pendingChoice.type !== 'choice' && pendingChoice.type !== 'share_penalty_target') return null;
  return pendingChoice;
}

function defaultPenaltyTargetIndex(state) {
  return Number.isInteger(state?.currentPlayerIndex) ? state.currentPlayerIndex : null;
}

export function transitionFlow(state, action, payload = {}) {
  switch (action) {
    case FLOW_TRANSITIONS.START_CHOICE: {
      const pendingChoice = normalizePendingChoice(payload.pendingChoice);
      const result = applyTransition(state, action, () => (
        pendingChoice ? guardOk() : guardFail('Choice transition requires a valid pending choice payload.')
      ));
      if (!result.ok) return result;
      state.choiceSelection = {
        active: true,
        pending: pendingChoice
      };
      return result;
    }
    case FLOW_TRANSITIONS.CLEAR_CHOICE: {
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      state.choiceSelection = createChoiceSelection();
      return result;
    }
    case FLOW_TRANSITIONS.START_EFFECT: {
      const hasPending = payload.pendingEffect && typeof payload.pendingEffect === 'object';
      const result = applyTransition(state, action, () => (
        hasPending ? guardOk() : guardFail('Effect transition requires a pending effect payload.')
      ));
      if (!result.ok) return result;
      state.effectSelection = {
        active: true,
        pending: payload.pendingEffect,
        cleanup: payload.cleanup ?? null,
        ui: payload.ui ?? null
      };
      return result;
    }
    case FLOW_TRANSITIONS.CLEAR_EFFECT: {
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      state.effectSelection = createEffectSelection();
      return result;
    }
    case FLOW_TRANSITIONS.QUEUE_CARD_PENALTY: {
      const targetPlayerIndex = Number.isInteger(payload.targetPlayerIndex)
        ? payload.targetPlayerIndex
        : defaultPenaltyTargetIndex(state);
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      if (result.from === FLOW_PHASES.CHOICE_SELECTION) {
        state.choiceSelection = createChoiceSelection();
      }
      state.penaltySource = PENALTY_SOURCES.CARD_PENDING;
      state.penaltyRollPlayerIndex = targetPlayerIndex;
      state.penaltyHintShown = false;
      return result;
    }
    case FLOW_TRANSITIONS.QUEUE_GROUP_PENALTY: {
      const queue = Array.isArray(payload.queue) ? payload.queue.slice() : [];
      const cursor = Number.isInteger(payload.cursor) && payload.cursor >= 0 ? payload.cursor : 0;
      const originPlayerIndex = Number.isInteger(payload.originPlayerIndex)
        ? payload.originPlayerIndex
        : defaultPenaltyTargetIndex(state);
      const result = applyTransition(state, action, () => (
        queue.length > 0 ? guardOk() : guardFail('Group penalty transition requires a non-empty queue.')
      ));
      if (!result.ok) return result;
      if (result.from === FLOW_PHASES.CHOICE_SELECTION) {
        state.choiceSelection = createChoiceSelection();
      }
      state.penaltyGroup = {
        active: true,
        queue,
        cursor,
        originPlayerIndex
      };
      state.penaltyRollPlayerIndex = null;
      state.penaltySource = PENALTY_SOURCES.GROUP_PENDING;
      state.penaltyHintShown = false;
      return result;
    }
    case FLOW_TRANSITIONS.SHOW_DECK_PENALTY:
    case FLOW_TRANSITIONS.SHOW_CARD_PENALTY:
    case FLOW_TRANSITIONS.SHOW_GROUP_PENALTY:
    case FLOW_TRANSITIONS.SHOW_REDRAW_PENALTY:
    case FLOW_TRANSITIONS.SHOW_REDRAW_HOLD_PENALTY: {
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      state.penaltyShown = true;
      state.penaltyConfirmArmed = true;
      state.penaltySource = SHOW_PENALTY_SOURCE_BY_ACTION[action];
      if (Object.prototype.hasOwnProperty.call(payload, 'rollPlayerIndex')) {
        state.penaltyRollPlayerIndex = Number.isInteger(payload.rollPlayerIndex)
          ? payload.rollPlayerIndex
          : null;
      }
      state.penaltyHintShown = false;
      return result;
    }
    case FLOW_TRANSITIONS.CLEAR_PENDING_PENALTY: {
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      state.penaltySource = null;
      state.penaltyHintShown = false;
      state.penaltyRollPlayerIndex = null;
      return result;
    }
    case FLOW_TRANSITIONS.RESUME_GROUP_PENDING: {
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      state.penaltyShown = false;
      state.penaltyConfirmArmed = false;
      state.penaltyCard = null;
      state.penaltySource = PENALTY_SOURCES.GROUP_PENDING;
      state.penaltyHintShown = false;
      state.penaltyRollPlayerIndex = null;
      return result;
    }
    case FLOW_TRANSITIONS.HIDE_PENALTY: {
      const result = applyTransition(state, action);
      if (!result.ok) return result;
      state.penaltyShown = false;
      state.penaltyCard = null;
      state.penaltyConfirmArmed = false;
      state.penaltySource = null;
      state.penaltyHintShown = false;
      state.penaltyRollPlayerIndex = null;
      return result;
    }
    default:
      return commitTransition(
        state,
        blockedTransition(action, syncFlowPhase(state), `Unknown flow transition "${action}".`)
      );
  }
}
