# Contributing to StudyOS

Thanks for considering a contribution. StudyOS is designed to remain a self-contained local-first tool, and the complete feature set should remain coherent rather than split into staged feature editions.

## Good contributions

- Fixes that improve correctness, accessibility, performance, mobile usability, or data portability.
- Scheduler edge-case tests and clearer explanation of trade-offs.
- Small visual refinements that respect the shared design system.
- Documentation improvements and reproducible bug reports.

## Product guardrails

- Do not add telemetry, ads, trackers, remote fonts, third-party services, or AI APIs without an explicit design discussion and clear privacy implications.
- Keep the core app usable without an account, backend, or package installation.
- Avoid committing real personal data, schedules, notes, grades, exported backups, credentials, or private institution details.
- Render user content safely and validate imported data/URLs.
- Make destructive actions clear and preserve export/backup paths.
- Do not describe the scheduler as AI; it is deterministic rule-based logic.

## Local checks

Node.js 18 or newer is required for the test suite. The application itself is a static website and can be served locally with Python 3.

```bash
node --check app.js
node --check features.js
node --test tests/*.test.js
```

For interface changes, manually try the affected flows in a browser: create/edit, save, reload, JSON export/import, and small-screen layout as relevant.

## Pull requests

Describe the problem, user-visible change, test commands and results, privacy impact, and any remaining limitations. Keep test fixtures fictional. Changes to date handling, scheduling, weighted grades, review intervals, backup logic, or import validation should include focused unit tests.
