import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayISO, isVaultDay, weekdayOf, round5,
  targetWeightText, parseNum, addDaysISO, FIELDS, formatSet, formatDate,
} from '../js/logic.js';

test('formatSet per exercise type', () => {
  assert.equal(formatSet('lift', { weight: 185, reps: 5 }), '185 lb × 5');
  assert.equal(formatSet('lift', { weight: null, reps: 8 }), '× 8');
  assert.equal(formatSet('iso', { reps: 3, seconds: 3 }), '3 × 3 s');
  assert.equal(formatSet('plyo', { drill: 'hurdle hops', contacts: 20 }), 'hurdle hops · 20 contacts');
  assert.equal(formatSet('plyo', { drill: '', contacts: 20 }), '20 contacts');
  assert.equal(formatSet('reps', { reps: 6 }), '6 reps');
  assert.equal(formatSet('hold', { seconds: 30 }), '30 s');
  assert.equal(formatSet('count', { count: 4 }), '4');
  assert.equal(formatSet('done', { minutes: 8 }), 'Done · 8 min');
  assert.equal(formatSet('done', { minutes: null }), 'Done');
});

test('formatDate is short and local', () => {
  assert.equal(formatDate('2026-10-30'), 'Fri, Oct 30');
});

test('todayISO uses local date', () => {
  assert.equal(todayISO(new Date(2026, 9, 27, 23, 30)), '2026-10-27');
  assert.equal(todayISO(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
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

test('weekdayOf gives the local day number', () => {
  assert.equal(weekdayOf('2026-10-26'), 1);
  assert.equal(weekdayOf('2026-11-01'), 0);
});
