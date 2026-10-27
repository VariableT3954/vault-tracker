// The 5-day plan, transcribed from reports/Pole vault 5 day training plan.md.
// Row ids follow the plan's item numbers; split compound items get a/b suffixes.
//
// Row: { id, options, target: {GP,SP,C}, sets: {GP,SP,C}, pct?: {phase: {lo, hi}}, maxRef?: {phase: exerciseId} }
//   target  – the plan's cell text, verbatim
//   sets    – how many set lines to show (lower bound of a range; 0 for "skip")
//   pct     – % of a max, when the plan gives one; lo is null for "≤ hi%"
// Option: { exerciseId, name, type, cue?, sets? }  (option.sets overrides row.sets)

export const PHASES = ['GP', 'SP', 'C'];
export const PHASE_NAMES = { GP: 'General prep', SP: 'Specific prep', C: 'Competition' };

const opt = (exerciseId, name, type, extra = {}) => ({ exerciseId, name, type, ...extra });
const tri = (GP, SP, C) => ({ GP, SP, C });

function row(id, options, target, sets, extra = {}) {
  return { id, options: Array.isArray(options) ? options : [options], target, sets, ...extra };
}

// Shared by Monday and Thursday.
const bandRows = (day, n) => [
  row(`${day}-${n}a`, opt('band-external-rotation', 'Band external rotations', 'reps'),
    tri('2 × 15', '2 × 15', '2 × 15'), tri(2, 2, 2)),
  row(`${day}-${n}b`, opt('band-pull-apart', 'Band pull-aparts', 'reps'),
    tri('2 × 15', '2 × 15', '2 × 15'), tri(2, 2, 2)),
];

