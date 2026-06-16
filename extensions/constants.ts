export const NPM_PACKAGE_SOURCE = "npm:@dbaida/pi-builder";
export const SOURCE_REPO = "dmytrobaida/pi-builder";
export const SOURCE_REPO_URL = `https://github.com/${SOURCE_REPO}.git`;
export const STATUS_KEY = "pi-builder";

export const USER_EXTENSIONS_DIR = "user/extensions";
export const USER_SKILLS_DIR = "user/skills";
export const USER_PROMPTS_DIR = "user/prompts";
export const USER_THEMES_DIR = "user/themes";

export const PROTECTED_PATHS = [
  "extensions",
  "package.json",
  "yarn.lock",
  "tsconfig.json",
  "eslint.config.js",
  ".prettierrc.json",
  ".yarnrc.yml",
  "LICENSE",
] as const;
