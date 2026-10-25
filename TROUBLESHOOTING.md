# Troubleshooting StudyOS

## A blank page or buttons do nothing

- Make sure the files were extracted with their folder structure preserved.
- Run the local server using `run_windows.bat` or `./run_mac_linux.sh`; do not upload the ZIP as a single source file.
- Open the server address shown by the launcher (`http://127.0.0.1:8080`).
- Refresh the page. Check the browser console for a JavaScript error before reporting a bug.

## The launcher says Python is not recognised

Install Python 3, then reopen the terminal/launcher. On Windows, `py` may work even if `python` does not. No Python packages need to be installed because the app is static.

## My tasks or notes disappeared

StudyOS stores data in browser local storage. Check that you are using the same browser and the same origin/URL as before. `http://localhost:8080`, `http://127.0.0.1:8080`, and an HTTPS GitHub Pages URL do not share storage. If you exported a JSON backup, restore it from Preferences → Data & privacy → Import JSON.

## The app is different on my phone

Local storage is per browser/origin and does not sync between your phone and laptop. Use a backup to move the workspace manually. A publicly hosted static website is not a cloud account.

## Install or offline mode is unavailable

PWA installability depends on browser support, HTTPS (or localhost), the service worker having registered successfully, and the browser's installation rules. Open the site over HTTPS or `localhost`, refresh after the first load, and check the browser's application/service-worker panel. Opening `index.html` directly from the file system does not provide service-worker support.

## No notifications arrive

The app only requests notification permission after you click Enable reminders. Permission must be granted. Notifications are best-effort and only checked while StudyOS is open; they are not alarms and may be restricted by the operating system/browser.

## Smart planning did not schedule everything

The planner preserves capacity limits and displays tasks/sessions that did not fit. Review the daily budget, study windows, focus-block size, deadlines, and long task estimates. A missed deadline can force a piece later than its due date; the tool cannot invent more time.

## Grade calculator gives a surprising number

Verify every score, maximum score, weight, and remaining weight. The calculation assumes weights are percentage points of one overall grade. Use the official grading scheme if it uses normalisation, dropped scores, minimum component marks, moderation, or another rule.

## Tests fail

Install Node.js 18 or newer and run:

```bash
node --check app.js
node --check features.js
node --test tests/*.test.js
```

If one fails, include the failing test name and error when opening an issue. Do not attach a backup containing private notes or marks.
