export const DEFAULT_CHOICE_SELECTION = Object.freeze({
  active: false,
  pending: null
});

export const DEFAULT_EFFECT_SELECTION = Object.freeze({
  active: false,
  pending: null,
  cleanup: null,
  ui: null
});

export const FLOW_PHASES = Object.freeze({
  IDLE: 'idle',
  CHOICE_SELECTION: 'choice_selection',
  EFFECT_SELECTION: 'effect_selection',
  PENALTY_PENDING_CARD: 'penalty_pending_card',
  PENALTY_PENDING_GROUP: 'penalty_pending_group',
  PENALTY_OPEN_DECK: 'penalty_open_deck',
  PENALTY_OPEN_CARD: 'penalty_open_card',
  PENALTY_OPEN_GROUP: 'penalty_open_group',
  PENALTY_OPEN_REDRAW: 'penalty_open_redraw',
  PENALTY_OPEN_REDRAW_HOLD: 'penalty_open_redraw_hold'
});

export const PENALTY_SOURCES = Object.freeze({
  DECK: 'deck',
  CARD: 'card',
  CARD_PENDING: 'card_pending',
  GROUP: 'group',
  GROUP_PENDING: 'group_pending',
  REDRAW: 'redraw',
  REDRAW_HOLD: 'redraw_hold'
});

export const FLOW_TRANSITIONS = Object.freeze({
  START_CHOICE: 'START_CHOICE',
  CLEAR_CHOICE: 'CLEAR_CHOICE',
  START_EFFECT: 'START_EFFECT',
  CLEAR_EFFECT: 'CLEAR_EFFECT',
  QUEUE_CARD_PENALTY: 'QUEUE_CARD_PENALTY',
  QUEUE_GROUP_PENALTY: 'QUEUE_GROUP_PENALTY',
  SHOW_DECK_PENALTY: 'SHOW_DECK_PENALTY',
  SHOW_CARD_PENALTY: 'SHOW_CARD_PENALTY',
  SHOW_GROUP_PENALTY: 'SHOW_GROUP_PENALTY',
  SHOW_REDRAW_PENALTY: 'SHOW_REDRAW_PENALTY',
  SHOW_REDRAW_HOLD_PENALTY: 'SHOW_REDRAW_HOLD_PENALTY',
  HIDE_PENALTY: 'HIDE_PENALTY',
  CLEAR_PENDING_PENALTY: 'CLEAR_PENDING_PENALTY',
  RESUME_GROUP_PENDING: 'RESUME_GROUP_PENDING'
});
