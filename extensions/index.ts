import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { registerCustomizationAdvisor } from "./advisor.js";
import { registerUserAgentsInjection } from "./agents.js";
import { registerCommands } from "./commands.js";
import { CONFIG_REPO_NAME } from "./config.js";
import { SOURCE_REPO_URL } from "./constants.js";
import { registerGuardrails } from "./guardrails.js";
import { replaceNpmPackageWithLocalRepo } from "./settings.js";
import {
  closePiBuilderRepoWatcher,
  refreshPiBuilderWidget,
  setPiBuilderStatus,
  watchPiBuilderRepo,
} from "./status.js";
import { getCommandOutputMessage, getRepoDir } from "./utils.js";

const DEFAULT_BRANCH = "HEAD";

export default function (pi: ExtensionAPI) {
  registerGuardrails(pi);
  registerCommands(pi);
  registerUserAgentsInjection(pi);
  registerCustomizationAdvisor(pi);

  pi.on("session_start", async (_event, ctx) => {
    setPiBuilderStatus(ctx, "running", "checking setup");

    const ghCheck = await pi.exec("gh", ["--version"], {
      timeout: 10_000,
    });

    if (ghCheck.code !== 0) {
      setPiBuilderStatus(ctx, "error", "GitHub CLI is not installed");
      ctx.ui.notify(
        "GitHub CLI is not installed. Install `gh` to use pi-builder GitHub workflows.",
        "error",
      );
      return;
    }

    const authCheck = await pi.exec("gh", ["auth", "status"], {
      timeout: 10_000,
    });

    if (authCheck.code !== 0) {
      setPiBuilderStatus(ctx, "error", "GitHub CLI is not logged in");
      ctx.ui.notify("GitHub CLI is not logged in. Run `gh auth login` and restart Pi.", "error");
      return;
    }

    const userResult = await pi.exec("gh", ["api", "user", "--jq", ".login"], {
      timeout: 10_000,
    });

    if (userResult.code !== 0) {
      const message = getCommandOutputMessage(userResult, "Failed to detect GitHub username");
      setPiBuilderStatus(ctx, "error", message);
      ctx.ui.notify(message, "error");
      return;
    }

    const owner = userResult.stdout.trim();

    if (owner.length === 0) {
      const message = "Failed to detect GitHub username";
      setPiBuilderStatus(ctx, "error", message);
      ctx.ui.notify(message, "error");
      return;
    }

    const configRepo = `${owner}/${CONFIG_REPO_NAME}`;
    const repoDir = getRepoDir();

    if (existsSync(join(repoDir, ".git"))) {
      const repoCheck = await checkConfigRepo(pi, configRepo);

      if (repoCheck === "public") {
        const message = `GitHub repo ${configRepo} exists but is not private`;
        setPiBuilderStatus(ctx, "error", message);
        ctx.ui.notify(message, "error");
        return;
      }

      if (repoCheck === "missing") {
        setPiBuilderStatus(ctx, "running", `recreating deleted repo ${configRepo}`);
        ctx.ui.notify(
          `pi-builder config repo ${configRepo} was deleted on GitHub; recreating it from the local clone...`,
          "warning",
        );
        await recreateConfigRepoFromLocal(pi, configRepo, repoDir, ctx);
        return;
      }

      await updatePackageSource(ctx);
      await refreshPiBuilderWidget(pi, ctx);
      await watchPiBuilderRepo(pi, ctx);
      return;
    }

    if (existsSync(repoDir)) {
      const message = `Config directory exists but is not a git repo: ${repoDir}`;
      setPiBuilderStatus(ctx, "error", message);
      ctx.ui.notify(message, "warning");
      return;
    }

    await mkdir(dirname(repoDir), { recursive: true });

    const repoCheck = await checkConfigRepo(pi, configRepo);

    if (repoCheck === "private") {
      setPiBuilderStatus(ctx, "running", `cloning ${configRepo}`);
      await cloneConfigRepo(pi, configRepo, repoDir, ctx);
      return;
    }

    if (repoCheck === "public") {
      const message = `GitHub repo ${configRepo} exists but is not private`;
      setPiBuilderStatus(ctx, "error", message);
      ctx.ui.notify(message, "error");
      return;
    }

    await createConfigRepoFromSource(pi, configRepo, repoDir, ctx);
  });

  pi.on("session_shutdown", () => {
    closePiBuilderRepoWatcher();
  });
}

async function checkConfigRepo(
  pi: ExtensionAPI,
  configRepo: string,
): Promise<"private" | "public" | "missing"> {
  const result = await pi.exec(
    "gh",
    ["repo", "view", configRepo, "--json", "isPrivate", "--jq", ".isPrivate"],
    {
      timeout: 10_000,
    },
  );

  if (result.code !== 0) {
    return "missing";
  }

  return result.stdout.trim() === "true" ? "private" : "public";
}

