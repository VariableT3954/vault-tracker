// Steps, poles and grips: one running note.
import { h, debounce } from './dom.js';

const updatedText = (iso) => (iso ? `Saved ${new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : '');

export function render(root, { store }) {
  const note = store.getState().setupNote;
  const status = h('p', { class: 'saved' }, updatedText(note.updatedAt));
  const save = debounce((text) => {
    store.setSetupNote(text);
    status.textContent = updatedText(store.getState().setupNote.updatedAt);
  }, 400);

  root.replaceChildren(
    h('h1', {}, 'Steps & poles'),
    h('p', { class: 'muted' }, 'Your current approach steps, poles and grips. Edit it whenever your setup changes.'),
    h('textarea', {
      'aria-label': 'Steps, poles and grips',
      placeholder: 'e.g.\nSteps: 6 lefts, start 70 ft\nPoles: 13\'6" 150, 14\' 155\nGrip: 12\'2"',
      style: 'min-height:55vh',
      oninput: (e) => {
        status.textContent = 'Saving…';
        save(e.target.value);
      },
      onchange: (e) => save.flush(e.target.value),
    }, note.text),
    status,
  );
}
