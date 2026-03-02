import test from 'node:test';
import assert from 'node:assert/strict';

import { runSpecialAction, runSpecialChoiceAction } from '../js/game/controller/specialActions.js';
import { applyDrinkEvent } from '../js/logic/effects.js';
import { gameData } from '../js/gameData.js';

function createState() {
  return {
    players: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    effects: [],
    stats: { players: [], updatedAt: 0 }
  };
}

function createLogCollector() {
  const lines = [];
  return {
    lines,
    log: (line) => lines.push(String(line))
  };
}

function createContext(state, log) {
  return {
    state,
    currentPlayer: state.players[0],
    currentPlayerIndex: 0,
    playerName: (index) => state.players[index]?.name || `Player ${index + 1}`,
    log,
    applyDrinkEvent,
    rollPenaltyCard: () => {}
  };
}

function runChoice(choiceAction, optionId, state, log) {
  return runSpecialChoiceAction(
    choiceAction,
    optionId,
    createContext(state, log)
  );
}

test('CHAOS_BUTTON returns reusable choice action payload', () => {
  const state = createState();
  const { log } = createLogCollector();
  const result = runSpecialAction('CHAOS_BUTTON', createContext(state, log));

  assert.equal(result?.endTurn, false);
  assert.equal(result?.choice?.type, 'choice');
  assert.equal(result?.choice?.key, 'CHAOS_BUTTON');
  assert.equal(Array.isArray(result?.choice?.options), true);
  assert.equal(result.choice.options.length, 2);
});

test('CHAOS_BUTTON option everybody drinks 3 affects all players', () => {
  const state = createState();
  const { lines, log } = createLogCollector();
  const actionResult = runSpecialAction('CHAOS_BUTTON', createContext(state, log));

  const choiceResult = runSpecialChoiceAction(
    actionResult.choice,
    'everybody_drinks_3',
    createContext(state, log)
  );

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.equal(state.stats.players[1].drinksTaken, 3);
  assert.equal(state.stats.players[2].drinksTaken, 3);
  assert.ok(lines.some((line) => line.includes('Chaos Button choice: everybody drinks 3 now.')));
  assert.ok(lines.some((line) => line.includes('Everybody drinks 3.')));
});

test('CHAOS_BUTTON option drink and draw again keeps turn and refreshes cards', () => {
  const state = createState();
  const { lines, log } = createLogCollector();
  const actionResult = runSpecialAction('CHAOS_BUTTON', createContext(state, log));

  const choiceResult = runSpecialChoiceAction(
    actionResult.choice,
    'drink_1_draw_again',
    createContext(state, log)
  );

  assert.deepEqual(choiceResult, { endTurn: false, refreshCards: true });
  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.equal(state.stats.players[1].drinksTaken, 0);
  assert.equal(state.stats.players[2].drinksTaken, 0);
  assert.ok(lines.some((line) => line.includes('A keeps their turn and draws one extra card.')));
});

test('WHO_KNOWS_YOU uses Drink 3 wording in history log', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  runSpecialAction('WHO_KNOWS_YOU', createContext(state, log));

  assert.ok(lines.some((line) => line.includes('Wrong answer -> responder drinks 3.')));
  assert.ok(lines.some((line) => line.includes('Correct answer -> A drinks 3.')));
  assert.ok(!lines.some((line) => /Penalty card/i.test(line)));
});

test('CHAOS_REFERENDUM_GROUP penalty choice queues manual group penalties and keeps turn pending', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const actionResult = runSpecialAction('CHAOS_REFERENDUM_GROUP', createContext(state, log));
  const choiceResult = runSpecialChoiceAction(
    actionResult.choice,
    'everybody_penalty_card',
    createContext(state, log)
  );

  assert.deepEqual(choiceResult, { endTurn: false });
  assert.equal(state.penaltySource, 'group_pending');
  assert.equal(state.penaltyGroup?.active, true);
  assert.deepEqual(state.penaltyGroup?.queue, [0, 1, 2]);
  assert.equal(state.penaltyGroup?.cursor, 0);
  assert.ok(lines.some((line) => line.includes('Chaos Referendum: everybody takes a Penalty card.')));
});

