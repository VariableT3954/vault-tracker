import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, parseBackup, needsBackupReminder } from '../js/backup.js';
import { emptyState } from '../js/store.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 30, 12);
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

function sampleState() {
  const s = emptyState();
  s.workouts.push(
    { id: 'a', sessionId: 'fri', phase: 'GP', date: '2026-10-23', startedAt: 'x', finishedAt: 'y', entries: {} },
    { id: 'b', sessionId: 'mon', phase: 'GP', date: '2026-10-26', startedAt: 'x', finishedAt: null, entries: {} },
  );
  s.journal['2026-10-26'] = { text: 'six lefts', updatedAt: 'x' };
  return s;
}

test('backup file name and round trip', () => {
  const state = sampleState();
  const { filename, text } = buildBackup(state, NOW);
  assert.equal(filename, 'vault-tracker-backup-2026-10-30.json');
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data, state);
  assert.equal(parsed.summary.workouts, 1, 'only finished workouts counted');
  assert.equal(parsed.summary.journal, 1);
  assert.equal(parsed.summary.exportedAt, NOW.toISOString());
});

test('rejects non-backup files', () => {
  const good = JSON.parse(buildBackup(sampleState(), NOW).text);
  const noWorkouts = { ...good, data: { ...good.data, workouts: undefined } };
  const cases = [
    '',
    '{bad',
    '\x89PNG\r\n',
    '{"app":"other"}',
    JSON.stringify({ ...good, format: 2 }),
    JSON.stringify(noWorkouts),
    JSON.stringify({ ...good, data: { ...good.data, settings: null } }),
  ];
  for (const text of cases) {
    const r = parseBackup(text);
    assert.equal(r.ok, false, `rejected: ${text.slice(0, 40)}`);
    assert.ok(r.error.length > 0);
  }
});

test('reminder rules', () => {
  const s = emptyState();
  assert.equal(needsBackupReminder(s, NOW), false, 'no changes');

  s.unbackedSince = ago(6 * DAY);
  assert.equal(needsBackupReminder(s, NOW), false, '6 days, never backed up');

  s.unbackedSince = ago(8 * DAY);
  assert.equal(needsBackupReminder(s, NOW), true, '8 days, never backed up');

  s.lastBackupAt = ago(8 * DAY);
  s.unbackedSince = ago(1 * DAY);
  assert.equal(needsBackupReminder(s, NOW), true, 'last backup 8 days ago, change yesterday');

  s.reminderDismissedAt = ago(2 * 60 * 60 * 1000);
  assert.equal(needsBackupReminder(s, NOW), false, 'dismissed 2 h ago');

  s.reminderDismissedAt = ago(25 * 60 * 60 * 1000);
  assert.equal(needsBackupReminder(s, NOW), true, 'dismissed over a day ago');

  s.lastBackupAt = NOW.toISOString();
  s.unbackedSince = null;
  assert.equal(needsBackupReminder(s, NOW), false, 'just backed up');
});
