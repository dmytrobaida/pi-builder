import { homedir } from "node:os";
import { join } from "node:path";

export const PI_AGENT_DIR = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
export const CONFIG_REPO_NAME = process.env.PI_BUILDER_CONFIG_REPO_NAME ?? "pi-builder-config";
