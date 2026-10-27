// Backup file format, import checks and the backup reminder rule. No DOM access.
import { todayISO } from './logic.js';

const APP = 'vault-tracker';
const FORMAT = 1;
const DAY = 24 * 60 * 60 * 1000;
const REMIND_AFTER = 7 * DAY;
const SNOOZE = DAY;

export function buildBackup(state, now) {
  return {
    filename: `vault-tracker-backup-${todayISO(now)}.json`,
    text: JSON.stringify({ app: APP, format: FORMAT, exportedAt: now.toISOString(), data: state }),
  };
}

const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

export function parseBackup(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a Vault Tracker backup." };
  }
  if (!isObject(file) || file.app !== APP) {
    return { ok: false, error: "This file isn't a Vault Tracker backup." };
  }
  if (file.format !== FORMAT) {
    return { ok: false, error: 'This backup was made by a different version of the app.' };
  }
  const d = file.data;
  if (!isObject(d) || !Array.isArray(d.workouts) || !isObject(d.settings)) {
    return { ok: false, error: 'This backup file is damaged or incomplete.' };
  }
  return {
    ok: true,
    data: d,
    summary: {
      exportedAt: file.exportedAt,
      workouts: d.workouts.filter((w) => w && w.finishedAt).length,
      journal: isObject(d.journal) ? Object.keys(d.journal).length : 0,
    },
  };
}

export function needsBackupReminder(state, now) {
  if (!state.unbackedSince) return false;
  const since = new Date(state.lastBackupAt ?? state.unbackedSince).getTime();
  if (now.getTime() - since <= REMIND_AFTER) return false;
  if (state.reminderDismissedAt && now.getTime() - new Date(state.reminderDismissedAt).getTime() < SNOOZE) {
    return false;
  }
  return true;
}
