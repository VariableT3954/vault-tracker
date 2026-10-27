# Vault Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An installable, offline iPhone web app that guides the user through their 5-day pole vault strength plan and logs every set, with history, a vault journal, a steps/poles/grips note, maxes, and backup/import through the Files app.

**Architecture:** A static site with no build step and no dependencies, served from GitHub Pages. Pure logic lives in ES modules (`js/logic.js`, `js/plan.js`, `js/store.js`, `js/backup.js`) tested with Node's built-in test runner. The UI is plain DOM code in `js/ui/*.js`, with hash routing and a bottom tab bar. All data is one JSON object in `localStorage`, saved on every change. A service worker caches the app shell for offline use.

**Tech Stack:** HTML, CSS, JavaScript ES modules; Node 24 `node --test` for tests (dev only); git; GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-26-vault-tracker-design.md`. The plan content comes from `C:\The Beginning of the End\reports\Pole vault 5 day training plan.md`.

## Global Constraints

- Target platform: iOS Safari, used as a standalone Home Screen app. Must work fully offline after the first load.
- Units: pounds (lb). Weights computed from maxes are rounded to the nearest 5 lb.
- No accounts, server, sync, charts, video, plan editing, or meet-week/taper/deload variants.
- No runtime dependencies or CDN scripts: everything is served from the repo, so it works offline.
- All paths are relative (`./`), so the app works at `https://<user>.github.io/<repo>/`.
- Storage key: `vault-tracker:v1`. Backup file: JSON, `app: "vault-tracker"`, `format: 1`.
- Backup reminder threshold: more than 7 days.
- Inputs must use a font size of at least 16px so iOS doesn't zoom when one is tapped. Tap targets are at least 44px.
- Only one in-progress workout at a time. Logged sets are never dropped without a confirmation.

## Review Focus

