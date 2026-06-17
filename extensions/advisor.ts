import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Repetition = {
  count: number;
  asked: boolean;
  example: string;
};

const MIN_REPEAT_COUNT = 3;
const recentIntents = new Map<string, Repetition>();

export function registerCustomizationAdvisor(pi: ExtensionAPI): void {
  pi.on("input", async (event, ctx) => {
    if (event.source !== "interactive") {
      return { action: "continue" as const };
    }

    if (event.text.trim().startsWith("/")) {
      return { action: "continue" as const };
    }

    const intent = normalizeIntent(event.text);

    if (intent.length < 12) {
      return { action: "continue" as const };
    }

    const repetition = recentIntents.get(intent) ?? {
      count: 0,
      asked: false,
      example: event.text.trim(),
    };
    repetition.count += 1;
    recentIntents.set(intent, repetition);

    if (repetition.count < MIN_REPEAT_COUNT || repetition.asked) {
      return { action: "continue" as const };
    }

    repetition.asked = true;

    const shouldCreateCustomization = await ctx.ui.confirm(
      "Create pi-builder customization?",
      [
        "You have asked for a similar workflow several times.",
        "Would you like Pi to turn it into a reusable pi-builder skill, prompt, or extension under user/?",
      ].join("\n"),
      { timeout: 15_000 },
    );

    if (!shouldCreateCustomization) {
      return { action: "continue" as const };
    }

    pi.sendUserMessage(
      `Use /pi-builder extend to create a reusable customization for this repeated workflow:\n\n${repetition.example}`,
      { deliverAs: "followUp" },
    );

    return { action: "continue" as const };
  });
}

function normalizeIntent(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/`[^`]*`/g, "")
    .replaceAll(/['"][^'"]*['"]/g, "")
    .replaceAll(/\b[\w./-]+\.(ts|js|json|md|tsx|jsx|css|html)\b/g, "<file>")
    .replaceAll(/\b\d+\b/g, "<number>")
    .replaceAll(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join(" ");
}