test('PENALTY_ALL_MANUAL queues manual group penalties for all players', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const result = runSpecialAction('PENALTY_ALL_MANUAL', createContext(state, log));

  assert.deepEqual(result, { endTurn: false });
  assert.equal(state.penaltySource, 'group_pending');
  assert.equal(state.penaltyGroup?.active, true);
  assert.deepEqual(state.penaltyGroup?.queue, [0, 1, 2]);
  assert.equal(state.penaltyGroup?.cursor, 0);
  assert.ok(lines.some((line) => line.includes('Fun for whole family: everybody takes a Penalty card.')));
});

test('SHARE_PENALTY_LOCKED arms share flow and keeps turn pending', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const result = runSpecialAction('SHARE_PENALTY_LOCKED', createContext(state, log));

  assert.deepEqual(result, { endTurn: false });
  assert.equal(state.penaltySource, 'card_pending');
  assert.deepEqual(state.sharePenalty, {
    active: true,
    sourcePlayerIndex: 0,
    penalty: null
  });
  assert.ok(lines.some((line) => line.includes('Share Penalty active: roll the Penalty Deck')));
});

test('MUTUAL_DAMAGE allows self target and applies Drink 3 once', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const actionResult = runSpecialAction('MUTUAL_DAMAGE', createContext(state, log));
  const firstChoice = runSpecialChoiceAction(
    actionResult.choice,
    'you_and_target_drink_3',
    createContext(state, log)
  );
  assert.equal(firstChoice?.endTurn, false);
  assert.equal(firstChoice?.choice?.type, 'choice');

  const targetChoice = runSpecialChoiceAction(
    firstChoice.choice,
    'target_0',
    createContext(state, log)
  );

  assert.deepEqual(targetChoice, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.equal(state.stats.players[1].drinksTaken, 0);
  assert.equal(state.stats.players[2].drinksTaken, 0);
  assert.ok(lines.some((line) => line.includes('picked themselves and drinks 3')));
});

test('all configured action codes execute without throwing', () => {
  const configuredActions = Array.from(new Set([
    ...(gameData.crowdChallenge?.subcategories || []),
    ...(gameData.special?.subcategories || [])
  ].map((entry) => entry?.action).filter(Boolean)));

  assert.equal(configuredActions.length, 25);

  configuredActions.forEach((actionCode) => {
    const state = createState();
    const { log } = createLogCollector();
    assert.doesNotThrow(() => runSpecialAction(actionCode, createContext(state, log)), actionCode);
  });
});

test('EVERYBODY_DRINK_CLINK applies Drink 1 to all players', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  runSpecialAction('EVERYBODY_DRINK_CLINK', createContext(state, log));

  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.equal(state.stats.players[1].drinksTaken, 1);
  assert.equal(state.stats.players[2].drinksTaken, 1);
  assert.ok(lines.some((line) => line.includes('Everybody drinks 1 and clinks glasses.')));
});

test('DOUBLE_OR_NOTHING_D6 applies initial Drink 4 to self', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  runSpecialAction('DOUBLE_OR_NOTHING_D6', createContext(state, log));

  assert.equal(state.stats.players[0].drinksTaken, 4);
  assert.ok(lines.some((line) => line.includes('Roll a d6 manually')));
});

test('DRINK_AND_DRAW_AGAIN keeps turn and refreshes cards', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const result = runSpecialAction('DRINK_AND_DRAW_AGAIN', createContext(state, log));

  assert.deepEqual(result, { endTurn: false, refreshCards: true });
  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.ok(lines.some((line) => line.includes('keeps their turn and draws new cards')));
});

test('SELFISH_SWITCH option give_6 records give stats', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('SELFISH_SWITCH', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'give_6', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksGiven, 6);
  assert.ok(lines.some((line) => line.includes('gives 6 drinks total')));
});

