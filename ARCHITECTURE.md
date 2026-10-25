# StudyOS Architecture

StudyOS is a dependency-light static web app with two JavaScript modules and browser storage.

## Components

- `index.html` defines the navigation shell, primary dashboard, and feature-view containers.
- `styles.css` defines the responsive visual system, shared controls, dialogs, and light/dark themes.
- `app.js` implements the core workspace: subjects, syllabus topics, tasks, the weekly planner, focus timer, analytics, settings, core JSON import/export, and the local-storage schema.
- `features.js` extends the core with calendar, revision records, flashcards, exams, notes, habits, recurring timetable blocks, goals, Quick Find, themes, notifications, and feature-specific exports.
- `manifest.webmanifest` provides installable-app metadata.
- `service-worker.js` caches the application shell for supported secure origins, allowing the static UI to reopen offline after its files have been cached.
- `tests/` contains pure logic tests that run with Node's built-in test runner.

## Data model

The core workspace is stored under `studyos.workspace.v1`. The extended toolkit is stored under `studyos.features.v1`. The JSON backup combines both in a single portable file. Records are normalised on load/import to constrain fields and expected types. Feature state is kept separate to avoid coupling every additional screen to the core task/syllabus object schema.

The browser local-storage boundary is also the privacy boundary: there is no API server, remote database, account identity, or shared server-side state.

## Scheduler behaviour

The weekly scheduler is a deterministic heuristic that sorts tasks using due date, priority, and creation order, then chooses available plan dates under the daily budget. The advanced scheduler can split tasks into focus-sized parts and allocates them to date capacities over a bounded planning horizon. It prefers slots on or before a due date when possible, falls back to later available dates when deadlines cannot be met, and retains tasks that cannot fit as unscheduled entries rather than dropping them silently.

Availability comes from a weekday's recurring study windows when present; otherwise the daily budget is used as a fallback. Scheduling is not a proof of feasibility: the person using the plan should review overloads, late items, and changes in real life.

## Review intervals

The revision and flashcard tools use a lightweight interval/ease heuristic, not a claim of scientifically optimal spaced repetition. Each review stores the rating, resulting interval, due date, and history. The algorithm is pure and unit-tested so its behaviour can be reviewed and changed transparently.

## Security and trust boundaries

- Render user-entered text as escaped content and validate external resource links to HTTP/HTTPS.
- Normalise imported records before using them in templates.
- Keep notifications opt-in.
- Avoid dependencies and third-party integrations in the core app.
- Do not use StudyOS as an authority for grades, exam requirements, or institution policy.
- No secrets or credentials belong in this repository; no real student data should be committed.

## Verification

The CI workflow checks JavaScript syntax, runs scheduler/review/grade/splitting tests, and confirms required application files exist. UI interactions should additionally be exercised in a real browser before changing form handling, local-storage imports, keyboard shortcuts, or the service worker.
