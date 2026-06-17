import { relative, resolve, sep, join } from "node:path";
import { PI_AGENT_DIR } from "./config.js";

type CommandOutput = {
  stdout: string;
  stderr: string;
};

export function getRepoDir(): string {
  return join(PI_AGENT_DIR, ".pi-builder-config");
}

export function getGlobalSettingsPath(): string {
  return join(PI_AGENT_DIR, "settings.json");
}

export function getLocalPackageSource(): string {
  return getRepoDir();
}

export function getUserExtensionsDir(): string {
  return join(getRepoDir(), "user", "extensions");
}

export function getUserSkillsDir(): string {
  return join(getRepoDir(), "user", "skills");
}

export function getUserPromptsDir(): string {
  return join(getRepoDir(), "user", "prompts");
}

export function getUserThemesDir(): string {
  return join(getRepoDir(), "user", "themes");
}

export function isInsidePath(parent: string, child: string): boolean {
  const relativePath = relative(resolve(parent), resolve(child));

  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`))
  );
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function getCommandOutputMessage(result: CommandOutput, fallback: string): string {
  if (result.stderr.length > 0) {
    return result.stderr;
  }

  if (result.stdout.length > 0) {
    return result.stdout;
  }

  return fallback;
}