test('MERCY_OR_MAYHEM target flow applies Drink 4 to selected player', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('MERCY_OR_MAYHEM', createContext(state, log));
  const firstChoice = runChoice(action.choice, 'pick_player_drinks_4', state, log);
  assert.equal(firstChoice?.endTurn, false);
  assert.equal(firstChoice?.choice?.type, 'choice');

  const targetChoice = runChoice(firstChoice.choice, 'target_2', state, log);
  assert.deepEqual(targetChoice, { endTurn: true });
  assert.equal(state.stats.players[2].drinksTaken, 4);
  assert.ok(lines.some((line) => line.includes('C drinks 4 (Mercy or Mayhem).')));
});

test('MERCY_CLAUSE everybody option applies Drink 1 to all', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('MERCY_CLAUSE', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'everybody_drinks_1', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 1);
  assert.equal(state.stats.players[1].drinksTaken, 1);
  assert.equal(state.stats.players[2].drinksTaken, 1);
  assert.ok(lines.some((line) => line.includes('Everybody drinks 1.')));
});

test('LAST_CALL_INSURANCE take_shot option applies Shot to current player', () => {
  const state = createState();
  const { log } = createLogCollector();

  const action = runSpecialAction('LAST_CALL_INSURANCE', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'take_shot', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 1);
});

test('CHAOS_REFERENDUM_GROUP everybody_drinks_5 option applies Drink 5 to all', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('CHAOS_REFERENDUM_GROUP', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'everybody_drinks_5', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 5);
  assert.equal(state.stats.players[1].drinksTaken, 5);
  assert.equal(state.stats.players[2].drinksTaken, 5);
  assert.ok(lines.some((line) => line.includes('Chaos Referendum result: everybody drinks 5.')));
});

test('PENALTY_INSURANCE draw_penalty option queues penalty roll', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('PENALTY_INSURANCE', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'draw_penalty', state, log);

  assert.deepEqual(choiceResult, { endTurn: false });
  assert.equal(state.penaltySource, 'card_pending');
  assert.ok(lines.some((line) => line.includes('Penalty Insurance: click the Penalty Deck to roll and continue.')));
});

test('DEAL_WITH_DEVIL penalty_then_give_6 queues penalty and records give', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('DEAL_WITH_DEVIL', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'penalty_then_give_6', state, log);

  assert.deepEqual(choiceResult, { endTurn: false });
  assert.equal(state.penaltySource, 'card_pending');
  assert.equal(state.stats.players[0].drinksGiven, 6);
  assert.ok(lines.some((line) => line.includes('Deal with Devil: click the Penalty Deck to roll and continue.')));
});

test('IMMUNITY_OR_SUFFER gain_immunity_drink_5 grants item when items are enabled', () => {
  const state = createState();
  state.includeItems = true;
  state.players[0].inventory = [];
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('IMMUNITY_OR_SUFFER', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'gain_immunity_drink_5', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.deepEqual(state.players[0].inventory, ['Immunity']);
  assert.equal(state.stats.players[0].drinksTaken, 5);
  assert.ok(lines.some((line) => line.includes('gained item: Immunity')));
});

test('ITEM_BUYOUT discard option falls back to Drink 3 when player has no items', () => {
  const state = createState();
  state.includeItems = true;
  state.players[0].inventory = [];
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('ITEM_BUYOUT', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'discard_1_give_8', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.equal(state.stats.players[0].drinksGiven, 0);
  assert.ok(lines.some((line) => line.includes('You have no item to discard. Drink 3 instead.')));
});

test('FINAL_OFFER drink_5_draw_again keeps turn and refreshes cards', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('FINAL_OFFER', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'drink_5_draw_again', state, log);

  assert.deepEqual(choiceResult, { endTurn: false, refreshCards: true });
  assert.equal(state.stats.players[0].drinksTaken, 5);
  assert.ok(lines.some((line) => line.includes('keeps their turn and draws one extra card')));
});

test('COLD_EXIT give_2_redraw records give and refreshes cards', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('COLD_EXIT', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'give_2_redraw', state, log);

  assert.deepEqual(choiceResult, { endTurn: false, refreshCards: true });
  assert.equal(state.stats.players[0].drinksGiven, 2);
  assert.ok(lines.some((line) => line.includes('gives 2 and redraws cards')));
});