export const SESSIONS = [
  {
    id: 'mon', weekday: 1, fixed: 'Vault', title: 'Upper body A',
    rows: [
      row('mon-1', opt('iso-squat-push', 'Isometric squat push', 'iso',
        { cue: 'Against pins, knee ~130–140°. Push as fast and hard as possible for 3 s.' }),
        tri('3 × 3 reps × 3 s, 60 s rest', '4 × 3 × 3 s', '2 × 3 × 3 s'), tri(3, 4, 2)),
      row('mon-2', opt('weighted-chin-up', 'Weighted chin-ups', 'lift'),
        tri('4 × 4–6', '4 × 3–4 (heavier)', '2–3 × 3'), tri(4, 4, 2)),
      row('mon-3', opt('db-bench-flat', 'Dumbbell bench (flat)', 'lift'),
        tri('4 × 6', '4 × 4–5', '2–3 × 4–5'), tri(4, 4, 2)),
      row('mon-4', opt('pullover', 'Straight-arm pullover', 'lift', { cue: 'DB or bar, controlled range' }),
        tri('3 × 8', '3 × 6', '2 × 6'), tri(3, 3, 2)),
      row('mon-5', opt('hanging-leg-raise', 'Weighted hanging leg raises', 'lift', { cue: 'Abs A · inversion' }),
        tri('3 × 6–8', '3 × 5–6', '2 × 5'), tri(3, 3, 2)),
      row('mon-6', opt('half-bubka', 'Half-Bubkas (high bar)', 'reps', { cue: 'Abs A · inversion' }),
        tri('3 × 5', '3 × 5', '2 × 4'), tri(3, 3, 2)),
      ...bandRows('mon', 7),
    ],
  },
  {
    id: 'tue', weekday: 2, fixed: 'Sprint', title: 'Plyometrics → Power',
    rows: [
      row('tue-1a', opt('mb-overhead-back', 'Med-ball overhead-backward throw', 'lift', { cue: 'Abs C · ballistic. Weight = ball.' }),
        tri('3 × 4', '3 × 4', '2 × 3'), tri(3, 3, 2)),
      row('tue-1b', opt('mb-rotational', 'Med-ball rotational throw', 'lift', { cue: 'Each side. Weight = ball.' }),
        tri('2 × 5/side', '2 × 4/side', '1 × 4/side'), tri(2, 2, 1)),
      row('tue-2', opt('main-plyos', 'Main plyometrics', 'plyo', { cue: 'Log each drill with its contacts.' }),
        tri('80–120 contacts · pogos, ankle hops, skips for height, short bounds, standing triple jumps, low hurdle hops',
          '80–120 contacts · hurdle hops 4 × 5, alternate-leg bounds 4 × 6–8, single-leg hops 3 × 5/leg, take-off pop-ups 4–6, drop jumps 3 × 5 at your tested box height',
          '40–60 contacts · a few hurdle hops, bounds and pop-ups. Drop jumps only in weeks without a meet.'),
        tri(1, 1, 1)),
      row('tue-3', [opt('power-clean', 'Power clean', 'lift', { cue: 'From the floor' }),
        opt('hang-power-clean', 'Hang power clean', 'lift', { cue: 'Use when technique slips or in season' })],
        tri('5 × 3 at 70–75%', '5 × 2–3 at 75–85%', '3 × 2 at 75–85% (hang power clean)'), tri(5, 5, 3),
        { pct: tri({ lo: 70, hi: 75 }, { lo: 75, hi: 85 }, { lo: 75, hi: 85 }),
          maxRef: tri('power-clean', 'power-clean', 'power-clean') }),
      row('tue-4', opt('jump-squat', 'Jump squat (contrast)', 'lift',
        { cue: '≤30% of squat 1RM → rest 3 min → 3 CMJs' }),
        tri('3 × 5', '4 × 3 → 3 CMJs', '2 × 3 (skip the CMJs)'), tri(3, 4, 2),
        { pct: tri({ lo: null, hi: 30 }, { lo: null, hi: 30 }, { lo: null, hi: 30 }),
          maxRef: tri('back-squat', 'back-squat', 'back-squat') }),
      row('tue-5', opt('bulgarian-split-squat', 'Bulgarian split squat', 'lift', { cue: '/leg · quarter-range in SP and C' }),
        tri('3 × 6/leg', '3 × 4/leg, heavier', '2 × 3/leg'), tri(3, 3, 2)),
      row('tue-6', opt('nordic-curl', 'Nordic hamstring curls', 'reps'),
        tri('2 × 5', '2 × 5', '1 × 5'), tri(2, 2, 1)),
    ],
  },
  {
    id: 'wed', weekday: 3, fixed: 'Active recovery', title: 'Low-intensity work',
    rows: [
      row('wed-1', [opt('spanish-squat', 'Spanish squat hold', 'hold', { cue: '~60° knee bend, hard effort (≥70%)' }),
        opt('wall-sit', 'Wall-sit hold', 'hold', { cue: '~60° knee bend, hard effort (≥70%)' })],
        tri('4 × 30–45 s', '3 × 30 s', '2–3 × 30 s'), tri(4, 3, 2)),
      row('wed-2', opt('single-leg-calf-hold', 'Single-leg calf raise hold', 'hold', { cue: 'Loaded; knee straight, then bent · /leg' }),
        tri('4 × 20–30 s/leg', '3 × 20 s/leg', '2 × 20 s/leg'), tri(4, 3, 2)),
      row('wed-3', opt('long-lever-bridge', 'Single-leg long-lever hamstring bridge', 'iso', { cue: 'Maximal and fast · /leg' }),
        tri('3 × 3 × 3 s/leg', '3 × 3 × 3 s/leg', '2 × 3 × 3 s/leg'), tri(3, 3, 2)),
      row('wed-4', opt('ab-wheel', 'Ab-wheel rollouts', 'reps', { cue: 'Abs B · anti-extension' }),
        tri('3 × 8', '3 × 8', '2 × 8'), tri(3, 3, 2)),
      row('wed-5', [opt('pallof-press', 'Pallof press', 'reps', { cue: 'Abs B · anti-rotation · /side' }),
        opt('cable-chop', 'Cable chops', 'reps', { cue: 'Abs B · anti-rotation · /side' })],
        tri('3 × 10/side', '3 × 10/side', '2 × 10/side'), tri(3, 3, 2)),
      row('wed-6', opt('hollow-hold', 'Hollow-body hold', 'hold', { cue: 'Abs B' }),
        tri('3 × 20–30 s', '3 × 30 s', '2 × 30 s'), tri(3, 3, 2)),
      row('wed-7', opt('back-extension', 'Back extensions', 'reps', { cue: 'Endurance, not heavy' }),
        tri('2 × 12–15', '2 × 12', '2 × 10'), tri(2, 2, 2)),
      row('wed-8', opt('mobility', 'Mobility: active straight-leg raise drills, hip flexors', 'done', { cue: 'Take-off side especially' }),
        tri('5–10 min', '5–10 min', '5–10 min'), tri(1, 1, 1)),
      row('wed-9', opt('gymnastics-light', 'Light gymnastics (optional)', 'done', { cue: 'Handstand holds, inverted hangs, L-sits' }),
        tri('10 min', '10 min', '5 min'), tri(1, 1, 1)),
    ],
  },
  {
    id: 'thu', weekday: 4, fixed: 'Vault', title: 'Upper body B',
    rows: [
      row('thu-1', opt('iso-ankle-push', 'Isometric ankle push', 'iso',
        { cue: 'Single-leg calf push against pins or a strap, ankle near neutral, knee straight · /leg' }),
        tri('3 × 3 × 3 s/leg', '4 × 3 × 3 s/leg', '2 × 3 × 3 s/leg'), tri(3, 4, 2)),
      row('thu-2', opt('iso-split-squat-push', 'Isometric split-squat push', 'iso', { cue: 'At your take-off knee angle · /leg' }),
        tri('2 × 3 × 3 s/leg', '3 × 3 × 3 s/leg', '2 × 3 × 3 s/leg'), tri(2, 3, 2)),
      row('thu-3', [opt('rope-climb', 'Rope climb', 'count', { cue: 'Log the number of climbs', sets: tri(1, 1, 1) }),
        opt('rope-pull', 'Rope pulls', 'count', { cue: 'Log the number of pulls', sets: tri(1, 1, 1) }),
        opt('eccentric-chin-up', 'Eccentric chin-ups', 'lift', { cue: '4–5 s lowering' })],
        tri('4 climbs or 3 × 3 eccentrics', '4 climbs', '2–3 climbs'), tri(3, 3, 3)),
      row('thu-4', opt('db-bench-thu', 'Dumbbell bench (incline or lighter flat)', 'lift'),
        tri('3 × 8', '3 × 6', '2 × 6'), tri(3, 3, 2)),
      row('thu-5', [opt('one-arm-db-row', 'One-arm DB row', 'lift'), opt('ring-row', 'Ring row', 'lift')],
        tri('3 × 8', '3 × 6–8', '2 × 8'), tri(3, 3, 2)),
      row('thu-6', [opt('toes-to-bar', 'Toes-to-bar', 'reps', { cue: 'Abs A · inversion' }),
        opt('rock-back-rings', 'Rock-back drill on rings', 'reps', { cue: 'Abs A · inversion' })],
        tri('3 × 6', '3 × 6', '2 × 5'), tri(3, 3, 2)),
      row('thu-7', [opt('l-sit', 'L-sit hold', 'hold', { cue: 'Abs A · static' }),
        opt('inverted-hang', 'Inverted hang hold', 'hold', { cue: 'Abs A · static' })],
        tri('4 × 10–20 s', '4 × 15–20 s', '3 × 15 s'), tri(4, 4, 3)),
      ...bandRows('thu', 8),
    ],
  },
  {
    id: 'fri', weekday: 5, fixed: 'Sprint', title: 'Plyometrics → Strength',
    rows: [
      row('fri-1a', opt('mb-overhead-back', 'Med-ball overhead-backward throw', 'lift', { cue: 'Abs C · ballistic. Weight = ball.' }),
        tri('3 × 4', '3 × 3', '2 × 3 (or skip)'), tri(3, 3, 2)),
      row('fri-1b', opt('mb-underhand-forward', 'Med-ball underhand-forward throw', 'lift', { cue: 'Abs C · ballistic. Weight = ball.' }),
        tri('3 × 4', '3 × 3', '2 × 3 (or skip)'), tri(3, 3, 2)),
      row('fri-2', opt('short-plyos', 'Short plyometrics', 'plyo', { cue: 'Pogos, single-leg hops, short bounds' }),
        tri('40–80 contacts', '40–60 contacts', 'Skip, or 20 pogos as a primer'), tri(1, 1, 0)),
      row('fri-3', opt('back-squat', 'Back squat', 'lift', { cue: 'Full depth in GP; half/quarter squat in SP and C' }),
        tri('4 × 5 at 75–80%', '4 × 3 at 82–88% (half/quarter squat)', '2–3 × 2–3 at 85–90% (half/quarter squat)'),
        tri(4, 4, 2),
        { pct: tri({ lo: 75, hi: 80 }, { lo: 82, hi: 88 }, { lo: 85, hi: 90 }),
          maxRef: tri('back-squat', 'partial-squat', 'partial-squat') }),
      row('fri-4', [opt('romanian-deadlift', 'Romanian deadlift', 'lift'),
        opt('single-leg-rdl', 'Single-leg RDL', 'lift', { cue: '/leg' }),
        opt('trap-bar-deadlift', 'Trap-bar deadlift', 'lift', { cue: 'Optional swap for one GP block: 3 × 5 at ~80%' })],
        tri('3 × 6', '3 × 5', '2 × 5'), tri(3, 3, 2)),
      row('fri-5', opt('nordic-curl', 'Nordic hamstring curls', 'reps'),
        tri('3 × 6', '3 × 6', '2 × 5'), tri(3, 3, 2)),
      row('fri-6', opt('heavy-calf-raise', 'Heavy calf raise', 'lift', { cue: 'Slow' }),
        tri('3 × 8', '3 × 6', '2 × 6'), tri(3, 3, 2)),
      row('fri-7', [opt('ab-wheel', 'Ab-wheel rollouts', 'reps', { cue: 'Abs B · short' }),
        opt('pallof-press', 'Pallof press', 'reps', { cue: 'Abs B · short · /side' })],
        tri('2 × 8', '2 × 8', '2 × 6'), tri(2, 2, 2)),
    ],
  },
];

