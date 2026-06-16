import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getRepoDir } from "./utils.js";
import { syncGlobalPiConfig, pushConfigRepo, upgradeConfigRepo } from "./sync.js";
import { validateAndReload } from "./validation.js";

export function registerCommands(pi: ExtensionAPI): void {
  pi.registerCommand("pi-builder-path", {
    description: "Show the local pi-builder config repository path",
    handler: async (_args, ctx) => {
      ctx.ui.notify(getRepoDir(), "info");
    },
  });

  pi.registerCommand("pi-builder-extend", {
    description: "Ask Pi to extend the private pi-builder config safely",
    handler: async (args) => {
      const request = args.trim();
      const goal = request.length > 0 ? request : "Describe the customization you want to add.";

      pi.sendUserMessage(`Extend my pi-builder config.

User request: ${goal}

Rules:
- Only create or edit user customization files under user/.
- Do not edit sealed pi-builder files such as extensions/, package.json, yarn.lock, tsconfig.json, eslint.config.js, or root config files.
- Put custom Pi extensions in user/extensions/.
- Put custom skills in user/skills/.
- Put custom prompt templates in user/prompts/.
- Put custom themes in user/themes/.
- After changes, ask me to run /pi-builder-validate, or run it if appropriate.`);
    },
  });

  pi.registerCommand("pi-builder-sync-global", {
    description: "Copy global Pi resources into the private pi-builder config repo",
    handler: async (_args, ctx) => {
      await syncGlobalPiConfig(pi, ctx);
    },
  });

  pi.registerCommand("pi-builder-validate", {
    description: "Validate the private pi-builder config repo and reload Pi resources",
    handler: async (_args, ctx) => {
      await validateAndReload(pi, ctx);
    },
  });

  pi.registerCommand("pi-builder-sync", {
    description: "Commit, tag, and push local pi-builder config changes",
    handler: async (_args, ctx) => {
      await pushConfigRepo(pi, ctx);
    },
  });

  pi.registerCommand("pi-builder-upgrade", {
    description: "Merge latest upstream pi-builder package changes into the private config repo",
    handler: async (_args, ctx) => {
      await upgradeConfigRepo(pi, ctx);
    },
  });
}
