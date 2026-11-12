// Two training programs, each transcribed from its plan in reports/:
//   vault  – Pole vault 5 day training plan.md
//   sprint – Collegiate 100 to 800 lifting plan.md
// Row ids follow the plans' item numbers; split compound items get a/b suffixes.
//
// Row: { id, options, target, sets, pct?, maxRef?, phases? } — every field keyed by phase
//   target  – the plan's cell text
//   sets    – how many set lines to show (lower bound of a range; 0 for "skip")
//   pct     – % of a max, when the plan gives one; lo is null for "≤ hi%"
//   phases  – the phases the row appears in (all of the program's phases when absent)
// Option: { exerciseId, name, type, cue?, target?, sets?, pct?, maxRef? }
//   an option's own target/sets/pct/maxRef replace the row's (pct: {} means no % target)
import { weekdayOf } from './logic.js';

export const PHASE_NAMES = {
  GP: 'General prep', SP: 'Specific prep', MS: 'Max strength', PW: 'Power', C: 'Competition',
};

const opt = (exerciseId, name, type, extra = {}) => ({ exerciseId, name, type, ...extra });
const tri = (GP, SP, C) => ({ GP, SP, C });
const quad = (GP, MS, PW, C) => ({ GP, MS, PW, C });
const pct = (lo, hi) => ({ lo, hi });
// The same value in every listed phase.
const each = (phases, v) => Object.fromEntries(phases.map((p) => [p, v]));
const RUN = ['GP', 'MS', 'PW', 'C'];

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