test('ALL_IN_TAX give_3_draw_penalty queues penalty and records give', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('ALL_IN_TAX', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'give_3_draw_penalty', state, log);

  assert.deepEqual(choiceResult, { endTurn: false });
  assert.equal(state.penaltySource, 'card_pending');
  assert.equal(state.stats.players[0].drinksGiven, 3);
  assert.ok(lines.some((line) => line.includes('All-In Tax: click the Penalty Deck to roll and continue.')));
});

test('IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3 triggers only when timed effect is active', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  runSpecialAction('IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3', createContext(state, log));
  assert.ok(lines.some((line) => line.includes('no active timed effects')));
  assert.equal(state.stats.players[0], undefined);

  state.effects.push({ type: 'LEFT_HAND', remainingTurns: 2 });
  runSpecialAction('IF_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3', createContext(state, log));
  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.equal(state.stats.players[1].drinksTaken, 3);
  assert.equal(state.stats.players[2].drinksTaken, 3);
});

test('IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3 triggers only when no timed effect is active', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  state.effects.push({ type: 'LEFT_HAND', remainingTurns: 1 });
  runSpecialAction('IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3', createContext(state, log));
  assert.ok(lines.some((line) => line.includes('active timed effects found, so nothing happens')));
  assert.equal(state.stats.players[0], undefined);

  state.effects = [];
  runSpecialAction('IF_NO_ACTIVE_EFFECTS_EVERYBODY_DRINKS_3', createContext(state, log));
  assert.equal(state.stats.players[0].drinksTaken, 3);
  assert.equal(state.stats.players[1].drinksTaken, 3);
  assert.equal(state.stats.players[2].drinksTaken, 3);
});

test('COLLECTOR drinks item count when current player has most items', () => {
  const state = createState();
  state.players[0].inventory = ['Shield', 'Mirror'];
  state.players[1].inventory = ['Immunity'];
  state.players[2].inventory = [];
  const { lines, log } = createLogCollector();

  runSpecialAction('COLLECTOR', createContext(state, log));

  assert.equal(state.stats.players[0].drinksTaken, 2);
  assert.ok(lines.some((line) => line.includes('you have the most items (2). Drink 2.')));
});

test('MINIMALIST gives drinks equal to total items held by others when self has none', () => {
  const state = createState();
  state.players[0].inventory = [];
  state.players[1].inventory = ['Shield', 'Mirror'];
  state.players[2].inventory = ['Immunity'];
  const { lines, log } = createLogCollector();

  runSpecialAction('MINIMALIST', createContext(state, log));

  assert.equal(state.stats.players[0].drinksGiven, 3);
  assert.ok(lines.some((line) => line.includes('you have 0 items -> GIVE 3 drinks')));
});

test('RISKY_ROLL_D20 logs manual d20 rule text', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  runSpecialAction('RISKY_ROLL_D20', createContext(state, log));

  assert.ok(lines.some((line) => line.includes('Risky Roll (d20): roll manually now.')));
});

test('MUTUAL_DAMAGE everybody_else_drinks_1 applies only to other players', () => {
  const state = createState();
  const { lines, log } = createLogCollector();

  const action = runSpecialAction('MUTUAL_DAMAGE', createContext(state, log));
  const choiceResult = runChoice(action.choice, 'everybody_else_drinks_1', state, log);

  assert.deepEqual(choiceResult, { endTurn: true });
  assert.equal(state.stats.players[0].drinksTaken, 0);
  assert.equal(state.stats.players[1].drinksTaken, 1);
  assert.equal(state.stats.players[2].drinksTaken, 1);
  assert.ok(lines.some((line) => line.includes('Everybody else drinks 1.')));
});
