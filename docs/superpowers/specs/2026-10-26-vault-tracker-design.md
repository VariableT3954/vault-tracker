# Vault Tracker — design

Date: 2026-10-26
Status: draft for approval

## Intent

A phone app (installable web app) for one pole vaulter to log their strength work **set by set, in the gym, right after each set**. It knows the athlete's 5-day training plan, opens on the workout planned for today, and makes logging fast. The point is to follow the plan and keep an honest record of what was done, not to analyse anything.

The plan it follows is `C:\The Beginning of the End\reports\Pole vault 5 day training plan.md`. That file is the source of truth for every session, exercise, target and phase variant. The builder transcribes it into the app's plan data.

## Who and where

- One user, an iPhone, **Safari**, added to the Home Screen and used like an app.
- Used mid-workout, between sets: one hand, sweaty, often poor signal. Must work fully offline after first load.

## Goals

1. **Plan built in.** The app knows the five weekday sessions and their targets for each phase:
   - Mon: Vault → Upper body A
   - Tue: Sprint → Plyometrics → Power
   - Wed: Active recovery + low-intensity work
   - Thu: Vault → Upper body B
   - Fri: Sprint → Plyometrics → Strength
   - Sat/Sun: rest
   The phases are GP (general prep), SP (specific prep) and C (competition). Each exercise's sets/reps/load text changes with the phase, exactly as in the plan's tables.
