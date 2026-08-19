import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const VARIANTS: Record<
  AppVariant,
  { nameSuffix: string; identifierSuffix: string; scheme: string }
> = {
  development: {
    nameSuffix: " Dev",
    identifierSuffix: ".dev",
    scheme: "jubileeworship-dev"
  },
  preview: {
    nameSuffix: " Preview",
    identifierSuffix: ".preview",
    scheme: "jubileeworship-preview"
  },
  production: { nameSuffix: "", identifierSuffix: "", scheme: "jubileeworship" }
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
    owner: "trust_me",
    name: `쥬빌리워십${settings.nameSuffix}`,
    slug: "jubilee-worship",
    description: "쥬빌리 워십 공식 예배 안내 앱",
    scheme: settings.scheme,
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/jubilee/app-icon-sky.png",
    ios: {
      bundleIdentifier: identifier,
      buildNumber: "1",
      supportsTablet: false,
      associatedDomains: webHost ? [`applinks:${webHost}`] : undefined,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        ...(variant === "development"
          ? {}
          : {
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: false
              }
            })
      }
    },
    android: {
      package: identifier,
      versionCode: 1,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        foregroundImage: "./assets/images/jubilee/app-icon-sky.png",
        backgroundColor: "#E7F3FB"
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
      favicon: "./assets/images/jubilee/app-icon-sky.png"
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
          image: "./assets/images/jubilee/app-icon-sky.png",
          imageWidth: 120,
          resizeMode: "contain",
          backgroundColor: "#E7F3FB",
          dark: {
            image: "./assets/images/jubilee/app-icon-sky.png",
            backgroundColor: "#0B0E12"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      appVariant: variant,
      eas: {
        projectId: "b003dbe7-c515-43c6-b1eb-e025c03f25bd"
      }
    }
  };
};
