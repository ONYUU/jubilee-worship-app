import type { ConfigContext, ExpoConfig } from "expo/config";
import { withAndroidManifest } from "expo/config-plugins";

type AppVariant = "development" | "preview" | "production";

type ReleaseEnvironment = Record<string, string | undefined>;

type AndroidManifestIntent = {
  action?: Array<{ $?: { "android:name"?: string } }>;
  data?: Array<{ $?: { "android:scheme"?: string } }>;
};

type PackageVisibilityManifest = {
  manifest: {
    queries?: Array<{ intent?: AndroidManifestIntent[] }>;
  };
};

const REQUIRED_EXTERNAL_APP_QUERIES = ["geo", "mailto"] as const;

/**
 * React Native implements Linking.canOpenURL() with ACTION_VIEW on Android.
 * Android 11+ hides matching apps unless each queried URI scheme is declared
 * under <queries>, so keep the exact ACTION_VIEW declarations in the generated
 * production manifest.
 */
export function addAndroidPackageVisibilityQueries<
  T extends PackageVisibilityManifest
>(manifest: T): T {
  const queries = manifest.manifest.queries ??= [];
  const queryGroup = queries[0] ?? { intent: [] };
  if (queries.length === 0) queries.push(queryGroup);
  const intents = queryGroup.intent ??= [];

  for (const scheme of REQUIRED_EXTERNAL_APP_QUERIES) {
    const alreadyDeclared = intents.some((intent) =>
      intent.action?.some(
        (action) => action.$?.["android:name"] === "android.intent.action.VIEW"
      ) === true &&
      intent.data?.some((data) => data.$?.["android:scheme"] === scheme) === true
    );
    if (alreadyDeclared) continue;

    intents.push({
      action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
      data: [{ $: { "android:scheme": scheme } }]
    });
  }

  return manifest;
}

const REQUIRED_PRODUCTION_VALUES = [
  "EXPO_PUBLIC_CONTENT_SOURCE",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_WEB_ORIGIN"
] as const;

function requiredValue(
  environment: ReleaseEnvironment,
  name: (typeof REQUIRED_PRODUCTION_VALUES)[number] | "GOOGLE_SERVICES_JSON"
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`[release-config] ${name} is required for a production build.`);
  }
  return value;
}

export function parseHttpsOrigin(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const hasOnlyOrigin =
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      parsed.pathname === "/" &&
      !parsed.search &&
      !parsed.hash;
    return hasOnlyOrigin ? parsed : null;
  } catch {
    return null;
  }
}

export function isSupabasePublishableKey(value: string): boolean {
  const normalized = value.trim();
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(normalized)) {
    return true;
  }
  if (normalized.startsWith("sb_secret_")) {
    return false;
  }

  const parts = normalized.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return false;
  }

  try {
    const encodedPayload = (parts[1] ?? "")
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const paddedPayload = encodedPayload.padEnd(
      encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4),
      "="
    );
    const payload = JSON.parse(globalThis.atob(paddedPayload));
    return typeof payload === "object"
      && payload !== null
      && (payload as { role?: unknown }).role === "anon";
  } catch {
    return false;
  }
}

