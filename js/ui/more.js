// More: training type, phase, maxes, backup and import.
import { h, toast, choiceDialog, confirmDialog } from './dom.js';
import {
  PROGRAMS, PROGRAM_IDS, PHASE_NAMES, getProgram, liftExercises,
} from '../plan.js';
import { parseNum, formatDate, todayISO } from '../logic.js';
import { runBackup, pickAndImport } from './backup-ui.js';

export function render(root, ctx) {
  const { store, rerender } = ctx;
  const state = store.getState();
  const program = getProgram(state.settings.program);
  const lifts = liftExercises(program.id);
  // Maxes the plan's percentages use come first; the rest sit under "Other lifts".
  const key = program.keyMaxes.map((id) => lifts.find((l) => l.exerciseId === id));
  const others = lifts.filter((l) => !program.keyMaxes.includes(l.exerciseId));

  async function switchProgram(id) {
    if (id === program.id) return;
    if (store.hasLoggedSets()) {
      await choiceDialog('Finish or discard the workout in progress on Today before changing training type.', [], 'OK');
      return;
    }
    const ok = await confirmDialog(
      `Switch this phone to ${PROGRAMS[id].name}? Your history, maxes and notes stay.`, 'Switch',
    );
    if (!ok) return;
    store.setProgram(id);
    toast(`Training type: ${PROGRAMS[id].name}`);
    rerender();
  }

  const maxRow = ({ exerciseId, name }) => {
    const m = state.maxes[exerciseId];
    const input = h('input', {
      type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'lb',
      'aria-label': `${name} max in pounds`, value: m ? String(m.value) : '',
    });
    const save = () => {
      const v = parseNum(input.value);
      if (v == null || v === 0) {
        if (m) {
          store.clearMax(exerciseId);
          toast(`${name} max cleared`);
        }
      } else if (v !== m?.value) {
        store.setMax(exerciseId, v);
        toast(`${name} max saved`);
      }
      rerender();
    };
    input.addEventListener('change', save);
    return h('div', { class: 'field' },
      h('label', {}, name, m && ` · set ${formatDate(m.date)}`),
      h('div', { class: 'field-row' }, input,
        h('button', { onclick: save }, 'Save')));
  };

  const last = state.lastBackupAt;

  root.replaceChildren(
    h('h1', {}, 'More'),

    h('div', { class: 'card' },
      h('h2', {}, 'Training type'),
      h('p', { class: 'cue' }, 'Saved on this phone. Decides which plan Today shows.'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Training type', style: 'margin-top:8px' },
        PROGRAM_IDS.map((id) => h('button', {
          'aria-pressed': id === program.id ? 'true' : 'false',
          onclick: () => switchProgram(id),
        }, PROGRAMS[id].name)))),

    h('div', { class: 'card' },
      h('h2', {}, 'Training phase'),
      h('p', { class: 'cue' }, 'Sets which targets the plan shows. A workout already in progress keeps its phase.'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Training phase', style: 'margin-top:8px' },
        program.phases.map((p) => h('button', {
          'aria-pressed': state.settings.phase === p ? 'true' : 'false',
          onclick: () => {
            store.setPhase(p);
            rerender();
          },
        }, p))),
      h('p', { class: 'cue' }, PHASE_NAMES[state.settings.phase])),

    h('div', { class: 'card' },
      h('h2', {}, 'Maxes'),
      h('p', { class: 'cue' }, 'Your 1-rep max. Lifts with a % target show real weights once a max is set. Leave blank to clear.'),
      key.map(maxRow),
      h('details', {},
        h('summary', { class: 'link', style: 'color:var(--accent);min-height:36px' }, 'Other lifts'),
        others.map(maxRow))),

    h('div', { class: 'card' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'cue' }, 'Saves a backup file. On your iPhone choose "Save to Files", then iCloud Drive.'),
      h('p', {}, 'Last backup: ', h('strong', {}, last ? formatDate(todayISO(new Date(last))) : 'Never')),
      h('div', { class: 'row-btns' },
        h('button', { class: 'primary', onclick: async () => { await runBackup(store); rerender(); } }, 'Back up'),
        h('button', { onclick: () => pickAndImport(store, rerender) }, 'Import'))),
  );
}
