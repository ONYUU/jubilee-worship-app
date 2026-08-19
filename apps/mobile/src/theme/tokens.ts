import { Platform } from "react-native";
import type { ThemeMode } from "./theme-storage";

export type { ThemeMode } from "./theme-storage";

export type ThemeColors = {
  background: string;
  card: string;
  navigation: string;
  secondarySurface: string;
  raised: string;
  line: string;
  controlBorder: string;
  text: string;
  muted: string;
  active: string;
  activeSoft: string;
  cta: string;
  ctaBorder: string;
  onCta: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  photoScrim: string;
  onPhoto: string;
  onLightSurface: string;
  shadow: string;
  white: string;
};

export const themeColors: Record<ThemeMode, ThemeColors> = {
  light: {
    background: "#F2F7FA",
    card: "#FFFCF4",
    navigation: "#FCFDFD",
    secondarySurface: "#E6EFF5",
    raised: "#F7FAFC",
    line: "#D5E0E7",
    controlBorder: "#78909E",
    text: "#111820",
    muted: "#596772",
    active: "#27658F",
    activeSoft: "#DCECF8",
    cta: "#FFF5AE",
    ctaBorder: "#9B7E16",
    onCta: "#27230B",
    danger: "#A33B45",
    dangerSoft: "#FBE8EA",
    success: "#3D7354",
    successSoft: "#E4F1E7",
    photoScrim: "#0D1C2A",
    onPhoto: "#FFFFFF",
    onLightSurface: "#111820",
    shadow: "#15354A",
    white: "#FFFFFF"
  },
  dark: {
    background: "#0E1114",
    card: "#171C20",
    navigation: "#12171B",
    secondarySurface: "#242B31",
    raised: "#1E252A",
    line: "#313A42",
    controlBorder: "#687782",
    text: "#F5F7F8",
    muted: "#AEB9C1",
    active: "#62A2E4",
    activeSoft: "#16384F",
    cta: "#FFF5AE",
    ctaBorder: "#D8C967",
    onCta: "#27230B",
    danger: "#FF929C",
    dangerSoft: "#48252B",
    success: "#82C99B",
    successSoft: "#203A2B",
    photoScrim: "#0D1C2A",
    onPhoto: "#FFFFFF",
    onLightSurface: "#111820",
    shadow: "#000000",
    white: "#FFFFFF"
  }
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999
} as const;

export function createShadows(colors: ThemeColors) {
  return {
    card: Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18
      },
      android: { elevation: 3 },
      default: {}
    }),
    small: Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 10
      },
      android: { elevation: 2 },
      default: {}
    })
  } as const;
}

export const typography = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: "800" as const },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "800" as const },
  heading: { fontSize: 19, lineHeight: 27, fontWeight: "800" as const },
  body: { fontSize: 15, lineHeight: 23, fontWeight: "500" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "700" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "600" as const }
} as const;
