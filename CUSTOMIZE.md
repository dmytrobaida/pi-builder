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
/pi-builder agents
```

## Personal agent rules

Use this command to edit your personal injected AGENTS.md:

```text
/pi-builder agents
```

The file lives at:

```text
user/AGENTS.md
```

pi-builder injects it into every session for personal rules, code style, and preferences.

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

If the user asks to move/share Pi settings, installed packages, or device-local extensions into pi-builder config, update only user-owned config in the private config repo (`~/.pi/agent/.pi-builder-config`): `user/`, `package.json`, and `yarn.lock`. Do not edit sealed upstream files there (`AGENTS.md`, `CUSTOMIZE.md`, `extensions/`, project config files), because upgrades replace those from the base pi-builder repo and local edits will cause merge conflicts. For package-backed extensions, add the npm package as a dependency and expose its extension path from the private config `package.json`. Show the diff and ask before running `/pi-builder sync`.
