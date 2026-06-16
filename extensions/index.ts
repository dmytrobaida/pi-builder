import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { REPO_URL } from "./constants.js";
import { getRepoDir } from "./utils.js";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const repoDir = getRepoDir();

    if (existsSync(join(repoDir, ".git"))) {
      return;
    }

    if (existsSync(repoDir)) {
      ctx.ui.notify(
        `pi-builder source directory exists but is not a git repo: ${repoDir}`,
        "warning",
      );
      return;
    }

    ctx.ui.notify(`Cloning pi-builder source repo to ${repoDir}...`, "info");

    await mkdir(dirname(repoDir), { recursive: true });

    const result = await pi.exec("git", ["clone", REPO_URL, repoDir], {
      timeout: 120_000,
    });

    if (result.code !== 0) {
      let message = "Failed to clone pi-builder repo";

      if (result.stderr.length > 0) {
        message = result.stderr;
      } else if (result.stdout.length > 0) {
        message = result.stdout;
      }

      ctx.ui.notify(message, "error");
      return;
    }

    ctx.ui.notify(`pi-builder source repo cloned to ${repoDir}`, "info");
  });

  pi.registerCommand("pi-builder-path", {
    description: "Show the local pi-builder source repository path",
    handler: async (_args, ctx) => {
      ctx.ui.notify(getRepoDir(), "info");
    },
  });
}
