# Changelog

This file records public RoastTrace web app updates.

## V1.3 - 2026-06-12

- PDF save titles now keep a detailed filename with country, variety, process, date, and batch number labels.
- Removed the quick title reset after opening print so mobile save/share flows can pick up the detailed PDF name.
- Updated cached assets to v55 so existing users can detect and load this release.

## V1.2 - 2026-06-12

- PDF print titles now use country, variety, process, date, and batch number for a clearer default file name.
- Reworked the PDF report into a compact one-page A4 layout with chart, key metrics, batch information, key events, temperature rows, and only non-empty notes.
- Added lowest temperature to the batch summary metrics.
- Updated cached assets to v54 so existing users can detect and load this release.

## V1.1 - 2026-06-12

- Changed "检查更新" so it clears cached app files and reloads the latest published version.
- Kept local roast data untouched during the reload.
- Updated cached assets to v53 so existing V1 users can detect and load this release.

## V1 - 2026-06-08

- Improved live temperature entry with slider rough control, direct numeric input, and ±0.1 / ±1 fine adjustment.
- Live and detail temperature tables now sort by recorded roast time, so later-entered 5:50 appears before 6:00.
- Temperature tables now read from earliest to latest, with 0:00 at the top.
- Updated cached assets to v52.
- Enabled Google Analytics 4 with measurement ID `G-H4G7309WFC`.
- Analytics tracks app opens and display mode only; roast data is not uploaded.
- Added a Google Analytics 4 hook for simple anonymous app-open statistics.
- Added a settings row explaining anonymous analytics status.
- Marked the current public app as version V1.
- Replaced "Open public app" with a real "Check for updates" button.
- Added "Copy app link" on the About / Feedback page.
- Added `version.json` so future releases can be detected by the app.
- Updated cached assets to v49 so the update controls load correctly.

## Pre-release v48 - 2026-06-07

- Added a public RoastTrace App QR code on the About / Feedback page.
- Added buttons for opening the public web app and viewing the public GitHub repository.
- Updated cached assets to v48 so the new QR image can load after app updates.

## Pre-release v47 - 2026-06-07

- Published the first public GitHub Pages build of RoastTrace.
- Added complete local data backup and restore.
- Kept the fixed local storage key so user data can remain after app updates on the same URL.
- Added Japanese and English text for the backup settings.
- Added the feedback/contact page with email and Google Form QR code.
- Kept the development repository private; this public repository contains only the published web app files.