2. **Guided, but switchable.** On open, it shows today's planned workout based on the weekday, for the phase set in settings. A "switch workout" control lets the user pick any of the five sessions instead, for when the week gets shuffled. On Sat/Sun it shows a rest day with the same switch option.
3. **Log after each set.** Each exercise shows its target, e.g. "Back squat · 4 × 5 · 75–80%". The user logs what they actually did, set by set. Fields depend on the exercise type:
   - **Lift:** weight (lb) and reps
   - **Isometric:** seconds held (sets × reps × seconds in the plan; log each set's reps and seconds)
   - **Plyometric block:** contacts, as one or more entries with an optional drill name (e.g. "hurdle hops – 20"), shown as a running total against the target range
   - **Abs / med ball:** reps or seconds, depending on the exercise
   - **Mobility / gymnastics** (Wed items 8–9): mark done, optional minutes
   Each new set is **pre-filled with the last logged values for that exercise**, so a typical set is one tap to confirm. The user can add an extra set or delete a set.
4. **Never lose an in-progress workout.** Every logged set is saved immediately. If iOS closes the app between sets, reopening returns to the same in-progress workout.
5. **Notes after each lift.** Each exercise has an optional short notes box ("bar felt slow on set 3"). Notes are saved with that exercise in the workout record.
6. **Maxes.** A screen to enter and edit a 1RM for any lift. When a max is set, %-based targets show real weights, e.g. "4 × 5 · 75–80% · 185–195 lb", rounded to the nearest 5 lb. Without a max, the % text is shown on its own.
7. **History.** A simple list of completed workouts, newest first: date, session, phase. Tap one to see every exercise, the logged sets and the notes. No charts.
8. **Vault journal.** One dated free-text entry per vault day. It is offered by default on Mon and Thu, and the user can add an entry on any other date they vaulted. A list of past entries, newest first; entries can be edited.
9. **Steps, poles and grips note.** One running free-text note that the user edits over time (current approach steps, poles, grip heights). It saves automatically. It is a single note, not dated entries.
10. **Back up.** A "Back up" button creates one backup file containing all data. It opens the iPhone share sheet so the user can choose **Save to Files** (iCloud Drive or On My iPhone). If the share sheet isn't available, it falls back to a download.
11. **Backup reminders.** The app remembers when the last backup was made. If it has been **more than 7 days** and there is data that hasn't been backed up, it shows a visible but dismissible reminder with a one-tap Back up button.
12. **Import.** An "Import" button lets the user pick a backup file from Files and restore it. Before replacing anything, it shows what the file contains (date of the backup, number of workouts) and asks for confirmation. It rejects files that aren't valid backups without touching existing data.
13. **Settings:** current phase (GP / SP / C), back up, import, last backup date.

## Non-goals

- No video, vault analysis, or sprint/vault session logging, beyond the journal and the steps/poles/grips note.
- No accounts, login, cloud sync, server, or multiple users.
- No charts, graphs, progress analytics or automatic progression.
- No editing of the plan inside the app. Changing the plan means changing the app's plan data.
- No meet-week, taper or deload variants in v1 (builder's call, see below). The user can just log fewer sets on those weeks.

## Anti-goals (would be a failure even if it technically works)

- Logging a set takes more than a couple of taps, or needs typing for an ordinary set.
- Data silently disappears: lost in-progress workouts, or an import that wipes data without confirmation.
- It needs a signal in the gym to work.
- It feels complicated: extra screens, settings or features the user didn't ask for.

## Constraints

- **Platform:** iOS Safari, installed via Add to Home Screen. Must behave correctly as a standalone Home Screen app: offline, keeps its data, safe-area insets respected.
- **Hosting:** GitHub Pages, over HTTPS. The user is creating a GitHub account; the app must be deployable as static files with no server.
- **Storage:** on the device only. Safari can clear website data that goes unused, which is why backup and import exist. The builder should request persistent storage where the browser allows it.
- **Units:** pounds.
- **Tech:** plain web code (HTML, CSS, JavaScript), no app store. That is my call, made so it can be hosted for free on GitHub Pages and keep working offline.

## Decided by the user

- Logging happens after each set; the app knows the plan and guides to the day's workout, with the ability to choose a different one.
- Backup via a button that saves a file to the Files app, plus reminders; import to restore.
- Steps/poles/grips: one simple running text box.
- Journal: dated entries for vault days.
- Maxes are optional and can be added for any lift.
- History: a simple list of completed lifts, with a notes box after each lift.

## My calls (the user can override these)

- The weekday sets today's default session. The journal is offered on Mon/Thu, but any date can have an entry.
- Pre-filling each set with the last logged values for that exercise.
- 7 days as the backup reminder threshold.
- Import **replaces** all data after confirmation, rather than merging.
- **Which max a % target uses:**
  - Each %-based exercise in the plan uses the max entered **for that same exercise**. Power clean and hang power clean both use the power clean max.
  - The half/quarter back squat in SP/C uses its own "Half/quarter squat" max if one is entered. Otherwise its % is shown without a weight, because the plan's partial-range percentages are heavier than full-squat ones.
  - The jump squat target (≤30%) uses the **back squat** max, as the plan says ("≤30% of squat 1RM").
- Exercises listed "/leg" or "/side" are logged as normal sets; the "/leg" label stays visible on the target.
- No meet-week, taper or deload variants in v1.
- A finished workout is saved to history when the user taps "Finish". A workout left unfinished stays in progress until it is finished or discarded.
- **Only one workout can be in progress at a time.**
  - **Opening the app with one in progress:** it goes straight back to that workout, whatever the date. If it was started on an earlier day, a banner asks "Finish" (save what was logged) or "Discard" (asks for confirmation first), and below that it offers today's planned session.
  - **Switching workout after logging sets:** the app asks whether to finish the current workout (save the partial log) or discard it, and always confirms before a discard. Logged sets are never moved to another session or dropped silently.
  - **Workout date:** a workout is dated **the day it was started**.
- **Plan rows with alternatives** (e.g. "Romanian deadlift (or single-leg RDL)", "Rope climb or eccentric chin-ups", "ab-wheel rollouts or Pallof press"):
  - **Default and switching:** the row shows the first-listed option by default. A small picker lets the user switch to another option, and the app remembers the last choice for that row.
  - **Separate pre-fill:** each option counts as its own exercise for pre-fill and history, with its own log fields. Rope climbs log a count; eccentric chin-ups log sets × reps.
  - **Optional trap-bar deadlift:** offered as an option on the RDL row.
- **The same exercise on different days:** it shares pre-fill only when it's truly the same movement and load scheme, as with Nordics, ab-wheel rollouts and band work. Monday's flat dumbbell bench and Thursday's incline or lighter dumbbell bench are separate exercises.
- **Hosting:** once the user has created their GitHub account and signed in on this computer, the builder sets up the repository and GitHub Pages. Then the user opens the address on their iPhone and adds it to the Home Screen, with a short walkthrough. Paths are relative, so the repository name doesn't matter.
- Past workouts in history can be deleted; editing them is optional.

## Left to the builder

- Visual design, colours, light/dark appearance, icons and layout, within "fast and simple on a phone mid-workout".
- Storage mechanism (localStorage or IndexedDB), the backup file format (JSON is fine) and its versioning.
- Offline caching approach (service worker) and how app updates reach the phone.
- Exact screen structure and navigation, as long as Today, History, Journal, Steps/Poles/Grips, Maxes and Settings are each easy to reach.
- How the plan data is structured in code.
- Testing approach.
