# Public Release Task Template

## Goal

What public app behavior changes?

## User-Facing Result

What will users see?

## Version / Changelog

- Does `version.json` need a version bump?
- Does `CHANGELOG.md` include the change?

## Checks

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `python3 -m json.tool version.json`
- GitHub Pages deployment succeeds

