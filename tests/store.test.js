import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY } from '../js/store.js';

function memStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

function clock(y, m, d, h = 17) {
  const c = { now: new Date(y, m - 1, d, h) };
  c.fn = () => c.now;
  return c;
}

const sq = (weight, reps) => ({ weight, reps });

test('restores in-progress workout from storage', () => {
  const storage = memStorage();
  const c = clock(2026, 10, 30);
  const a = createStore(storage, c.fn);
  a.startWorkout('fri');
  a.logSet('fri-3', 'back-squat', sq(185, 5));
  a.logSet('fri-3', 'back-squat', sq(195, 5));
  const b = createStore(storage, c.fn);
  assert.equal(b.inProgress().sessionId, 'fri');
  assert.equal(b.inProgress().entries['fri-3'].sets.length, 2);
});

test('survives corrupt storage', () => {
  const storage = memStorage({ [STORAGE_KEY]: '{not json' });
  const s = createStore(storage, clock(2026, 10, 30).fn);
  assert.equal(s.inProgress(), null);
  assert.deepEqual(s.getState().workouts, []);
  const saved = [...storage.data.keys()].find((k) => k.startsWith('vault-tracker:corrupt-'));
  assert.ok(saved, 'raw copy kept');
  assert.equal(storage.data.get(saved), '{not json');
});

test('startWorkout refuses to replace a workout with logged sets', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  assert.throws(() => s.startWorkout('tue'), /IN_PROGRESS/);
  assert.equal(s.inProgress().sessionId, 'fri');
});

test('startWorkout silently replaces an empty workout', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.startWorkout('tue');
  assert.equal(s.inProgress().sessionId, 'tue');
  assert.equal(s.getState().workouts.length, 1);
});

test('isStale when the workout was started on an earlier day', () => {
  const c = clock(2026, 10, 26);
  const s = createStore(memStorage(), c.fn);
  s.startWorkout('mon');
  assert.equal(s.isStale(), false);
  c.now = new Date(2026, 9, 27, 8);
  assert.equal(s.isStale(), true);
});

test('workout keeps its start date when finished the next day', () => {
  const c = clock(2026, 10, 26, 23);
  const s = createStore(memStorage(), c.fn);
  s.startWorkout('mon');
  s.logSet('mon-2', 'weighted-chin-up', sq(25, 5));
  c.now = new Date(2026, 9, 27, 7);
  s.finishWorkout();
  assert.equal(s.history()[0].date, '2026-10-26');
  assert.ok(s.history()[0].finishedAt);
  assert.equal(s.inProgress(), null);
});

test('workout records the phase it was started in', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.setPhase('SP');
  s.startWorkout('fri');
  s.setPhase('C');
  assert.equal(s.inProgress().phase, 'SP');
});

test('prefill from last finished workout, then from the current one', () => {
  const s = createStore(memStorage(), clock(2026, 10, 23).fn);
  s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  s.logSet('fri-3', 'back-squat', sq(195, 5));
  s.finishWorkout();
  assert.deepEqual(s.prefill('back-squat', 0), sq(185, 5));
  assert.deepEqual(s.prefill('back-squat', 1), sq(195, 5));
  assert.deepEqual(s.prefill('back-squat', 3), sq(195, 5));
  assert.equal(s.prefill('romanian-deadlift', 0), null);

  s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(200, 5));
  assert.deepEqual(s.prefill('back-squat', 1), sq(200, 5));
});

test('prefill returns a copy', () => {
  const s = createStore(memStorage(), clock(2026, 10, 23).fn);
  s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  const p = s.prefill('back-squat', 1);
  p.weight = 999;
  assert.equal(s.inProgress().entries['fri-3'].sets[0].weight, 185);
});

test('finishWorkout with no sets leaves history empty', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.finishWorkout();
  assert.deepEqual(s.history(), []);
  assert.equal(s.inProgress(), null);
});

test('update, delete sets and notes', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  s.logSet('fri-3', 'back-squat', sq(195, 5));
  s.updateSet('fri-3', 0, sq(190, 5));
  s.deleteSet('fri-3', 1);
  s.setNote('fri-3', 'back-squat', 'bar felt slow');
  const e = s.inProgress().entries['fri-3'];
  assert.deepEqual(e.sets, [sq(190, 5)]);
  assert.equal(e.note, 'bar felt slow');
  assert.equal(s.hasLoggedSets(), true);
  s.deleteSet('fri-3', 0);
  assert.equal(s.hasLoggedSets(), false);
});

test('discardWorkout removes the in-progress workout', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  s.discardWorkout();
  assert.equal(s.inProgress(), null);
  assert.deepEqual(s.getState().workouts, []);
});

