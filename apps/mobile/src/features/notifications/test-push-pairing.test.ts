import { describe, expect, it } from "vitest";
import {
  isTestPushPairingVariant,
  parseTestPushPairingCode,
  testPushPairingRemainingMs
} from "./test-push-pairing";

describe("test push pairing response", () => {
  it("accepts one formatted 60-bit code for the expected non-production variant", () => {
    expect(parseTestPushPairingCode({
      pairingCode: "0123-4567-89AB",
      expiresAt: "2035-06-15T10:10:00.000Z",
      appVariant: "development"
    }, "development")).toEqual({
      pairingCode: "0123-4567-89AB",
      expiresAt: "2035-06-15T10:10:00.000Z",
      appVariant: "development"
    });
  });

  it("rejects production, a variant mismatch, malformed code, and invalid expiry", () => {
    const base = {
      pairingCode: "0123-4567-89AB",
      expiresAt: "2035-06-15T10:10:00.000Z",
      appVariant: "preview"
    };
    expect(parseTestPushPairingCode(base, "development")).toBeNull();
    expect(parseTestPushPairingCode({ ...base, pairingCode: "1234" }, "preview")).toBeNull();
    expect(parseTestPushPairingCode({ ...base, expiresAt: "invalid" }, "preview")).toBeNull();
    expect(isTestPushPairingVariant("production")).toBe(false);
    expect(isTestPushPairingVariant("preview")).toBe(true);
  });

  it("reports no remaining time after a pairing code expires", () => {
    const pairing = {
      pairingCode: "0123-4567-89AB",
      expiresAt: "2035-06-15T10:10:00.000Z",
      appVariant: "preview" as const
    };
    expect(testPushPairingRemainingMs(pairing, Date.parse("2035-06-15T10:09:59.000Z"))).toBe(1_000);
    expect(testPushPairingRemainingMs(pairing, Date.parse("2035-06-15T10:10:01.000Z"))).toBe(0);
  });
});
