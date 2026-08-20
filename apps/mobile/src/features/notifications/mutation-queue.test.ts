import { describe, expect, it } from "vitest";

import {
  createNotificationMutationQueue,
  isSameInstallationCredential,
  notificationCleanupRequiresRecoveryCancel,
  shouldFailClosedNotificationState,
  shouldReportNotificationRegistered,
  shouldRetryPendingNotificationCleanup
} from "./mutation-queue";

describe("notification mutation serialization", () => {
  it("makes a withdrawal queued during refresh the final state", async () => {
    const enqueue = createNotificationMutationQueue();
    const states: string[] = [];
    let releaseRefresh!: () => void;
    let markRefreshStarted!: () => void;
    const refreshStarted = new Promise<void>((resolve) => {
      markRefreshStarted = resolve;
    });
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    const refresh = enqueue(async () => {
      states.push("refresh-start");
      markRefreshStarted();
      await refreshGate;
      states.push("refresh-register");
    });
    const withdrawal = enqueue(async () => {
      states.push("withdraw");
    });

    await refreshStarted;
    expect(states).toEqual(["refresh-start"]);
    releaseRefresh();
    await Promise.all([refresh, withdrawal]);
    expect(states).toEqual(["refresh-start", "refresh-register", "withdraw"]);
  });

  it("requires startup cleanup only when both marker and credentials remain", () => {
    expect(shouldRetryPendingNotificationCleanup(true, true)).toBe(true);
    expect(shouldRetryPendingNotificationCleanup(true, false)).toBe(false);
    expect(shouldRetryPendingNotificationCleanup(false, true)).toBe(false);
  });

  it("retries recovery cancellation after a failed withdrawal or app restart", () => {
    expect(shouldRetryPendingNotificationCleanup(true, true)).toBe(true);
    expect(notificationCleanupRequiresRecoveryCancel(true)).toBe(true);
    expect(notificationCleanupRequiresRecoveryCancel(false)).toBe(false);
  });

  it("fails closed when consent and credentials survive missing preferences", () => {
    expect(shouldFailClosedNotificationState(true, true, false)).toBe(true);
    expect(shouldFailClosedNotificationState(true, true, true)).toBe(false);
    expect(shouldFailClosedNotificationState(false, true, false)).toBe(false);
    expect(shouldFailClosedNotificationState(true, false, false)).toBe(false);
  });

  it("never clears credentials created after an older queued operation", () => {
    const oldCredentials = {
      installationId: "11111111-1111-4111-8111-111111111111",
      installationSecret: "old-secret"
    };
    const newCredentials = {
      installationId: "22222222-2222-4222-8222-222222222222",
      installationSecret: "new-secret"
    };
    expect(isSameInstallationCredential(oldCredentials, oldCredentials)).toBe(true);
    expect(isSameInstallationCredential(oldCredentials, newCredentials)).toBe(false);
    expect(isSameInstallationCredential(oldCredentials, null)).toBe(false);
  });

  it("reports registered only after the local two-phase commit completes", () => {
    const base = {
      hasCurrentConsent: true,
      wantsNotifications: true,
      hasCredentials: true,
      hasReinstallRecovery: false,
      cleanupPending: false
    };
    expect(shouldReportNotificationRegistered({
      ...base,
      registrationCommitted: false
    })).toBe(false);
    expect(shouldReportNotificationRegistered({
      ...base,
      registrationCommitted: true
    })).toBe(true);
    expect(shouldReportNotificationRegistered({
      ...base,
      hasCredentials: false,
      registrationCommitted: false
    })).toBe(false);
  });

  it("keeps owner recovery and cleanup-pending installations fail closed", () => {
    const base = {
      hasCurrentConsent: true,
      wantsNotifications: true,
      hasCredentials: true,
      registrationCommitted: true,
      hasReinstallRecovery: false,
      cleanupPending: false
    };
    expect(shouldReportNotificationRegistered({
      ...base,
      hasReinstallRecovery: true
    })).toBe(false);
    expect(shouldReportNotificationRegistered({
      ...base,
      cleanupPending: true
    })).toBe(false);
  });
});
