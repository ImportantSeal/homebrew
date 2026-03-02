import { gameData } from './gameData.js';
import { createMirrorState } from './logic/mirror.js';

function createEffectSelectionState() {
  return {
    active: false,
    pending: null,
    cleanup: null
  };
}

function createChoiceSelectionState() {
  return {
    active: false,
    pending: null
  };
}

export function createInitialState() {
  return {
    players: [],
    includeItems: false,
    currentPlayerIndex: 0,
    bags: {},

    // UI / flow guards
    uiLocked: false,
    historyLogKind: null,
    backgroundScene: 'normal',

    // Penalty deck: 1st click reveals, 2nd click confirms (+ ends turn unless reset manually)
    penaltyConfirmArmed: false,

    // why penalty is currently shown (affects behavior)
    // 'deck' | 'card' | 'card_pending' | 'group' | 'group_pending' | 'redraw' | 'redraw_hold' | null
    penaltySource: null,

    // prevent log spam when player clicks cards while penalty must be confirmed
    penaltyHintShown: false,

    // which player the currently shown penalty belongs to
    penaltyRollPlayerIndex: null,

    // manual group-penalty queue (everyone/selected players roll one by one)
    penaltyGroup: null,

    // Ditto: pending effect per card index
    dittoPending: [null, null, null],

    // timed effects
    // Each effect: { id, type, remainingTurns, sourceIndex?, targetIndex?, createdBy? }
    effects: [],

    // when an effect needs a target pick
    effectSelection: createEffectSelectionState(),

    // when a card action needs a forced option pick
    choiceSelection: createChoiceSelectionState(),

    // static game data
    ...gameData,

    // game-runtime state
    currentCards: [],
    revealed: [true, true, true],
    dittoActive: [false, false, false],
    hiddenIndex: null,
    redrawUsed: false,
    cardHistory: [],
    penaltyCard: null,
    penaltyShown: false,
    stats: {
      players: [],
      updatedAt: 0
    },

    mirror: createMirrorState()
  };
}

export const state = createInitialState();
