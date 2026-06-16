import { homedir } from "node:os";
import { join } from "node:path";

export const PI_AGENT_DIR = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
