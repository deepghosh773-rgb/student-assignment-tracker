# StudyFlow — Student Assignment and Deadline Tracker

## Overview
StudyFlow is a single-user, client-side web app for organising coursework assignments and deadlines. It supports adding, viewing, editing, and deleting assignments; marking work complete; status/subject filtering; title search; sorting; dashboard counts; upcoming deadlines; and JSON backup import/export.

## Architecture
- `index.html` — page structure and controls
- `style.css` — visual styling and responsive layout
- `script.js` — assignment operations, validation, status calculation, search/filter/sort, local persistence, backup handling
- Browser `localStorage` — persists assignment records in the current browser profile
- JSON — backup export/import format

There is no backend, account system, or remote database.

## Setup and run
1. Extract the submitted ZIP archive.
2. Open the `student-assignment-tracker` folder.
3. Open `index.html` in a modern browser (Chrome, Edge, Firefox, or Safari).
4. Use **+ New assignment** to create a record.

No package installation or build step is required for this static version.

## Test / verification
Follow `docs/test-plan-and-traceability.md`. The results marked “Passed” are the manual tests the student confirmed during the development walkthrough. For evidence, retain screenshots from the browser. Do not treat this as automated test coverage.

## Data and backup
Assignment records are stored in browser localStorage. They are not synced to another device and may be lost if browser data is cleared. Export a JSON backup before importing another backup. Importing can replace the current assignment list. Invalid JSON should display an error.

## Known limitations
- Single user and single browser profile
- No cloud sync, account login, calendar integration, or push notifications
- Manual testing only; no automated test framework
- Browser-local data can be removed by clearing site/browser data

##  AI-use declaration
This prototype was developed with AI assistance for planning, code drafting/revision, and documentation generation. No external server or database is used. 

