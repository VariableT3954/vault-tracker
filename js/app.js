import { createStore } from './store.js';
import { h, flushPending } from './ui/dom.js';
import { todayISO } from './logic.js';
import { needsBackupReminder } from './backup.js';
import * as today from './ui/today.js';
import * as history from './ui/history.js';
import * as journal from './ui/journal.js';
import * as notes from './ui/notes.js';
import * as more from './ui/more.js';
import { runBackup } from './ui/backup-ui.js';

const store = createStore(localStorage);
// Handy for checking data from the browser console.
window.store = store;

// Ask Safari not to clear our data when space runs low. Not guaranteed, hence backups.
navigator.storage?.persist?.().catch(() => {});

const ROUTES = { today, history, journal, notes, more };

const svg = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const TABS = [
  ['today', 'Today', svg('<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>')],
  ['history', 'History', svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')],
  ['journal', 'Journal', svg('<path d="M6 3.5h10.5a2 2 0 0 1 2 2v15H8a2 2 0 0 1-2-2z"/><path d="M6 18.5a2 2 0 0 1 2-2h10.5M10 8h5"/>')],
  ['notes', 'Steps & Poles', svg('<path d="M6.5 21 17.5 3"/><path d="M3.5 9.5h17"/>')],
  ['more', 'More', svg('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>')],
];

const app = document.getElementById('app');
const tabs = document.getElementById('tabs');
const banner = document.getElementById('banner');

function currentRoute() {
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: ROUTES[name] ? name : 'today', arg };
}

const navigate = (hash) => {
  location.hash = hash;
};

function renderTabs(active) {
  tabs.replaceChildren(...TABS.map(([name, label, icon]) => {
    const a = h('a', { href: `#/${name}`, 'aria-current': name === active ? 'page' : null });
    a.innerHTML = `${icon}<span>${label}</span>`;
    return a;
  }));
}

function renderBanner() {
  if (!needsBackupReminder(store.getState(), new Date())) {
    banner.replaceChildren();
    return;
  }
  banner.replaceChildren(h('div', { class: 'banner', role: 'alert' },
    h('p', {}, "It's been over a week since your last backup."),
    h('div', { class: 'row-btns' },
      h('button', { onclick: async () => { await runBackup(store); renderApp(); } }, 'Back up'),
      h('button', { onclick: () => { store.dismissReminder(); renderBanner(); } }, 'Not now'))));
}

let renderedDate = todayISO();

function renderApp() {
  flushPending();
  renderedDate = todayISO();
  const { name, arg } = currentRoute();
  renderTabs(name);
  renderBanner();
  ROUTES[name].render(app, { store, navigate, arg, rerender: renderApp });
}

window.addEventListener('hashchange', () => {
  renderApp();
  window.scrollTo(0, 0);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // iOS may close the app any time after this, so save waiting notes now.
    flushPending();
    return;
  }
  // Coming back (e.g. from a timer app between sets): keep anything typed but not yet
  // logged. Only re-render when the date has rolled over.
  if (todayISO() !== renderedDate) renderApp();
  else renderBanner();
});

renderApp();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
