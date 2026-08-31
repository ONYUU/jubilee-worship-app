import { describe, expect, it, vi } from "vitest";
import { themeColors } from "./tokens";

vi.mock("react-native", () => ({
  Platform: {
    select: ({ default: defaultValue }: { default?: unknown }) => defaultValue ?? {}
  }
}));

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe.each(["light", "dark"] as const)("%s theme contrast", (mode) => {
  const colors = themeColors[mode];

  it.each([
    ["primary text", colors.text, colors.card],
    ["secondary text", colors.muted, colors.card],
    ["active text", colors.active, colors.card],
    ["active soft text", colors.active, colors.activeSoft],
    ["CTA text", colors.onCta, colors.cta]
  ])("keeps %s at 4.5:1 or better", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps functional control boundaries at 3:1 or better", () => {
    expect(contrastRatio(colors.controlBorder, colors.raised)).toBeGreaterThanOrEqual(3);
  });
});
