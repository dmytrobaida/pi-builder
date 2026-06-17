# pi-builder

Personal Pi customization package for Pi.

This package helps you keep a private, editable copy of your Pi customization setup while installing the runtime extension through npm.

## Installation

Install the package in Pi:

```bash
pi install npm:@dbaida/pi-builder
```

Restart Pi after installation, or run this inside Pi:

```text
/reload
```

## First run

On startup, pi-builder checks for GitHub CLI:

```bash
gh --version
gh auth status
```

If `gh` is installed and logged in, pi-builder creates or reuses a private GitHub repository in your account named:

```text
pi-builder-config
```

Then it clones that private config repository to your global Pi agent directory:

```text
~/.pi/agent/.pi-builder-config
```

After the private repository is ready, pi-builder updates your global Pi settings so future loads use your private git repository instead of the public npm package:

```text
npm:@dbaida/pi-builder → git:https://github.com/<you>/pi-builder-config.git
```

Restart Pi after this first-time switch so Pi loads the private package source.

If you use a custom Pi agent directory with `PI_CODING_AGENT_DIR`, the clone is created there instead:

```text
$PI_CODING_AGENT_DIR/.pi-builder-config
```

The private config repo is initialized from:

```text
https://github.com/dmytrobaida/pi-builder.git
```

You can override the private repo name with:

```bash
PI_BUILDER_CONFIG_REPO_NAME=my-custom-pi-config pi
```

## Status widget

pi-builder shows a multiline widget below the editor with useful details:

```text
pi-builder
  config: dirty, 2 file(s) changed
  branch: main
  upstream: new version available: 0.1.4 (current 0.1.3)
  gh: authenticated
  path: ~/.pi/agent/.pi-builder-config
```

Refresh or print the same information on demand:

```text
/pi-builder status
```

## Customizing your private config

After first run, your editable config lives in:

```text
~/.pi/agent/.pi-builder-config
```

Start with the single pi-builder command:

```text
/pi-builder help
```

User customizations belong in the `user/` directories:

```text
user/extensions/  # custom Pi extensions
user/skills/      # custom skills
user/prompts/     # prompt templates
user/themes/      # themes
```

pi-builder protects its sealed runtime files from agent edits to reduce merge conflicts when you upgrade later. Ask Pi to place new custom code under `user/` instead of editing the sealed package files.

The private config repo includes these guide files so users and agents do not need to search around:

```text
AGENTS.md
CUSTOMIZE.md
user/README.md
```

## Commands

Show help:

```text
/pi-builder help
```

Show where the local config repository is stored:

```text
/pi-builder repo-location
```

Ask Pi to extend your private config safely:

```text
/pi-builder extend add a prompt template for reviewing pull requests
```

Create starter customization files:

```text
/pi-builder new-extension current-time
/pi-builder new-skill release-checklist
/pi-builder new-prompt review-pr
/pi-builder new-theme my-theme
```

Copy global Pi resources into your private config repo:

```text
/pi-builder sync-global
```

Validate your private config and reload Pi resources:

```text
/pi-builder validate
```

Commit, tag, and push local config changes to your private repo's `main` branch:

```text
/pi-builder sync
```

Use this command instead of raw `git push` for config changes so each private-repo push includes the required user-development tag.

Sync tags use this format:

```text
<current-extension-version>-udv-<number>
```

Example:

```text
0.1.3-udv-1
```

Merge the latest upstream pi-builder changes into your private config repo, tag the result, and push it automatically:

```text
/pi-builder upgrade
```

If Git reports merge conflicts, pi-builder stops before pushing so you can resolve them.

Check common setup problems:

```text
/pi-builder doctor
```

## Updating

To update to the latest package version:

```bash
pi update npm:@dbaida/pi-builder
```

Or update all installed Pi packages:

```bash
pi update --extensions
```

Restart Pi after updating, or run:

```text
/reload
```

## Troubleshooting

Check that Pi sees the package:

```bash
pi list
```

If pi-builder reports that GitHub CLI is missing, install it and restart Pi:

```bash
brew install gh
```

If pi-builder reports that GitHub CLI is not logged in, run:

```bash
gh auth login
```

If the config repository was not cloned:

1. Check the bottom status bar for the error message.
2. Check that `git` and `gh` are installed.
3. Check that `gh auth status` succeeds.
4. Run `/reload` inside Pi or restart Pi.

If Pi still loads the npm package after the private repository is ready, restart Pi and check your global Pi settings:

```text
~/.pi/agent/settings.json
```

The `packages` list should contain your private git repository instead of `npm:@dbaida/pi-builder`.

## Security

Pi extensions run with your local user permissions. Only install Pi packages from sources you trust.
