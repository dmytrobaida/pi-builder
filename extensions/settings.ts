import { readFile, writeFile } from "node:fs/promises";
import { CONFIG_REPO_NAME } from "./config.js";
import { NPM_PACKAGE_SOURCE } from "./constants.js";
import { getGlobalSettingsPath, getLocalPackageSource } from "./utils.js";

type PackageEntry = string | { source?: string; [key: string]: unknown };

type PiSettings = {
  packages?: PackageEntry[];
  [key: string]: unknown;
};

export async function replaceNpmPackageWithLocalRepo(): Promise<boolean> {
  const settingsPath = getGlobalSettingsPath();
  const settings = await readSettings(settingsPath);
  const packages = settings.packages ?? [];
  const localPackageSource = getLocalPackageSource();
  let changed = false;
  let localPackageConfigured = false;
  const nextPackages: PackageEntry[] = [];

  for (const entry of packages) {
    const source = getPackageSource(entry);

    if (source === localPackageSource) {
      if (!localPackageConfigured) {
        nextPackages.push(entry);
        localPackageConfigured = true;
      } else {
        changed = true;
      }

      continue;
    }

    if (source === NPM_PACKAGE_SOURCE || isLegacyGitPackageSource(source)) {
      changed = true;

      if (!localPackageConfigured) {
        nextPackages.push(replacePackageSource(entry, localPackageSource));
        localPackageConfigured = true;
      }

      continue;
    }

    nextPackages.push(entry);
  }

  if (!localPackageConfigured) {
    nextPackages.push(localPackageSource);
    changed = true;
  }

  if (!changed) {
    return false;
  }

  await writeFile(
    settingsPath,
    `${JSON.stringify(
      {
        ...settings,
        packages: nextPackages,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return true;
}

function getPackageSource(entry: PackageEntry): string | undefined {
  if (typeof entry === "string") {
    return entry;
  }

  return entry.source;
}

function replacePackageSource(entry: PackageEntry, source: string): PackageEntry {
  if (typeof entry === "string") {
    return source;
  }

  return {
    ...entry,
    source,
  };
}

function isLegacyGitPackageSource(source: string | undefined): boolean {
  if (source === undefined) {
    return false;
  }

  return new RegExp(`^git:https://github\\.com/[^/]+/${CONFIG_REPO_NAME}\\.git$`).test(source);
}

async function readSettings(settingsPath: string): Promise<PiSettings> {
  try {
    const raw = await readFile(settingsPath, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as PiSettings;
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }

  return {};
}
