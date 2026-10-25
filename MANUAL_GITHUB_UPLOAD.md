# Publish StudyOS manually to GitHub

This package is a complete static app. No terminal, Git, Node.js, package installation, API key, backend, or account setup is needed to upload it via GitHub's website.

## 1. Download and extract

Download `StudyOS-Complete-Edition.zip`, extract it on your computer, and open the extracted folder. Upload the *contents* of that folder, not the ZIP itself.

## 2. Create the new repository

Open https://github.com/new and enter:

- **Repository name:** `studyos`
- **Description:** `StudyOS is a local-first study workspace with smart planning, syllabus tracking, focus sessions, spaced-repetition revision, flashcards, exam analytics, notes, habits, goals, and calendar exports. No account, backend, or remote AI required.`
- **Visibility:** Public
- Leave “Add a README”, “Add .gitignore”, and “Choose a license” unchecked; these are already included.

Click **Create repository**. If `studyos` is unavailable, use `studyos-study-workspace` and update the repository links later.

## 3. Upload the source

On the new, empty repository, choose **Add file → Upload files**. Drag in all files and folders from the extracted package. Ensure that hidden `.github` and `.nojekyll` files/folders are included, and that `README.md` is at the top level beside `index.html`, `app.js`, `features.js`, and `styles.css`.

Commit with the message `Add StudyOS complete edition`.

## 4. Run the app locally

For a quick view, open `index.html`. For best results, run the included `run_windows.bat` on Windows or `run_mac_linux.sh` on macOS/Linux. The app opens at `http://127.0.0.1:8080`. The launchers use Python's standard library; there are no Python package requirements.

## 5. Optional: make it a live public website

After source upload, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose `main`, select `/(root)`, and save. Once GitHub Pages finishes deploying, use the URL shown in that panel. StudyOS stores each visitor's data in that visitor's own browser; it does not send user workspaces to the repository owner.

## 6. Verify automated checks

Open the **Actions** tab. The Quality Checks workflow runs JavaScript syntax checks and the scheduler/feature logic tests on pushes and pull requests. If checks fail, open the failed run and review the first error before advertising the build as verified.

## Suggested repository topics

`study-planner`, `student-productivity`, `time-management`, `syllabus-tracker`, `flashcards`, `spaced-repetition`, `focus-timer`, `education-technology`, `javascript`, `local-first`, `pwa`, `github-pages`

## Important notes

- Sample tasks, notes, students/subjects, and grades in the starter workspace are fictional. Review the sample data before using the app for your own work.
- Use **Preferences → Data & privacy → Export JSON** to back up your workspace. Importing a backup replaces current local data.
- StudyOS is local-first and rule-based. It has no cross-device sync, backend, remote AI, or official college/LMS integration.
- GitHub Pages is for hosting the static UI, not for storing one shared database. Each visitor has a separate browser workspace.
