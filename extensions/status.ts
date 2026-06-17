import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { STATUS_KEY } from "./constants.js";
import {
  compareUserDevTags,
  getLatestLocalUserDevTag,
  getLatestRemoteUserDevTag,
  type UserDevTag,
} from "./tags.js";
import { getCommandOutputMessage, getRepoDir } from "./utils.js";

export type PiBuilderStatus = "running" | "ready" | "dirty" | "upgrade" | "error";

type PackageJson = {
  version?: string;
};

type UpstreamSummary = {
  currentVersion: string;
  latestVersion: string;
  upgradeAvailable: boolean;
};

export function setPiBuilderStatus(
  ctx: ExtensionContext,
  status: PiBuilderStatus,
  message: string,
): void {
  ctx.ui.setStatus(STATUS_KEY, undefined);

  let color: "error" | "warning" | "success" = "success";

  if (status === "error") {
    color = "error";
  } else if (status === "running") {
    color = "warning";
  }

  setPiBuilderWidget(ctx, [ctx.ui.theme.fg(color, `pi-builder: ${status} — ${message}`)]);
}

export async function refreshPiBuilderWidget(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<void> {
  const repoDir = getRepoDir();

  if (!existsSync(join(repoDir, ".git"))) {
    ctx.ui.setStatus(STATUS_KEY, undefined);
    setPiBuilderWidget(ctx, [
      ctx.ui.theme.bold("pi-builder"),
      `  ${ctx.ui.theme.fg("warning", "config repo not cloned yet")}`,
      `  path: ${ctx.ui.theme.fg("muted", repoDir)}`,
    ]);
    return;
  }

  const [dirty, origin, localTag, remoteTag, upstream, gh] = await Promise.all([
    getDirtySummary(pi, repoDir),
    getRemoteSummary(pi, repoDir, "origin", "main"),
    getLatestLocalUserDevTag(pi, repoDir),
    getLatestRemoteUserDevTag(pi, repoDir),
    getUpstreamSummary(pi, repoDir),
    getGhSummary(pi),
  ]);

  ctx.ui.setStatus(STATUS_KEY, undefined);

  setPiBuilderWidget(ctx, [
    ctx.ui.theme.bold("pi-builder"),
    `  local: ${formatLocalState(ctx, dirty.changedFiles, origin.ahead, origin.behind, localTag, remoteTag)}`,
    `  upstream: ${formatUpstreamState(ctx, upstream)}`,
    `  gh: ${formatGhState(ctx, gh)}`,
    `  path: ${ctx.ui.theme.fg("muted", repoDir)}`,
  ]);
}

export async function getPiBuilderStatusText(pi: ExtensionAPI): Promise<string> {
  const repoDir = getRepoDir();

  if (!existsSync(join(repoDir, ".git"))) {
    return [`pi-builder status`, `config repo: missing`, `path: ${repoDir}`].join("\n");
  }

  const [dirty, origin, localTag, remoteTag, upstream, gh] = await Promise.all([
    getDirtySummary(pi, repoDir),
    getRemoteSummary(pi, repoDir, "origin", "main"),
    getLatestLocalUserDevTag(pi, repoDir),
    getLatestRemoteUserDevTag(pi, repoDir),
    getUpstreamSummary(pi, repoDir),
    getGhSummary(pi),
  ]);

  return [
    "pi-builder status",
    `path: ${repoDir}`,
    `local: ${formatLocalText(dirty.changedFiles, origin.ahead, origin.behind, localTag, remoteTag)}`,
    `upstream: ${formatUpstreamText(upstream)}`,
    `gh: ${gh.ok ? "authenticated" : gh.message}`,
    "",
    "Suggested actions:",
    dirty.changedFiles > 0 || origin.ahead > 0 ? "- /pi-builder sync" : "- no sync needed",
    upstream.upgradeAvailable ? "- /pi-builder upgrade" : "- no upgrade available",
  ].join("\n");
}

function setPiBuilderWidget(ctx: ExtensionContext, lines: string[]): void {
  ctx.ui.setWidget(STATUS_KEY, lines, {
    placement: "belowEditor",
  });
}

async function getDirtySummary(
  pi: ExtensionAPI,
  repoDir: string,
): Promise<{ changedFiles: number }> {
  const result = await pi.exec("git", ["-C", repoDir, "status", "--porcelain"], {
    timeout: 10_000,
  });

  if (result.code !== 0) {
    return { changedFiles: 0 };
  }

  const changedFiles = result.stdout.split("\n").filter((line) => line.trim().length > 0).length;

  return { changedFiles };
}

async function getRemoteSummary(
  pi: ExtensionAPI,
  repoDir: string,
  remote: string,
  branch: string,
): Promise<{ ahead: number; behind: number }> {
  const fetchResult = await pi.exec("git", ["-C", repoDir, "fetch", remote, branch], {
    timeout: 30_000,
  });

  if (fetchResult.code !== 0) {
    return { ahead: 0, behind: 0 };
  }

  const result = await pi.exec(
    "git",
    ["-C", repoDir, "rev-list", "--left-right", "--count", `HEAD...${remote}/${branch}`],
    {
      timeout: 10_000,
    },
  );

  if (result.code !== 0) {
    return { ahead: 0, behind: 0 };
  }

  const [aheadRaw, behindRaw] = result.stdout.trim().split(/\s+/);
  const ahead = Number.parseInt(aheadRaw ?? "0", 10);
  const behind = Number.parseInt(behindRaw ?? "0", 10);

  return {
    ahead: Number.isNaN(ahead) ? 0 : ahead,
    behind: Number.isNaN(behind) ? 0 : behind,
  };
}

async function getUpstreamSummary(pi: ExtensionAPI, repoDir: string): Promise<UpstreamSummary> {
  const currentVersion = await getLocalPackageVersion(repoDir);
  const fetchResult = await pi.exec("git", ["-C", repoDir, "fetch", "upstream", "main"], {
    timeout: 30_000,
  });

  if (fetchResult.code !== 0) {
    return {
      currentVersion,
      latestVersion: currentVersion,
      upgradeAvailable: false,
    };
  }

  const showResult = await pi.exec("git", ["-C", repoDir, "show", "upstream/main:package.json"], {
    timeout: 10_000,
  });

  if (showResult.code !== 0) {
    return {
      currentVersion,
      latestVersion: currentVersion,
      upgradeAvailable: false,
    };
  }

  const latestVersion = parsePackageVersion(showResult.stdout, currentVersion);

  return {
    currentVersion,
    latestVersion,
    upgradeAvailable: compareVersions(latestVersion, currentVersion) > 0,
  };
}

async function getLocalPackageVersion(repoDir: string): Promise<string> {
  try {
    return parsePackageVersion(await readFile(join(repoDir, "package.json"), "utf8"), "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function parsePackageVersion(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as PackageJson;

    return parsed.version ?? fallback;
  } catch {
    return fallback;
  }
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map((part) => Number.parseInt(part, 10));
  const bParts = b.split(".").map((part) => Number.parseInt(part, 10));
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aPart = aParts[index] ?? 0;
    const bPart = bParts[index] ?? 0;

    if (aPart > bPart) {
      return 1;
    }

    if (aPart < bPart) {
      return -1;
    }
  }

  return 0;
}

async function getGhSummary(pi: ExtensionAPI): Promise<{ ok: boolean; message: string }> {
  const result = await pi.exec("gh", ["auth", "status"], {
    timeout: 10_000,
  });

  if (result.code === 0) {
    return { ok: true, message: "authenticated" };
  }

  return {
    ok: false,
    message: getCommandOutputMessage(result, "not authenticated"),
  };
}

function formatLocalState(
  ctx: ExtensionContext,
  changedFiles: number,
  ahead: number,
  behind: number,
  localTag: UserDevTag | undefined,
  remoteTag: UserDevTag | undefined,
): string {
  const text = formatLocalText(changedFiles, ahead, behind, localTag, remoteTag);

  if (changedFiles > 0 || ahead > 0 || behind > 0 || hasRemoteUpdate(localTag, remoteTag)) {
    return ctx.ui.theme.fg("warning", text);
  }

  return ctx.ui.theme.fg("success", text);
}

function formatLocalText(
  changedFiles: number,
  ahead: number,
  behind: number,
  localTag: UserDevTag | undefined,
  remoteTag: UserDevTag | undefined,
): string {
  const currentVersion = localTag?.name ?? "no user version yet";
  const parts: string[] = [];

  if (remoteTag !== undefined && hasRemoteUpdate(localTag, remoteTag)) {
    parts.push(`new version available: ${remoteTag.name} (current ${currentVersion})`);
  } else if (behind > 0) {
    parts.push(`remote update available (${remoteTag?.name ?? `${behind} commit(s)`})`);
  } else {
    parts.push(`version ${currentVersion}`);
  }

  if (changedFiles > 0) {
    parts.push(`${changedFiles} file(s) changed`);
  }

  if (ahead > 0) {
    parts.push(`unpushed commits ${ahead}`);
  }

  if (parts.length === 1 && changedFiles === 0 && ahead === 0 && behind === 0) {
    parts.push("synced");
  }

  return parts.join(", ");
}

function hasRemoteUpdate(
  localTag: UserDevTag | undefined,
  remoteTag: UserDevTag | undefined,
): boolean {
  if (remoteTag === undefined) {
    return false;
  }

  if (localTag === undefined) {
    return true;
  }

  return compareUserDevTags(remoteTag, localTag) > 0;
}

function formatUpstreamState(ctx: ExtensionContext, upstream: UpstreamSummary): string {
  if (upstream.upgradeAvailable) {
    return ctx.ui.theme.fg(
      "warning",
      `new version available: ${upstream.latestVersion} (current ${upstream.currentVersion})`,
    );
  }

  return ctx.ui.theme.fg("success", `up to date (${upstream.currentVersion})`);
}

function formatUpstreamText(upstream: UpstreamSummary): string {
  if (upstream.upgradeAvailable) {
    return `new version available: ${upstream.latestVersion} (current ${upstream.currentVersion})`;
  }

  return `up to date (${upstream.currentVersion})`;
}

function formatGhState(ctx: ExtensionContext, gh: { ok: boolean; message: string }): string {
  if (gh.ok) {
    return ctx.ui.theme.fg("success", gh.message);
  }

  return ctx.ui.theme.fg("error", gh.message);
}
