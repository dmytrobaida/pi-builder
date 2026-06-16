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

Currently this package includes a starter Pi extension. More commands and customizations will be added over time.

When installed, Pi discovers the package through its package manifest and loads the extension automatically.

## Updating

To update to the latest version:

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

## Security

Pi extensions run with your local user permissions. Only install Pi packages from sources you trust.
