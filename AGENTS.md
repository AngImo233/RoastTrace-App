# Agent Instructions

## Repository Role

This public repository contains only the published static web app files for RoastTrace. Development happens in the private `RoastTrace` repository.

## Context Discipline

- Keep this repo release-focused.
- Do not add private notes, unfinished experiments, or source-only development material.
- Update `CHANGELOG.md` for every public user-facing change.
- Keep `version.json` aligned with the user-facing public version.

## Release Checks

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `python3 -m json.tool version.json`
- Confirm GitHub Pages deployment succeeds.

## Do Not Commit

- `.DS_Store`
- temporary exports
- zips
- private development notes

