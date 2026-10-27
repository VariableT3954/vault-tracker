// All app data, kept as one JSON object in storage and saved on every change.
import { todayISO } from './logic.js';

export const STORAGE_KEY = 'vault-tracker:v1';

export function emptyState() {
  return {
    version: 1,
    settings: { phase: 'GP' },
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
    return { ...emptyState(), ...parsed };
  } catch {
    // Keep the unreadable text so nothing is lost for good, then start fresh.
    storage.setItem(`vault-tracker:corrupt-${now().getTime()}`, raw);
    return emptyState();
  }
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

  const entryFor = (w, rowId, exerciseId) => {
    w.entries[rowId] ??= { exerciseId, sets: [], note: '' };
    return w.entries[rowId];
  };

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    setPhase: (phase) => change(() => { state.settings.phase = phase; }),
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
    setNote: (rowId, text) => {
      const w = requireCurrent();
      const e = w.entries[rowId];
      change(() => {
        if (e) e.note = text;
        else w.entries[rowId] = { exerciseId: null, sets: [], note: text };
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
      state = { ...emptyState(), ...clone(data) };
      save();
    },
  };
}
