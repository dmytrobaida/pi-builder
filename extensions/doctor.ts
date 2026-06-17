import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NPM_PACKAGE_SOURCE } from "./constants.js";
import { getGlobalSettingsPath, getRepoDir } from "./utils.js";

export async function runDoctor(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  const repoDir = getRepoDir();
  const lines = ["pi-builder doctor"];

  lines.push(formatCheck("local config repo", existsSync(join(repoDir, ".git")), repoDir));
  lines.push(formatCheck("user/extensions", existsSync(join(repoDir, "user", "extensions"))));
  lines.push(formatCheck("user/skills", existsSync(join(repoDir, "user", "skills"))));
  lines.push(formatCheck("user/prompts", existsSync(join(repoDir, "user", "prompts"))));
  lines.push(formatCheck("user/themes", existsSync(join(repoDir, "user", "themes"))));

  const ghResult = await pi.exec("gh", ["auth", "status"], {
    timeout: 10_000,
  });
  lines.push(formatCheck("GitHub CLI authenticated", ghResult.code === 0));

  const settings = await readSettingsText();
  lines.push(
    formatCheck("global settings use private git", !settings.includes(NPM_PACKAGE_SOURCE)),
  );

  ctx.ui.notify(lines.join("\n"), "info");
}

function formatCheck(label: string, ok: boolean, detail?: string): string {
  const marker = ok ? "✓" : "✗";

  if (detail === undefined) {
    return `${marker} ${label}`;
  }

  return `${marker} ${label}: ${detail}`;
}

async function readSettingsText(): Promise<string> {
  try {
    return await readFile(getGlobalSettingsPath(), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}
