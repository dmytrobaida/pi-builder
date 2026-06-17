import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getRepoDir } from "./utils.js";

const USER_AGENTS_RELATIVE_PATH = "user/AGENTS.md";
const DEFAULT_USER_AGENTS = `# My Pi Agent Rules

Add your personal rules, code style preferences, and project-independent agent instructions here.

Examples:

- Prefer small, focused changes.
- Run validation before saying work is complete.
- Explain tradeoffs only when they matter.
`;

export function registerUserAgentsInjection(pi: ExtensionAPI): void {
  pi.on("before_agent_start", async (event) => {
    const content = await readUserAgents();

    if (content.trim().length === 0) {
      return undefined;
    }

    return {
      systemPrompt: `${event.systemPrompt}\n\n# User pi-builder AGENTS.md\n\n${content}`,
    };
  });
}

export async function editUserAgents(ctx: {
  ui: {
    editor(title: string, initialValue: string): Promise<string | undefined>;
    notify(message: string, level: "info" | "warning" | "error"): void;
  };
}): Promise<void> {
  const path = getUserAgentsPath();
  const current = await readUserAgents();
  const next = await ctx.ui.editor(
    "Edit user/AGENTS.md",
    current.length > 0 ? current : DEFAULT_USER_AGENTS,
  );

  if (next === undefined) {
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, next, "utf8");
  ctx.ui.notify("Saved user/AGENTS.md. Run /pi-builder validate to reload rules.", "info");
}

export function getUserAgentsPath(): string {
  return join(getRepoDir(), USER_AGENTS_RELATIVE_PATH);
}

async function readUserAgents(): Promise<string> {
  try {
    return await readFile(getUserAgentsPath(), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}
