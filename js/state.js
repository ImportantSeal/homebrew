import { gameData } from './gameData.js';

function createEffectSelectionState() {
  return {
    active: false,
    pending: null,
    cleanup: null
  };
}

function createMirrorState() {
  return {
    active: false,
    sourceIndex: null,
    selectedCardIndex: null,
    parentName: '',
    subName: '',
    subInstruction: '',
    displayText: ''
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

    // Penalty deck: 1st click reveals, 2nd click confirms + ends turn
    penaltyConfirmArmed: false,

    // why penalty is currently shown (affects behavior)
    // 'deck' | 'card' | 'redraw' | 'redraw_hold' | null
    penaltySource: null,

    // prevent log spam when player clicks cards while penalty must be confirmed
    penaltyHintShown: false,

    // Ditto: pending effect per card index
    dittoPending: [null, null, null],

    // timed effects
    // Each effect: { id, type, remainingTurns, sourceIndex?, targetIndex?, createdBy? }
    effects: [],

    // when an effect needs a target pick
    effectSelection: createEffectSelectionState(),

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

    mirror: createMirrorState()
  };
}

export const state = createInitialState();
