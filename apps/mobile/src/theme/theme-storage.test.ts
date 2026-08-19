import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_MODE, parseStoredThemeMode, themeModes } from "./theme-storage";

describe("parseStoredThemeMode", () => {
  it("offers only the approved light and dark modes", () => {
    expect(themeModes).toEqual(["light", "dark"]);
  });

  it.each(["light", "dark"] as const)("accepts the supported %s mode", (mode) => {
    expect(parseStoredThemeMode(mode)).toBe(mode);
  });

  it.each([null, "system", "", "LIGHT", "unknown"])(
    "falls back for an unsupported stored value: %s",
    (value) => {
      expect(parseStoredThemeMode(value)).toBe(DEFAULT_THEME_MODE);
    }
  );
});
