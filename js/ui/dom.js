// Small DOM helpers shared by the screens.

// h('button', { class: 'primary', onclick }, 'Save')
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Ask a question with several answers. Resolves to the chosen value, or null on cancel.
export function choiceDialog(message, choices, cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    const dlg = h('dialog', {},
      h('p', {}, message),
      h('div', { class: 'stack' },
        choices.map((c) => h('button', {
          class: c.danger ? 'danger block' : c.primary ? 'primary block' : 'block',
          onclick: () => close(c.value),
        }, c.label)),
        h('button', { class: 'block', onclick: () => close(null) }, cancelLabel),
      ),
    );
    const close = (value) => {
      dlg.close();
      dlg.remove();
      resolve(value);
    };
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(null);
    });
    document.body.append(dlg);
    dlg.showModal();
  });
}

export async function confirmDialog(message, okLabel = 'OK', { danger = false } = {}) {
  const v = await choiceDialog(message, [{ label: okLabel, value: true, danger, primary: !danger }]);
  return v === true;
}

let toastTimer;
export function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const pending = new Set();

export function debounce(fn, ms) {
  let t;
  let last;
  const run = () => {
    clearTimeout(t);
    pending.delete(d);
    fn(...last);
  };
  const d = (...args) => {
    last = args;
    clearTimeout(t);
    pending.add(d);
    t = setTimeout(run, ms);
  };
  // Run the waiting call now, if there is one.
  d.flush = () => {
    if (pending.has(d)) run();
  };
  return d;
}

// Save everything still waiting to be saved: before leaving a screen, finishing a
// workout, or when iOS sends the app to the background.
export function flushPending() {
  for (const d of [...pending]) d.flush();
}
