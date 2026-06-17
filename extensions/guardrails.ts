import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { resolve } from "node:path";
import { PROTECTED_PATHS } from "./constants.js";
import { getRepoDir, isInsidePath } from "./utils.js";

type FileMutationInput = {
  path: string;
};

export function registerGuardrails(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event, ctx) => {
    if (isToolCallEventType<"edit", FileMutationInput>("edit", event)) {
      return blockProtectedPath(event.input.path, ctx.cwd);
    }

    if (isToolCallEventType<"write", FileMutationInput>("write", event)) {
      return blockProtectedPath(event.input.path, ctx.cwd);
    }

    if (isToolCallEventType<"bash", { command: string }>("bash", event)) {
      return blockProtectedBash(event.input.command, ctx.cwd);
    }
  });
}

function blockProtectedPath(
  path: string,
  cwd: string,
): { block: true; reason: string } | undefined {
  const repoDir = getRepoDir();
  const absolutePath = resolve(cwd, path);

  if (!isInsidePath(repoDir, absolutePath)) {
    return undefined;
  }

  for (const protectedPath of PROTECTED_PATHS) {
    const absoluteProtectedPath = resolve(repoDir, protectedPath);

    if (isInsidePath(absoluteProtectedPath, absolutePath)) {
      return {
        block: true,
        reason: `pi-builder sealed path is protected from user edits: ${protectedPath}. Put custom code under user/ instead.`,
      };
    }
  }

  return undefined;
}

function blockProtectedBash(
  command: string,
  cwd: string,
): { block: true; reason: string } | undefined {
  const repoDir = getRepoDir();
  const targetsConfigRepo = commandTargetsConfigRepo(command, cwd, repoDir);

  if (!targetsConfigRepo) {
    return undefined;
  }

  const rawGitSyncCommand = getRawGitSyncCommand(command);

  if (rawGitSyncCommand !== undefined) {
    return {
      block: true,
      reason: `Use /pi-builder sync instead of raw ${rawGitSyncCommand}. It validates, commits, tags, and pushes with the required <current-extension-version>-udv-<number> tag.`,
    };
  }

  for (const protectedPath of PROTECTED_PATHS) {
    if (referencesProtectedPath(command, repoDir, protectedPath)) {
      return {
        block: true,
        reason: `pi-builder sealed path is protected from bash mutations: ${protectedPath}. Put user config in package.json, yarn.lock, or user/ instead.`,
      };
    }
  }

  return undefined;
}

function commandTargetsConfigRepo(command: string, cwd: string, repoDir: string): boolean {
  if (isInsidePath(repoDir, cwd)) {
    return true;
  }

  return command.includes(repoDir) || command.includes("~/.pi/agent/.pi-builder-config");
}

function getRawGitSyncCommand(command: string): string | undefined {
  const match = command.match(
    /(?:^|[;&|()\s])git(?:\s+-[A-Za-z]+(?:\s+[^;&|()\s]+)?)*\s+(commit|push|tag)\b/,
  );

  if (match === null) {
    return undefined;
  }

  const subcommand = match[1];

  if (subcommand === undefined) {
    return undefined;
  }

  return `git ${subcommand}`;
}

function referencesProtectedPath(command: string, repoDir: string, protectedPath: string): boolean {
  const escapedPath = protectedPath.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAbsolutePath = resolve(repoDir, protectedPath).replaceAll(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const relativePattern = new RegExp(`(^|[\\s'"\`])${escapedPath}(/|[\\s'"\`]|$)`);
  const absolutePattern = new RegExp(`(^|[\\s'"\`])${escapedAbsolutePath}(/|[\\s'"\`]|$)`);

  return relativePattern.test(command) || absolutePattern.test(command);
}
