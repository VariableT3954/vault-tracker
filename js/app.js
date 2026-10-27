import { createStore } from './store.js';
import { h } from './ui/dom.js';
import * as today from './ui/today.js';

const store = createStore(localStorage);
// Handy for checking data from the browser console.
window.store = store;

// Ask Safari not to clear our data when space runs low. Not guaranteed, hence backups.
navigator.storage?.persist?.().catch(() => {});

const stub = (title) => ({ render: (root) => root.replaceChildren(h('h1', {}, title)) });

const ROUTES = {
  today,
  history: stub('History'),
  journal: stub('Vault journal'),
  notes: stub('Steps & poles'),
  more: stub('More'),
};

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

function renderApp() {
  const { name, arg } = currentRoute();
  renderTabs(name);
  ROUTES[name].render(app, { store, navigate, arg, rerender: renderApp });
}

window.addEventListener('hashchange', () => {
  renderApp();
  window.scrollTo(0, 0);
});

renderApp();
