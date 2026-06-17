import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { cp, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PI_AGENT_DIR } from "./config.js";
import { refreshPiBuilderWidget, setPiBuilderStatus } from "./status.js";
import { validateConfigRepo } from "./validation.js";
import {
  getCommandOutputMessage,
  getRepoDir,
  getUserExtensionsDir,
  getUserPromptsDir,
  getUserSkillsDir,
  getUserThemesDir,
  shellQuote,
} from "./utils.js";

type PackageJson = {
  version?: string;
};

export async function syncGlobalPiConfig(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  setPiBuilderStatus(ctx, "running", "syncing global Pi config");

  await copyGlobalResource("extensions", getUserExtensionsDir());
  await copyGlobalResource("skills", getUserSkillsDir());
  await copyGlobalResource("prompts", getUserPromptsDir());
  await copyGlobalResource("themes", getUserThemesDir());

  await validateConfigRepo(pi, ctx);
  await refreshPiBuilderWidget(pi, ctx);
  ctx.ui.notify("Global Pi resources synced into pi-builder config user/ directories", "info");
}

export async function pushConfigRepo(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  const repoDir = getRepoDir();
  const valid = await validateConfigRepo(pi, ctx);

  if (!valid) {
    return;
  }

  setPiBuilderStatus(ctx, "running", "committing config changes");

  const addResult = await pi.exec(
    "git",
    ["-C", repoDir, "add", "user", "package.json", "README.md"],
    {
      timeout: 30_000,
    },
  );

  if (addResult.code !== 0) {
    notifyGitError(addResult, "Failed to stage pi-builder config changes", ctx);
    return;
  }

  const diffResult = await pi.exec("git", ["-C", repoDir, "diff", "--cached", "--quiet"], {
    timeout: 30_000,
  });

  if (diffResult.code === 0) {
    ctx.ui.notify("No pi-builder config changes to sync", "info");
    await refreshPiBuilderWidget(pi, ctx);
    return;
  }

  const tag = await getNextUserDevTag(pi, repoDir);
  const commitResult = await pi.exec(
    "git",
    ["-C", repoDir, "commit", "-m", `pi-builder config ${tag}`],
    {
      timeout: 60_000,
    },
  );

  if (commitResult.code !== 0) {
    notifyGitError(commitResult, "Failed to commit pi-builder config changes", ctx);
    return;
  }

  const tagResult = await pi.exec("git", ["-C", repoDir, "tag", tag], {
    timeout: 30_000,
  });

  if (tagResult.code !== 0) {
    notifyGitError(tagResult, `Failed to create tag ${tag}`, ctx);
    return;
  }

  const pushResult = await pi.exec(
    "git",
    ["-C", repoDir, "push", "origin", "HEAD:main", "--tags"],
    {
      timeout: 120_000,
    },
  );

  if (pushResult.code !== 0) {
    notifyGitError(pushResult, "Failed to push pi-builder config changes", ctx);
    return;
  }

  await refreshPiBuilderWidget(pi, ctx);
  ctx.ui.notify(`pi-builder config pushed to main with tag ${tag}`, "info");
}

export async function upgradeConfigRepo(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  const repoDir = getRepoDir();
  setPiBuilderStatus(ctx, "running", "upgrading from upstream pi-builder");

  const remoteResult = await pi.exec("bash", ["-lc", ensureUpstreamCommand(repoDir)], {
    timeout: 60_000,
  });

  if (remoteResult.code !== 0) {
    notifyGitError(remoteResult, "Failed to configure upstream remote", ctx);
    return;
  }

  const mergeResult = await pi.exec(
    "bash",
    [
      "-lc",
      `cd ${shellQuote(repoDir)} && git fetch upstream main && git merge --no-edit upstream/main`,
    ],
    {
      timeout: 120_000,
    },
  );

  if (mergeResult.code !== 0) {
    notifyGitError(mergeResult, "Failed to merge latest pi-builder upstream changes", ctx);
    return;
  }

  const valid = await validateConfigRepo(pi, ctx);

  if (!valid) {
    return;
  }

  setPiBuilderStatus(ctx, "running", "tagging upgraded config repo");

  const tag = await getNextUserDevTag(pi, repoDir);
  const tagResult = await pi.exec("git", ["-C", repoDir, "tag", tag], {
    timeout: 30_000,
  });

  if (tagResult.code !== 0) {
    notifyGitError(tagResult, `Failed to create tag ${tag}`, ctx);
    return;
  }

  setPiBuilderStatus(ctx, "running", "pushing upgraded config repo");

  const pushResult = await pi.exec(
    "git",
    ["-C", repoDir, "push", "origin", "HEAD:main", "--tags"],
    {
      timeout: 120_000,
    },
  );

  if (pushResult.code !== 0) {
    notifyGitError(pushResult, "Failed to push upgraded pi-builder config", ctx);
    return;
  }

  await refreshPiBuilderWidget(pi, ctx);
  ctx.ui.notify(`pi-builder config upgraded and pushed to private repo with tag ${tag}.`, "info");
}

async function copyGlobalResource(name: string, destination: string): Promise<void> {
  const source = join(PI_AGENT_DIR, name);
  await mkdir(destination, { recursive: true });

  try {
    await cp(source, destination, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function getNextUserDevTag(pi: ExtensionAPI, repoDir: string): Promise<string> {
  const version = await getPackageVersion(repoDir);
  const prefix = `${version}-udv-`;
  const tagsResult = await pi.exec("git", ["-C", repoDir, "tag", "--list", `${prefix}*`], {
    timeout: 30_000,
  });

  if (tagsResult.code !== 0) {
    return `${prefix}1`;
  }

  let max = 0;

  for (const tag of tagsResult.stdout.split("\n")) {
    if (!tag.startsWith(prefix)) {
      continue;
    }

    const value = Number.parseInt(tag.slice(prefix.length), 10);

    if (!Number.isNaN(value) && value > max) {
      max = value;
    }
  }

  return `${prefix}${max + 1}`;
}

async function getPackageVersion(repoDir: string): Promise<string> {
  const raw = await readFile(join(repoDir, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as PackageJson;

  return parsed.version ?? "0.0.0";
}

function ensureUpstreamCommand(repoDir: string): string {
  return [
    `cd ${shellQuote(repoDir)}`,
    "git remote get-url upstream >/dev/null 2>&1 || git remote add upstream https://github.com/dmytrobaida/pi-builder.git",
    "git remote set-url upstream https://github.com/dmytrobaida/pi-builder.git",
  ].join(" && ");
}

function notifyGitError(
  result: { stdout: string; stderr: string },
  fallback: string,
  ctx: ExtensionContext,
): void {
  const message = getCommandOutputMessage(result, fallback);
  setPiBuilderStatus(ctx, "error", message);
  ctx.ui.notify(message, "error");
}
