import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const VARIANTS: Record<
  AppVariant,
  { nameSuffix: string; identifierSuffix: string }
> = {
  development: { nameSuffix: " Dev", identifierSuffix: ".dev" },
  preview: { nameSuffix: " Preview", identifierSuffix: ".preview" },
  production: { nameSuffix: "", identifierSuffix: "" }
};

function resolveVariant(value: string | undefined): AppVariant {
  if (value === "preview" || value === "production") return value;
  return "development";
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const settings = VARIANTS[variant];
  const identifier = `org.sundoo.jubileeworship${settings.identifierSuffix}`;
  const webHost = (() => {
    try {
      const origin = new URL(process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "");
      return origin.protocol === "https:" && !origin.username && !origin.password
        ? origin.hostname
        : null;
    } catch {
      return null;
    }
  })();

  return {
    ...config,
    name: `쥬빌리워십${settings.nameSuffix}`,
    slug: "jubilee-worship",
    scheme: "jubileeworship",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/images/jubilee/app-icon-rose-haze.png",
    ios: {
      bundleIdentifier: identifier,
      buildNumber: "1",
      supportsTablet: false,
      associatedDomains: webHost ? [`applinks:${webHost}`] : undefined,
      infoPlist:
        variant === "development"
          ? undefined
          : {
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: false
              }
            }
    },
    android: {
      package: identifier,
      versionCode: 1,
      predictiveBackGestureEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/images/jubilee/app-icon-rose-haze.png",
        backgroundColor: "#E5D8D9"
      },
      intentFilters: webHost
        ? [
            {
              action: "VIEW",
              autoVerify: true,
              data: [{ scheme: "https", host: webHost, pathPrefix: "/worship" }],
              category: ["BROWSABLE", "DEFAULT"]
            }
          ]
        : undefined,
      blockedPermissions: [
        "android.permission.READ_CALENDAR",
        "android.permission.WRITE_CALENDAR",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        ...(variant === "development"
          ? []
          : [
              "android.permission.SYSTEM_ALERT_WINDOW",
              "android.permission.USE_BIOMETRIC",
              "android.permission.USE_FINGERPRINT"
            ])
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/jubilee/app-icon-rose-haze.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-calendar",
        {
          calendarPermission: false,
          remindersPermission: false,
          writeOnlyCalendarPermission: false
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/jubilee/notification-icon.png",
          color: "#27658F"
        }
      ],
      ["expo-secure-store", { faceIDPermission: false }],
      "expo-sqlite",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/jubilee/rose-haze-background.png",
          imageWidth: 390,
          resizeMode: "cover",
          backgroundColor: "#E5D8D9"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      appVariant: variant,
      ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
        : {})
    }
  };
};
