import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type UserDevTag = {
  name: string;
  version: string;
  number: number;
};

const USER_DEV_TAG_PATTERN = /^(\d+\.\d+\.\d+)-udv-(\d+)$/;

export function parseUserDevTag(tag: string): UserDevTag | undefined {
  const match = tag.match(USER_DEV_TAG_PATTERN);

  if (match === null) {
    return undefined;
  }

  const version = match[1];
  const number = Number.parseInt(match[2] ?? "0", 10);

  if (version === undefined || Number.isNaN(number)) {
    return undefined;
  }

  return {
    name: tag,
    version,
    number,
  };
}

export function compareUserDevTags(a: UserDevTag, b: UserDevTag): number {
  const versionCompare = compareVersions(a.version, b.version);

  if (versionCompare !== 0) {
    return versionCompare;
  }

  return a.number - b.number;
}

export function getLatestUserDevTag(tags: string[]): UserDevTag | undefined {
  let latest: UserDevTag | undefined;

  for (const tag of tags) {
    const parsed = parseUserDevTag(tag.trim());

    if (parsed === undefined) {
      continue;
    }

    if (latest === undefined || compareUserDevTags(parsed, latest) > 0) {
      latest = parsed;
    }
  }

  return latest;
}

export async function getLocalUserDevTags(pi: ExtensionAPI, repoDir: string): Promise<string[]> {
  const result = await pi.exec("git", ["-C", repoDir, "tag", "--list", "*-udv-*"], {
    timeout: 30_000,
  });

  if (result.code !== 0) {
    return [];
  }

  return result.stdout.split("\n").filter((tag) => tag.trim().length > 0);
}

export async function getRemoteUserDevTags(pi: ExtensionAPI, repoDir: string): Promise<string[]> {
  const result = await pi.exec("git", ["-C", repoDir, "ls-remote", "--tags", "origin", "*-udv-*"], {
    timeout: 30_000,
  });

  if (result.code !== 0) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim().split("refs/tags/")[1] ?? "")
    .map((tag) => tag.replace(/\^\{\}$/, ""))
    .filter((tag) => tag.length > 0);
}

export async function getLatestLocalUserDevTag(
  pi: ExtensionAPI,
  repoDir: string,
): Promise<UserDevTag | undefined> {
  return getLatestUserDevTag(await getLocalUserDevTags(pi, repoDir));
}

export async function getLatestRemoteUserDevTag(
  pi: ExtensionAPI,
  repoDir: string,
): Promise<UserDevTag | undefined> {
  return getLatestUserDevTag(await getRemoteUserDevTags(pi, repoDir));
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
