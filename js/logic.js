// Pure helpers shared by the store and the UI. No DOM access.

// Fields logged per set, by exercise type.
export const FIELDS = {
  lift: ['weight', 'reps'],
  iso: ['reps', 'seconds'],
  plyo: ['drill', 'contacts'],
  reps: ['reps'],
  hold: ['seconds'],
  count: ['count'],
  done: ['minutes'],
};

const SESSION_BY_WEEKDAY = [null, 'mon', 'tue', 'wed', 'thu', 'fri', null];

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date, never UTC: a workout at 11:30 pm belongs to that day.
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Parse YYYY-MM-DD as a local date. new Date('YYYY-MM-DD') would read it as UTC.
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function defaultSessionId(iso) {
  return SESSION_BY_WEEKDAY[parseISO(iso).getDay()];
}

export function isVaultDay(iso) {
  const day = parseISO(iso).getDay();
  return day === 1 || day === 4;
}

export function round5(n) {
  return Math.round(n / 5) * 5;
}

export function targetWeightText(pct, max) {
  if (!pct || !max) return null;
  const hi = round5((max * pct.hi) / 100);
  if (pct.lo == null) return `≤ ${hi} lb`;
  const lo = round5((max * pct.lo) / 100);
  return lo === hi ? `${lo} lb` : `${lo}–${hi} lb`;
}

// One logged set as short text, e.g. "185 lb × 5".
export function formatSet(type, v) {
  switch (type) {
    case 'lift': return v.weight == null ? `× ${v.reps}` : `${v.weight} lb × ${v.reps}`;
    case 'iso': return `${v.reps} × ${v.seconds} s`;
    case 'plyo': return v.drill ? `${v.drill} · ${v.contacts} contacts` : `${v.contacts} contacts`;
    case 'reps': return `${v.reps} reps`;
    case 'hold': return `${v.seconds} s`;
    case 'count': return `${v.count}`;
    case 'done': return v.minutes == null ? 'Done' : `Done · ${v.minutes} min`;
    default: return '';
  }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso) {
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Numbers typed on a phone: trims spaces, rejects blanks, junk and negatives.
export function parseNum(input) {
  const s = String(input ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
