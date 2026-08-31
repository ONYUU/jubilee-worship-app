import {
  assert,
  assertEquals,
  assertRejects,
  assertThrows,
} from "jsr:@std/assert@1";
import { HttpError } from "./http.ts";
import {
  createTestPushPairingCode,
  formatTestPushPairingCode,
  pairingCodeDigest,
  requiredTestPushPairingCode,
  requiredTestPushPairingPepper,
} from "./pairing.ts";

Deno.test("pairing codes carry 60 bits in a human-readable Crockford format", () => {
  const code = createTestPushPairingCode();
  assert(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){2}$/.test(code));
  assertEquals(requiredTestPushPairingCode(code).length, 12);
});

Deno.test("pairing code input normalizes separators and ambiguous characters", () => {
  const normalized = requiredTestPushPairingCode("o1il-abcd-efgh");
  assertEquals(normalized, "0111ABCDEFGH");
  assertEquals(formatTestPushPairingCode(normalized), "0111-ABCD-EFGH");
});

Deno.test("pairing code input rejects short or unsupported values", () => {
  for (const value of [null, "ABCD-EFGH", "ABCD-EFGH-UJKL"]) {
    const error = assertThrows(
      () => requiredTestPushPairingCode(value),
      HttpError,
    );
    assertEquals(error.status, 400);
  }
});

Deno.test("pairing HMAC is stable, pepper-bound, and never contains raw code", async () => {
  const code = "0123456789AB";
  const first = await pairingCodeDigest(code, "a".repeat(32));
  const repeated = await pairingCodeDigest(code, "a".repeat(32));
  const otherPepper = await pairingCodeDigest(code, "b".repeat(32));
  assertEquals(first, repeated);
  assert(first !== otherPepper);
  assert(/^[0-9a-f]{64}$/.test(first));
  assert(!first.includes(code));
});

Deno.test("pairing pepper is mandatory server-only configuration", async () => {
  await assertRejects(
    async () => requiredTestPushPairingPepper(undefined),
    HttpError,
  );
  assertEquals(requiredTestPushPairingPepper("p".repeat(32)).length, 32);
});
