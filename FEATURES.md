# StudyOS — Complete Feature Inventory

This file documents the features included in the complete edition. It is an inventory of implemented functionality, not a staged roadmap.

## 1. Today and task management

- Daily overview of tasks, deadlines, subject progress, and completion.
- Add, edit, delete, complete, and reopen tasks.
- Subject assignment, priority, estimated duration, due date, plan date, and notes.
- Task-linked focus sessions and manually recorded time.
- Quick actions to add tasks from the dashboard or a calendar date.

## 2. Study planning

- Monday-to-Sunday weekly view with navigation between weeks.
- Transparent rule-based plan generation using task deadlines, priorities, and estimated duration.
- Adjustable daily study budget and weekly goal.
- Smart plan for a 21-day horizon.
- Task splitting into manageable focus-sized parts; parts retain their parent task relationship in the data.
- Availability-aware capacity from recurring study windows, with due-date preference and a visible count of sessions that could not fit.
- The app never calls this AI. Scheduling is deterministic JavaScript logic, not a language model.

## 3. Syllabus and subjects

- Add, rename, colour, and delete subjects.
- Add chapters/topics using one topic per line.
- Optional subject exam date.
- Preserve completion status when an edited topic retains its name.
- Topic status cycle: Not started → In progress → Done.
- Search and filter subjects, see per-subject completion, and review overall progress.

## 4. Focus timer and insights

- Configurable focus-session duration, pause/resume/reset, and full-screen focus mode.
- Optionally link a session to a task.
- Save focus-time records by date and subject.
- Track total focus time, completed tasks, recent daily focus, focus by subject, and a task-completion streak.
- Export the whole workspace or a task CSV.

## 5. Calendar and assessments

- Monthly calendar with date selection and agenda.
- Calendar combines task planned dates, due dates, subject exam dates, assessments, user-created events, and recurring weekly blocks.
- Event categories include events, exams/important dates, and personal commitments.
- Create and edit events with optional start/end time, subject, and notes.
- Export tasks, deadlines, assessments, events, subject exam dates, and recurring timetable blocks to `.ics`.
- Upcoming-deadline cards summarise the next items.

## 6. Revision lab and flashcards

- Generate revision records from syllabus topics.
- Rate recall as Again, Hard, Good, or Easy.
- Store interval, ease, repetitions, last-review date, and review history.
- Create card decks with prompt/front and answer/back.
- Search cards, filter by deck, study a session, flip cards, and rate recall.
- CSV export for flashcards and revision history.
- The spacing algorithm is a lightweight study aid. Users should adjust intervals when a topic is still difficult.

## 7. Exam center

- Track exams, quizzes, assignments, and mock tests.
- Store date, subject, score, maximum score, weight, and notes.
- Calculate the weighted average from graded assessments with non-zero weight.
- Estimate the score needed on a remaining assessment weight to reach a target overall percentage.
- Flag mathematically impossible target scenarios rather than implying every target is achievable.
- Assessment dates appear in the calendar and milestones.

## 8. Notes vault

- Create and edit text notes, tag them, associate them with subjects, and pin important notes.
- Save resource URLs using HTTP/HTTPS only.
- Search note titles, contents, and tags.
- Export notes as Markdown and export the collection.
- Notes are local to the browser and are not encrypted by the application.

## 9. Habits, goals, and milestones

- Create named habits with weekly target days and an approved colour.
- Log or undo today's habit check-in.
- See recent check-ins and streak/consistency visuals.
- Export habit check-ins.
- Create measurable goals for focus minutes, completed tasks, completed syllabus topics, or flashcard reviews.
- Show progress against the goal target and target date.
- Surface upcoming subject exams and assessments as milestones.
- Export goals to CSV.

## 10. Timetable and availability

- Create recurring weekly time blocks for study windows, classes/lectures, and personal/unavailable time.
- Detect time overlaps and ask before saving a conflict.
- Study windows contribute to smart-planner capacity for that weekday. When no study window exists, the daily budget is used as a fallback.
- Export recurring blocks through the calendar ICS file.

## 11. Quick Find, personalisation, and portability

- Command palette searchable across tasks, subjects/topics, notes, flashcards, and assessments.
- Keyboard launch with `Ctrl+K` / `⌘K` or `/` when not typing.
- Light and dark themes.
- Browser notification reminders, with permission explicitly requested by the user; reminders only run while the page is open.
- JSON backup and restore of the core workspace and extended feature data.
- Domain-specific CSV, Markdown, and ICS exports.
- Responsive layout for large and small screens.
- PWA manifest and service-worker app-shell caching when deployed from a secure origin.

## 12. Default sample workspace

A fresh browser profile receives clearly fictional subjects, tasks, sample focus logs, example revision material, starter flashcards, starter notes, habit ideas, sample goals, and an ungraded mock assessment. Use Preferences → Data & privacy → Reset data to remove seeded and subsequent local data.

## Explicitly not included

- No backend or hosted database.
- No login, institution-managed identity, or access-control system.
- No cross-device synchronisation or shared workspaces.
- No remote LLM/AI inference or AI-generated schedule.
- No direct connection to a college timetable, LMS, official exam portal, or external calendar account.
- No guaranteed reminder delivery.

The app is a self-contained personal productivity tool. Keep personal data backed up and do not treat its plans, spaced intervals, or grade estimates as authoritative academic advice.
