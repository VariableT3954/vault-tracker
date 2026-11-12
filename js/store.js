// All app data, kept as one JSON object in storage and saved on every change.
import { todayISO } from './logic.js';
import { findRow, getProgram } from './plan.js';

export const STORAGE_KEY = 'vault-tracker:v1';

export function emptyState() {
  return {
    version: 1,
    // program: null until the phone has been asked what it is training for.
    settings: { phase: 'GP', program: null },
    maxes: {},
    workouts: [],
    inProgressId: null,
    rowChoices: {},
    journal: {},
    setupNote: { text: '', updatedAt: null },
    lastBackupAt: null,
    unbackedSince: null,
    reminderDismissedAt: null,
  };
}

const clone = (v) => JSON.parse(JSON.stringify(v));

function load(storage, now) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw == null) return emptyState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.workouts)) throw new Error('bad shape');
    return repair({ ...emptyState(), ...parsed });
  } catch {
    // Keep the unreadable text so nothing is lost for good, then start fresh.
    storage.setItem(`vault-tracker:corrupt-${now().getTime()}`, raw);
    return emptyState();
  }
}

const hasData = (s) => s.workouts.length > 0 || Object.keys(s.journal ?? {}).length > 0
  || Object.keys(s.maxes ?? {}).length > 0 || !!s.setupNote?.text;

// Bring older saves up to date:
// - saves from before training types were all pole vault; keep them there without asking.
// - sets stored under an entry with no exercise id (a note typed before the first set) get
//   their id back from the plan: the remembered choice, else the row's first option.
function repair(state) {
  state.settings = { ...emptyState().settings, ...state.settings };
  if (!getProgram(state.settings.program)) state.settings.program = hasData(state) ? 'vault' : null;

  for (const w of state.workouts) {
    for (const [rowId, e] of Object.entries(w.entries ?? {})) {
      if (e.exerciseId || !e.sets?.length) continue;
      const row = findRow(rowId);
      if (!row) continue;
      const choice = state.rowChoices?.[rowId];
      e.exerciseId = row.options.some((o) => o.exerciseId === choice) ? choice : row.options[0].exerciseId;
    }
  }
  return state;
}

