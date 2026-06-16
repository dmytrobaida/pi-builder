import { join } from "node:path";
import { PI_AGENT_DIR } from "./config.js";

export function getRepoDir(): string {
  return join(PI_AGENT_DIR, ".pi-builder");
}
