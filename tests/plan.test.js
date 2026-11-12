import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROGRAMS, PROGRAM_IDS, PHASE_NAMES, getProgram, getSession, defaultSessionId, rowsFor, planFor,
  liftExercises, exerciseInfo, resolveOption,
} from '../js/plan.js';
import { FIELDS } from '../js/logic.js';

const VAULT = PROGRAMS.vault.sessions;
const SPRINT = PROGRAMS.sprint.sessions;
const allRows = () => PROGRAM_IDS.flatMap((p) => PROGRAMS[p].sessions.flatMap((s) => s.rows));
const row = (id) => allRows().find((r) => r.id === id);
const opt = (r, exerciseId) => r.options.find((o) => o.exerciseId === exerciseId);

test('two programs, each with its own phases', () => {
  assert.deepEqual(PROGRAM_IDS, ['vault', 'sprint']);
  assert.deepEqual(PROGRAMS.vault.phases, ['GP', 'SP', 'C']);
  assert.deepEqual(PROGRAMS.sprint.phases, ['GP', 'MS', 'PW', 'C']);
  for (const p of PROGRAM_IDS) {
    for (const ph of PROGRAMS[p].phases) assert.ok(PHASE_NAMES[ph], `${p} ${ph} has a name`);
  }
  assert.equal(getProgram('sprint').name, '100–800 m runner');
  assert.equal(getProgram('nope'), undefined);
});

test('pole vault keeps its five weekday sessions', () => {
  assert.deepEqual(VAULT.map((s) => s.id), ['mon', 'tue', 'wed', 'thu', 'fri']);
  assert.deepEqual(VAULT.map((s) => s.fixed), ['Vault', 'Sprint', 'Active recovery', 'Vault', 'Sprint']);
  assert.deepEqual(VAULT.map((s) => s.weekday), [1, 2, 3, 4, 5]);
  assert.equal(getSession('thu').fixed, 'Vault');
  assert.equal(getSession('sat'), undefined);
});

test('runner lifts Monday, Tuesday, Thursday and Friday', () => {
  assert.deepEqual(SPRINT.map((s) => s.id), ['r-mon', 'r-tue', 'r-thu', 'r-fri']);
  assert.deepEqual(SPRINT.map((s) => s.weekday), [1, 2, 4, 5]);
  assert.equal(getSession('r-tue').title, 'Upper A');
});

test('defaultSessionId follows the program', () => {
  assert.equal(defaultSessionId('vault', '2026-10-26'), 'mon');
  assert.equal(defaultSessionId('vault', '2026-10-28'), 'wed');
  assert.equal(defaultSessionId('vault', '2026-10-31'), null);
  assert.equal(defaultSessionId('sprint', '2026-10-26'), 'r-mon');
  assert.equal(defaultSessionId('sprint', '2026-10-28'), null);
  assert.equal(defaultSessionId('sprint', '2026-10-30'), 'r-fri');
  assert.equal(defaultSessionId('sprint', '2026-11-01'), null);
});

test('session and row ids are unique across both programs', () => {
  const sessionIds = PROGRAM_IDS.flatMap((p) => PROGRAMS[p].sessions.map((s) => s.id));
  assert.equal(new Set(sessionIds).size, sessionIds.length);
  const rowIds = allRows().map((r) => r.id);
  assert.equal(new Set(rowIds).size, rowIds.length);
});

test('every row and option is well formed in every phase it appears', () => {
  for (const p of PROGRAM_IDS) {
    const known = new Set(liftExercises(p).map((e) => e.exerciseId));
    for (const s of PROGRAMS[p].sessions) {
      for (const ph of PROGRAMS[p].phases) {
        for (const r of rowsFor(s, ph)) {
          assert.ok(r.options.length > 0, `${r.id} has options`);
          for (const o of r.options) {
            const plan = planFor(r, o, ph);
            const where = `${p} ${r.id} ${o.exerciseId} ${ph}`;
            assert.ok(o.type in FIELDS, `${where} type`);
            assert.ok(typeof plan.target === 'string' && plan.target.length > 0, `${where} target`);
            assert.ok(Number.isInteger(plan.sets) && plan.sets >= 0, `${where} sets`);
            if (plan.pct) assert.ok(known.has(plan.maxRef), `${where} maxRef`);
          }
        }
      }
    }
  }
});

test('rowsFor hides rows outside their phases', () => {
  const mon = getSession('r-mon');
  const ids = (ph) => rowsFor(mon, ph).map((r) => r.options[0].exerciseId);
  assert.ok(ids('GP').includes('back-squat'));
  assert.ok(!ids('GP').includes('partial-squat'));
  assert.ok(ids('C').includes('partial-squat'));
  assert.ok(!ids('C').includes('back-squat'));
  assert.equal(rowsFor(getSession('fri'), 'SP').length, getSession('fri').rows.length, 'vault rows show in every phase');
});

