export const NPM_PACKAGE_SOURCE = "npm:@dbaida/pi-builder";
export const SOURCE_REPO = "dmytrobaida/pi-builder";
export const SOURCE_REPO_URL = `https://github.com/${SOURCE_REPO}.git`;
export const STATUS_KEY = "pi-builder";

export const USER_EXTENSIONS_DIR = "user/extensions";
export const USER_SKILLS_DIR = "user/skills";
export const USER_PROMPTS_DIR = "user/prompts";
export const USER_THEMES_DIR = "user/themes";

export const CUSTOMIZATION_HELP = `pi-builder customization rules:
- Edit only user/ files for personal customizations.
- Use user/extensions/ for Pi extension code.
- Use user/skills/ for skills.
- Use user/prompts/ for prompt templates.
- Use user/themes/ for themes.
- Do not edit sealed runtime files in extensions/ or project config files.
- After changes, run /pi-builder validate.
- To save changes remotely, run /pi-builder sync.`;

export const PROTECTED_PATHS = [
  "extensions",
  "package.json",
  "yarn.lock",
  "tsconfig.json",
  "eslint.config.js",
  ".prettierrc.json",
  ".yarnrc.yml",
  "LICENSE",
  "AGENTS.md",
  "CUSTOMIZE.md",
] as const;
