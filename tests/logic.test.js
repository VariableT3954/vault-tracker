import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayISO, defaultSessionId, isVaultDay, round5,
  targetWeightText, parseNum, addDaysISO, FIELDS,
} from '../js/logic.js';

test('todayISO uses local date', () => {
  assert.equal(todayISO(new Date(2026, 9, 27, 23, 30)), '2026-10-27');
  assert.equal(todayISO(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('defaultSessionId maps weekdays to sessions', () => {
  assert.equal(defaultSessionId('2026-10-26'), 'mon');
  assert.equal(defaultSessionId('2026-10-27'), 'tue');
  assert.equal(defaultSessionId('2026-10-28'), 'wed');
  assert.equal(defaultSessionId('2026-10-29'), 'thu');
  assert.equal(defaultSessionId('2026-10-30'), 'fri');
  assert.equal(defaultSessionId('2026-10-31'), null);
  assert.equal(defaultSessionId('2026-11-01'), null);
});

test('isVaultDay is Monday and Thursday', () => {
  assert.equal(isVaultDay('2026-10-26'), true);
  assert.equal(isVaultDay('2026-10-29'), true);
  assert.equal(isVaultDay('2026-10-27'), false);
});

test('round5 rounds to nearest 5', () => {
  assert.equal(round5(187.4), 185);
  assert.equal(round5(187.5), 190);
});

test('targetWeightText', () => {
  assert.equal(targetWeightText({ lo: 75, hi: 80 }, 250), '190–200 lb');
  assert.equal(targetWeightText({ lo: null, hi: 30 }, 300), '≤ 90 lb');
  assert.equal(targetWeightText({ lo: 75, hi: 80 }, undefined), null);
  assert.equal(targetWeightText(undefined, 250), null);
});

test('parseNum', () => {
  assert.equal(parseNum('102.5'), 102.5);
  assert.equal(parseNum(' 95 '), 95);
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('abc'), null);
  assert.equal(parseNum('-5'), null);
});

test('addDaysISO crosses month boundaries', () => {
  assert.equal(addDaysISO('2026-10-31', 1), '2026-11-01');
});

test('FIELDS per exercise type', () => {
  assert.deepEqual(FIELDS.lift, ['weight', 'reps']);
  assert.deepEqual(FIELDS.plyo, ['drill', 'contacts']);
  assert.deepEqual(Object.keys(FIELDS).sort(), ['count', 'done', 'hold', 'iso', 'lift', 'plyo', 'reps']);
});
