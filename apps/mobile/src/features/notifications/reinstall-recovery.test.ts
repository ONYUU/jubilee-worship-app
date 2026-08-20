import { describe, expect, it, vi } from "vitest";

import {
  createReinstallRecoveryCapability,
  createReinstallRecoveryCancelBody,
  createReinstallRecoveryFinalizeBody,
  createProvisionalPendingReinstallRecovery,
  createReinstallRecoveryRequestBody,
  formatReinstallRecoveryCode,
  isConfirmedReinstallRecoveryWithdrawal,
  normalizeReinstallRecoveryCode,
  parsePendingReinstallRecovery,
  parseStoredPendingReinstallRecovery,
  persistReinstallRecoveryRequest,
  reinstallRecoveryRemainingMs,
  scrubExpiredReinstallRecoveryCapability,
  serializePendingReinstallRecovery
} from "./reinstall-recovery";

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_algorithm: string, value: string) => {
    if (value === "jubilee:reinstall-recovery:v1\n00000000000000000000000000") {
      return "06500acf7542b2815c62efe5b7a6420a9001d1e02758d7a3877eba7fb74b9da3";
    }
    throw new Error("Unexpected digest input");
  },
  getRandomBytesAsync: async (length: number) => new Uint8Array(length)
}));

describe("owner-approved reinstall recovery capability", () => {
  it("creates a formatted 128-bit Crockford capability and domain-separated digest", async () => {
    const capability = await createReinstallRecoveryCapability(new Uint8Array(16));
    expect(capability).toEqual({
      recoveryCode: "0000-0000-0000-0000-0000-0000-00",
      recoveryCodeDigest:
        "06500acf7542b2815c62efe5b7a6420a9001d1e02758d7a3877eba7fb74b9da3"
    });
    expect(normalizeReinstallRecoveryCode(capability.recoveryCode)).toBe(
      "00000000000000000000000000"
    );
  });

  it("rejects malformed and ambiguous codes", () => {
    expect(normalizeReinstallRecoveryCode("0000-0000-0000-0000-0000-0000-0O"))
      .toBeNull();
    expect(() => formatReinstallRecoveryCode("short")).toThrow();
  });

  it("accepts only a bounded non-production pending response", () => {
    const now = Date.parse("2035-06-15T10:00:00.000Z");
    const payload = {
      status: "pending_owner_approval",
      expires_at: "2035-06-15T10:10:00.000Z"
    };
    const pending = parsePendingReinstallRecovery(
      payload,
      "0000-0000-0000-0000-0000-0000-00",
      "preview",
      "ExpoPushToken[preview-recovery]",
      now
    );
    expect(pending).toEqual({
      recoveryCode: "0000-0000-0000-0000-0000-0000-00",
      expoPushToken: "ExpoPushToken[preview-recovery]",
      appVariant: "preview",
      mode: "relink",
      createdAt: "2035-06-15T10:00:00.000Z",
      expiresAt: "2035-06-15T10:10:00.000Z"
    });
    expect(parsePendingReinstallRecovery(
      payload,
      pending!.recoveryCode!,
      "production",
      pending!.expoPushToken,
      now
    ))
      .toBeNull();
    expect(parsePendingReinstallRecovery(
      { ...payload, expires_at: "2035-06-15T10:17:00.000Z" },
      pending!.recoveryCode!,
      "preview",
      pending!.expoPushToken,
      now
    )).toBeNull();
  });

  it("round-trips the device-only pending record and clamps expired time", () => {
    const pending = {
      recoveryCode: "0000-0000-0000-0000-0000-0000-00",
      expoPushToken: "ExponentPushToken[development-recovery]",
      appVariant: "development" as const,
      mode: "relink" as const,
      createdAt: "2035-06-15T10:00:00.000Z",
      expiresAt: "2035-06-15T10:10:00.000Z"
    };
    expect(parseStoredPendingReinstallRecovery(
      serializePendingReinstallRecovery(pending)
    )).toEqual(pending);
    expect(reinstallRecoveryRemainingMs(
      pending,
      Date.parse("2035-06-15T10:09:59.000Z")
    )).toBe(1_000);
    expect(reinstallRecoveryRemainingMs(
      pending,
      Date.parse("2035-06-15T10:11:00.000Z")
    )).toBe(0);
  });

  it("persists a provisional code and exact token before the server request", () => {
    const now = Date.parse("2035-06-15T10:00:00.000Z");
    const provisional = createProvisionalPendingReinstallRecovery(
      "0000-0000-0000-0000-0000-0000-00",
      "ExpoPushToken[request-crash-recovery]",
      "preview",
      now
    );
    expect(provisional).toMatchObject({
      recoveryCode: "0000-0000-0000-0000-0000-0000-00",
      expoPushToken: "ExpoPushToken[request-crash-recovery]",
      appVariant: "preview",
      mode: "relink",
      createdAt: "2035-06-15T10:00:00.000Z",
      expiresAt: "2035-06-15T10:16:00.000Z"
    });
    const withdrawal = scrubExpiredReinstallRecoveryCapability({
      ...provisional,
      mode: "withdrawal"
    }, now);
    expect(parseStoredPendingReinstallRecovery(
      serializePendingReinstallRecovery(withdrawal)
    )).toEqual({ ...provisional, recoveryCode: null, mode: "withdrawal" });
  });

  it("scrubs an expired raw code but keeps the minimum restart cleanup capability", () => {
    const pending = {
      recoveryCode: "0000-0000-0000-0000-0000-0000-00",
      expoPushToken: "ExpoPushToken[expired-minimal-recovery]",
      appVariant: "preview" as const,
      mode: "relink" as const,
      createdAt: "2035-06-15T10:00:00.000Z",
      expiresAt: "2035-06-15T10:10:00.000Z"
    };
    expect(scrubExpiredReinstallRecoveryCapability(
      pending,
      Date.parse("2035-06-15T10:09:59.000Z")
    )).toBe(pending);
    const minimized = scrubExpiredReinstallRecoveryCapability(
      pending,
      Date.parse("2035-06-15T10:10:00.000Z")
    );
    expect(minimized).toEqual({ ...pending, recoveryCode: null });
    expect(parseStoredPendingReinstallRecovery(
      serializePendingReinstallRecovery(minimized)
    )).toEqual(minimized);
  });

  it("writes the provisional capability before mutating the server", async () => {
    const provisional = createProvisionalPendingReinstallRecovery(
      "0000-0000-0000-0000-0000-0000-00",
      "ExpoPushToken[ordered-recovery]",
      "preview",
      Date.parse("2035-06-15T10:00:00.000Z")
    );
    const authoritative = {
      ...provisional,
      expiresAt: "2035-06-15T10:10:00.000Z"
    };
    const events: string[] = [];
    let stored: typeof provisional | null = null;

    await expect(persistReinstallRecoveryRequest({
      provisional,
      writePending: async (value) => {
        events.push(stored ? "write-authoritative" : "write-provisional");
        stored = value;
      },
      request: async () => {
        events.push("request");
        expect(stored).toEqual(provisional);
        return { status: "pending_owner_approval" };
      },
      parseResponse: () => authoritative
    })).resolves.toEqual(authoritative);
    expect(events).toEqual([
      "write-provisional",
      "request",
      "write-authoritative"
    ]);
  });

  it("keeps the provisional record when a committed server response is lost", async () => {
    const provisional = createProvisionalPendingReinstallRecovery(
      "0000-0000-0000-0000-0000-0000-00",
      "ExpoPushToken[lost-response-recovery]",
      "development"
    );
    let stored: typeof provisional | null = null;
    let serverCommitted = false;
    await expect(persistReinstallRecoveryRequest({
      provisional,
      writePending: async (value) => { stored = value; },
      request: async () => {
        serverCommitted = true;
        throw new Error("response lost after commit");
      },
      parseResponse: () => provisional
    })).rejects.toThrow("response lost after commit");
    expect(serverCommitted).toBe(true);
    expect(stored).toEqual(provisional);
  });

  it("keeps the provisional record when the authoritative SecureStore write fails", async () => {
    const provisional = createProvisionalPendingReinstallRecovery(
      "0000-0000-0000-0000-0000-0000-00",
      "ExpoPushToken[final-write-recovery]",
      "preview"
    );
    const authoritative = {
      ...provisional,
      expiresAt: new Date(Date.parse(provisional.createdAt) + 10 * 60_000).toISOString()
    };
    let stored: typeof provisional | null = null;
    let writes = 0;
    const result = persistReinstallRecoveryRequest({
      provisional,
      writePending: async (value) => {
        writes += 1;
        if (writes === 2) throw new Error("SecureStore unavailable");
        stored = value;
      },
      request: async () => ({ status: "pending_owner_approval" }),
      parseResponse: () => authoritative
    });
    await expect(result).rejects.toMatchObject({
      phase: "authoritative"
    });
    expect(stored).toEqual(provisional);
  });

  it("keeps the provisional record if the app stops after the request", async () => {
    const provisional = createProvisionalPendingReinstallRecovery(
      "0000-0000-0000-0000-0000-0000-00",
      "ExpoPushToken[killed-after-request]",
      "preview"
    );
    let stored: typeof provisional | null = null;
    let writes = 0;
    await expect(persistReinstallRecoveryRequest({
      provisional,
      writePending: async (value) => {
        writes += 1;
        stored = value;
      },
      request: async () => ({ status: "pending_owner_approval" }),
      parseResponse: () => {
        throw new Error("simulated app termination before final write");
      }
    })).rejects.toThrow("simulated app termination");
    expect(writes).toBe(1);
    expect(stored).toEqual(provisional);
  });

  it("clears local recovery data only for a typed withdrawn acknowledgement", () => {
    expect(isConfirmedReinstallRecoveryWithdrawal({ status: "withdrawn" })).toBe(true);
    expect(isConfirmedReinstallRecoveryWithdrawal({ status: "ok" })).toBe(false);
    expect(isConfirmedReinstallRecoveryWithdrawal({
      status: "error",
      code: "RECOVERY_UNLINK_NOT_AVAILABLE"
    })).toBe(false);
    expect(isConfirmedReinstallRecoveryWithdrawal(null)).toBe(false);
  });

  it("builds an RPC body that cannot contain the raw code, token, secret, or proof", () => {
    const body = createReinstallRecoveryRequestBody({
      installationId: "11111111-1111-4111-8111-111111111111",
      secretStoreHash: "a".repeat(64),
      pairingStoreHash: "b".repeat(64),
      platform: "android",
      appVersion: "0.1.0+1",
      appVariant: "development",
      consentVersion: "v2",
      disclosureSha256: "c".repeat(64),
      consentLocale: "ko-KR",
      age14OrOverConfirmed: true,
      worshipReminder: true,
      scheduleChanges: false,
      setlistUpdates: false,
      recoveryCodeDigest: "d".repeat(64)
    });
    expect(body.target_recovery_code_digest).toBe("d".repeat(64));
    expect(Object.keys(body)).not.toEqual(expect.arrayContaining([
      "recoveryCode",
      "expoPushToken",
      "installationSecret",
      "proof"
    ]));
    expect(Object.values(body)).not.toContain("0000-0000-0000-0000-0000-0000-00");
  });

  it("keeps the exact token only in the SecureStore record, never an RPC body", () => {
    const finalizeBody = createReinstallRecoveryFinalizeBody({
      installationId: "11111111-1111-4111-8111-111111111111",
      platform: "android",
      appVersion: "0.1.0+1",
      appVariant: "development",
      consentVersion: "v2",
      disclosureSha256: "c".repeat(64),
      consentLocale: "ko-KR",
      age14OrOverConfirmed: true,
      worshipReminder: true,
      scheduleChanges: false,
      setlistUpdates: false
    });
    const cancelBody = createReinstallRecoveryCancelBody(
      "11111111-1111-4111-8111-111111111111",
      "android",
      "development"
    );
    for (const body of [finalizeBody, cancelBody]) {
      expect(Object.keys(body)).not.toEqual(expect.arrayContaining([
        "expoPushToken",
        "recoveryCode",
        "installationSecret",
        "proof"
      ]));
      expect(Object.values(body)).not.toContain("ExpoPushToken[secret-device-token]");
    }
  });
});