export function getSession(id) {
  return SESSIONS.find((s) => s.id === id);
}

export function findRow(rowId) {
  for (const s of SESSIONS) {
    const r = s.rows.find((x) => x.id === rowId);
    if (r) return r;
  }
  return undefined;
}

// Sets to show for a row in a phase, honouring an option's own override.
export function setsFor(row, option, phase) {
  return (option.sets ?? row.sets)[phase];
}

// Which option a row shows: the one already logged, else the remembered choice, else the first.
export function resolveOption(row, entry, choice) {
  const byId = (id) => row.options.find((o) => o.exerciseId === id);
  if (entry?.sets?.length) return byId(entry.exerciseId) ?? row.options[0];
  return byId(choice) ?? row.options[0];
}

export function exerciseInfo(exerciseId) {
  for (const s of SESSIONS) {
    for (const r of s.rows) {
      const o = r.options.find((x) => x.exerciseId === exerciseId);
      if (o) return { name: o.name, type: o.type };
    }
  }
  return undefined;
}

// Every lift that can have a max, for the Maxes screen.
export function liftExercises() {
  const seen = new Map();
  for (const s of SESSIONS) {
    for (const r of s.rows) {
      for (const o of r.options) {
        if (o.type === 'lift' && !seen.has(o.exerciseId)) seen.set(o.exerciseId, o.name);
      }
    }
  }
  seen.set('partial-squat', 'Half/quarter squat');
  return [...seen].map(([exerciseId, name]) => ({ exerciseId, name }));
}
