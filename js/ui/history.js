// History: finished workouts, newest first, with a detail view.
import { h, confirmDialog, toast } from './dom.js';
import { getSession, exerciseInfo, PHASE_NAMES } from '../plan.js';
import { formatSet, formatDate } from '../logic.js';

export function render(root, { store, navigate, arg }) {
  if (arg) return renderDetail(root, store, navigate, arg);

  const list = store.history();
  root.replaceChildren(
    h('h1', {}, 'History'),
    list.length === 0
      ? h('p', { class: 'empty' }, 'Finished workouts show up here.')
      : h('div', { class: 'list' }, list.map((w) => {
        const session = getSession(w.sessionId);
        const sets = Object.values(w.entries).reduce((n, e) => n + e.sets.length, 0);
        return h('button', { class: 'list-item', onclick: () => navigate(`#/history/${w.id}`) },
          h('div', {},
            h('div', {}, h('strong', {}, formatDate(w.date)), ` · ${session?.title ?? w.sessionId}`),
            h('div', { class: 'sub' }, `${PHASE_NAMES[w.phase]} · ${sets} sets`)),
          h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'));
      })),
  );
}

function renderDetail(root, store, navigate, id) {
  const w = store.history().find((x) => x.id === id);
  if (!w) {
    root.replaceChildren(h('h1', {}, 'History'), h('p', { class: 'empty' }, 'That workout is gone.'),
      h('button', { class: 'block', onclick: () => navigate('#/history') }, 'Back to History'));
    return;
  }
  const session = getSession(w.sessionId);
  // Show exercises in plan order, then anything that no longer matches the plan.
  const order = session ? session.rows.map((r) => r.id) : [];
  const rowIds = [...order.filter((rid) => w.entries[rid]), ...Object.keys(w.entries).filter((rid) => !order.includes(rid))];

  root.replaceChildren(
    h('p', {}, h('button', { class: 'link', onclick: () => navigate('#/history') }, '‹ History')),
    h('h1', {}, formatDate(w.date)),
    h('p', { class: 'muted' }, `${session ? `${session.fixed} → ${session.title}` : w.sessionId} · ${PHASE_NAMES[w.phase]}`),
    ...rowIds.filter((rid) => w.entries[rid].sets.length || w.entries[rid].note).map((rid) => {
      const e = w.entries[rid];
      const info = exerciseInfo(e.exerciseId);
      return h('div', { class: 'card' },
        h('h2', {}, info?.name ?? 'Notes'),
        e.sets.length > 0 && h('div', { class: 'sets' }, e.sets.map((v, i) => h('div', { class: 'set' },
          h('span', { class: 'set-n' }, `Set ${i + 1}`),
          h('span', { class: 'set-val' }, formatSet(info?.type, v)),
          h('span')))),
        e.note && h('p', { class: 'cue' }, `Note: ${e.note}`));
    }),
    h('button', {
      class: 'danger block',
      style: 'margin-top:18px',
      onclick: async () => {
        if (await confirmDialog("Delete this workout from History? This can't be undone.", 'Delete', { danger: true })) {
          store.deleteWorkout(w.id);
          toast('Workout deleted');
          navigate('#/history');
        }
      },
    }, 'Delete workout'),
  );
}
