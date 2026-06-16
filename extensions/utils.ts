import { join } from "node:path";
import { PI_AGENT_DIR } from "./config.js";

type CommandOutput = {
  stdout: string;
  stderr: string;
};

export function getRepoDir(): string {
  return join(PI_AGENT_DIR, ".pi-builder");
}

export function getGlobalSettingsPath(): string {
  return join(PI_AGENT_DIR, "settings.json");
}

export function getPrivateGitPackageSource(configRepo: string): string {
  return `git:https://github.com/${configRepo}.git`;
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
