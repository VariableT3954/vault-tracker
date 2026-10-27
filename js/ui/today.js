// Today: the planned (or chosen) workout, logged one set at a time.
import { h, choiceDialog, confirmDialog, toast, debounce, flushPending } from './dom.js';
import { SESSIONS, getSession, setsFor, resolveOption, PHASE_NAMES } from '../plan.js';
import {
  FIELDS, todayISO, defaultSessionId, isVaultDay, targetWeightText, parseNum, formatSet, formatDate,
} from '../logic.js';

const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' };
const FIELD_LABEL = { weight: 'lb', reps: 'reps', seconds: 'sec', contacts: 'contacts', drill: 'drill', count: 'count', minutes: 'min' };
// The field a set can't be logged without.
const REQUIRED = { lift: 'reps', iso: 'seconds', plyo: 'contacts', reps: 'reps', hold: 'seconds', count: 'count', done: null };

// Screen state that only lives while the app is open.
let picked = null; // session chosen with the switch control before any set is logged
let editKey = null; // "rowId:index" of a logged set being edited
const addOpen = new Set(); // rows where "Add set" was tapped

export function render(root, ctx) {
  flushPending(); // notes typed on the old screen are saved before it is replaced
  const { store, navigate } = ctx;
  const rerender = () => render(root, ctx);
  const state = store.getState();
  const w = store.inProgress();
  const today = todayISO();
  const todaySid = defaultSessionId(today);
  const sessionId = w ? w.sessionId : (picked ?? todaySid);
  const phase = w ? w.phase : state.settings.phase;
  const session = sessionId ? getSession(sessionId) : null;

  const ensureWorkout = () => {
    if (!store.inProgress()) store.startWorkout(sessionId);
  };

  async function switchTo(newId) {
    if (newId === sessionId) return;
    flushPending();
    const cur = store.inProgress();
    if (cur && store.hasLoggedSets()) {
      const choice = await choiceDialog(
        `You've logged sets in ${DAY_NAMES[cur.sessionId]}'s workout. What should happen to them?`,
        [
          { label: 'Finish and switch', value: 'finish', primary: true },
          { label: 'Discard and switch', value: 'discard', danger: true },
        ],
      );
      if (!choice) return rerender();
      if (choice === 'finish') {
        store.finishWorkout();
        toast('Workout saved to History');
      } else {
        const sure = await confirmDialog("Discard the logged sets? This can't be undone.", 'Discard', { danger: true });
        if (!sure) return rerender();
        store.discardWorkout();
      }
    } else if (cur) {
      store.discardWorkout(); // nothing logged, nothing to lose
    }
    picked = newId || null;
    editKey = null;
    addOpen.clear();
    rerender();
  }

  // ---- header ----
  const els = [
    h('div', { class: 'head' },
      h('div', {},
        h('p', { class: 'muted small' }, formatDate(w ? w.date : today)),
        h('h1', {}, session ? DAY_NAMES[session.id] : 'Rest day'),
        session && h('p', { class: 'muted' }, `${session.fixed} → ${session.title}`)),
      h('span', { class: 'chip' }, PHASE_NAMES[phase])),
  ];

  if (w && store.isStale()) {
    els.push(h('div', { class: 'banner' },
      h('p', {}, `${DAY_NAMES[w.sessionId]}'s workout from ${formatDate(w.date)} isn't finished.`),
      h('div', { class: 'row-btns' },
        h('button', {
          onclick: () => {
            flushPending();
            store.finishWorkout();
            picked = null;
            toast('Workout saved to History');
            rerender();
          },
        }, 'Finish (save it)'),
        h('button', {
          onclick: async () => {
            if (await confirmDialog("Discard this workout's logged sets? This can't be undone.", 'Discard', { danger: true })) {
              flushPending();
              store.discardWorkout();
              picked = null;
              rerender();
            }
          },
        }, 'Discard')),
      todaySid && todaySid !== w.sessionId
        && h('p', {}, h('button', { class: 'link', onclick: () => switchTo(todaySid) }, `Today's plan: ${DAY_NAMES[todaySid]} →`))));
  }

  // ---- switch workout ----
  els.push(h('div', { class: 'field' },
    h('label', { for: 'switch' }, w ? 'Workout in progress' : 'Workout'),
    h('select', { id: 'switch', onchange: (e) => switchTo(e.target.value) },
      !session && h('option', { value: '', selected: true }, 'Rest day'),
      SESSIONS.map((s) => h('option', { value: s.id, selected: s.id === sessionId },
        `${DAY_NAMES[s.id]} · ${s.title}${s.id === todaySid ? ' (today)' : ''}`)))));

  if (!session) {
    els.push(h('div', { class: 'card' },
      h('h2', {}, 'Rest day'),
      h('p', { class: 'muted' }, 'Nothing planned. If your week got shuffled, pick a workout above.')));
    root.replaceChildren(...els);
    return;
  }

  for (const row of session.rows) els.push(rowCard(row));

  // ---- finish ----
  if (w && store.hasLoggedSets()) {
    els.push(h('button', {
      class: 'primary block',
      style: 'margin-top:14px',
      onclick: () => {
        flushPending();
        store.finishWorkout();
        picked = null;
        editKey = null;
        addOpen.clear();
        toast('Workout saved to History');
        rerender();
        window.scrollTo(0, 0);
      },
    }, 'Finish workout'));
    els.push(h('p', { style: 'text-align:center' }, h('button', {
      class: 'link danger',
      onclick: async () => {
        if (await confirmDialog("Discard this workout's logged sets? This can't be undone.", 'Discard', { danger: true })) {
          flushPending();
          store.discardWorkout();
          picked = null;
          rerender();
        }
      },
    }, 'Discard workout')));
  }

  if (isVaultDay(today) || sessionId === 'mon' || sessionId === 'thu') {
    els.push(h('div', { class: 'card' },
      h('h2', {}, 'Vault day'),
      h('p', { class: 'muted' }, 'How did practice go?'),
      h('button', { class: 'block', onclick: () => navigate('#/journal') }, "Write today's vault journal")));
  }

  root.replaceChildren(...els);

  // ---- one exercise ----
  function rowCard(row) {
    const entry = w?.entries[row.id];
    const logged = entry?.sets ?? [];
    const option = resolveOption(row, entry, store.choiceFor(row.id));
    const planned = setsFor(row, option, phase);
    const pct = row.pct?.[phase];
    const max = state.maxes[row.maxRef?.[phase]]?.value;
    const weight = targetWeightText(pct, max);
    const complete = planned > 0 && logged.length >= planned;

    const title = row.options.length > 1 && logged.length === 0
      ? h('select', {
        'aria-label': 'Exercise option',
        onchange: (e) => {
          store.chooseOption(row.id, e.target.value);
          rerender();
        },
      }, row.options.map((o) => h('option', { value: o.exerciseId, selected: o.exerciseId === option.exerciseId }, o.name)))
      : h('h2', {}, option.name);

    const lines = logged.map((v, i) => (editKey === `${row.id}:${i}` ? editLine(v, i) : loggedLine(v, i)));
    const showPending = logged.length < planned || addOpen.has(row.id);
    if (showPending) lines.push(pendingLine(logged.length));
    for (let i = logged.length + 1; i < planned; i++) {
      lines.push(h('div', { class: 'set planned' }, h('span', { class: 'set-n' }, `Set ${i + 1}`), h('span', { class: 'set-val' }, 'planned'), h('span')));
    }

    const note = entry?.note ?? '';
    // The workout id is fixed when typing starts, so a save that lands after Finish
    // still goes to the right workout instead of starting a new one.
    const saveNote = debounce((workoutId, text) => store.setNote(row.id, option.exerciseId, text, workoutId), 400);

    return h('div', { class: complete ? 'card complete' : 'card' },
      h('div', { class: 'card-title' }, title, complete && h('span', { class: 'tick', 'aria-label': 'Done' }, '✓')),
      h('div', { class: 'target' },
        row.target[phase],
        weight && h('span', { class: 'weight' }, ` · ${weight}`)),
      pct && !max && h('p', { class: 'cue' },
        h('button', { class: 'link', onclick: () => navigate('#/more') }, 'Add your max'), ' to see target weights.'),
      option.cue && h('p', { class: 'cue' }, option.cue),
      h('div', { class: 'sets' }, lines),
      !showPending && h('button', {
        class: 'block',
        style: 'margin-top:8px',
        onclick: () => {
          addOpen.add(row.id);
          rerender();
        },
      }, '+ Add set'),
      option.type === 'plyo' && logged.length > 0
        && h('p', { class: 'total' }, `Total: ${logged.reduce((n, v) => n + (v.contacts ?? 0), 0)} contacts`),
      h('details', { class: 'notes', open: note ? true : null },
        h('summary', {}, note ? 'Notes' : '+ Notes'),
        h('textarea', {
          placeholder: 'How did it feel?',
          oninput: (e) => {
            ensureWorkout();
            saveNote(store.inProgress().id, e.target.value);
          },
          onchange: () => saveNote.flush(),
        }, note)));

    function inputsFor(values) {
      return FIELDS[option.type].map((f) => {
        const v = values?.[f];
        return h('div', { class: f === 'drill' ? 'drill' : null },
          h('input', {
            name: f,
            type: 'text',
            inputmode: f === 'drill' ? 'text' : f === 'weight' ? 'decimal' : 'numeric',
            autocapitalize: f === 'drill' ? 'off' : null,
            autocomplete: 'off',
            enterkeyhint: 'done',
            'aria-label': FIELD_LABEL[f],
            placeholder: f === 'drill' ? 'e.g. hurdle hops' : '',
            value: v == null ? '' : String(v),
          }),
          h('label', {}, FIELD_LABEL[f]));
      });
    }

    // Read a line's inputs. Returns null (and focuses the gap) when the required field is empty.
    function readValues(lineEl) {
      const values = {};
      for (const f of FIELDS[option.type]) {
        const input = lineEl.querySelector(`input[name="${f}"]`);
        values[f] = f === 'drill' ? input.value.trim() : parseNum(input.value);
      }
      const need = REQUIRED[option.type];
      if (need && values[need] == null) {
        lineEl.querySelector(`input[name="${need}"]`).focus();
        return null;
      }
      return values;
    }

    function pendingLine(i) {
      const line = h('div', { class: 'set' },
        h('span', { class: 'set-n' }, `Set ${i + 1}`),
        h('div', { class: 'fields' }, inputsFor(store.prefill(option.exerciseId, i))),
        h('button', {
          class: 'check',
          'aria-label': `Log set ${i + 1}`,
          onclick: () => {
            const values = readValues(line);
            if (!values) return;
            ensureWorkout();
            store.logSet(row.id, option.exerciseId, values);
            addOpen.delete(row.id);
            rerender();
          },
        }, '✓'));
      return line;
    }

    function loggedLine(v, i) {
      return h('div', { class: 'set' },
        h('span', { class: 'set-n' }, `Set ${i + 1}`),
        h('button', {
          class: 'set-val',
          'aria-label': `Edit set ${i + 1}`,
          onclick: () => {
            editKey = `${row.id}:${i}`;
            rerender();
          },
        }, formatSet(option.type, v)),
        h('span', { class: 'tick' }, '✓'));
    }

    function editLine(v, i) {
      const line = h('div', { class: 'set' },
        h('span', { class: 'set-n' }, `Set ${i + 1}`),
        h('div', { class: 'fields' }, inputsFor(v)),
        h('span'),
        h('div', { class: 'edit-actions' },
          h('button', {
            class: 'primary',
            onclick: () => {
              const values = readValues(line);
              if (!values) return;
              store.updateSet(row.id, i, values);
              editKey = null;
              rerender();
            },
          }, 'Save'),
          h('button', {
            class: 'danger',
            onclick: () => {
              store.deleteSet(row.id, i);
              editKey = null;
              rerender();
            },
          }, 'Delete'),
          h('button', {
            onclick: () => {
              editKey = null;
              rerender();
            },
          }, 'Cancel')));
      return line;
    }
  }
}
