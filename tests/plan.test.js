import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, SESSIONS, getSession, liftExercises, exerciseInfo, resolveOption } from '../js/plan.js';
import { FIELDS } from '../js/logic.js';

const allRows = () => SESSIONS.flatMap((s) => s.rows);
const row = (id) => allRows().find((r) => r.id === id);

test('five weekday sessions with their fixed sessions', () => {
  assert.deepEqual(SESSIONS.map((s) => s.id), ['mon', 'tue', 'wed', 'thu', 'fri']);
  assert.deepEqual(SESSIONS.map((s) => s.fixed), ['Vault', 'Sprint', 'Active recovery', 'Vault', 'Sprint']);
  assert.deepEqual(SESSIONS.map((s) => s.weekday), [1, 2, 3, 4, 5]);
  assert.equal(getSession('thu').fixed, 'Vault');
  assert.equal(getSession('sat'), undefined);
});

test('every row is well formed for every phase', () => {
  const ids = allRows().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'row ids unique');
  for (const r of allRows()) {
    assert.ok(r.options.length > 0, `${r.id} has options`);
    for (const p of PHASES) {
      assert.ok(typeof r.target[p] === 'string' && r.target[p].length > 0, `${r.id} target ${p}`);
      assert.ok(Number.isInteger(r.sets[p]) && r.sets[p] >= 0, `${r.id} sets ${p}`);
    }
    for (const o of r.options) assert.ok(o.type in FIELDS, `${r.id} ${o.exerciseId} type`);
  }
});

test('every % target references a known max', () => {
  const known = new Set(liftExercises().map((e) => e.exerciseId));
  for (const r of allRows()) {
    for (const p of PHASES) {
      if (r.pct?.[p]) assert.ok(known.has(r.maxRef?.[p]), `${r.id} ${p} maxRef`);
    }
  }
});

test('spot checks against the written plan', () => {
  const squat = row('fri-3');
  assert.equal(squat.options[0].exerciseId, 'back-squat');
  assert.equal(squat.target.GP, '4 × 5 at 75–80%');
  assert.deepEqual(squat.pct.GP, { lo: 75, hi: 80 });
  assert.equal(squat.maxRef.GP, 'back-squat');
  assert.equal(squat.maxRef.SP, 'partial-squat');

  const clean = row('tue-3');
  assert.equal(clean.options[0].exerciseId, 'power-clean');
  assert.deepEqual(clean.pct.SP, { lo: 75, hi: 85 });

  const jump = row('tue-4');
  assert.equal(jump.maxRef.GP, 'back-squat');
  assert.equal(jump.pct.GP.hi, 30);

  assert.equal(row('mon-1').options[0].type, 'iso');
  assert.deepEqual(row('fri-4').options.map((o) => o.exerciseId),
    ['romanian-deadlift', 'single-leg-rdl', 'trap-bar-deadlift']);
});

test('exercise identity across days', () => {
  assert.equal(row('mon-3').options[0].exerciseId, 'db-bench-flat');
  assert.equal(row('thu-4').options[0].exerciseId, 'db-bench-thu');
  assert.equal(row('tue-6').options[0].exerciseId, 'nordic-curl');
  assert.equal(row('fri-5').options[0].exerciseId, 'nordic-curl');
});

test('exerciseInfo finds name and type by id', () => {
  assert.deepEqual(exerciseInfo('single-leg-rdl'), { name: 'Single-leg RDL', type: 'lift' });
  assert.deepEqual(exerciseInfo('main-plyos'), { name: 'Main plyometrics', type: 'plyo' });
  assert.equal(exerciseInfo('nope'), undefined);
});

test('liftExercises lists unique lifts plus the partial squat', () => {
  const ids = liftExercises().map((e) => e.exerciseId);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['back-squat', 'power-clean', 'partial-squat', 'db-bench-flat']) assert.ok(ids.includes(id), id);
});

test('resolveOption: logged sets win, otherwise the remembered choice, otherwise the first option', () => {
  const r = SESSIONS.find((s) => s.id === 'fri').rows.find((x) => x.id === 'fri-4');
  assert.equal(resolveOption(r, undefined, undefined).exerciseId, 'romanian-deadlift');
  assert.equal(resolveOption(r, undefined, 'trap-bar-deadlift').exerciseId, 'trap-bar-deadlift');
  const withSets = { exerciseId: 'single-leg-rdl', sets: [{ weight: 50, reps: 6 }] };
  assert.equal(resolveOption(r, withSets, 'trap-bar-deadlift').exerciseId, 'single-leg-rdl');
  const emptied = { exerciseId: 'romanian-deadlift', sets: [] };
  assert.equal(resolveOption(r, emptied, 'trap-bar-deadlift').exerciseId, 'trap-bar-deadlift');
  assert.equal(resolveOption(r, undefined, 'not-an-option').exerciseId, 'romanian-deadlift');
});
