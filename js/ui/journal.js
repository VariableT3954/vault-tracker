// Vault journal: one dated free-text entry per vault day.
import { h, debounce } from './dom.js';
import { todayISO, isVaultDay, formatDate } from '../logic.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function render(root, { store, navigate, arg }) {
  const date = arg && ISO.test(arg) ? arg : todayISO();
  const entry = store.getState().journal[date];
  const status = h('p', { class: 'saved' }, entry ? 'Saved' : '');

  const save = debounce((text) => {
    if (text.trim() === '') {
      if (store.getState().journal[date]) store.deleteJournal(date);
      status.textContent = '';
    } else {
      store.saveJournal(date, text);
      status.textContent = 'Saved';
    }
    renderList();
  }, 400);

  const listEl = h('div', { class: 'list' });
  function renderList() {
    const entries = store.journalEntries().filter((e) => e.date !== date);
    listEl.replaceChildren(...entries.map((e) => h('button', {
      class: 'list-item',
      onclick: () => navigate(`#/journal/${e.date}`),
    },
    h('div', { style: 'min-width:0' },
      h('strong', {}, formatDate(e.date)),
      h('div', { class: 'sub', style: 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, e.text.split('\n')[0])),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))));
  }
  renderList();

  root.replaceChildren(
    h('h1', {}, 'Vault journal'),
    h('div', { class: 'field' },
      h('label', { for: 'jdate' }, 'Date'),
      h('input', {
        id: 'jdate',
        type: 'date',
        value: date,
        max: todayISO(),
        onchange: (e) => {
          if (ISO.test(e.target.value)) navigate(`#/journal/${e.target.value}`);
        },
      })),
    !isVaultDay(date) && h('p', { class: 'cue' }, 'Journal entries are meant for vault days, but you can still write one here.'),
    h('textarea', {
      id: 'jtext',
      'aria-label': `Journal for ${formatDate(date)}`,
      placeholder: 'How did practice go? Steps, pole, grip, what clicked, what to work on.',
      style: 'min-height:220px',
      oninput: (e) => {
        status.textContent = 'Saving…';
        save(e.target.value);
      },
      onchange: (e) => save.flush(e.target.value),
    }, entry?.text ?? ''),
    status,
    h('hr'),
    h('h2', {}, 'Past entries'),
    listEl.childElementCount ? listEl : h('p', { class: 'empty' }, 'No other entries yet.'),
  );
}
