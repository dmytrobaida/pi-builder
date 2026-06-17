# Customizing pi-builder

Use this file as the starting point when you or an agent wants to customize Pi through pi-builder.

## One command entry point

Use the Pi command:

```text
/pi-builder help
```

Common subcommands:

```text
/pi-builder repo-location
/pi-builder extend <what you want>
/pi-builder new-extension <name>
/pi-builder new-skill <name>
/pi-builder new-prompt <name>
/pi-builder new-theme <name>
/pi-builder validate
/pi-builder sync
/pi-builder upgrade
/pi-builder doctor
```

## Where customizations go

Only edit files under `user/` for personal customizations:

```text
user/extensions/  # custom Pi extensions
user/skills/      # custom skills
user/prompts/     # prompt templates
user/themes/      # themes
```

## What not to edit

Do not edit sealed runtime files unless the user explicitly asks to change pi-builder itself:

```text
extensions/
package.json
yarn.lock
tsconfig.json
eslint.config.js
.prettierrc.json
.yarnrc.yml
AGENTS.md
CUSTOMIZE.md
LICENSE
```

Those files belong to the base pi-builder package and are protected to reduce merge conflicts during `/pi-builder upgrade`.

## After changing custom files

Run:

```text
/pi-builder validate
```

When the user wants to save changes to their private GitHub repository, run:

```text
/pi-builder sync
```

Do not use raw `git push` for normal config changes. `/pi-builder sync` is required because every push to the private config repo must include an auto-incremented tag in this format:

```text
<current-extension-version>-udv-<number>
```
