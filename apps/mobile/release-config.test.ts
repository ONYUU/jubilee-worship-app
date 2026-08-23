import { afterEach, describe, expect, it, vi } from "vitest";

import createExpoConfig, {
  addAndroidPackageVisibilityQueries,
  isSupabasePublishableKey,
  parseHttpsOrigin,
  validateProductionEnvironment
} from "./app.config";

const VALID_PRODUCTION_ENV = {
  APP_VARIANT: "production",
  EXPO_PUBLIC_CONTENT_SOURCE: "supabase",
  EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example_key_value",
  EXPO_PUBLIC_WEB_ORIGIN: "https://jubilee-worship.vercel.app"
};

function productionConfig() {
  for (const [name, value] of Object.entries(VALID_PRODUCTION_ENV)) {
    vi.stubEnv(name, value);
  }
  return createExpoConfig({
    config: {},
    projectRoot: process.cwd(),
    staticConfigPath: null,
    packageJsonPath: null
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("release configuration", () => {
  function legacyJwt(role: string): string {
    const encode = (value: object) => globalThis.btoa(JSON.stringify(value))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.test-signature`;
  }

  it("accepts only a path-free HTTPS origin", () => {
    expect(parseHttpsOrigin("https://jubilee-worship.vercel.app")?.hostname).toBe(
      "jubilee-worship.vercel.app"
    );
    expect(parseHttpsOrigin("https://jubilee-worship.vercel.app/")?.hostname).toBe(
      "jubilee-worship.vercel.app"
    );
    expect(parseHttpsOrigin("http://jubilee-worship.vercel.app")).toBeNull();
    expect(parseHttpsOrigin("https://jubilee-worship.vercel.app/privacy")).toBeNull();
    expect(parseHttpsOrigin("https://user:pass@example.com")).toBeNull();
  });

  it("keeps production identifiers separate from preview builds", () => {
    const config = productionConfig();

    expect(config.name).toBe("쥬빌리워십");
    expect(config.version).toBe("1.0.0");
    expect(config.scheme).toBe("jubileeworship");
    expect(config.ios?.bundleIdentifier).toBe("org.sundoo.jubileeworship");
    expect(config.android?.package).toBe("org.sundoo.jubileeworship");
    expect(config.ios?.associatedDomains).toEqual([
      "applinks:jubilee-worship.vercel.app"
    ]);
    expect(config.android?.intentFilters?.[0]?.data).toEqual([
      {
        scheme: "https",
        host: "jubilee-worship.vercel.app",
        path: "/worship"
      },
      {
        scheme: "https",
        host: "jubilee-worship.vercel.app",
        pathPrefix: "/worship/"
      }
    ]);
    expect(config.android?.blockedPermissions).toEqual(expect.arrayContaining([
      "android.permission.READ_APP_BADGE",
      "com.sec.android.provider.badge.permission.READ",
      "com.sec.android.provider.badge.permission.WRITE",
      "me.everything.badger.permission.BADGE_COUNT_READ",
      "me.everything.badger.permission.BADGE_COUNT_WRITE"
    ]));
  });

  it("declares Android 11 package visibility for the exact external URI schemes", () => {
    const manifest = {
      manifest: {
        queries: [
          {
            intent: [
              {
                action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
                data: [{ $: { "android:scheme": "https" } }]
              }
            ]
          }
        ]
      }
    };

    addAndroidPackageVisibilityQueries(manifest);
    addAndroidPackageVisibilityQueries(manifest);

    const schemes = manifest.manifest.queries[0]?.intent
      ?.map((intent) => intent.data?.[0]?.$?.["android:scheme"])
      .filter(Boolean);
    expect(schemes).toEqual(["https", "geo", "mailto"]);
  });

  it("fails a production config before a broken public build is created", () => {
    expect(() => validateProductionEnvironment({})).toThrow(
      "EXPO_PUBLIC_SUPABASE_URL is required"
    );
    expect(() =>
      validateProductionEnvironment({
        ...VALID_PRODUCTION_ENV,
        EXPO_PUBLIC_WEB_ORIGIN: "https://jubilee-worship.vercel.app/privacy"
      })
    ).toThrow("EXPO_PUBLIC_WEB_ORIGIN must be an HTTPS origin");
    expect(() =>
      validateProductionEnvironment({
        ...VALID_PRODUCTION_ENV,
        EXPO_PUBLIC_CONTENT_SOURCE: "local"
      })
    ).toThrow("EXPO_PUBLIC_CONTENT_SOURCE must be supabase");
  });

  it("accepts only client-safe Supabase keys", () => {
    expect(isSupabasePublishableKey("sb_publishable_release_validation_placeholder")).toBe(true);
    expect(isSupabasePublishableKey(legacyJwt("anon"))).toBe(true);
    expect(isSupabasePublishableKey("sb_secret_server_only_value_that_must_not_ship")).toBe(false);
    expect(isSupabasePublishableKey(legacyJwt("service_role"))).toBe(false);
    expect(isSupabasePublishableKey("a-long-but-unclassified-key-value")).toBe(false);

    expect(() => validateProductionEnvironment({
      ...VALID_PRODUCTION_ENV,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_server_only_value_that_must_not_ship"
    })).toThrow("secret and service_role keys are forbidden");
    expect(() => validateProductionEnvironment({
      ...VALID_PRODUCTION_ENV,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacyJwt("service_role")
    })).toThrow("secret and service_role keys are forbidden");
  });

  it("rejects a mistyped app variant instead of silently building a dev app", () => {
    vi.stubEnv("APP_VARIANT", "prod");
    expect(() =>
      createExpoConfig({
        config: {},
        projectRoot: process.cwd(),
        staticConfigPath: null,
        packageJsonPath: null
      })
    ).toThrow("Unsupported APP_VARIANT: prod");
  });

  it("resolves the production identifier for credential commands using the profile", () => {
    vi.stubEnv("APP_VARIANT", undefined);
    vi.stubEnv("EAS_BUILD_PROFILE", "production");

    const config = createExpoConfig({
      config: {},
      projectRoot: process.cwd(),
      staticConfigPath: null,
      packageJsonPath: null
    });
    expect(config.ios?.bundleIdentifier).toBe("org.sundoo.jubileeworship");
    expect(config.android?.package).toBe("org.sundoo.jubileeworship");
  });

  it("keeps the installable production-device profile on production identifiers", () => {
    vi.stubEnv("APP_VARIANT", undefined);
    vi.stubEnv("EAS_BUILD_PROFILE", "production-device");

    const config = createExpoConfig({
      config: {},
      projectRoot: process.cwd(),
      staticConfigPath: null,
      packageJsonPath: null
    });
    expect(config.name).toBe("쥬빌리워십");
    expect(config.ios?.bundleIdentifier).toBe("org.sundoo.jubileeworship");
    expect(config.android?.package).toBe("org.sundoo.jubileeworship");
  });

  it("keeps the Mac production-simulator profile on production identifiers", () => {
    vi.stubEnv("APP_VARIANT", undefined);
    vi.stubEnv("EAS_BUILD_PROFILE", "production-simulator");

    const config = createExpoConfig({
      config: {},
      projectRoot: process.cwd(),
      staticConfigPath: null,
      packageJsonPath: null
    });
    expect(config.name).toBe("쥬빌리워십");
    expect(config.version).toBe("1.0.0");
    expect(config.ios?.bundleIdentifier).toBe("org.sundoo.jubileeworship");
  });

  it("does not advertise unverified web associations from the preview app", () => {
    vi.stubEnv("APP_VARIANT", "preview");
    vi.stubEnv("EXPO_PUBLIC_WEB_ORIGIN", "https://jubilee-worship.vercel.app");

    const config = createExpoConfig({
      config: {},
      projectRoot: process.cwd(),
      staticConfigPath: null,
      packageJsonPath: null
    });
    expect(config.ios?.associatedDomains).toBeUndefined();
    expect(config.android?.intentFilters).toBeUndefined();
  });

  it("does not require build-only secrets during credentials management", () => {
    vi.stubEnv("APP_VARIANT", "production");
    expect(() =>
      createExpoConfig({
        config: {},
        projectRoot: process.cwd(),
        staticConfigPath: null,
        packageJsonPath: null
      })
    ).not.toThrow();
  });

  it("requires the Firebase service file on an Android production worker", () => {
    expect(() =>
      validateProductionEnvironment({
        ...VALID_PRODUCTION_ENV,
        EAS_BUILD_PLATFORM: "android"
      })
    ).toThrow("GOOGLE_SERVICES_JSON is required");

    expect(() =>
      validateProductionEnvironment({
        ...VALID_PRODUCTION_ENV,
        EAS_BUILD_PLATFORM: "android",
        GOOGLE_SERVICES_JSON: "/eas/secret/google-services.json"
      })
    ).not.toThrow();
  });

  it("does not require Android Firebase material for an iOS worker", () => {
    expect(() =>
      validateProductionEnvironment({
        ...VALID_PRODUCTION_ENV,
        EAS_BUILD_PLATFORM: "ios"
      })
    ).not.toThrow();
  });
});
