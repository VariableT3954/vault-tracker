// More: phase, maxes, backup and import.
import { h, toast } from './dom.js';
import { PHASES, PHASE_NAMES, liftExercises } from '../plan.js';
import { parseNum, formatDate, todayISO } from '../logic.js';
import { runBackup, pickAndImport } from './backup-ui.js';

// Maxes the plan's percentages use; the rest sit under "Other lifts".
const KEY_MAXES = ['back-squat', 'partial-squat', 'power-clean'];

export function render(root, ctx) {
  const { store, rerender } = ctx;
  const state = store.getState();
  const lifts = liftExercises();
  const key = KEY_MAXES.map((id) => lifts.find((l) => l.exerciseId === id));
  const others = lifts.filter((l) => !KEY_MAXES.includes(l.exerciseId));

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
      h('h2', {}, 'Training phase'),
      h('p', { class: 'cue' }, 'Sets which targets the plan shows. A workout already in progress keeps its phase.'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Training phase', style: 'margin-top:8px' },
        PHASES.map((p) => h('button', {
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
