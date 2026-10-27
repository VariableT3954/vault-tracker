// Back up through the iPhone share sheet (Save to Files), or a download elsewhere.
import { h, choiceDialog, confirmDialog, toast } from './dom.js';
import { buildBackup, parseBackup } from '../backup.js';
import { formatDate, todayISO } from '../logic.js';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function runBackup(store) {
  const { filename, text } = buildBackup(store.getState(), new Date());
  const file = new File([text], filename, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const url = URL.createObjectURL(file);
      const a = h('a', { href: url, download: filename });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch (e) {
    if (e.name !== 'AbortError') toast("Couldn't create the backup");
    return false;
  }
  store.markBackedUp();
  toast('Backup saved');
  return true;
}

// Opens the file picker and restores a backup after confirmation.
export function pickAndImport(store, onDone) {
  const input = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    const result = parseBackup(await file.text());
    if (!result.ok) {
      await choiceDialog(`${result.error} Nothing was changed.`, [], 'OK');
      return;
    }
    const { exportedAt, workouts, journal } = result.summary;
    const when = exportedAt ? formatDate(todayISO(new Date(exportedAt))) : 'an unknown date';
    const ok = await confirmDialog(
      `Replace all data on this phone with the backup from ${when}? It has ${plural(workouts, 'workout')} and ${plural(journal, 'journal entry', 'journal entries')}.`,
      'Replace my data',
      { danger: true },
    );
    if (!ok) return;
    store.replaceAll(result.data);
    toast('Backup restored');
    onDone?.();
  });
  document.body.append(input);
  input.click();
}
