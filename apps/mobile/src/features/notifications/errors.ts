export class NotificationSetupError extends Error {
  constructor(
    message: string,
    readonly code = "notification_setup_failed",
    readonly status?: number
  ) {
    super(message);
    this.name = "NotificationSetupError";
  }
}

export function isInvalidInstallationError(error: unknown): boolean {
  return error instanceof NotificationSetupError && error.code === "invalid_installation";
}
