export const themeModes = ["light", "dark"] as const;

export type ThemeMode = (typeof themeModes)[number];

export const THEME_STORAGE_KEY = "jubilee.theme.mode.v1";
export const DEFAULT_THEME_MODE: ThemeMode = "light";

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && themeModes.includes(value as ThemeMode);
}

export function parseStoredThemeMode(value: string | null): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}
