import { describe, expect, it, vi } from "vitest";

import {
  clearCleanupStorageIfCredentialsMatch,
  parseStoredInstallationCredentials,
  prepareNotificationWithdrawalState,
  type StoredInstallationCredentials
} from "./cleanup-state";

const credentials: StoredInstallationCredentials = {
  installationId: "11111111-1111-4111-8111-111111111111",
  installationSecret: "a".repeat(32),
  registrationState: "committed"
};

describe("notification cleanup state", () => {
  it("distinguishes missing credentials from corrupted or invalid credentials", () => {
    expect(parseStoredInstallationCredentials(null)).toBeNull();
    expect(parseStoredInstallationCredentials(JSON.stringify({
      installationId: credentials.installationId,
      installationSecret: credentials.installationSecret
    }))).toEqual({ ...credentials, registrationState: "pending" });
    expect(() => parseStoredInstallationCredentials("not-json")).toThrow();
    expect(() => parseStoredInstallationCredentials("{}")).toThrow();
    expect(() => parseStoredInstallationCredentials("")).toThrow();
  });

  it("attempts every local withdrawal write even when one storage backend fails", async () => {
    const calls: string[] = [];
    await expect(prepareNotificationWithdrawalState({
      clearConsent: async () => {
        calls.push("consent");
        throw new Error("secure storage unavailable");
      },
      clearPreferences: async () => { calls.push("preferences"); },
      writeCleanupMarker: async () => { calls.push("marker"); }
    })).resolves.toBe(false);
    expect(calls).toEqual(["consent", "preferences", "marker"]);
  });

  it("reports local withdrawal preparation only after all writes succeed", async () => {
    await expect(prepareNotificationWithdrawalState({
      clearConsent: async () => undefined,
      clearPreferences: async () => undefined,
      writeCleanupMarker: async () => undefined
    })).resolves.toBe(true);
  });

  it("clears recovery and credentials before deleting the durable marker", async () => {
    const calls: string[] = [];
    await expect(clearCleanupStorageIfCredentialsMatch({
      expected: credentials,
      readCredentials: async () => credentials,
      clearConsent: async () => { calls.push("consent"); },
      clearPreferences: async () => { calls.push("preferences"); },
      clearPendingRecovery: async () => { calls.push("recovery"); },
      clearCredentials: async () => { calls.push("credentials"); },
      clearCleanupMarker: async () => { calls.push("marker"); }
    })).resolves.toBe(true);
    expect(calls).toEqual([
      "consent",
      "preferences",
      "recovery",
      "credentials",
      "marker"
    ]);
  });

  it("keeps the marker when an earlier cleanup step fails", async () => {
    const calls: string[] = [];
    await expect(clearCleanupStorageIfCredentialsMatch({
      expected: credentials,
      readCredentials: async () => credentials,
      clearConsent: async () => { calls.push("consent"); },
      clearPreferences: async () => { calls.push("preferences"); },
      clearPendingRecovery: async () => { calls.push("recovery"); },
      clearCredentials: async () => {
        calls.push("credentials");
        throw new Error("secure delete failed");
      },
      clearCleanupMarker: async () => { calls.push("marker"); }
    })).rejects.toThrow("secure delete failed");
    expect(calls).toEqual(["consent", "preferences", "recovery", "credentials"]);
  });

  it("does not clear a newer installation or its marker", async () => {
    const clearPendingRecovery = vi.fn(async () => undefined);
    const clearCredentials = vi.fn(async () => undefined);
    const clearCleanupMarker = vi.fn(async () => undefined);
    const clearConsent = vi.fn(async () => undefined);
    const clearPreferences = vi.fn(async () => undefined);
    await expect(clearCleanupStorageIfCredentialsMatch({
      expected: credentials,
      readCredentials: async () => ({
        ...credentials,
        installationId: "22222222-2222-4222-8222-222222222222"
      }),
      clearConsent,
      clearPreferences,
      clearPendingRecovery,
      clearCredentials,
      clearCleanupMarker
    })).resolves.toBe(false);
    expect(clearConsent).not.toHaveBeenCalled();
    expect(clearPreferences).not.toHaveBeenCalled();
    expect(clearPendingRecovery).not.toHaveBeenCalled();
    expect(clearCredentials).not.toHaveBeenCalled();
    expect(clearCleanupMarker).not.toHaveBeenCalled();
  });
});
