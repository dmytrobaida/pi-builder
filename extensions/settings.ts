import { readFile, writeFile } from "node:fs/promises";
import { NPM_PACKAGE_SOURCE } from "./constants.js";
import { getGlobalSettingsPath, getPrivateGitPackageSource } from "./utils.js";

type PackageEntry = string | { source?: string; [key: string]: unknown };

type PiSettings = {
  packages?: PackageEntry[];
  [key: string]: unknown;
};

export async function replaceNpmPackageWithPrivateGitRepo(configRepo: string): Promise<boolean> {
  const settingsPath = getGlobalSettingsPath();
  const settings = await readSettings(settingsPath);
  const packages = settings.packages ?? [];
  const gitPackageSource = getPrivateGitPackageSource(configRepo);
  let replaced = false;
  let alreadyConfigured = false;

  const nextPackages = packages.map((entry) => {
    if (entry === gitPackageSource) {
      alreadyConfigured = true;
      return entry;
    }

    if (entry === NPM_PACKAGE_SOURCE) {
      replaced = true;
      return gitPackageSource;
    }

    if (typeof entry === "object" && entry.source === gitPackageSource) {
      alreadyConfigured = true;
      return entry;
    }

    if (typeof entry === "object" && entry.source === NPM_PACKAGE_SOURCE) {
      replaced = true;
      return {
        ...entry,
        source: gitPackageSource,
      };
    }

    return entry;
  });

  if (!replaced && !alreadyConfigured) {
    nextPackages.push(gitPackageSource);
    replaced = true;
  }

  if (!replaced) {
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
