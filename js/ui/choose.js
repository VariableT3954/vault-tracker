// First open on a new phone: pick the training type once. It is saved, and can be changed in More.
import { h } from './dom.js';
import { PROGRAMS, PROGRAM_IDS } from '../plan.js';

const BLURB = {
  vault: 'Pole vault lifting, isometrics, plyometrics and abs, with a vault journal.',
  sprint: 'Four lifting days a week for a 100, 200, 400 and 800 m runner.',
};

export function render(root, { store, onChosen }) {
  root.replaceChildren(
    h('h1', { style: 'margin-top:24px' }, 'What are you training for?'),
    h('p', { class: 'muted' }, 'This is saved on this phone. You can change it later in More.'),
    h('div', { class: 'list' }, PROGRAM_IDS.map((id) => h('button', {
      class: 'list-item',
      onclick: () => {
        store.setProgram(id);
        onChosen();
      },
    },
    h('div', {},
      h('strong', {}, PROGRAMS[id].name),
      h('div', { class: 'sub' }, BLURB[id])),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')))),
  );
}