async function createPrivateRepo(
  pi: ExtensionAPI,
  configRepo: string,
  ctx: ExtensionContext,
): Promise<boolean> {
  const createResult = await pi.exec(
    "gh",
    [
      "repo",
      "create",
      configRepo,
      "--private",
      "--description",
      "Personal Pi builder configuration",
    ],
    {
      timeout: 60_000,
    },
  );

  if (createResult.code !== 0) {
    const message = getCommandOutputMessage(createResult, `Failed to create ${configRepo}`);
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return false;
  }

  const setupGitResult = await pi.exec("gh", ["auth", "setup-git"], {
    timeout: 30_000,
  });

  if (setupGitResult.code !== 0) {
    const message = getCommandOutputMessage(setupGitResult, "Failed to configure gh git auth");
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return false;
  }

  return true;
}

async function createConfigRepoFromSource(
  pi: ExtensionAPI,
  configRepo: string,
  repoDir: string,
  ctx: ExtensionContext,
): Promise<void> {
  setPiBuilderStatus(ctx, "running", `creating private repo ${configRepo}`);

  if (!(await createPrivateRepo(pi, configRepo, ctx))) {
    return;
  }

  setPiBuilderStatus(ctx, "running", "initializing config repo from pi-builder");
  ctx.ui.notify(`Creating private pi-builder config repo ${configRepo}...`, "info");

  const cloneSourceResult = await pi.exec("git", ["clone", SOURCE_REPO_URL, repoDir], {
    timeout: 120_000,
  });

  if (cloneSourceResult.code !== 0) {
    const message = getCommandOutputMessage(cloneSourceResult, "Failed to clone pi-builder source");
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return;
  }

  await pushConfigRepo(pi, configRepo, repoDir, ctx, `Failed to push initial ${configRepo}`);
}

async function recreateConfigRepoFromLocal(
  pi: ExtensionAPI,
  configRepo: string,
  repoDir: string,
  ctx: ExtensionContext,
): Promise<void> {
  if (!(await createPrivateRepo(pi, configRepo, ctx))) {
    return;
  }

  await pushConfigRepo(pi, configRepo, repoDir, ctx, `Failed to restore ${configRepo}`);
}

async function pushConfigRepo(
  pi: ExtensionAPI,
  configRepo: string,
  repoDir: string,
  ctx: ExtensionContext,
  pushFailureMessage: string,
): Promise<void> {
  const remoteUrl = `https://github.com/${configRepo}.git`;
  const setRemoteResult = await pi.exec(
    "git",
    ["-C", repoDir, "remote", "set-url", "origin", remoteUrl],
    {
      timeout: 10_000,
    },
  );

  if (setRemoteResult.code !== 0) {
    const message = getCommandOutputMessage(
      setRemoteResult,
      "Failed to repoint config repo remote",
    );
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return;
  }

  const pushResult = await pi.exec("git", ["-C", repoDir, "push", "-u", "origin", DEFAULT_BRANCH], {
    timeout: 120_000,
  });

  if (pushResult.code !== 0) {
    const message = getCommandOutputMessage(pushResult, pushFailureMessage);
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return;
  }

  await updatePackageSource(ctx);
  await refreshPiBuilderWidget(pi, ctx);
  await watchPiBuilderRepo(pi, ctx);
  ctx.ui.notify(`pi-builder config repo is ready: ${configRepo}`, "info");
}

async function cloneConfigRepo(
  pi: ExtensionAPI,
  configRepo: string,
  repoDir: string,
  ctx: ExtensionContext,
): Promise<void> {
  const result = await pi.exec("gh", ["repo", "clone", configRepo, repoDir], {
    timeout: 120_000,
  });

  if (result.code !== 0) {
    const message = getCommandOutputMessage(result, `Failed to clone ${configRepo}`);
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return;
  }

  await updatePackageSource(ctx);
  await refreshPiBuilderWidget(pi, ctx);
  await watchPiBuilderRepo(pi, ctx);
  ctx.ui.notify(`pi-builder config repo cloned to ${repoDir}`, "info");
}

async function updatePackageSource(ctx: ExtensionContext): Promise<void> {
  try {
    const changed = await replaceNpmPackageWithLocalRepo();

    if (!changed) {
      return;
    }

    ctx.ui.notify(
      "pi-builder switched global Pi settings from npm package to local config repo. Restart Pi to load the local package source.",
      "info",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update Pi settings";
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
  }
}
