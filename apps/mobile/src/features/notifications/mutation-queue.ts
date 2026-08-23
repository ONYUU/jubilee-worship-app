export type NotificationMutationQueue = <T>(operation: () => Promise<T>) => Promise<T>;

/**
 * Serializes every notification registration mutation. A withdrawal queued
 * while token refresh is awaiting native/network work therefore always runs
 * after that refresh and remains the final state; a later refresh must first
 * observe the persisted cleanup-pending/consent state.
 */
export function createNotificationMutationQueue(): NotificationMutationQueue {
  let tail: Promise<void> = Promise.resolve();
  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.catch(() => undefined).then(operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}

export function shouldRetryPendingNotificationCleanup(
  cleanupPending: boolean
): boolean {
  // Cleanup also disables Expo's persisted native-token auto-registration,
  // which can remain pending even after server credentials were never created
  // or were already removed.
  return cleanupPending;
}

export function notificationCleanupRequiresRecoveryCancel(
  hasPendingReinstallRecovery: boolean
): boolean {
  return hasPendingReinstallRecovery;
}

/**
 * A current consent and server credential can never legitimately coexist with
 * an all-off preference snapshot. Treat that combination as local corruption
 * and withdraw remotely instead of leaving an old server subscription active.
 */
export function shouldFailClosedNotificationState(
  hasCurrentConsent: boolean,
  hasCredentials: boolean,
  wantsNotifications: boolean
): boolean {
  return hasCurrentConsent && !wantsNotifications && hasCredentials;
}

export function isSameInstallationCredential(
  expected: { installationId: string; installationSecret: string },
  current: { installationId: string; installationSecret: string } | null
): boolean {
  return Boolean(
    current
      && current.installationId === expected.installationId
      && current.installationSecret === expected.installationSecret
  );
}

export function shouldReportNotificationRegistered(input: {
  hasCurrentConsent: boolean;
  wantsNotifications: boolean;
  hasCredentials: boolean;
  registrationCommitted: boolean;
  hasReinstallRecovery: boolean;
  cleanupPending: boolean;
}): boolean {
  return input.hasCurrentConsent
    && input.wantsNotifications
    && input.hasCredentials
    && input.registrationCommitted
    && !input.hasReinstallRecovery
    && !input.cleanupPending;
}
