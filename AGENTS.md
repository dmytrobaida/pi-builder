# pi-builder Agent Instructions

This repository is managed by pi-builder.

## Editable user customization areas

Agents may create and edit files only under these directories for user customizations:

- `user/extensions/` — custom Pi extension code
- `user/skills/` — custom skills
- `user/prompts/` — prompt templates
- `user/themes/` — themes

## Sealed runtime areas

Do not edit these unless the user explicitly asks to change pi-builder itself:

- `extensions/`
- `package.json`
- `yarn.lock`
- `tsconfig.json`
- `eslint.config.js`
- `.prettierrc.json`
- `.yarnrc.yml`
- `AGENTS.md`
- `CUSTOMIZE.md`
- `LICENSE`

## Workflow

1. Read `CUSTOMIZE.md` and `user/README.md` before customizing.
2. Put user customizations under `user/`.
3. Validate with `/pi-builder validate`.
4. Push user config changes with `/pi-builder sync` when requested.
5. Never push the private config repo with raw `git push` unless the user explicitly asks. `/pi-builder sync` must be used because it creates the required `<current-extension-version>-udv-<number>` tag before pushing.
6. If the user asks to move/share device Pi config, installed packages, extensions, or settings into pi-builder config, edit only user-owned config in the private config repo at `~/.pi/agent/.pi-builder-config`: `user/`, `package.json`, and `yarn.lock`. Do not edit sealed upstream files there (`AGENTS.md`, `CUSTOMIZE.md`, `extensions/`, project config files), because those must come from the base pi-builder repo during upgrades and local edits will cause merge conflicts. Show the diff and ask before running `/pi-builder sync`.