test('history is newest first and deletable', () => {
  const c = clock(2026, 10, 26);
  const s = createStore(memStorage(), c.fn);
  for (const [day, session] of [[26, 'mon'], [27, 'tue'], [27, 'wed']]) {
    c.now = new Date(2026, 9, day, session === 'wed' ? 19 : 17);
    s.startWorkout(session);
    s.logSet(`${session}-2`, 'x', { reps: 1 });
    s.finishWorkout();
  }
  assert.deepEqual(s.history().map((w) => w.sessionId), ['wed', 'tue', 'mon']);
  s.deleteWorkout(s.history()[1].id);
  assert.deepEqual(s.history().map((w) => w.sessionId), ['wed', 'mon']);
});

test('row option choices are remembered', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  assert.equal(s.choiceFor('fri-4'), undefined);
  s.chooseOption('fri-4', 'single-leg-rdl');
  assert.equal(s.choiceFor('fri-4'), 'single-leg-rdl');
});

test('maxes', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.setMax('back-squat', 250);
  assert.deepEqual(s.getState().maxes['back-squat'], { value: 250, date: '2026-10-30' });
  s.clearMax('back-squat');
  assert.equal(s.getState().maxes['back-squat'], undefined);
});

test('journal entries newest first', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.saveJournal('2026-10-26', 'six lefts, 14 ft pole');
  s.saveJournal('2026-10-29', 'moved back a foot');
  assert.deepEqual(s.journalEntries().map((e) => e.date), ['2026-10-29', '2026-10-26']);
  s.deleteJournal('2026-10-29');
  assert.deepEqual(s.journalEntries().map((e) => e.date), ['2026-10-26']);
});

test('setup note and backup tracking', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  assert.equal(s.getState().unbackedSince, null);
  s.setSetupNote('6 lefts · 13\'6" 150 · grip 11\'8"');
  assert.equal(s.getState().setupNote.text, '6 lefts · 13\'6" 150 · grip 11\'8"');
  assert.ok(s.getState().unbackedSince);
  s.markBackedUp();
  assert.equal(s.getState().unbackedSince, null);
  assert.ok(s.getState().lastBackupAt);
  s.dismissReminder();
  assert.equal(s.getState().unbackedSince, null, 'dismiss is not a data change');
});

test('replaceAll swaps in imported data and persists it', () => {
  const storage = memStorage();
  const s = createStore(storage, clock(2026, 10, 30).fn);
  s.setPhase('C');
  const other = createStore(memStorage(), clock(2026, 10, 30).fn);
  other.saveJournal('2026-10-26', 'from backup');
  s.replaceAll(other.getState());
  assert.equal(s.getState().settings.phase, 'GP');
  assert.equal(createStore(storage, clock(2026, 10, 30).fn).journalEntries()[0].text, 'from backup');
});

test('subscribers hear about changes', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  let calls = 0;
  const off = s.subscribe(() => calls++);
  s.setPhase('SP');
  off();
  s.setPhase('C');
  assert.equal(calls, 1);
});

test('note before first set keeps the exercise id', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.setNote('fri-3', 'back-squat', 'felt good');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  assert.equal(s.inProgress().entries['fri-3'].exerciseId, 'back-squat');
  assert.deepEqual(s.prefill('back-squat', 1), sq(185, 5));
});

test('logging after all sets were deleted records the newly chosen option', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  s.startWorkout('fri');
  s.logSet('fri-4', 'romanian-deadlift', sq(135, 6));
  s.deleteSet('fri-4', 0);
  s.logSet('fri-4', 'trap-bar-deadlift', sq(225, 5));
  assert.equal(s.inProgress().entries['fri-4'].exerciseId, 'trap-bar-deadlift');
});

test('repairs saved entries that lost their exercise id', () => {
  const saved = {
    workouts: [{
      id: 'w', sessionId: 'fri', phase: 'GP', date: '2026-10-23', startedAt: 'a', finishedAt: 'b',
      entries: {
        'fri-3': { exerciseId: null, sets: [sq(185, 5)], note: 'n' },
        'fri-4': { exerciseId: null, sets: [sq(95, 6)], note: '' },
      },
    }],
    settings: { phase: 'GP' },
    rowChoices: { 'fri-4': 'single-leg-rdl' },
  };
  const s = createStore(memStorage({ [STORAGE_KEY]: JSON.stringify(saved) }), clock(2026, 10, 30).fn);
  const e = s.history()[0].entries;
  assert.equal(e['fri-3'].exerciseId, 'back-squat');
  assert.equal(e['fri-4'].exerciseId, 'single-leg-rdl');
});

test('a late note save goes to its own workout and never starts a new one', () => {
  const s = createStore(memStorage(), clock(2026, 10, 30).fn);
  const w = s.startWorkout('fri');
  s.logSet('fri-3', 'back-squat', sq(185, 5));
  s.finishWorkout();
  s.setNote('fri-3', 'back-squat', 'late note', w.id);
  assert.equal(s.inProgress(), null);
  assert.equal(s.history()[0].entries['fri-3'].note, 'late note');

  const gone = s.startWorkout('tue');
  s.discardWorkout();
  s.setNote('tue-6', 'nordic-curl', 'lost', gone.id);
  assert.equal(s.getState().workouts.length, 1);
});
