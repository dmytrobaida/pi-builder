import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { refreshPiBuilderWidget, setPiBuilderStatus } from "./status.js";
import { getCommandOutputMessage, getRepoDir, shellQuote } from "./utils.js";

export async function validateConfigRepo(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
): Promise<boolean> {
  const repoDir = getRepoDir();
  setPiBuilderStatus(ctx, "running", "validating config repo");

  const result = await pi.exec(
    "bash",
    [
      "-lc",
      `cd ${shellQuote(repoDir)} && yarn install && yarn lint && yarn typecheck && yarn format:check`,
    ],
    {
      timeout: 180_000,
    },
  );

  if (result.code !== 0) {
    const message = getCommandOutputMessage(result, "pi-builder config validation failed");
    setPiBuilderStatus(ctx, "error", message);
    ctx.ui.notify(message, "error");
    return false;
  }

  await refreshPiBuilderWidget(pi, ctx);
  ctx.ui.notify("pi-builder config validation passed", "info");
  return true;
}

export async function validateAndReload(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const valid = await validateConfigRepo(pi, ctx);

  if (!valid) {
    return;
  }

  ctx.ui.notify("Reloading Pi resources after pi-builder config changes...", "info");
  await ctx.reload();
}