export function validateProductionEnvironment(
  environment: ReleaseEnvironment
): void {
  const supabaseUrl = requiredValue(environment, "EXPO_PUBLIC_SUPABASE_URL");
  const publishableKey = requiredValue(
    environment,
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
  const webOrigin = requiredValue(environment, "EXPO_PUBLIC_WEB_ORIGIN");

  if (environment.EXPO_PUBLIC_CONTENT_SOURCE !== "supabase") {
    throw new Error(
      "[release-config] EXPO_PUBLIC_CONTENT_SOURCE must be supabase for a production build."
    );
  }

  if (!parseHttpsOrigin(supabaseUrl)) {
    throw new Error(
      "[release-config] EXPO_PUBLIC_SUPABASE_URL must be an HTTPS origin without a path, query, or fragment."
    );
  }
  if (!isSupabasePublishableKey(publishableKey)) {
    throw new Error(
      "[release-config] EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key or a legacy anon JWT; secret and service_role keys are forbidden."
    );
  }
  if (!parseHttpsOrigin(webOrigin)) {
    throw new Error(
      "[release-config] EXPO_PUBLIC_WEB_ORIGIN must be an HTTPS origin without a path, query, or fragment."
    );
  }

  if (environment.EAS_BUILD_PLATFORM === "android") {
    requiredValue(environment, "GOOGLE_SERVICES_JSON");
  }
}

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

function resolveVariant(
  value: string | undefined,
  buildProfile: string | undefined
): AppVariant {
  if (value === undefined) {
    if (buildProfile?.startsWith("production")) return "production";
    if (buildProfile?.startsWith("preview")) return "preview";
    return "development";
  }
  if (value === "development") return "development";
  if (value === "preview" || value === "production") return value;
  throw new Error(`[release-config] Unsupported APP_VARIANT: ${value}`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(
    process.env.APP_VARIANT,
    process.env.EAS_BUILD_PROFILE
  );
  const settings = VARIANTS[variant];
  const identifier = `org.sundoo.jubileeworship${settings.identifierSuffix}`;
  const shouldValidateProduction =
    process.env.EAS_BUILD === "true" ||
    process.env.JUBILEE_VALIDATE_PRODUCTION_CONFIG === "true";
  if (variant === "production" && shouldValidateProduction) {
    validateProductionEnvironment(process.env);
  }
  const webHost = parseHttpsOrigin(process.env.EXPO_PUBLIC_WEB_ORIGIN)?.hostname ?? null;
  const appLinkHost = variant === "production" ? webHost : null;

  const expoConfig: ExpoConfig = {
    ...config,
    owner: "trust_me",
    name: `쥬빌리워십${settings.nameSuffix}`,
    slug: "jubilee-worship",
    description: "쥬빌리 워십 공식 예배 안내 앱",
    scheme: settings.scheme,
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/images/jubilee/app-icon-official.png",
    ios: {
      bundleIdentifier: identifier,
      buildNumber: "1",
      icon: "./assets/images/jubilee/app-icon-official.png",
      supportsTablet: false,
      associatedDomains: appLinkHost ? [`applinks:${appLinkHost}`] : undefined,
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
      icon: "./assets/images/jubilee/app-icon-official.png",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        foregroundImage: "./assets/images/jubilee/app-icon-official-foreground.png",
        monochromeImage: "./assets/images/jubilee/app-icon-official-monochrome.png",
        backgroundColor: "#FFF5AE"
      },
      intentFilters: appLinkHost
        ? [
            {
              action: "VIEW",
              autoVerify: true,
              data: [
                { scheme: "https", host: appLinkHost, path: "/worship" },
                { scheme: "https", host: appLinkHost, pathPrefix: "/worship/" }
              ],
              category: ["BROWSABLE", "DEFAULT"]
            }
          ]
        : undefined,
      blockedPermissions: [
        "android.permission.READ_CALENDAR",
        "android.permission.WRITE_CALENDAR",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_APP_BADGE",
        "com.anddoes.launcher.permission.UPDATE_COUNT",
        "com.htc.launcher.permission.READ_SETTINGS",
        "com.htc.launcher.permission.UPDATE_SHORTCUT",
        "com.huawei.android.launcher.permission.CHANGE_BADGE",
        "com.huawei.android.launcher.permission.READ_SETTINGS",
        "com.huawei.android.launcher.permission.WRITE_SETTINGS",
        "com.majeur.launcher.permission.UPDATE_BADGE",
        "com.oppo.launcher.permission.READ_SETTINGS",
        "com.oppo.launcher.permission.WRITE_SETTINGS",
        "com.sec.android.provider.badge.permission.READ",
        "com.sec.android.provider.badge.permission.WRITE",
        "com.sonyericsson.home.permission.BROADCAST_BADGE",
        "com.sonymobile.home.permission.PROVIDER_INSERT_BADGE",
        "me.everything.badger.permission.BADGE_COUNT_READ",
        "me.everything.badger.permission.BADGE_COUNT_WRITE",
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
      favicon: "./assets/images/jubilee/app-icon-official.png"
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

  return withAndroidManifest(expoConfig, (pluginConfig) => {
    pluginConfig.modResults = addAndroidPackageVisibilityQueries(
      pluginConfig.modResults
    );
    return pluginConfig;
  });
};
