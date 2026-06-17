import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RELEASE_TYPE = "patch";

function main() {
  assertCleanGitTree();
  run("yarn", ["lint"]);
  run("yarn", ["typecheck"]);
  run("yarn", ["format:check"]);
  run("npm", ["version", RELEASE_TYPE, "-m", "release v%s"]);

  const version = getPackageVersion();
  run("npm", ["publish", "--access", "public", "--tag", "latest"]);
  run("git", ["push", "origin", "HEAD", `v${version}`]);

  console.log(`Released v${version}`);
}

function assertCleanGitTree() {
  const status = run("git", ["status", "--porcelain"], {
    capture: true,
  });

  if (status.length > 0) {
    throw new Error(
      [
        "Cannot release with uncommitted changes.",
        "Commit or stash your changes, then run `yarn release` again.",
        "",
        status,
      ].join("\n"),
    );
  }
}

function getPackageVersion() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  if (typeof packageJson.version !== "string") {
    throw new Error("package.json version is missing");
  }

  return packageJson.version;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture === true ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    const details = options.capture === true ? `${result.stdout}${result.stderr}` : "";
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${details}`);
  }

  if (options.capture === true) {
    return result.stdout.trim();
  }

  return "";
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
