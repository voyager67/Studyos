# Privacy and Data Handling

StudyOS is designed as a local-first personal study workspace.

## What StudyOS stores

The app stores its workspace using the browser's local storage for the website origin. It may include subjects, syllabus topics, task names, plans, focus logs, assessments and scores, notes, resource URLs, flashcards, habits, goals, events, timetable blocks, theme/preferences, and review history. The initial records are fictional demo data.

## Where data goes

The application code does not send workspace content to a backend, analytics provider, advertising network, or remote AI service. There is no account system or cloud sync. Your browser loads the static website files from wherever you host it. When you export, the file is saved by your browser; when you import, its contents replace the workspace after confirmation.

If you host the website publicly, other visitors can download and inspect the public source code. They do not automatically receive your browser's local storage. Data is scoped to the origin (scheme, host, and port), so `localhost`, a GitHub Pages URL, and a different browser each have separate workspaces.

## Important limitations

- Local storage is not encrypted by StudyOS and is available to scripts running on the same origin. Do not store passwords, secret tokens, or highly sensitive personal information in notes.
- Anyone who can use the same browser profile may be able to view or alter the local workspace.
- Clearing site data or browser storage can remove records. Export a JSON backup regularly and keep it in a safe place.
- JSON/CSV/Markdown/ICS files can contain private study information. Protect exported files and delete them securely when no longer needed.
- Browser notifications may display titles on the operating system's notification surface. Enable them only if that is acceptable.
- A local or GitHub Pages deployment is not a managed, encrypted institutional system.

## Resetting data

Open **Preferences → Data & privacy → Reset data** and confirm. This clears the workspace stored in the current browser origin; it does not delete files you previously exported or data in another browser/device.

## Accessibility and consent

StudyOS asks for browser notification permission only after a person requests reminders. It does not attempt to fingerprint users or identify visitors. No network calls are needed for core planning or study features after the app shell has been loaded and cached on a supported browser.
