import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDrinkFromText,
  parseGiveFromText,
  shouldTriggerPenaltyPreview,
  shouldShowActionScreenForPlainCard,
  isDrawPenaltyCardText
} from '../js/game/controller/helpers.js';

test('parseDrinkFromText parses direct drink values', () => {
  assert.deepEqual(parseDrinkFromText('Drink 3'), { scope: 'self', amount: 3 });
  assert.deepEqual(parseDrinkFromText('Drink 2, Give 1'), { scope: 'self', amount: 2 });
  assert.deepEqual(parseDrinkFromText('Take a Shot'), { scope: 'self', amount: 'Shot' });
  assert.deepEqual(parseDrinkFromText('Shotgun'), { scope: 'self', amount: 'Shotgun' });
  assert.deepEqual(parseDrinkFromText('Shot + Shotgun'), { scope: 'self', amount: 'Shot+Shotgun' });
});

test('parseDrinkFromText parses group drink values', () => {
  assert.deepEqual(parseDrinkFromText('Everybody drinks 2'), { scope: 'all', amount: 2 });
  assert.deepEqual(parseDrinkFromText('Everybody takes a Shot'), { scope: 'all', amount: 'Shot' });
  assert.deepEqual(parseDrinkFromText('Everybody take a shot + shotgun'), { scope: 'all', amount: 'Shot+Shotgun' });
});

test('parseDrinkFromText returns null for non-drink text', () => {
  assert.equal(parseDrinkFromText('Give 3'), null);
  assert.equal(parseDrinkFromText('Random text'), null);
});

test('parseGiveFromText parses give values', () => {
  assert.deepEqual(parseGiveFromText('Give 2'), { amount: 2 });
  assert.deepEqual(parseGiveFromText('Drink 1, Give 4'), { amount: 4 });
  assert.equal(parseGiveFromText('Drink 3'), null);
});

test('plain card action screen guard works for direct drink/give cards', () => {
  assert.equal(shouldShowActionScreenForPlainCard('Drink 2'), false);
  assert.equal(shouldShowActionScreenForPlainCard('Drink 2, Give 1'), false);
  assert.equal(shouldShowActionScreenForPlainCard('Draw a Penalty Card'), false);
  assert.equal(shouldShowActionScreenForPlainCard('Categories challenge starts now'), true);
});

test('isDrawPenaltyCardText matches only expected card text', () => {
  assert.equal(isDrawPenaltyCardText('Draw a Penalty Card'), true);
  assert.equal(isDrawPenaltyCardText('draw a penalty card'), true);
  assert.equal(isDrawPenaltyCardText('Draw penalty'), false);
});

test('shouldTriggerPenaltyPreview only for immediate penalty reveal instructions', () => {
  assert.equal(
    shouldTriggerPenaltyPreview(
      'Fun for whole family',
      'Roll the Penalty deck. The penalty applies to all players.',
      ''
    ),
    true
  );
  assert.equal(
    shouldTriggerPenaltyPreview(
      'Share Penalty',
      'Reveal a Penalty card now and share that same penalty with one other player.',
      ''
    ),
    true
  );
  assert.equal(
    shouldTriggerPenaltyPreview(
      'Clean Sheet Punishment',
      'If your Penalties are 0, draw a Penalty Card.',
      ''
    ),
    false
  );
  assert.equal(
    shouldTriggerPenaltyPreview(
      'Notification Curse',
      "For the next 10 rounds, 'notification' means taking a Penalty card.",
      ''
    ),
    false
  );
});
