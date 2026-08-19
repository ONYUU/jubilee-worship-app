import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Appearance, Platform } from "react-native";
import { DEFAULT_THEME_MODE, parseStoredThemeMode, THEME_STORAGE_KEY } from "./theme-storage";
import { themeColors, type ThemeColors, type ThemeMode } from "./tokens";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => {
        if (active) setModeState(parseStoredThemeMode(value));
      })
      .catch(() => {
        // The in-memory default remains usable if local storage is unavailable.
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {
      // Keep the selected mode for this session even when persistence fails.
    });
  }, []);

  useEffect(() => {
    if (ready && Platform.OS !== "web") Appearance.setColorScheme(mode);
  }, [mode, ready]);

  const value = useMemo(
    () => ({ mode, colors: themeColors[mode], setMode }),
    [mode, setMode]
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used within ThemeProvider");
  return context;
}

export function useAppThemeStyles<T>(createStyles: (colors: ThemeColors) => T) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [createStyles, theme.colors]);
  return { ...theme, styles };
}
