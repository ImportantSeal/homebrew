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

function createPlayerState(player = {}, index = 0) {
  const normalizedName = typeof player?.name === 'string' ? player.name.trim() : '';
  const normalizedColor = typeof player?.color === 'string' ? player.color.trim() : '';

  const nextPlayer = {
    name: normalizedName || `Player ${index + 1}`,
    inventory: []
  };

  if (normalizedColor) {
    nextPlayer.color = normalizedColor;
  }

  return nextPlayer;
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

    // Share Penalty flow: keep rolled penalty until one extra target is picked
    // { active: true, sourcePlayerIndex, penalty } | null
    sharePenalty: null,

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
    historyEntryCount: 0,
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

export function resetStateForNewGame(stateObj, options = {}) {
  if (!stateObj || typeof stateObj !== 'object') return createInitialState();

  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(options, key);
  const freshState = createInitialState();
  const sourcePlayers = hasOwn('players') ? options.players : stateObj.players;
  const includeItems = hasOwn('includeItems') ? options.includeItems : stateObj.includeItems;
  const rng = hasOwn('rng') ? options.rng : stateObj.rng;

  const players = Array.isArray(sourcePlayers)
    ? sourcePlayers.map((player, index) => createPlayerState(player, index))
    : [];

  Object.keys(stateObj).forEach((key) => {
    delete stateObj[key];
  });

  Object.assign(stateObj, freshState, {
    players,
    includeItems: Boolean(includeItems)
  });

  if (rng !== undefined) {
    stateObj.rng = rng;
  }

  return stateObj;
}
