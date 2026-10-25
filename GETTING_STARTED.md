# Getting Started with StudyOS

StudyOS is a static web app. You do not need to create an account, install a framework, configure an API key, or provision a server.

## First launch

### Windows

1. Install Python 3 if it is not already available.
2. Extract the repository folder.
3. Double-click `run_windows.bat`.
4. The local server starts and opens `http://127.0.0.1:8080`.
5. Keep the terminal window open while you use the app.

### macOS or Linux

In a terminal, navigate to the project folder and run:

```bash
./run_mac_linux.sh
```

If the script is not executable, run `bash run_mac_linux.sh`. Or start a server manually:

```bash
python3 -m http.server 8080
```

Then visit `http://127.0.0.1:8080`.

## First 10 minutes

1. Explore the demo workspace and look at the Today dashboard.
2. Open Syllabus to change the sample subjects and topics to your course.
3. Open Preferences and set a realistic daily study budget, weekly focus target, and focus-session duration.
4. Add a few real tasks with estimated minutes, due dates, and priorities.
5. Use Study planner to make a weekly plan; use Timetable to record recurring study windows.
6. Use the smart planner only after reviewing your pending tasks. It may split long tasks and reassign unfinished task dates.
7. Start a focus session and link it to a task if useful.
8. Add flashcards or generate revision items from the syllabus.
9. Enter your assessments in Exam center if you want to use the target-score calculator.
10. Export a JSON backup from Preferences → Data & privacy before clearing browser storage or changing devices.

## Using the planner safely

The basic weekly planner is a deterministic heuristic. The availability-aware smart planner uses a 21-day horizon, focus-block size, daily budget, and recurring study windows. It cannot infer your fatigue, other responsibilities, or a change of plans unless you update the workspace. Review the generated plan before treating it as a commitment.

The smart planner can replace a long task with focus-sized parts. Keep a backup first if you are not sure you want to apply the changes.

## Demo data versus personal data

The starter workspace is deliberately populated so first-time visitors can explore each screen. All sample names, records, and study entries are fictional. Open Preferences → Data & privacy → Reset data to clear the workspace, then create your own subjects and records.

## Hosting as a website

For a personal demo, a local server is the simplest option. For a public static site, upload the project to GitHub and enable GitHub Pages from `main` / root in repository Settings → Pages. When GitHub Pages is ready, use the HTTPS URL it gives you. Each visitor's data stays in their browser's own local storage; publishing the site does not expose it to the repository owner.

## Backups

- **Export JSON** includes core subjects, tasks, focus logs, preferences, and extended records such as flashcards, notes, habits, goals, events, exams, and time blocks.
- **Import JSON** replaces the current workspace after a confirmation prompt.
- CSV, Markdown, and ICS exports are intended for individual records and external tools; they are not a replacement for a full JSON backup.
