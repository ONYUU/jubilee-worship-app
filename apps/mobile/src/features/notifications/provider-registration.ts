export type NotificationProviderRegistrationApi = {
  setAutoServerRegistrationEnabledAsync(enabled: boolean): Promise<void>;
  unregisterForNotificationsAsync(): Promise<void>;
};

/**
 * Stops Expo's persisted native-token updates before invalidating the current
 * APNs/FCM registration. Both operations are attempted so one provider error
 * cannot leave the other cleanup path untouched.
 */
export async function stopNotificationProviderRegistration(
  api: NotificationProviderRegistrationApi
): Promise<void> {
  let firstError: unknown = null;

  try {
    await api.setAutoServerRegistrationEnabledAsync(false);
  } catch (error) {
    firstError = error;
  }

  try {
    await api.unregisterForNotificationsAsync();
  } catch (error) {
    firstError ??= error;
  }

  if (firstError) throw firstError;
}
