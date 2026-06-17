import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import parseArgv from "string-argv";
import { CUSTOMIZATION_HELP } from "./constants.js";
import { runDoctor } from "./doctor.js";
import { scaffoldCustomization, type ScaffoldKind } from "./scaffold.js";
import { getPiBuilderStatusText, refreshPiBuilderWidget } from "./status.js";
import { pushConfigRepo, syncGlobalPiConfig, upgradeConfigRepo } from "./sync.js";
import { getRepoDir } from "./utils.js";
import { validateAndReload } from "./validation.js";

const HELP_TEXT = `${CUSTOMIZATION_HELP}

Usage:
/pi-builder help
/pi-builder repo-location
/pi-builder extend <request>
/pi-builder sync-global
/pi-builder validate
/pi-builder sync
/pi-builder upgrade
/pi-builder status
/pi-builder doctor
/pi-builder new-extension <name>
/pi-builder new-skill <name>
/pi-builder new-prompt <name>
/pi-builder new-theme <name>`;

export function registerCommands(pi: ExtensionAPI): void {
  pi.registerCommand("pi-builder", {
    description: "Manage and customize the private pi-builder config repo",
    getArgumentCompletions: (prefix) => getSubcommandCompletions(prefix),
    handler: async (args, ctx) => {
      const argv = parseArgv(args);
      const subcommand = argv[0] ?? "help";
      const rest = argv.slice(1);

      if (subcommand === "help") {
        ctx.ui.notify(HELP_TEXT, "info");
        return;
      }

      if (subcommand === "repo-location") {
        ctx.ui.notify(getRepoDir(), "info");
        return;
      }

      if (subcommand === "extend") {
        const request = rest.join(" ").trim();
        const goal = request.length > 0 ? request : "Describe the customization you want to add.";
        pi.sendUserMessage(buildExtendPrompt(goal));
        return;
      }

      if (subcommand === "sync-global") {
        await syncGlobalPiConfig(pi, ctx);
        return;
      }

      if (subcommand === "validate") {
        await validateAndReload(pi, ctx);
        return;
      }

      if (subcommand === "sync") {
        await pushConfigRepo(pi, ctx);
        return;
      }

      if (subcommand === "upgrade") {
        await upgradeConfigRepo(pi, ctx);
        return;
      }

      if (subcommand === "status") {
        await refreshPiBuilderWidget(pi, ctx);
        ctx.ui.notify(await getPiBuilderStatusText(pi), "info");
        return;
      }

      if (subcommand === "doctor") {
        await runDoctor(pi, ctx);
        return;
      }

      if (isScaffoldSubcommand(subcommand)) {
        await scaffoldCustomization(getScaffoldKind(subcommand), rest[0] ?? "", ctx);
        return;
      }

      ctx.ui.notify(`Unknown pi-builder subcommand: ${subcommand}\n\n${HELP_TEXT}`, "error");
    },
  });
}

function getSubcommandCompletions(prefix: string): Array<{ value: string; label: string }> | null {
  const subcommands = [
    "help",
    "repo-location",
    "extend",
    "sync-global",
    "validate",
    "sync",
    "upgrade",
    "status",
    "doctor",
    "new-extension",
    "new-skill",
    "new-prompt",
    "new-theme",
  ];
  const matches = subcommands
    .filter((subcommand) => subcommand.startsWith(prefix))
    .map((subcommand) => ({ value: subcommand, label: subcommand }));

  if (matches.length === 0) {
    return null;
  }

  return matches;
}

function isScaffoldSubcommand(value: string): boolean {
  return ["new-extension", "new-skill", "new-prompt", "new-theme"].includes(value);
}

function getScaffoldKind(subcommand: string): ScaffoldKind {
  if (subcommand === "new-extension") {
    return "extension";
  }

  if (subcommand === "new-skill") {
    return "skill";
  }

  if (subcommand === "new-prompt") {
    return "prompt";
  }

  return "theme";
}

function buildExtendPrompt(goal: string): string {
  return `Extend my pi-builder config.

User request: ${goal}

${CUSTOMIZATION_HELP}

Implementation guidance:
- First read AGENTS.md, CUSTOMIZE.md, and user/README.md in the pi-builder config repo.
- Prefer scaffolding files under user/ instead of creating ad-hoc structure.
- For custom extension code, use user/extensions/.
- For custom skills, use user/skills/.
- For prompt templates, use user/prompts/.
- For themes, use user/themes/.
- After changes, run /pi-builder validate.`;
}