const VAULT_SESSIONS = [
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

// Lifting only; the running is planned separately. Mon/Fri load the legs, Tue/Thu are upper body.
const SPRINT_SESSIONS = [
  {
    id: 'r-mon', weekday: 1, fixed: null, title: 'Lower A · Strength',
    rows: [
      row('r-mon-1', [
        opt('hang-power-clean', 'Hang power clean', 'lift'),
        opt('clean-pull', 'Clean pull', 'lift', {
          cue: 'No catch: pull past the hips. % of your power clean max.',
          target: quad('4 × 3 at 85–95%', '4 × 3 at 90–100%', '4 × 2 at 90–100%', '3 × 2 at 90–100%'),
          sets: quad(4, 4, 4, 3),
          pct: quad(pct(85, 95), pct(90, 100), pct(90, 100), pct(90, 100)),
        }),
        opt('jump-shrug', 'Jump shrug', 'lift', {
          cue: '% of your power clean max',
          target: quad('3 × 4 at 30–45%', '3 × 4 at 30–45%', '3 × 4 at 30–45%', '2 × 3 at 30–45%'),
          sets: quad(3, 3, 3, 2),
          pct: each(RUN, pct(30, 45)),
        })],
      quad('4 × 3 at 65–75%', '4 × 3 at 75–85%', '5 × 2 at 80–87%', '3 × 2 at 80–87%'), quad(4, 4, 5, 3),
      { pct: quad(pct(65, 75), pct(75, 85), pct(80, 87), pct(80, 87)), maxRef: each(RUN, 'power-clean') }),
      row('r-mon-2a', opt('back-squat', 'Back squat', 'lift', { cue: 'Full depth' }),
        { GP: '5 × 5 at 65–75%', MS: '4 × 3–5 at 80–90%' }, { GP: 5, MS: 4 },
        { phases: ['GP', 'MS'], pct: { GP: pct(65, 75), MS: pct(80, 90) }, maxRef: each(['GP', 'MS'], 'back-squat') }),
      row('r-mon-2b', opt('partial-squat', 'Half squat', 'lift', { cue: 'Thighs about parallel or a little above' }),
        { PW: '3 × 3 at 85–90%', C: '2–3 × 2–3 at 85–90%' }, { PW: 3, C: 2 },
        { phases: ['PW', 'C'], pct: each(['PW', 'C'], pct(85, 90)), maxRef: each(['PW', 'C'], 'partial-squat') }),
      row('r-mon-3', [opt('romanian-deadlift', 'Romanian deadlift', 'lift'), opt('trap-bar-deadlift', 'Trap-bar deadlift', 'lift')],
        quad('3 × 6', '3 × 4–5, heavy', '3 × 4', '2 × 5'), quad(3, 3, 3, 2)),
      row('r-mon-4', opt('nordic-curl', 'Nordic hamstring curls', 'reps'),
        quad('3 × 4', '3 × 5', '2 × 5', '2 × 5'), quad(3, 3, 2, 2)),
      row('r-mon-5', [opt('standing-calf-raise', 'Standing calf raise', 'lift', { cue: 'Heavy and slow' }),
        opt('single-leg-calf-raise', 'Single-leg calf raise', 'lift', { cue: 'Heavy and slow · /leg' })],
        quad('3 × 8–10', '3 × 6–8', '2 × 6–8', '2 × 6–8'), quad(3, 3, 2, 2)),
    ],
  },
  {
    id: 'r-tue', weekday: 2, fixed: null, title: 'Upper A',
    rows: [
      row('r-tue-1', [opt('bench-press', 'Bench press', 'lift'),
        opt('db-bench', 'Dumbbell bench', 'lift', {
          target: quad('3 × 6', '3 × 5', '3 × 4', '2–3 × 4'), pct: {}, maxRef: {},
        })],
        quad('3 × 6 at 65–75%', '3 × 4–5 at 75–85%', '3 × 3–4 at 80–85%', '2–3 × 3 at about 85%'), quad(3, 3, 3, 2),
        { pct: quad(pct(65, 75), pct(75, 85), pct(80, 85), pct(85, 85)), maxRef: each(RUN, 'bench-press') }),
      row('r-tue-2', [opt('weighted-pull-up', 'Weighted pull-up', 'lift'), opt('barbell-row', 'Barbell row', 'lift')],
        quad('3 × 6', '3 × 4–5', '3 × 4', '2 × 4'), quad(3, 3, 3, 2)),
      row('r-tue-3', opt('copenhagen-adduction', 'Copenhagen adduction', 'reps', { cue: '/side' }),
        quad('1 × 6–10/side, building weekly', '1 × 12–15/side', '1 × 12–15/side', '1 × 12–15/side'), quad(1, 1, 1, 1)),
    ],
  },
  {
    id: 'r-thu', weekday: 4, fixed: null, title: 'Upper B',
    rows: [
      row('r-thu-1', [opt('incline-db-press', 'Incline dumbbell press', 'lift'), opt('overhead-press', 'Overhead press', 'lift')],
        quad('3 × 8', '3 × 6', '3 × 5', '2 × 5'), quad(3, 3, 3, 2)),
      row('r-thu-2', [opt('chin-up', 'Chin-up', 'lift'), opt('one-arm-db-row', 'One-arm DB row', 'lift')],
        quad('3 × 8', '3 × 6', '3 × 5', '2 × 5'), quad(3, 3, 3, 2)),
      row('r-thu-3', opt('copenhagen-adduction', 'Copenhagen adduction', 'reps', { cue: '/side' }),
        { GP: '1 × 6–10/side', MS: '1 × 12–15/side', PW: '1 × 12–15/side' }, { GP: 1, MS: 1, PW: 1 },
        { phases: ['GP', 'MS', 'PW'] }),
      row('r-thu-4', [opt('jump-shrug', 'Jump shrug (power touch)', 'lift', { cue: 'Optional. Skip if the legs feel flat before a meet. % of power clean max.' }),
        opt('speed-squat', 'Speed squat (power touch)', 'lift', {
          cue: 'Optional. Move it fast. % of back squat max.',
          target: { C: '2–3 × 2 at 50–60%, fast' }, pct: { C: pct(50, 60) }, maxRef: { C: 'back-squat' },
        })],
        { C: '2–3 × 2 at 30–45%, fast' }, { C: 2 },
        { phases: ['C'], pct: { C: pct(30, 45) }, maxRef: { C: 'power-clean' } }),
    ],
  },
  {
    id: 'r-fri', weekday: 5, fixed: null, title: 'Lower B · Power',
    rows: [
      row('r-fri-1', [opt('jump-squat', 'Jump squat', 'lift', { cue: '% of back squat max' }),
        opt('speed-squat', 'Banded speed squat', 'lift', {
          cue: 'Move the bar fast. % of back squat max.',
          target: { GP: '3 × 5 at 50–60%', MS: '4 × 4 at 50–60%', PW: '4 × 3 at 50–60%' },
          pct: each(['GP', 'MS', 'PW'], pct(50, 60)),
        })],
        { GP: '3 × 5 at 25–30%', MS: '4 × 4 at 25–30%', PW: '4 × 3 at 25–30%' }, { GP: 3, MS: 4, PW: 4 },
        { phases: ['GP', 'MS', 'PW'], pct: each(['GP', 'MS', 'PW'], pct(25, 30)), maxRef: each(['GP', 'MS', 'PW'], 'back-squat') }),
      row('r-fri-2', [opt('rfe-split-squat', 'Rear-foot-elevated split squat', 'lift', { cue: '/leg' }),
        opt('step-up', 'Step-up', 'lift', { cue: '/leg' })],
        { GP: '3 × 6/leg', MS: '3 × 5/leg', PW: '2 × 5/leg' }, { GP: 3, MS: 3, PW: 2 }, { phases: ['GP', 'MS', 'PW'] }),
      row('r-fri-3', opt('hip-thrust', 'Barbell hip thrust', 'lift'),
        { GP: '3 × 6', MS: '3 × 5, heavy', PW: '3 × 3–5, fast' }, { GP: 3, MS: 3, PW: 3 }, { phases: ['GP', 'MS', 'PW'] }),
      row('r-fri-4', opt('seated-leg-curl', 'Seated leg curl', 'lift'),
        { GP: '3 × 8', MS: '3 × 6–8', PW: '2 × 8' }, { GP: 3, MS: 3, PW: 2 }, { phases: ['GP', 'MS', 'PW'] }),
      row('r-fri-5', opt('nordic-curl', 'Nordic hamstring curls', 'reps'),
        { GP: '2 × 4', MS: '2 × 5', PW: '2 × 4' }, { GP: 2, MS: 2, PW: 2 }, { phases: ['GP', 'MS', 'PW'] }),
      row('r-fri-6', opt('seated-calf-raise', 'Seated calf raise', 'lift', { cue: 'Heavy' }),
        { GP: '3 × 8–10', MS: '3 × 6–8' }, { GP: 3, MS: 3 }, { phases: ['GP', 'MS'] }),
      row('r-fri-7', [opt('jump-squat', 'Jump squat (meet primer)', 'lift', { cue: 'Before a Saturday meet. Light and fast, or skip.' }),
        opt('hang-power-clean', 'Hang power clean (meet primer)', 'lift', {
          cue: 'Before a Saturday meet. Light and fast, or skip.',
          target: { C: '2 × 2 at 50–65%, fast' }, pct: { C: pct(50, 65) }, maxRef: { C: 'power-clean' },
        })],
        { C: '2 × 2 at 20–30%, or skip' }, { C: 2 },
        { phases: ['C'], pct: { C: pct(20, 30) }, maxRef: { C: 'back-squat' } }),
    ],
  },
];

export const PROGRAMS = {
  vault: {
    id: 'vault', name: 'Pole vault', phases: ['GP', 'SP', 'C'], sessions: VAULT_SESSIONS,
    keyMaxes: ['back-squat', 'partial-squat', 'power-clean'],
    tabs: ['today', 'history', 'journal', 'notes', 'more'], restTitle: 'Rest day',
  },
  sprint: {
    id: 'sprint', name: '100–800 m runner', phases: RUN, sessions: SPRINT_SESSIONS,
    keyMaxes: ['back-squat', 'partial-squat', 'power-clean', 'bench-press'],
    tabs: ['today', 'history', 'more'], restTitle: 'No lifting today',
  },
};
export const PROGRAM_IDS = Object.keys(PROGRAMS);

export const getProgram = (id) => PROGRAMS[id];

const allSessions = () => PROGRAM_IDS.flatMap((p) => PROGRAMS[p].sessions);

export function getSession(id) {
  return allSessions().find((s) => s.id === id);
}

export function findRow(rowId) {
  for (const s of allSessions()) {
    const r = s.rows.find((x) => x.id === rowId);
    if (r) return r;
  }
  return undefined;
}

// The program's session for a date's weekday, or null on a day off.
export function defaultSessionId(programId, iso) {
  const day = weekdayOf(iso);
  return getProgram(programId)?.sessions.find((s) => s.weekday === day)?.id ?? null;
}

export function rowsFor(session, phase) {
  return session.rows.filter((r) => !r.phases || r.phases.includes(phase));
}

// Target, set count and % of which max for one option in one phase.
export function planFor(row, option, phase) {
  const pick = (key) => (option[key] ?? row[key])?.[phase];
  return { target: pick('target'), sets: pick('sets'), pct: pick('pct'), maxRef: pick('maxRef') };
}

// Which option a row shows: the one already logged, else the remembered choice, else the first.
export function resolveOption(row, entry, choice) {
  const byId = (id) => row.options.find((o) => o.exerciseId === id);
  if (entry?.sets?.length) return byId(entry.exerciseId) ?? row.options[0];
  return byId(choice) ?? row.options[0];
}

export function exerciseInfo(exerciseId) {
  for (const s of allSessions()) {
    for (const r of s.rows) {
      const o = r.options.find((x) => x.exerciseId === exerciseId);
      if (o) return { name: o.name, type: o.type };
    }
  }
  return undefined;
}

// Every lift in a program that can have a max, for the Maxes screen.
export function liftExercises(programId) {
  const seen = new Map();
  for (const s of getProgram(programId).sessions) {
    for (const r of s.rows) {
      for (const o of r.options) {
        if (o.type === 'lift' && !seen.has(o.exerciseId)) seen.set(o.exerciseId, o.name);
      }
    }
  }
  // Maxes that % targets point at, even when no exercise in the program has that exact id
  // (the runner's hang cleans use the power clean max).
  for (const id of getProgram(programId).keyMaxes) {
    if (!seen.has(id)) seen.set(id, exerciseInfo(id)?.name ?? id);
  }
  seen.set('partial-squat', 'Half/quarter squat');
  return [...seen].map(([exerciseId, name]) => ({ exerciseId, name }));
}