1. **iOS closes the app between sets.** Reopening must restore the in-progress workout with every logged set. Test: `store.test.js` › "restores in-progress workout from storage".
2. **Importing a wrong or damaged file** (a photo, truncated JSON, another app's JSON). It must be rejected with a message and existing data left untouched. Test: `backup.test.js` › "rejects non-backup files".
3. **Saved data that can't be read at startup** (malformed JSON in storage). The app must not crash or blank the screen: it keeps the raw text under `vault-tracker:corrupt-<timestamp>` and starts empty. Test: `store.test.js` › "survives corrupt storage".
4. **Messy number entry:** blank fields, `102.5`, `" 95 "`, `-5`, `abc`. Values store as numbers; blanks and invalid input store as `null`; negatives are rejected. Test: `logic.test.js` › "parseNum".
5. **Late-night workouts:** at 11:30 pm the date must be the local calendar date, not the UTC date, or the workout lands on the wrong day. Test: `logic.test.js` › "todayISO uses local date".

---

### Task 1: Project setup and core logic

**Files:**
- Create: `package.json`, `.gitignore`, `js/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Produces:
  - `todayISO(now?: Date): string`: local `YYYY-MM-DD`.
  - `defaultSessionId(iso: string): "mon"|"tue"|"wed"|"thu"|"fri"|null`: weekday → session; Sat/Sun → `null`.
  - `isVaultDay(iso: string): boolean`: Mon or Thu.
  - `round5(n: number): number`
  - `targetWeightText(pct: {lo: number|null, hi: number}|undefined, max: number|undefined): string|null`: `"185–195 lb"` (en dash), `"≤ 95 lb"` when `lo` is null, `null` when there's no pct or no max.
  - `parseNum(input: string): number|null`
  - `FIELDS: Record<ExerciseType, string[]>` = `{lift:["weight","reps"], iso:["reps","seconds"], plyo:["drill","contacts"], reps:["reps"], hold:["seconds"], count:["count"], done:["minutes"]}`
  - `addDaysISO(iso: string, days: number): string`

- [ ] **Step 1:** In `C:\The Beginning of the End\Vault Tracker`, run `git init -b main`. Create `package.json`, `{"name":"vault-tracker","private":true,"type":"module","scripts":{"test":"node --test tests/"}}`, and a `.gitignore` containing `node_modules/` and `.DS_Store`.
- [ ] **Step 2: Write failing tests** in `tests/logic.test.js`:
  - `todayISO(new Date(2026, 9, 27, 23, 30)) === "2026-10-27"` ("todayISO uses local date").
  - `defaultSessionId`: `"2026-10-26"` → `"mon"`, `"2026-10-27"` → `"tue"`, `"2026-10-28"` → `"wed"`, `"2026-10-29"` → `"thu"`, `"2026-10-30"` → `"fri"`, `"2026-10-31"` → `null`, `"2026-11-01"` → `null`.
  - `isVaultDay("2026-10-26") === true`, `isVaultDay("2026-10-29") === true`, `isVaultDay("2026-10-27") === false`.
  - `round5(187.4) === 185`, `round5(187.5) === 190`.
  - `targetWeightText({lo:75,hi:80}, 250) === "190–200 lb"`; `targetWeightText({lo:null,hi:30}, 300) === "≤ 90 lb"`; `targetWeightText({lo:75,hi:80}, undefined) === null`; `targetWeightText(undefined, 250) === null`.
  - "parseNum": `"102.5"` → `102.5`, `" 95 "` → `95`, `""` → `null`, `"abc"` → `null`, `"-5"` → `null`.
  - `addDaysISO("2026-10-31", 1) === "2026-11-01"`.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement `js/logic.js`. Parse ISO dates as local dates (`new Date(y, m-1, d)`), never with `new Date("YYYY-MM-DD")`, which reads them as UTC.
- [ ] **Step 5:** Run `npm test`. Expected: all pass.
- [ ] **Step 6:** Commit: `git add -A && git commit -m "feat: project setup and core date/weight logic"`.

### Task 2: Plan data

**Files:**
- Create: `js/plan.js`
- Test: `tests/plan.test.js`

**Interfaces:**
- Consumes: `FIELDS` from `js/logic.js`.
- Produces:
  - `PHASES = ["GP","SP","C"]`, `PHASE_NAMES = {GP:"General prep", SP:"Specific prep", C:"Competition"}`
  - `SESSIONS: Session[]`, in order mon, tue, wed, thu, fri.
    - `Session = {id, weekday: 1..5, fixed: "Vault"|"Sprint"|"Active recovery", title: string, rows: Row[]}`
    - `Row = {id: string /* e.g. "fri-3" */, options: Option[], target: {GP,SP,C: string}, sets: {GP,SP,C: number}, pct?: {GP?,SP?,C?: {lo:number|null, hi:number}}, maxRef?: {GP?,SP?,C?: string}}`. `pct[phase]` and `maxRef[phase]` are always set together.
    - `Option = {exerciseId: string, name: string, type: keyof FIELDS, cue?: string}`
  - `getSession(id): Session|undefined`
  - `liftExercises(): {exerciseId, name}[]`: every unique `type:"lift"` option, plus `partial-squat`, for the Maxes screen.

- [ ] **Step 1: Write failing tests** in `tests/plan.test.js`:
  - 5 sessions with ids `mon,tue,wed,thu,fri` and fixed sessions `Vault,Sprint,Active recovery,Vault,Sprint`.
  - Every row id is unique; every row has a non-empty `target` string and an integer `sets ≥ 0` for each of GP/SP/C; every option `type` is a key of `FIELDS`.
  - For every row and phase with `pct[phase]`, `maxRef[phase]` exists and is an exercise id present in `liftExercises()`.
  - Spot checks copied from the plan:
    - Fri row "Back squat": `target.GP === "4 × 5 at 75–80%"` and `pct.GP` = `{lo:75,hi:80}`.
    - Tue power clean: `pct.SP` = `{lo:75,hi:85}`.
    - Tue jump squat: `maxRef.GP` = `"back-squat"`, `pct.GP.hi` = 30.
    - Fri back squat: `maxRef.GP` = `"back-squat"`, `maxRef.SP` = `"partial-squat"`.
    - Mon row 1 is `type:"iso"`.
    - The Fri RDL row has options `romanian-deadlift`, `single-leg-rdl`, `trap-bar-deadlift`.
  - Mon flat DB bench and Thu DB bench have different `exerciseId`s (`db-bench-flat`, `db-bench-thu`). Nordics on Tue and Fri share `nordic-curl`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Transcribe every row of the five session tables in the plan file into `js/plan.js`:
  - **`target`:** copy each phase cell verbatim.
  - **`sets`:** the first number in the cell. For a range like "2–3 × 3", use the lower bound. Use 0 for "skip" cells, and 1 for single-entry blocks (plyo blocks, mobility).
  - **`pct`:** only for cells with % of max.
  - **`maxRef`:**
    - Power clean / hang power clean → `power-clean`.
    - Fri back squat → `back-squat` for GP and `partial-squat` for SP/C.
    - Jump squat → `back-squat`.
  - **Rows with "or" alternatives:** one Option each, listed first-mentioned first.
  - **Split compound rows into separate rows:** Tue/Fri med-ball pairs, and "band external rotations + pull-aparts".
  - **`cue`:** short notes such as "knee ~130–140°" or "/leg".
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -am "feat: encode 5-day training plan"` (add the new files first).

### Task 3: Data store

**Files:**
- Create: `js/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Consumes: `todayISO` from logic; `getSession` from plan.
- Produces: `createStore(storage: {getItem,setItem}, now: () => Date = () => new Date())` returning:
  - `getState(): State`; `subscribe(fn): () => void`
  - `setPhase(p)`; `setMax(exerciseId, value: number)`; `clearMax(exerciseId)`
  - `inProgress(): Workout|null`; `isStale(): boolean`: true when the in-progress workout's `date` is before today.
  - `hasLoggedSets(): boolean`
  - `startWorkout(sessionId): Workout`: replaces an in-progress workout that has no sets; throws `Error("IN_PROGRESS")` if the current one has logged sets.
  - `logSet(rowId, exerciseId, values: object)`; `updateSet(rowId, i, values)`; `deleteSet(rowId, i)`; `setNote(rowId, text)`
  - `choiceFor(rowId): string|undefined`; `chooseOption(rowId, exerciseId)`
  - `finishWorkout()`: sets `finishedAt`; a workout with zero sets is discarded instead.
  - `discardWorkout()`
  - `history(): Workout[]`: finished workouts only, newest first (by `date`, then `startedAt`); `deleteWorkout(id)`
  - `prefill(exerciseId, setIndex): object|null`
  - `saveJournal(iso, text)`; `deleteJournal(iso)`; `journalEntries(): {date, text, updatedAt}[]`, newest first
  - `setSetupNote(text)`
  - `markBackedUp()`; `dismissReminder()`; `replaceAll(data: State)`
- State shape: `{version:1, settings:{phase:"GP"}, maxes:{[id]:{value,date}}, workouts: Workout[], inProgressId: string|null, rowChoices:{}, journal:{[iso]:{text,updatedAt}}, setupNote:{text:"",updatedAt:null}, lastBackupAt:null, unbackedSince:null, reminderDismissedAt:null}`.
  - `Workout = {id, sessionId, phase, date, startedAt, finishedAt: string|null, entries: {[rowId]: {exerciseId, sets: object[], note: string}}}`
  - Every mutation writes the whole state to `vault-tracker:v1`. Every mutation except `markBackedUp`/`dismissReminder` sets `unbackedSince` if it is null.
- **Prefill rule:**
  - If the current in-progress entry for that exercise already has a set before `setIndex`, return a copy of the last one.
  - Otherwise use the most recent finished workout containing that `exerciseId`: return its set at `setIndex` if present, else its last set.
  - Otherwise return `null`.

- [ ] **Step 1: Write failing tests** in `tests/store.test.js`, using an in-memory `{getItem,setItem}` stub and a fixed `now`:
  - "restores in-progress workout from storage": start `fri`, log 2 sets, create a new store on the same storage, and `inProgress().entries["fri-3"].sets.length === 2`.
  - "survives corrupt storage": storage holds `"{not json"`, so `createStore` doesn't throw, the state is the empty default, and a key starting `vault-tracker:corrupt-` holds the raw text.
  - `startWorkout` throws `IN_PROGRESS` when sets are logged, and replaces silently when none are.
  - `isStale()` is true when the workout was started on 2026-10-26 and `now` is 2026-10-27.
  - Workout `date` is the start date even when `finishWorkout` runs the next day.
  - Prefill: after a finished workout with squat sets `[{weight:185,reps:5},{weight:195,reps:5}]`, `prefill("back-squat",1)` gives `{weight:195,reps:5}` and `prefill("back-squat",3)` gives `{weight:195,reps:5}`. Within a new workout, after logging `{weight:200,reps:5}`, `prefill("back-squat",1)` gives `{weight:200,reps:5}`.
  - `finishWorkout` with zero sets leaves history empty.
  - `history()` ordering, `deleteWorkout`, journal ordering, and `unbackedSince` set by `logSet` and cleared by `markBackedUp`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `js/store.js`. Make IDs with `crypto.randomUUID()`, which exists in Node 24 and iOS Safari 15.4+.
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: local data store with in-progress workout handling`.

### Task 4: Backup, import and reminder logic

**Files:**
- Create: `js/backup.js`
- Test: `tests/backup.test.js`

**Interfaces:**
- Produces:
  - `buildBackup(state, now: Date): {filename: string, text: string}`: filename `vault-tracker-backup-YYYY-MM-DD.json`, text `JSON.stringify({app:"vault-tracker", format:1, exportedAt: ISO, data: state})`.
  - `parseBackup(text: string): {ok:true, data: State, summary:{exportedAt: string, workouts: number, journal: number}} | {ok:false, error: string}`
  - `needsBackupReminder(state, now: Date): boolean`: true when `unbackedSince` is set, `now − (lastBackupAt ?? unbackedSince) > 7 days`, and `reminderDismissedAt` is null or more than 24 h ago.

- [ ] **Step 1: Write failing tests:**
  - A round trip `parseBackup(buildBackup(s).text)` returns `ok` with equal data, and the summary counts only finished workouts.
  - "rejects non-backup files": `""`, `"{bad"`, `'{"app":"other"}'`, a valid wrapper with `format: 2`, and a wrapper missing `data.workouts` all return `ok:false` with a non-empty `error`.
  - Reminder:
    - false with no changes;
    - false 6 days after the first unbacked change;
    - true 8 days after it, with no backup ever;
    - true when the last backup was 8 days ago and a change was made yesterday;
    - false when dismissed 2 h ago;
    - false after `markBackedUp`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `js/backup.js` (pure, no DOM).
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: backup file format, import validation, reminder rule`.

### Task 5: App shell and Today screen

**Files:**
- Create: `index.html`, `css/app.css`, `js/app.js`, `js/ui/dom.js`, `js/ui/today.js`, `tools/serve.mjs`, `.claude/launch.json`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces:
  - `js/ui/dom.js`: `h(tag, attrs?, ...children): HTMLElement`, `confirmDialog(message, okLabel): Promise<boolean>` (uses `<dialog>`).
  - Each screen module exports `render(root: HTMLElement, ctx: {store, navigate(hash)})`.
  - `js/app.js` creates the store (`createStore(localStorage)`), calls `navigator.storage?.persist?.()`, and routes hashes `#/today`, `#/history`, `#/history/<id>`, `#/journal`, `#/notes`, `#/more`, re-rendering on change and on store updates.
  - The bottom tab bar has five tabs: Today, History, Journal, Steps & Poles, More.

**Today screen behaviour (from spec):**
- **No workout in progress:** show `defaultSessionId(today)`'s session for the current phase. Sat/Sun shows "Rest day" plus the switch control.
  - The header shows the fixed session, e.g. "Fri · Sprint → Strength", and the phase.
  - Logging the first set calls `startWorkout` automatically, with no separate Start tap.
- **Workout in progress:** show it.
  - If `isStale()`, show a banner "Workout from <weekday date> isn't finished" with Finish (save) and Discard (confirm first).
  - Below the banner, show a "Today's plan: <session>" link, which uses the switch flow.
- **Switch workout:** a select listing the 5 sessions.
  - If `hasLoggedSets()`, a dialog offers "Finish and switch" or "Discard and switch" (with a second confirmation), plus Cancel.
- **Each row:**
  - Shows the exercise name, the option picker if there are several options (hidden once the row has logged sets), the `target[phase]` text, and `targetWeightText(...)` when a max exists. The cue appears in small text.
  - Then come `max(sets[phase], logged + 1)` set lines:
    - **Logged lines** show their values, tap to edit, with a delete control.
    - **The next pending line** shows inputs pre-filled from `store.prefill(...)` (or empty) and a large ✓ button. One tap on ✓ logs it.
    - **Inputs:** `inputmode="decimal"` for weight, `inputmode="numeric"` for counts, and a text input for the plyo drill.
    - **Plyo rows** also show a running contacts total.
  - An "Add set" button sits under the set lines.
  - A collapsible "Notes" textarea saves on input.
- A "Finish workout" button at the bottom saves the workout and shows a short confirmation.
- On Mon/Thu, or when the in-progress session is mon/thu, a card links to "Write today's vault journal" (`#/journal`).

- [ ] **Step 1:** Write `tools/serve.mjs`, a ~30-line static file server using `node:http` on port 5173 with correct MIME types for `.js` (`text/javascript`), `.webmanifest`, `.png` and `.json`. Write `.claude/launch.json` with `{"version":"0.0.1","configurations":[{"name":"vault-tracker","runtimeExecutable":"node","runtimeArgs":["tools/serve.mjs"],"port":5173}]}`.
- [ ] **Step 2:** Implement `index.html`:
  - Viewport `width=device-width, initial-scale=1, viewport-fit=cover`, plus `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` metas.
  - `<script type="module" src="./js/app.js">`.
  - `css/app.css`: phone-first, padded with `env(safe-area-inset-*)`, light and dark via `prefers-color-scheme`, input font ≥16px, buttons ≥44px.
- [ ] **Step 3:** Implement `dom.js`, `app.js`, `today.js`. Stub the other routes so they render their title.
- [ ] **Step 4: Verify** with `preview_start {name:"vault-tracker"}` and `resize_window {preset:"mobile"}`:
  - Log two Fri back-squat sets.
  - Reload the page, and both sets are still there.
  - Switch to Tue, and the finish/discard dialog appears.
  - Enter a back-squat max of 250 via the console (`store.setMax`), and the target shows "190–200 lb" in GP.
  - The console has no errors.
- [ ] **Step 5:** Commit: `feat: app shell and Today logging screen`.

### Task 6: History, Journal, Steps & Poles, More (Maxes, Settings, Backup)

**Files:**
- Create: `js/ui/history.js`, `js/ui/journal.js`, `js/ui/notes.js`, `js/ui/more.js`
- Modify: `js/app.js` (replace the stubs and add the reminder banner)

**Behaviour:**
- **History:**
  - The list shows date, session title and phase, newest first.
  - The detail view `#/history/<id>` lists each exercise with its sets and note, plus a Delete button (confirm first).
- **Journal:**
  - A date field defaults to today, with a textarea that saves on input (debounced 400 ms).
  - Changing the date loads that date's entry.
  - The list of past entries shows the date and the first line; tap to open.
  - On non-vault days, show a hint that entries are meant for vault days. Still allow saving.
- **Steps & Poles:** a single large textarea bound to `setSetupNote`, saved on input (debounced) and showing "Saved".
- **More:**
  - **Phase selector (GP/SP/C):** changing it doesn't touch the in-progress workout's saved `phase`.
  - **Maxes:** one row per `liftExercises()` item with a number input. Saving calls `setMax`, and a Clear button calls `clearMax`.
  - **Back up button:**
    - `buildBackup` → `new File([text], filename, {type:"application/json"})`.
    - If `navigator.canShare?.({files:[file]})`, call `navigator.share({files:[file]})`. Otherwise download through an `<a download>` link.
    - Call `markBackedUp()` only when the share resolves or the download starts. A share `AbortError` changes nothing.
    - Show "Last backup: <date>" or "Never".
  - **Import button:**
    - A hidden `<input type="file" accept=".json,application/json">` reads the file text and runs `parseBackup`.
    - On error, show the message and change nothing.
    - On success, the confirm dialog says "Replace all data with backup from <date> (<n> workouts)?". Then call `replaceAll`.
- **Reminder banner** (in `app.js`, on every screen when `needsBackupReminder(state, new Date())`):
  - Text "It's been over a week since your last backup", with Back up and Dismiss buttons. Dismiss calls `dismissReminder`.

- [ ] **Step 1:** Implement the four screens and the banner.
- [ ] **Step 2: Verify in the preview at mobile size:**
  - Finish a workout, and it appears in History with its sets and note.
  - Save a journal entry for today, and it persists after reload.
  - Edit the Steps & Poles note, reload, and the text is still there.
  - Click Back up, and a `.json` download starts (desktop fallback).
  - Import that file, confirm, and the data matches.
  - Import a `.png` or a text file, and you get an error with data unchanged.
  - Set `unbackedSince` to 8 days ago via the console, and the banner shows.
- [ ] **Step 3:** Commit: `feat: history, journal, notes, maxes, settings, backup/import`.

### Task 7: Installable and offline

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `tools/make-icons.mjs`, `icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png` (180×180)
- Modify: `index.html` (manifest link, apple-touch-icon link), `js/app.js` (service worker registration)

**Decisions:**
- **Manifest:** `name` "Vault Tracker", `short_name` "Vault", `display` "standalone", `start_url` "./", `scope` "./", plus `background_color`/`theme_color` matching the CSS.
- **Service worker cache:**
  - Cache name `vt-shell-v1`. It precaches `./`, `index.html`, the CSS, every JS module and the icons.
  - Fetch is cache-first and falls back to the network.
  - On `activate`, delete old cache names.
  - Every release bumps `CACHE` in `sw.js`, which is how updates reach the phone on its next open.
- **Icons:** `tools/make-icons.mjs` writes solid-background PNGs with a simple bar-and-crossbar mark using `node:zlib` (no dependencies). Run it once and commit the PNGs.

- [ ] **Step 1:** Write `make-icons.mjs`, run `node tools/make-icons.mjs`, and check the three PNGs open in the Read tool.
- [ ] **Step 2:** Add the manifest, the service worker, and the links in `index.html`.
- [ ] **Step 3: Verify in the preview:**
  - In the console, `navigator.serviceWorker.controller` is non-null after one reload.
  - Stop the dev server (`preview_stop`), reload, and the app still loads and shows saved data.
  - Restart the server.
- [ ] **Step 4:** Run `npm test`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: offline support and home screen install`.

### Task 8: Publish to GitHub Pages and install on the iPhone

Needs the user. They create a GitHub account and an empty public repo, e.g. `vault-tracker`. The builder never enters credentials.

- [ ] **Step 1:** The user creates the account and repo on github.com and gives the repo URL in chat.
- [ ] **Step 2:** Run `git remote add origin <url>` and `git push -u origin main`.
  - Git Credential Manager opens a browser sign-in; the user completes it.
- [ ] **Step 3:** The user enables Pages on github.com: repo → Settings → Pages → Source "Deploy from a branch", branch `main`, folder `/ (root)` → Save.
- [ ] **Step 4:** Check `https://<user>.github.io/vault-tracker/` loads in the built-in browser.
- [ ] **Step 5:** Walk the user through installing on the phone:
  - Open the link in Safari → Share → **Add to Home Screen** → open from the icon.
  - Log one set, close the app, reopen it, and the set is still there.
  - Turn on Airplane mode, reopen, and the app still works.
  - Tap Back up → **Save to Files**, and the file appears in iCloud Drive.
