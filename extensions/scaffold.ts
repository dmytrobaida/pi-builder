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
    await scaffoldExtension(normalizedName);
  } else if (kind === "prompt") {
    await scaffoldPrompt(normalizedName);
  } else if (kind === "skill") {
    await scaffoldSkill(normalizedName);
  } else {
    await scaffoldTheme(normalizedName);
  }

  ctx.ui.notify(`Created user ${kind}: ${normalizedName}. Run /pi-builder validate.`, "info");
}

async function scaffoldExtension(name: string): Promise<void> {
  const dir = getUserExtensionsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${name}.ts`),
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

async function scaffoldPrompt(name: string): Promise<void> {
  const dir = getUserPromptsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${name}.md`),
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

async function scaffoldSkill(name: string): Promise<void> {
  const dir = join(getUserSkillsDir(), name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
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

async function scaffoldTheme(name: string): Promise<void> {
  const dir = getUserThemesDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${name}.json`),
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
