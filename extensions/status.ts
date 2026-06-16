import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { STATUS_KEY } from "./constants.js";

export type PiBuilderStatus = "running" | "ready" | "error";

export function setPiBuilderStatus(
  ctx: ExtensionContext,
  status: PiBuilderStatus,
  message: string,
): void {
  ctx.ui.setStatus(STATUS_KEY, `pi-builder: ${status} — ${message}`);
}
