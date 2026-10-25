# Security and privacy

StudyOS is a static, local-first personal planning app. There is no server-side account system, cloud database, authentication, or remote AI service.

## Data boundaries

- Workspace records are stored in the browser's local storage for the current origin.
- JSON backups can contain study plans, private notes, habits, and assessment results. Store them accordingly.
- The app shell can be hosted as a public static site, but one visitor cannot read another visitor's local storage through the application.
- This project does not collect telemetry intentionally. Standard hosting providers may produce their own server access logs.
- Browser storage is not encrypted by StudyOS. Do not use it to store passwords, secrets, or sensitive personal data.

## Reporting a problem

Please do not publish private personal information, backup files, or sensitive details in a public issue. For a security-sensitive concern, contact the repository owner privately through GitHub before disclosing technical details publicly. Include the affected file, steps to reproduce, impact, and a proposed mitigation when possible.

## Scope

StudyOS is a personal productivity tool, not an official academic record system, medical tool, guaranteed alarm service, or institutional scheduling service. Users should keep backups and verify grade estimates against the relevant official rules.
