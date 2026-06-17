import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const RELEASE_TYPE = "patch";

function main() {
  assertCleanGitTree();
  run("yarn", ["lint"]);
  run("yarn", ["typecheck"]);
  run("yarn", ["format:check"]);

  const packageName = getPackageName();
  let version = getPackageVersion();

  if (shouldResumeRelease(packageName, version)) {
    console.log(`Resuming release v${version}`);
  } else {
    run("npm", ["version", RELEASE_TYPE, "-m", "release v%s"]);
    version = getPackageVersion();
  }

  if (npmVersionExists(packageName, version)) {
    console.log(`${packageName}@${version} is already published; skipping npm publish.`);
  } else {
    run("npm", ["publish", "--access", "public", "--tag", "latest"]);
  }

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

function shouldResumeRelease(packageName, version) {
  if (!localTagExists(version)) {
    return false;
  }

  if (!localTagPointsToHead(version)) {
    console.log(
      `v${version} exists but does not point to HEAD; creating a new ${RELEASE_TYPE} release instead.`,
    );
    return false;
  }

  if (npmVersionExists(packageName, version)) {
    throw new Error(
      `${packageName}@${version} is already published and v${version} points to HEAD. Nothing to release.`,
    );
  }

  return true;
}

function getPackageName() {
  const packageJson = getPackageJson();

  if (typeof packageJson.name !== "string") {
    throw new Error("package.json name is missing");
  }

  return packageJson.name;
}

function getPackageVersion() {
  const packageJson = getPackageJson();

  if (typeof packageJson.version !== "string") {
    throw new Error("package.json version is missing");
  }

  return packageJson.version;
}

function getPackageJson() {
  return JSON.parse(readFileSync("package.json", "utf8"));
}

function localTagExists(version) {
  const result = spawnSync("git", ["rev-parse", "--verify", `refs/tags/v${version}`], {
    encoding: "utf8",
    stdio: "pipe",
  });

  return result.status === 0;
}

function localTagPointsToHead(version) {
  const head = run("git", ["rev-parse", "HEAD"], {
    capture: true,
  });
  const tag = run("git", ["rev-parse", `v${version}`], {
    capture: true,
  });

  return head === tag;
}

function npmVersionExists(packageName, version) {
  const result = spawnSync("npm", ["view", `${packageName}@${version}`, "version"], {
    encoding: "utf8",
    stdio: "pipe",
  });

  return result.status === 0 && result.stdout.trim() === version;
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