export function createStore(storage, now = () => new Date()) {
  let state = load(storage, now);
  const listeners = new Set();

  const save = () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    for (const fn of listeners) fn(state);
  };

  // Every user change marks data as not yet backed up.
  const change = (fn) => {
    fn();
    if (!state.unbackedSince) state.unbackedSince = now().toISOString();
    save();
  };

  const current = () => state.workouts.find((w) => w.id === state.inProgressId) ?? null;

  const requireCurrent = () => {
    const w = current();
    if (!w) throw new Error('NO_WORKOUT');
    return w;
  };

  const countSets = (w) => Object.values(w.entries).reduce((n, e) => n + e.sets.length, 0);

  const removeWorkout = (id) => {
    state.workouts = state.workouts.filter((w) => w.id !== id);
    if (state.inProgressId === id) state.inProgressId = null;
  };

  // An entry with no sets yet takes whichever option is being logged now.
  const entryFor = (w, rowId, exerciseId) => {
    w.entries[rowId] ??= { exerciseId, sets: [], note: '' };
    const e = w.entries[rowId];
    if (e.sets.length === 0) e.exerciseId = exerciseId;
    return e;
  };

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    setPhase: (phase) => change(() => { state.settings.phase = phase; }),
    // Switching training type never touches logged sets: it is refused while a workout has
    // any, and an empty in-progress workout is dropped. A phase the new program lacks
    // becomes its first phase.
    setProgram(id) {
      const program = getProgram(id);
      if (!program) throw new Error('UNKNOWN_PROGRAM');
      const w = current();
      if (w && countSets(w) > 0) throw new Error('IN_PROGRESS');
      change(() => {
        if (w) removeWorkout(w.id);
        state.settings.program = id;
        if (!program.phases.includes(state.settings.phase)) state.settings.phase = program.phases[0];
      });
    },
    setMax: (exerciseId, value) => change(() => {
      state.maxes[exerciseId] = { value, date: todayISO(now()) };
    }),
    clearMax: (exerciseId) => change(() => { delete state.maxes[exerciseId]; }),

    inProgress: current,
    isStale() {
      const w = current();
      return !!w && w.date < todayISO(now());
    },
    hasLoggedSets() {
      const w = current();
      return !!w && countSets(w) > 0;
    },

    startWorkout(sessionId) {
      const existing = current();
      if (existing && countSets(existing) > 0) throw new Error('IN_PROGRESS');
      const w = {
        id: crypto.randomUUID(),
        sessionId,
        phase: state.settings.phase,
        date: todayISO(now()),
        startedAt: now().toISOString(),
        finishedAt: null,
        entries: {},
      };
      change(() => {
        if (existing) removeWorkout(existing.id);
        state.workouts.push(w);
        state.inProgressId = w.id;
      });
      return w;
    },

    logSet: (rowId, exerciseId, values) => {
      const w = requireCurrent();
      change(() => { entryFor(w, rowId, exerciseId).sets.push({ ...values }); });
    },
    updateSet: (rowId, i, values) => {
      const e = requireCurrent().entries[rowId];
      if (!e?.sets[i]) return;
      change(() => { e.sets[i] = { ...values }; });
    },
    deleteSet: (rowId, i) => {
      const e = requireCurrent().entries[rowId];
      if (!e?.sets[i]) return;
      change(() => { e.sets.splice(i, 1); });
    },
    // workoutId pins a delayed save to the workout it was typed in, even if that workout
    // has since been finished; if it was discarded the note is dropped with it.
    setNote: (rowId, exerciseId, text, workoutId) => {
      const w = workoutId ? state.workouts.find((x) => x.id === workoutId) : requireCurrent();
      if (!w) return;
      change(() => {
        w.entries[rowId] ??= { exerciseId, sets: [], note: '' };
        w.entries[rowId].note = text;
      });
    },

    choiceFor: (rowId) => state.rowChoices[rowId],
    chooseOption: (rowId, exerciseId) => change(() => { state.rowChoices[rowId] = exerciseId; }),

    finishWorkout() {
      const w = current();
      if (!w) return;
      change(() => {
        if (countSets(w) === 0) {
          removeWorkout(w.id);
          return;
        }
        w.finishedAt = now().toISOString();
        state.inProgressId = null;
      });
    },
    discardWorkout() {
      const w = current();
      if (w) change(() => removeWorkout(w.id));
    },

    history() {
      return state.workouts
        .filter((w) => w.finishedAt)
        .sort((a, b) => (b.date.localeCompare(a.date)) || b.startedAt.localeCompare(a.startedAt));
    },
    deleteWorkout: (id) => change(() => removeWorkout(id)),

    prefill(exerciseId, setIndex) {
      const w = current();
      const own = w && Object.values(w.entries).find((e) => e.exerciseId === exerciseId);
      if (own && own.sets.length > 0 && setIndex > 0) {
        return clone(own.sets[Math.min(setIndex, own.sets.length) - 1]);
      }
      for (const past of this.history()) {
        const e = Object.values(past.entries).find((x) => x.exerciseId === exerciseId && x.sets.length);
        if (e) return clone(e.sets[Math.min(setIndex, e.sets.length - 1)]);
      }
      return null;
    },

    saveJournal: (iso, text) => change(() => {
      state.journal[iso] = { text, updatedAt: now().toISOString() };
    }),
    deleteJournal: (iso) => change(() => { delete state.journal[iso]; }),
    journalEntries() {
      return Object.entries(state.journal)
        .map(([date, e]) => ({ date, ...e }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    setSetupNote: (text) => change(() => {
      state.setupNote = { text, updatedAt: now().toISOString() };
    }),

    markBackedUp() {
      state.lastBackupAt = now().toISOString();
      state.unbackedSince = null;
      state.reminderDismissedAt = null;
      save();
    },
    dismissReminder() {
      state.reminderDismissedAt = now().toISOString();
      save();
    },
    replaceAll(data) {
      state = repair({ ...emptyState(), ...clone(data) });
      save();
    },
  };
}
