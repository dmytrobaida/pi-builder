# pi-builder

Personal Pi customization package.

This package adds reusable Pi extensions, prompts, skills, and themes that can be installed into Pi with one command.

## Installation

Install the package in Pi:

```bash
pi install npm:@dmytrobaida/pi-builder
```

Restart Pi after installation, or run this inside Pi:

```text
/reload
```

## What it adds

When Pi starts, this package automatically clones its source repository to your global Pi agent directory:

```text
~/.pi/agent/.pi-builder
```

If you use a custom Pi agent directory with `PI_CODING_AGENT_DIR`, the clone is created there instead:

```text
$PI_CODING_AGENT_DIR/.pi-builder
```

Source repository:

```text
https://github.com/dmytrobaida/pi-builder.git
```

The package also adds this command inside Pi:

```text
/pi-builder-path
```

Use it to show where the local source repository is stored.

## Updating

To update to the latest package version:

```bash
pi update npm:@dmytrobaida/pi-builder
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

If the extension does not seem active:

1. Run `/reload` inside Pi.
2. Restart Pi.
3. Confirm the package appears in `pi list`.
4. Update the package with `pi update npm:@dmytrobaida/pi-builder`.

If the source repository was not cloned, check that `git` is installed and that this URL is reachable from your machine:

```text
https://github.com/dmytrobaida/pi-builder.git
```

## Security

Pi extensions run with your local user permissions. Only install Pi packages from sources you trust.
