# Changelog

This file records public RoastTrace web app updates.

## V1.13 - 2026-06-14

- Added a same-bean review page from the local data library.
- Added bean grouping in the local data library.
- Added same-bean summary metrics on batch detail pages: batch count, average drop time, average development time, and average moisture loss.
- Added previous-batch deltas and a quick compare action from the same-bean review list.
- Updated cached assets to v65 so existing users can detect and load this release.

## V1.12 - 2026-06-14

- Added a local random anonymous analytics ID for open-count reporting.
- Added GA4 parameters for total opens, weekly opens, active weeks, open-count bucket, first-open week, app version, language, and display mode.
- Added `first_open`, `app_installed_open`, and enriched `app_open` events without uploading roast data.
- Updated cached assets to v64 so existing users can detect and load this release.

## V1.11 - 2026-06-12

- Restored brown filled metric cards in the single-batch PDF and forced print color adjustment for PDF output.
- Rebalanced the A4 portrait layout with more space in the bottom half.
- Increased temperature-record row spacing and changed the right memo area to a clean framed `メモ` box without ruled lines.
- Updated cached assets to v63 so existing users can detect and load this release.

## V1.10 - 2026-06-12

- Fixed batch detail pages failing to open after restoring a valid backup because the PDF report template referenced a missing lowest-temperature variable.
- Verified the fix against the real `roasttrace-backup-2026-06-11.json` backup file and opened all four restored batch detail pages in a local render simulation.
- Updated cached assets to v62 so existing users can detect and load this release.

## V1.9 - 2026-06-12

- Relaxed backup restore file selection to accept JSON-like files that iPhone may label as plain text or generic binary.
- Backup restore now strips UTF-8 BOM before parsing older backup files.
- Manual key events are saved when either time or temperature is present, so PDF key points can show temperature-only values such as lowest temperature.
- Temperature-only key events are kept out of charts and time tables to avoid displaying them as false `00:00` points.
- Updated cached assets to v61 so existing users can detect and load this release.

## V1.8 - 2026-06-12

- Made the dedicated PDF print document visible after iPhone save/share flows, avoiding a blank app-colored screen.
- Redesigned the single-batch PDF into a compact one-page A4 layout with four key metrics, chart, compact batch info, key points, vertical time/temperature log, and a notes area.
- Removed the PDF version badge and removed process notes from app detail/manual display and PDF output.
- Renamed water loss wording to `水分减少率` / Japanese `水分減少率`.
- Updated cached assets to v60 so existing users can detect and load this release.

## V1.7 - 2026-06-12

- Added water loss percentage to the manual-entry key event section next to lowest temperature.
- Updated cached assets to v59 so existing users can detect and load this release.

## V1.6 - 2026-06-12

- Removed the separate "直接输入" live temperature field; the main temperature number is now directly editable.
- Added a per-time temperature comparison table to batch comparison.
- Added a one-page comparison PDF report with curve, key event summaries, and temperature table.
- Updated cached assets to v58 so existing users can detect and load this release.

## V1.5 - 2026-06-12

- PDF generation now opens a dedicated titled report document before printing, so iPhone save/share flows can use the bean, date, and batch title instead of the app name.
- Updated cached assets to v57 so existing users can detect and load this release.

## V1.4 - 2026-06-12

- PDF save titles now use the English bean name, compact date, and batch number, for example `Ethiopia Samii Heirloom 20260612 #1`.
- Updated cached assets to v56 so existing users can detect and load this release.

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
