import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  HttpError,
  readJsonObject,
  requiredExpoPushToken,
  requiredSensitiveInterestNotificationConsent,
  requiredTestAppVariant,
  SENSITIVE_INTEREST_NOTIFICATION_CONSENT_VERSION,
  SENSITIVE_INTEREST_NOTIFICATION_DISCLOSURE_SHA256,
  sha256Hex,
} from "./http.ts";
import { enforceRegistrationRateLimit } from "./rate-limit.ts";

Deno.test("request validation rejects a non-POST request", async () => {
  const error = await assertRejects(
    () => readJsonObject(new Request("http://local.test", { method: "GET" })),
    HttpError,
  );
  assertEquals(error.status, 405);
});

Deno.test("Expo token validation accepts current and legacy prefixes", () => {
  assertEquals(
    requiredExpoPushToken("ExpoPushToken[abc_123-XYZ]"),
    "ExpoPushToken[abc_123-XYZ]",
  );
  assertEquals(
    requiredExpoPushToken("ExponentPushToken[legacy_123]"),
    "ExponentPushToken[legacy_123]",
  );
});

Deno.test("sensitive-interest consent validation accepts only v5", () => {
  assertEquals(
    SENSITIVE_INTEREST_NOTIFICATION_CONSENT_VERSION,
    "sensitive-interest-notifications-v5",
  );
  assertEquals(
    SENSITIVE_INTEREST_NOTIFICATION_DISCLOSURE_SHA256,
    "575ecb39ce1c1670e169e5fdae28587b09477a765a80c6dcfdb5df2f170a5f0e",
  );
  assertEquals(
    requiredSensitiveInterestNotificationConsent(
      "sensitive-interest-notifications-v5",
    ),
    "sensitive-interest-notifications-v5",
  );
  for (
    const staleVersion of [
      "sensitive-interest-notifications-v4",
      "sensitive-interest-notifications-v3",
      "sensitive-interest-notifications-v2",
    ]
  ) {
    try {
      requiredSensitiveInterestNotificationConsent(staleVersion);
      throw new Error("expected the stale consent version to be rejected");
    } catch (error) {
      assert(error instanceof HttpError);
      assertEquals(error.status, 400);
      assertEquals(error.code, "sensitive_interest_consent_required");
    }
  }
});

Deno.test("test app variant validation accepts only development and preview", () => {
  assertEquals(requiredTestAppVariant("development"), "development");
  assertEquals(requiredTestAppVariant("preview"), "preview");
  for (const value of ["production", "staging", null]) {
    try {
      requiredTestAppVariant(value);
      throw new Error("expected requiredTestAppVariant to reject the value");
    } catch (error) {
      assert(error instanceof HttpError);
      assertEquals(error.status, 400);
      assertEquals(error.code, "invalid_app_variant");
    }
  }
});

Deno.test("SHA-256 helper returns a lowercase hash and never the raw secret", async () => {
  const hash = await sha256Hex("a-local-installation-secret");
  assertEquals(hash.length, 64);
  assert(/^[0-9a-f]{64}$/.test(hash));
  assert(hash !== "a-local-installation-secret");
});

Deno.test("per-isolate registration limiter rejects the next request in its window", async () => {
  const request = new Request("http://local.test", {
    headers: {
      "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 200) + 1}`,
      "user-agent": crypto.randomUUID(),
    },
  });
  await enforceRegistrationRateLimit(request, 1, 60_000);
  const error = await assertRejects(
    () => enforceRegistrationRateLimit(request, 1, 60_000),
    HttpError,
  );
  assertEquals(error.status, 429);
});
