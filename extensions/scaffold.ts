import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getUserExtensionsDir,
  getUserPromptsDir,
  getUserSkillsDir,
  getUserThemesDir,
} from "./utils.js";

export type ScaffoldKind = "extension" | "prompt" | "skill" | "theme";

export async function scaffoldCustomization(
  kind: ScaffoldKind,
  name: string,
  ctx: ExtensionContext,
): Promise<void> {
  const normalizedName = normalizeName(name);

  if (normalizedName.length === 0) {
    ctx.ui.notify(`Usage: /pi-builder new-${kind} <name>`, "error");
    return;
  }

  if (kind === "extension") {
    await scaffoldExtension(normalizedName, ctx);
  } else if (kind === "prompt") {
    await scaffoldPrompt(normalizedName, ctx);
  } else if (kind === "skill") {
    await scaffoldSkill(normalizedName, ctx);
  } else {
    await scaffoldTheme(normalizedName, ctx);
  }

  ctx.ui.notify(`Created user ${kind}: ${normalizedName}. Run /pi-builder validate.`, "info");
}

async function scaffoldExtension(name: string, ctx: ExtensionContext): Promise<void> {
  const dir = getUserExtensionsDir();
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${name}.ts`);

  if (await pathExists(path)) {
    ctx.ui.notify(`user extension already exists: ${path}`, "warning");
    return;
  }

  await writeFile(
    path,
    `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("${name}", {
    description: "${toTitle(name)} custom command",
    handler: async (_args, ctx) => {
      ctx.ui.notify("${toTitle(name)} is ready", "info");
    },
  });
}
`,
    "utf8",
  );
}

async function scaffoldPrompt(name: string, ctx: ExtensionContext): Promise<void> {
  const dir = getUserPromptsDir();
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${name}.md`);

  if (await pathExists(path)) {
    ctx.ui.notify(`user prompt already exists: ${path}`, "warning");
    return;
  }

  await writeFile(
    path,
    `---
description: ${toTitle(name)} prompt
argument-hint: "[instructions]"
---

# ${toTitle(name)}

$ARGUMENTS
`,
    "utf8",
  );
}

async function scaffoldSkill(name: string, ctx: ExtensionContext): Promise<void> {
  const dir = join(getUserSkillsDir(), name);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "SKILL.md");

  if (await pathExists(path)) {
    ctx.ui.notify(`user skill already exists: ${path}`, "warning");
    return;
  }

  await writeFile(
    path,
    `---
name: ${name}
description: ${toTitle(name)} workflow. Use when the user asks for ${name.replaceAll("-", " ")} help.
---

# ${toTitle(name)}

## Workflow

1. Understand the request.
2. Inspect relevant files.
3. Make the smallest safe change.
4. Validate the result.
`,
    "utf8",
  );
}

async function scaffoldTheme(name: string, ctx: ExtensionContext): Promise<void> {
  const dir = getUserThemesDir();
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${name}.json`);

  if (await pathExists(path)) {
    ctx.ui.notify(`user theme already exists: ${path}`, "warning");
    return;
  }

  await writeFile(
    path,
    `${JSON.stringify(
      {
        name,
        colors: {},
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const { access } = await import("node:fs/promises");
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function toTitle(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
