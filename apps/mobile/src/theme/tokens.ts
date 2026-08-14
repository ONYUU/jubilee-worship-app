import { Platform } from "react-native";

export const colors = {
  background: "#E5D8D9",
  card: "#F0E8E5",
  navigation: "#E4D8D9",
  secondarySurface: "#D9CBCE",
  raised: "#E9DEDE",
  line: "#C1AEB3",
  controlBorder: "#92747C",
  text: "#30272B",
  muted: "#62545A",
  active: "#27658F",
  activeSoft: "#D4DEE7",
  cta: "#F2E398",
  ctaBorder: "#9B7E16",
  danger: "#923741",
  dangerSoft: "#F2DDD6",
  success: "#3E6F50",
  successSoft: "#DDEBDD",
  photoScrim: "#0D1C2A",
  white: "#FFFFFF"
} as const;

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

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#402A33",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 18
    },
    android: { elevation: 3 },
    default: {}
  }),
  small: Platform.select({
    ios: {
      shadowColor: "#402A33",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 10
    },
    android: { elevation: 2 },
    default: {}
  })
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: "800" as const },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "800" as const },
  heading: { fontSize: 19, lineHeight: 27, fontWeight: "800" as const },
  body: { fontSize: 15, lineHeight: 23, fontWeight: "500" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "700" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "600" as const }
} as const;
