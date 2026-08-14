import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  HttpError,
  readJsonObject,
  requiredExpoPushToken,
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