test('runner spot checks against the written plan', () => {
  const squat = row('r-mon-2a');
  const sq = planFor(squat, squat.options[0], 'GP');
  assert.equal(sq.target, '5 × 5 at 65–75%');
  assert.deepEqual(sq.pct, { lo: 65, hi: 75 });
  assert.equal(sq.maxRef, 'back-squat');
  assert.equal(sq.sets, 5);

  const half = row('r-mon-2b');
  assert.equal(planFor(half, half.options[0], 'PW').maxRef, 'partial-squat');

  const bench = row('r-tue-1');
  assert.equal(planFor(bench, opt(bench, 'bench-press'), 'C').maxRef, 'bench-press');
  assert.equal(planFor(bench, opt(bench, 'db-bench'), 'C').pct, undefined, 'dumbbell bench has no % target');

  const jump = row('r-fri-1');
  assert.deepEqual(planFor(jump, opt(jump, 'jump-squat'), 'GP').pct, { lo: 25, hi: 30 });
  assert.equal(planFor(jump, opt(jump, 'jump-squat'), 'GP').maxRef, 'back-squat');
});

test('an option can override the row targets', () => {
  const clean = row('r-mon-1');
  const hang = planFor(clean, opt(clean, 'hang-power-clean'), 'MS');
  const pull = planFor(clean, opt(clean, 'clean-pull'), 'MS');
  assert.deepEqual(hang.pct, { lo: 75, hi: 85 });
  assert.deepEqual(pull.pct, { lo: 90, hi: 100 });
  assert.notEqual(hang.target, pull.target);
});

test('vault spot checks against the written plan', () => {
  const squat = row('fri-3');
  const at = (ph) => planFor(squat, squat.options[0], ph);
  assert.equal(squat.options[0].exerciseId, 'back-squat');
  assert.equal(at('GP').target, '4 × 5 at 75–80%');
  assert.deepEqual(at('GP').pct, { lo: 75, hi: 80 });
  assert.equal(at('GP').maxRef, 'back-squat');
  assert.equal(at('SP').maxRef, 'partial-squat');

  const clean = row('tue-3');
  assert.equal(clean.options[0].exerciseId, 'power-clean');
  assert.deepEqual(planFor(clean, clean.options[0], 'SP').pct, { lo: 75, hi: 85 });

  const jump = row('tue-4');
  assert.equal(planFor(jump, jump.options[0], 'GP').maxRef, 'back-squat');
  assert.equal(planFor(jump, jump.options[0], 'GP').pct.hi, 30);

  assert.equal(row('mon-1').options[0].type, 'iso');
  assert.deepEqual(row('fri-4').options.map((o) => o.exerciseId),
    ['romanian-deadlift', 'single-leg-rdl', 'trap-bar-deadlift']);
  const rope = row('thu-3');
  assert.equal(planFor(rope, opt(rope, 'rope-climb'), 'GP').sets, 1);
  assert.equal(planFor(rope, opt(rope, 'eccentric-chin-up'), 'GP').sets, 3);
});

test('exercise identity across days', () => {
  assert.equal(row('mon-3').options[0].exerciseId, 'db-bench-flat');
  assert.equal(row('thu-4').options[0].exerciseId, 'db-bench-thu');
  assert.equal(row('tue-6').options[0].exerciseId, 'nordic-curl');
  assert.equal(row('fri-5').options[0].exerciseId, 'nordic-curl');
  assert.equal(row('r-mon-4').options[0].exerciseId, 'nordic-curl');
});

test('exerciseInfo finds name and type by id in either program', () => {
  assert.deepEqual(exerciseInfo('single-leg-rdl'), { name: 'Single-leg RDL', type: 'lift' });
  assert.deepEqual(exerciseInfo('main-plyos'), { name: 'Main plyometrics', type: 'plyo' });
  assert.deepEqual(exerciseInfo('copenhagen-adduction'), { name: 'Copenhagen adduction', type: 'reps' });
  assert.equal(exerciseInfo('nope'), undefined);
});

test('liftExercises lists each program\'s lifts plus the half squat', () => {
  const vault = liftExercises('vault').map((e) => e.exerciseId);
  assert.equal(new Set(vault).size, vault.length);
  for (const id of ['back-squat', 'power-clean', 'partial-squat', 'db-bench-flat']) assert.ok(vault.includes(id), id);
  const sprint = liftExercises('sprint').map((e) => e.exerciseId);
  for (const id of ['back-squat', 'partial-squat', 'power-clean', 'bench-press']) assert.ok(sprint.includes(id), id);
  assert.ok(!sprint.includes('db-bench-flat'), 'vault-only lifts are not listed for runners');
  for (const p of PROGRAM_IDS) {
    for (const id of PROGRAMS[p].keyMaxes) assert.ok(liftExercises(p).some((e) => e.exerciseId === id), `${p} key max ${id}`);
  }
});

test('resolveOption: logged sets win, otherwise the remembered choice, otherwise the first option', () => {
  const r = row('fri-4');
  assert.equal(resolveOption(r, undefined, undefined).exerciseId, 'romanian-deadlift');
  assert.equal(resolveOption(r, undefined, 'trap-bar-deadlift').exerciseId, 'trap-bar-deadlift');
  const withSets = { exerciseId: 'single-leg-rdl', sets: [{ weight: 50, reps: 6 }] };
  assert.equal(resolveOption(r, withSets, 'trap-bar-deadlift').exerciseId, 'single-leg-rdl');
  const emptied = { exerciseId: 'romanian-deadlift', sets: [] };
  assert.equal(resolveOption(r, emptied, 'trap-bar-deadlift').exerciseId, 'trap-bar-deadlift');
  assert.equal(resolveOption(r, undefined, 'not-an-option').exerciseId, 'romanian-deadlift');
});
