# RoastTrace-App Context

## Current Version

V1.3

## Public URLs

- App: https://angimo233.github.io/RoastTrace-App/
- Repository: https://github.com/AngImo233/RoastTrace-App
- Version file: https://angimo233.github.io/RoastTrace-App/version.json

## Role

This repository is the public deployment target. It should contain only the static files needed to run the public web app.

## Product Decisions

- The private `RoastTrace` repository is the development workspace.
- This public repository exists so GitHub Pages can host the app for free.
- User data stays on each user's device.
- Internal cache numbers such as `v49` are not public product versions.

## Release Rule

Every user-facing change should update `CHANGELOG.md`. If the app version changes, update both `app.js` and `version.json`.

## Minimal Agent Workflow

When asking Codex to work on this public repo, say:

> 按 AGENTS.md 流程做，先读 CONTEXT.md，只读必要文件。
