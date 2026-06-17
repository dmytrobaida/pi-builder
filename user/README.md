# User customizations

This directory is the safe editable area for your private pi-builder config.

## Folders

- `extensions/` — custom Pi extension files (`.ts` or `.js`)
- `skills/` — custom skills, each with a `SKILL.md`
- `prompts/` — prompt templates (`.md` files)
- `themes/` — Pi themes (`.json` files)
- `AGENTS.md` — personal agent rules injected into each session

## Quick examples

Create a prompt template:

```text
/pi-builder new-prompt review-pr
```

Create a skill:

```text
/pi-builder new-skill release-checklist
```

Create an extension:

```text
/pi-builder new-extension current-time
```

Edit personal agent rules:

```text
/pi-builder agents
```

Ask Pi to customize this repo:

```text
/pi-builder extend add a prompt for reviewing staged git changes
```

Validate and reload:

```text
/pi-builder validate
```

Push changes to your private GitHub repo:

```text
/pi-builder sync
```

Use `/pi-builder sync` instead of raw `git push`; it creates the required `<current-extension-version>-udv-<number>` tag before pushing.
